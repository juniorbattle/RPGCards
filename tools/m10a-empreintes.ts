// Avenant M10-A (AV-13) — empreintes des replays du mode Duel STANDARD, avant et après le patch des neutres : un corpus
// déterministe de duels IA contre IA (quatre Signatures, variantes toutes / aucune / quelques-unes, paires de Techniques,
// profils d'IA) et les enregistrements `lqv-replay/1` du dépôt, rejoués sur le moteur pur. Le patch ne doit changer
// AUCUNE empreinte (état complet + journal public et privé).
// Usage : npx tsx tools/m10a-empreintes.ts <sortie.json> [référence.json]   (avec une référence : compare, code 1 si écart)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { FAMILIES } from '../src/game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../src/game/catalog/techniques';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import type { GameConfig } from '../src/game/model/types';
import { replay, type ReplayRecord } from '../src/game/replay/replay';

const out = process.argv[2];
if (!out) throw new Error('usage : npx tsx tools/m10a-empreintes.ts <sortie.json> [référence.json]');
const ref = process.argv[3];

const PROFILS = Object.keys(PROFILES);
const VARIANTES: GameConfig['players']['p1']['variants'][] = ['all', 'none', ['Cendre-3', 'Voile-4', 'Ronce-1', 'Astre-2'], ['Astre-4', 'Astre-2', 'Voile-3', 'Cendre-4']];
const hashes: Record<string, string> = {};
const t0 = Date.now();
let n = 0;
for (let i = 0; i < 240; i++) {
  const seed = 7001 + i;
  const s1 = FAMILIES[i % 4]!;
  const s2 = FAMILIES[Math.floor(i / 4) % 4]!;
  const v1 = VARIANTES[i % VARIANTES.length]!;
  const v2 = VARIANTES[(i + 1 + Math.floor(i / 16)) % VARIANTES.length]!;
  const t1: TechniqueId[] = [TECHNIQUE_IDS[i % 6]!, TECHNIQUE_IDS[(i + 1) % 6]!];
  const t2: TechniqueId[] = [TECHNIQUE_IDS[(i + 2) % 6]!, TECHNIQUE_IDS[(i + 4) % 6]!];
  const hp = [60, 90, 125][i % 3]!;
  const cfg: GameConfig = { seed, players: { p1: { name: 'Vous', hp: 90, signature: s1, variants: v1, techniques: t1 }, p2: { name: 'Rival', hp, signature: s2, variants: v2, techniques: t2 } } };
  const pr: [string, string] = [PROFILS[i % PROFILS.length]!, PROFILS[(i + 3) % PROFILS.length]!];
  const m = autoplay(cfg, 200, [PROFILES[pr[0]]!, PROFILES[pr[1]]!]);
  // l'enregistrement rejoué doit redonner la même empreinte que la partie (contrôle croisé)
  const r = replay(m.record());
  if (r.hash !== m.hash()) throw new Error(`duel ${i} : rejeu ≠ partie`);
  hashes[`duel-${String(i).padStart(3, '0')} ${s1}/${s2} ${pr.join('/')}`] = m.hash();
  n++;
}
for (const f of ['artifacts/qa/tmp/rc-record.json']) {
  if (!existsSync(f)) continue;
  const rec = JSON.parse(readFileSync(f, 'utf8')) as ReplayRecord;
  hashes[`enregistrement ${f}`] = replay(rec).hash;
  n++;
}
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src').toString().trim() ? '+arbre de travail' : '';
const res = { commit: `${head}${dirty}`, duels: n, ms: Date.now() - t0, hashes };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
console.log(`${n} empreintes (${res.ms} ms) → ${out}`);
if (ref) {
  const a = JSON.parse(readFileSync(ref, 'utf8')) as typeof res;
  const keys = new Set([...Object.keys(a.hashes), ...Object.keys(hashes)]);
  const diff = [...keys].filter((k) => a.hashes[k] !== hashes[k]);
  console.log(diff.length ? `ÉCARTS : ${diff.length}\n${diff.slice(0, 20).join('\n')}` : `IDENTIQUES : ${keys.size} empreintes (référence ${a.commit}, ici ${res.commit})`);
  if (diff.length) process.exit(1);
}
