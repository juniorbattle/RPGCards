// Rejoue hors navigateur un enregistrement de duel (`__lqv.record()` exporté en JSON) sur le moteur
// pur et imprime le hash (état + journal). Sert à prouver que les animations, le rythme et la
// présentation n’influencent jamais l’état du jeu (M06). Usage : npx tsx tools/replay-hash.ts rec.json
import { readFileSync } from 'node:fs';
import { replay, type ReplayRecord } from '../src/game/replay/replay';

const rec = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as ReplayRecord;
const r = replay(rec);
console.log(JSON.stringify({ hash: r.hash, phase: r.state.phase, turn: r.state.turn, winner: r.state.winner, commands: rec.commands.length }));
