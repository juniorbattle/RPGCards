// Avenant 09 (M12) — mesure des 32 variantes B et C, moteur pur, IA contre IA (profil « équilibré » des deux côtés,
// sièges alternés, Signatures et Techniques tirées par graine). Pour chaque variante V d'une identité I : deck standard
// (variantes A) où I joue V, contre le même deck où I joue A ; seul I diffère. Taux de victoire du côté V (50 % = neutre),
// durée des duels. Puis deck tout B et deck tout C contre deck tout A. Sortie : artifacts/qa/m12/variantes/mesure.json et
// mesure.md. Usage : npx tsx tools/m12-variantes-mesure.ts [duels par variante, défaut 400] [filtre : identité ou nom, ex. Escarbille]
// (avec un filtre : seules les lignes qui le contiennent, sortie mesure-<filtre>.json et .md).
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { EFFECTS, FAMILIES, VARIANTS, type Family } from '../src/game/catalog/cards';
import { TECHNIQUE_IDS } from '../src/game/catalog/techniques';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import type { GameConfig, PlayerId } from '../src/game/model/types';

const N = Number(process.argv[2] ?? 400);
const FILTRE = process.argv[3] ?? '';
const OUT = 'artifacts/qa/m12/variantes';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const IDS = FAMILIES.flatMap((f) => ([1, 2, 3, 4] as const).map((r) => ({ f, r, id: `${f}-${r}` })));
/** Deck : identités en A, sauf celles listées (définition exacte). */
const deck = (over: Record<string, string>): string[] => IDS.map(({ id }) => over[id] ?? id);
const MARGE = 6; // points de pourcentage

interface Res { label: string; wins: number; games: number; turns: number; rate: number; delta: number; flag: boolean }

function measure(label: string, a: string[], b: string[], n: number, seed0: number): Res {
  let wins = 0;
  let games = 0;
  let turns = 0;
  for (let i = 0; i < n; i++) {
    const seed = seed0 + i * 7919;
    const sigA = FAMILIES[i % 4] as Family;
    const sigB = FAMILIES[(i * 3 + 1) % 4] as Family;
    const t1 = TECHNIQUE_IDS[i % TECHNIQUE_IDS.length]!;
    const t2 = TECHNIQUE_IDS[(i * 5 + 2) % TECHNIQUE_IDS.length]!;
    const techs = t1 === t2 ? [t1] : [t1, t2];
    const vSeat: PlayerId = i % 2 === 0 ? 'p1' : 'p2';
    const seatA = { ...DEFAULT_CONFIG.players.p1, signature: sigA, variants: a, techniques: techs };
    const seatB = { ...DEFAULT_CONFIG.players.p2, signature: sigB, variants: b, techniques: techs };
    const cfg: GameConfig = { seed, players: vSeat === 'p1' ? { p1: seatA, p2: { ...seatB } } : { p1: { ...seatB, name: DEFAULT_CONFIG.players.p1.name }, p2: { ...seatA, name: DEFAULT_CONFIG.players.p2.name } } };
    const m = autoplay(cfg, 80, [PROFILES.equilibre!, PROFILES.equilibre!]);
    if (m.state.phase !== 'ENDED') continue;
    games++;
    turns += m.state.turn;
    if (m.state.winner === vSeat) wins++;
  }
  const rate = games ? (100 * wins) / games : 0;
  return { label, wins, games, turns: games ? turns / games : 0, rate, delta: rate - 50, flag: Math.abs(rate - 50) > MARGE };
}

const t0 = Date.now();
const results: Res[] = [];
// témoin : A contre A (doit être proche de 50 %)
if (!FILTRE) results.push(measure('témoin A contre A', deck({}), deck({}), N, 11));
for (const { f, r, id } of IDS) {
  for (const k of [1, 2] as const) {
    const [e] = VARIANTS[f][r][k]!;
    if (FILTRE && !`${id} ${EFFECTS[e].name}`.includes(FILTRE)) continue;
    const res = measure(`${id} ${k === 1 ? 'B' : 'C'} ${EFFECTS[e].name}`, deck({ [id]: `${id}-${e}` }), deck({}), N, 1000 + k * 100 + IDS.findIndex((x) => x.id === id) * 7);
    results.push(res);
    process.stdout.write(`${res.label.padEnd(36)} ${res.rate.toFixed(1)} % (${res.games})${res.flag ? '  ← hors marge' : ''}\n`);
  }
}
const allB = Object.fromEntries(IDS.map(({ f, r, id }) => [id, `${id}-${VARIANTS[f][r][1]![0]}`]));
const allC = Object.fromEntries(IDS.map(({ f, r, id }) => [id, `${id}-${VARIANTS[f][r][2]![0]}`]));
if (!FILTRE) {
  results.push(measure('deck tout B contre deck tout A', deck(allB), deck({}), N, 5000));
  results.push(measure('deck tout C contre deck tout A', deck(allC), deck({}), N, 6000));
  results.push(measure('deck tout B contre deck tout C', deck(allB), deck(allC), N, 7000));
}
const NOM = FILTRE ? `mesure-${FILTRE.replace(/[^\w-]+/g, '_')}` : 'mesure';
const ms = Date.now() - t0;

writeFileSync(`${OUT}/${NOM}.json`, JSON.stringify({ commit, date: new Date().toISOString(), duelsParMesure: N, marge: MARGE, ms, results }, null, 2));
const lines = [
  `# Mesure des variantes B et C (avenant 09)${FILTRE ? ` : ${FILTRE}` : ''} — ${commit}`,
  '',
  `${N} duels par ligne, IA « équilibré » des deux côtés, sièges alternés ; 50 % = la variante ne change rien ; marge ±${MARGE} points (au-delà : à revoir). Durée : ${(ms / 1000).toFixed(0)} s.`,
  '',
  '| Mesure | Victoires du côté mesuré | Écart | Tours moyens | |',
  '|---|---|---|---|---|',
  ...results.map((x) => `| ${x.label} | ${x.rate.toFixed(1)} % (${x.wins}/${x.games}) | ${x.delta >= 0 ? '+' : ''}${x.delta.toFixed(1)} | ${x.turns.toFixed(1)} | ${x.flag ? '**hors marge**' : ''} |`),
  '',
];
writeFileSync(`${OUT}/${NOM}.md`, lines.join('\n'));
console.log(`\n${results.filter((x) => x.flag).length} mesure(s) hors marge ; ${(ms / 1000).toFixed(0)} s ; ${OUT}/${NOM}.md`);
