// Mesure du moteur pur (Node, sans navigateur) : duels IA/IA complets, transitions/s.
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';

const N = Number(process.argv[2] ?? 200);
const t0 = performance.now();
let commands = 0;
let turns = 0;
let overtime = 0;
const wins = { p1: 0, p2: 0 };
for (let seed = 1; seed <= N; seed++) {
  const m = autoplay({ ...DEFAULT_CONFIG, seed });
  commands += m.commands.length;
  turns += m.state.turn;
  overtime += m.state.overtime ? 1 : 0;
  if (m.state.winner) wins[m.state.winner]++;
}
const ms = performance.now() - t0;
console.log(JSON.stringify({ duels: N, ms: Math.round(ms), msPerDuel: +(ms / N).toFixed(2), commands, usPerCommand: +((ms * 1000) / commands).toFixed(1), avgTurns: +(turns / N).toFixed(2), duelsWithOvertime: overtime, wins }));
