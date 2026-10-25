// Avenant 08 (annonce des Signatures) — preuve que la résolution ne change pas. Rejoue des enregistrements de replay
// (`LQV_RECORDS=…` de `tools/m10a-empreintes.ts`, produits avant l'avenant) et calcule pour chaque duel une empreinte
// « hors annonce » : état final sans `reveal.signatures`, étiquette des règles et compteur d'événements neutralisés ;
// journal sans l'événement `signatureAnnounced`, sans le drapeau `signature` de `committed` et sans numérotation.
// Lancé sur le moteur d'avant (archive du commit e987d45) puis sur celui d'après, les deux fichiers doivent coïncider.
// Amendement 1 (révision) : quand le rejeu tombe sur une fenêtre de révision, que les enregistrements d'avant ne
// connaissent pas, le joueur concerné GARDE son engagement ; la fenêtre, ses événements et les champs d'état de la
// révision sont retirés de l'empreinte « hors annonce ».
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
let revisions = 0;
for (const [cle, rec] of Object.entries(records)) {
  let { state, events } = createGame(rec.config);
  const all: GameEvent[] = [...events];
  for (const cmd of rec.commands) {
    if ((state as { phase: string }).phase === 'REVISION') {
      const keep = applyCommand(state, { type: 'revise', player: (state as unknown as { revision: 'p1' | 'p2' }).revision, commit: null });
      state = keep.state; all.push(...keep.events); revisions++;
    }
    const r = applyCommand(state, cmd); state = r.state; all.push(...r.events);
  }
  // fenêtre ouverte par le dernier verrouillage (le duel d'avant se terminait dans la même transition)
  if ((state as { phase: string }).phase === 'REVISION') {
    const keep = applyCommand(state, { type: 'revise', player: (state as unknown as { revision: 'p1' | 'p2' }).revision, commit: null });
    state = keep.state; all.push(...keep.events); revisions++;
  }
  const s = structuredClone(state) as unknown as { reveal: Record<string, unknown>; rules: string; eventSeq: number; commitOrder?: unknown; commitHeld?: unknown; revision?: unknown };
  delete s.reveal.signatures;
  delete s.commitOrder; delete s.commitHeld; delete s.revision;
  s.rules = '-';
  s.eventSeq = 0;
  annonces += all.filter((e) => e.kind === 'signatureAnnounced').length;
  const evs = all.filter((e) => !['signatureAnnounced', 'revisionOpened', 'revised'].includes(e.kind) && !(e.kind === 'locked' && e.phase === 'REVISION')).map((e) => {
    const data: Record<string, unknown> = { ...e.data };
    if (e.kind === 'committed' && e.vis === 'public') delete data.signature;
    // l'engagement gardé s'applique pendant la fenêtre de révision : même contenu, phase COMMIT d'avant
    return { turn: e.turn, phase: e.phase === 'REVISION' ? 'COMMIT' : e.phase, vis: e.vis, kind: e.kind, data };
  });
  empreintes[cle] = `${hashString(JSON.stringify(s)).toString(16)}:${hashString(JSON.stringify(evs)).toString(16)}`;
}
const res = { duels: Object.keys(empreintes).length, annonces, revisions, empreintes };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
console.log(`${res.duels} duels, ${annonces} annonces de Signature, ${revisions} révisions gardées → ${out}`);
if (ref) {
  const a = JSON.parse(readFileSync(ref, 'utf8')) as typeof res;
  const diff = Object.keys(a.empreintes).filter((k) => a.empreintes[k] !== empreintes[k]);
  console.log(diff.length ? `ÉCARTS : ${diff.length} (${diff.slice(0, 10).join(', ')})` : `IDENTIQUES hors annonce : ${res.duels} duels (référence : ${a.annonces} annonces, ici ${annonces})`);
  if (diff.length) process.exit(1);
}
