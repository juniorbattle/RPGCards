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
/** Avenant 07 (V3.3, G-08) : le duel contient-il un Clash où l'Assaut gagne contre une Garde ? (journal public) */
const agAssaut: Record<string, boolean> = {};
/** Enregistrements des duels SANS Clash « Assaut vainqueur contre une Garde » : rejoués tels quels sur le moteur d'après. */
const sansAG: Record<string, ReplayRecord> = {};
/** `LQV_RECORDS=<fichier>` : écrit les enregistrements de tout le corpus (preuve de l'avenant 08 : rejeu sur le moteur d'après). */
const records: Record<string, ReplayRecord> = {};
const aAgAssaut = (evs: readonly { kind: string; vis: string; data: unknown }[]) => evs.some((e) => {
  if (e.kind !== 'clash' || e.vis !== 'public') return false;
  const r = e.data as { stances: { p1: string; p2: string }; guardWin: boolean };
  return r.stances.p1 !== r.stances.p2 && !r.guardWin;
});
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
  const cle = `duel-${String(i).padStart(3, '0')} ${s1}/${s2} ${pr.join('/')}`;
  hashes[cle] = m.hash();
  agAssaut[cle] = aAgAssaut(m.events);
  if (!agAssaut[cle]) sansAG[cle] = m.record();
  if (process.env.LQV_RECORDS) records[cle] = m.record();
  n++;
}
for (const f of ['artifacts/qa/tmp/rc-record.json']) {
  if (!existsSync(f)) continue;
  const rec = JSON.parse(readFileSync(f, 'utf8')) as ReplayRecord;
  const rr = replay(rec);
  hashes[`enregistrement ${f}`] = rr.hash;
  agAssaut[`enregistrement ${f}`] = aAgAssaut(rr.events);
  n++;
}
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src').toString().trim() ? '+arbre de travail' : '';
const res = { commit: `${head}${dirty}`, duels: n, ms: Date.now() - t0, hashes, agAssaut, sansAG };
mkdirSync(dirname(out), { recursive: true });
if (process.env.LQV_RECORDS) { mkdirSync(dirname(process.env.LQV_RECORDS), { recursive: true }); writeFileSync(process.env.LQV_RECORDS, JSON.stringify(records)); }
writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
console.log(`${n} empreintes (${res.ms} ms) → ${out}`);
if (ref) {
  const a = JSON.parse(readFileSync(ref, 'utf8')) as Omit<typeof res, 'agAssaut' | 'sansAG'> & { agAssaut?: Record<string, boolean>; sansAG?: Record<string, ReplayRecord> };
  const keys = new Set([...Object.keys(a.hashes), ...Object.keys(hashes)]);
  const diff = [...keys].filter((k) => a.hashes[k] !== hashes[k]);
  if (process.env.LQV_EXPLIQUE === 'garde-v33') {
    // Preuve de l'avenant 07 (G-08) : changent exactement les duels de la référence qui contiennent un Clash où l'Assaut
    // gagne contre une Garde ; les autres gardent leur empreinte.
    const attendus = Object.keys(a.agAssaut ?? {}).filter((k) => a.agAssaut![k]);
    const inexpliques = diff.filter((k) => !a.agAssaut?.[k]);
    const inchanges = attendus.filter((k) => !diff.includes(k));
    console.log(`ÉCARTS : ${diff.length} ; attendus : ${attendus.length} ; inexpliqués : ${inexpliques.length} ; attendus inchangés : ${inchanges.length} ; identiques : ${keys.size - diff.length}`);
    // Un duel sans tel Clash peut changer par les choix de l'IA (elle estime les Clashes possibles avec `computeClash`) :
    // ses commandes d'avant, rejouées sur le moteur d'après, doivent redonner exactement son empreinte d'avant.
    const moteurIdentique = Object.entries(a.sansAG ?? {}).filter(([k, rec]) => replay(rec).hash === a.hashes[k]).length;
    console.log(`Duels sans Assaut vainqueur contre une Garde : ${Object.keys(a.sansAG ?? {}).length} ; leurs commandes rejouées sur le moteur d'après redonnent l'empreinte d'avant : ${moteurIdentique} ; changés par les choix de l'IA : ${inexpliques.length}`);
    if (moteurIdentique !== Object.keys(a.sansAG ?? {}).length || inchanges.length) { console.log([...inexpliques, ...inchanges].slice(0, 20).join(', ')); process.exit(1); }
  } else {
    console.log(diff.length ? `ÉCARTS : ${diff.length}\n${diff.slice(0, 20).join('\n')}` : `IDENTIQUES : ${keys.size} empreintes (référence ${a.commit}, ici ${res.commit})`);
    if (diff.length) process.exit(1);
  }
}
