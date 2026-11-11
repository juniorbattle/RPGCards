// Lot de correction de clôture (fiche B1) — les Signatures mesurées par paires, moteur pur, IA contre IA. Le deck standard
// de chaque camp ne diffère que par sa Signature (16 identités en variantes A, plus la Signature de sa famille) : une
// paire « Cendre contre Voile » mesure donc le Brasier Originel contre le Miroir du Voile. Sièges alternés, mêmes
// Techniques des deux côtés (tirées par graine), IA « équilibré » des deux côtés (base de la décision), puis profils
// historiques tournants (contexte : c'est sur ce corpus que l'audit relevait 57,3 %).
// `LQV_PAIRES=Cendre` : seulement les paires de cette Signature ; `LQV_PROFILS=equilibre` : sans les profils tournants ;
// `LQV_GRAINE=<n>` : décale les graines (second lot de confirmation).
// Usage : npx tsx tools/cloture-signatures.ts [duels par paire, défaut 1200] [sortie.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { FAMILIES, SIGNATURES, type Family } from '../src/game/catalog/cards';
import { TECHNIQUE_IDS } from '../src/game/catalog/techniques';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { PROFILES, PROFILS_HISTORIQUES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import type { GameConfig, PlayerId } from '../src/game/model/types';

const N = Number(process.argv[2] ?? 1200);
const OUT = process.argv[3];
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const PAIRES = process.env.LQV_PAIRES ?? '';
const SEUL_EQUILIBRE = process.env.LQV_PROFILS === 'equilibre';
const DECALAGE = Number(process.env.LQV_GRAINE ?? 0);

interface Res { a: Family; b: Family; profils: string; wins: number; games: number; rate: number; turns: number; signatureJouee: number }

function paire(a: Family, b: Family, tournants: boolean, seed0: number): Res {
  let wins = 0; let games = 0; let turns = 0; let sig = 0;
  for (let i = 0; i < N; i++) {
    const seed = seed0 + i * 7919;
    const t1 = TECHNIQUE_IDS[i % TECHNIQUE_IDS.length]!;
    const t2 = TECHNIQUE_IDS[(i * 5 + 2) % TECHNIQUE_IDS.length]!;
    const techniques = t1 === t2 ? [t1] : [t1, t2];
    const aSeat: PlayerId = i % 2 === 0 ? 'p1' : 'p2';
    const side = (f: Family, name: string) => ({ ...DEFAULT_CONFIG.players.p1, name, signature: f, variants: 'all' as const, techniques });
    const cfg: GameConfig = { seed, players: aSeat === 'p1' ? { p1: side(a, 'Vous'), p2: side(b, 'Rival') } : { p1: side(b, 'Vous'), p2: side(a, 'Rival') } };
    const pa = tournants ? PROFILES[PROFILS_HISTORIQUES[i % PROFILS_HISTORIQUES.length]!]! : PROFILES.equilibre!;
    const pb = tournants ? PROFILES[PROFILS_HISTORIQUES[(i * 7 + 3) % PROFILS_HISTORIQUES.length]!]! : PROFILES.equilibre!;
    const m = autoplay(cfg, 200, aSeat === 'p1' ? [pa, pb] : [pb, pa]);
    if (m.state.phase !== 'ENDED') continue;
    games++;
    turns += m.state.turn;
    if (m.state.winner === aSeat) wins++;
    if (m.events.some((e) => e.kind === 'signatureAnnounced' && e.data.player === aSeat)) sig++;
  }
  return { a, b, profils: tournants ? 'tournants' : 'équilibré', wins, games, rate: games ? (100 * wins) / games : 0, turns: games ? turns / games : 0, signatureJouee: games ? (100 * sig) / games : 0 };
}

const t0 = Date.now();
const res: Res[] = [];
for (const tournants of SEUL_EQUILIBRE ? [false] : [false, true]) {
  for (let x = 0; x < 4; x++) for (let y = x + 1; y < 4; y++) {
    if (PAIRES && FAMILIES[x] !== PAIRES && FAMILIES[y] !== PAIRES) continue;
    const r = paire(FAMILIES[x]!, FAMILIES[y]!, tournants, 22500 + DECALAGE + x * 101 + y * 13 + (tournants ? 5 : 0));
    res.push(r);
    console.log(`${r.profils.padEnd(10)} ${r.a} contre ${r.b} : ${r.rate.toFixed(1)} % (${r.wins}/${r.games}), ${r.turns.toFixed(1)} tours`);
  }
}
/** Taux de victoire d'une Signature contre les trois autres (moyenne des trois paires, chacune du point de vue de f). */
const parSignature = (profils: string) => Object.fromEntries(FAMILIES.map((f) => {
  const xs = res.filter((r) => r.profils === profils && (r.a === f || r.b === f));
  const w = xs.reduce((s, r) => s + (r.a === f ? r.wins : r.games - r.wins), 0);
  const g = xs.reduce((s, r) => s + r.games, 0);
  return [f, { rate: g ? (100 * w) / g : 0, wins: w, games: g }];
}));
const sommaire = { equilibre: parSignature('équilibré'), tournants: parSignature('tournants') };
const ms = Date.now() - t0;
console.log(`Par Signature (équilibré) : ${FAMILIES.map((f) => `${f} ${sommaire.equilibre[f]!.rate.toFixed(1)} %`).join(', ')}`);
console.log(`Par Signature (tournants) : ${FAMILIES.map((f) => `${f} ${sommaire.tournants[f]!.rate.toFixed(1)} %`).join(', ')}`);
console.log(`Brasier Originel : Puissance ${SIGNATURES.Cendre.power} ; ${(ms / 1000).toFixed(0)} s`);
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ commit, date: new Date().toISOString(), duelsParPaire: N, brasier: SIGNATURES.Cendre.power, ms, paires: res, parSignature: sommaire }, null, 1) + '\n');
}
