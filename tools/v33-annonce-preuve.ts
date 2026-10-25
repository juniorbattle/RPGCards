// Avenant 08 (annonce des Signatures) — preuve que la résolution ne change pas. Rejoue des enregistrements de replay
// (`LQV_RECORDS=…` de `tools/m10a-empreintes.ts`, produits avant l'avenant) et calcule pour chaque duel une empreinte
// « hors annonce » : état final sans `reveal.signatures`, étiquette des règles et compteur d'événements neutralisés ;
// journal sans l'événement `signatureAnnounced`, sans le drapeau `signature` de `committed` et sans numérotation.
// Lancé sur le moteur d'avant (archive du commit e987d45) puis sur celui d'après, les deux fichiers doivent coïncider.
// Usage : npx tsx tools/v33-annonce-preuve.ts <enregistrements.json> <sortie.json> [référence.json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyCommand, createGame } from '../src/game/engine/engine';
import { hashString } from '../src/game/engine/rng';
import type { GameEvent } from '../src/game/model/types';
import type { ReplayRecord } from '../src/game/replay/replay';

const [src, out, ref] = process.argv.slice(2);
if (!src || !out) throw new Error('usage : npx tsx tools/v33-annonce-preuve.ts <enregistrements.json> <sortie.json> [référence.json]');
const records = JSON.parse(readFileSync(src, 'utf8')) as Record<string, ReplayRecord>;

const empreintes: Record<string, string> = {};
let annonces = 0;
for (const [cle, rec] of Object.entries(records)) {
  let { state, events } = createGame(rec.config);
  const all: GameEvent[] = [...events];
  for (const cmd of rec.commands) { const r = applyCommand(state, cmd); state = r.state; all.push(...r.events); }
  const s = structuredClone(state) as unknown as { reveal: Record<string, unknown>; rules: string; eventSeq: number };
  delete s.reveal.signatures;
  s.rules = '-';
  s.eventSeq = 0;
  annonces += all.filter((e) => e.kind === 'signatureAnnounced').length;
  const evs = all.filter((e) => e.kind !== 'signatureAnnounced').map((e) => {
    const data: Record<string, unknown> = { ...e.data };
    if (e.kind === 'committed' && e.vis === 'public') delete data.signature;
    return { turn: e.turn, phase: e.phase, vis: e.vis, kind: e.kind, data };
  });
  empreintes[cle] = `${hashString(JSON.stringify(s)).toString(16)}:${hashString(JSON.stringify(evs)).toString(16)}`;
}
const res = { duels: Object.keys(empreintes).length, annonces, empreintes };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
console.log(`${res.duels} duels, ${annonces} annonces de Signature → ${out}`);
if (ref) {
  const a = JSON.parse(readFileSync(ref, 'utf8')) as typeof res;
  const diff = Object.keys(a.empreintes).filter((k) => a.empreintes[k] !== empreintes[k]);
  console.log(diff.length ? `ÉCARTS : ${diff.length} (${diff.slice(0, 10).join(', ')})` : `IDENTIQUES hors annonce : ${res.duels} duels (référence : ${a.annonces} annonces, ici ${annonces})`);
  if (diff.length) process.exit(1);
}
