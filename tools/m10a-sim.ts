// Avenant M10-A (PROPOSÉ) — simulation d'équilibrage IA contre IA sur le moteur patché (neutres, deck explicite,
// Signature optionnelle). Usage : npx tsx tools/m10a-sim.ts [duels par matchup]
import { autoplay } from '../src/game/match';
import { PROFILES } from '../src/game/ai/policy';
import type { GameConfig } from '../src/game/model/types';
import type { TechniqueId } from '../src/game/catalog/techniques';

const N = Number(process.argv[2] ?? 400);
const N16 = [1, 2, 3, 4].flatMap((r) => Array.from({ length: 4 }, () => `neutre-${r}`));
const sansUnParRang = (k: number) => [1, 2, 3, 4].flatMap((r) => Array.from({ length: 4 - k }, () => `neutre-${r}`));
const fam = (f: string, v: Record<number, string | null>) => [1, 2, 3, 4].map((r) => (v[r] ? `${f}-${r}-${v[r]}` : `${f}-${r}-basic`));
type Seat = GameConfig['players']['p1'];
const seat = (deck: string[] | null, hp: number, techniques: TechniqueId[], signature: Seat['signature'] = null, variants: Seat['variants'] = []): Seat =>
  ({ name: 'x', hp, signature, variants, techniques, ...(deck ? { deck } : {}) });
const RUE: TechniqueId[] = ['Sondage', 'Recentrage'];

const M: Array<{ id: string; p1: Seat; p2: Seat; prof: [string, string] }> = [
  { id: 'Inaugural : 16 neutres contre 16 neutres, PV 60/60', p1: seat(N16, 60, RUE), p2: seat(N16, 60, RUE), prof: ['equilibre', 'offensif'] },
  { id: 'Inaugural (miroir de profil équilibré)', p1: seat(N16, 60, RUE), p2: seat(N16, 60, RUE), prof: ['equilibre', 'equilibre'] },
  { id: 'Cadet Voile : joueur 12 N + 4 Basics Voile (PV 90) contre cadet 12 N + Voile dont III Dissimulation (PV 80)', p1: seat([...fam('Voile', {}), ...sansUnParRang(1)], 90, ['Sondage', 'Dissipation']), p2: seat([...fam('Voile', { 3: 'dissimulation' }), ...sansUnParRang(1)], 80, ['Lecture', 'Dissipation']), prof: ['equilibre', 'lecteur'] },
  { id: 'Bras droit Voile : joueur 12 N + Voile (III) contre Sélène 12 N + Voile (III, IV) (PV 100)', p1: seat([...fam('Voile', { 3: 'dissimulation' }), ...sansUnParRang(1)], 90, ['Sondage', 'Dissipation']), p2: seat([...fam('Voile', { 3: 'dissimulation', 4: 'silence' }), ...sansUnParRang(1)], 100, ['Lecture', 'Dissipation']), prof: ['equilibre', 'lecteur'] },
  { id: 'Chef Voile : joueur 12 N + Voile (III, IV), sans Signature, contre Ilse 12 N + 4 variantes + Miroir du Voile (PV 110)', p1: seat([...fam('Voile', { 3: 'dissimulation', 4: 'silence' }), ...sansUnParRang(1)], 90, ['Sondage', 'Dissipation']), p2: seat([...fam('Voile', { 1: 'eclaireur', 2: 'detour', 3: 'dissimulation', 4: 'silence' }), ...sansUnParRang(1), 'sig-Voile'], 110, ['Lecture', 'Dissipation'], 'Voile'), prof: ['equilibre', 'lecteur'] },
  { id: 'Chef Voile, PV 90 (variante d’équilibrage)', p1: seat([...fam('Voile', { 3: 'dissimulation', 4: 'silence' }), ...sansUnParRang(1)], 90, ['Sondage', 'Dissipation']), p2: seat([...fam('Voile', { 1: 'eclaireur', 2: 'detour', 3: 'dissimulation', 4: 'silence' }), ...sansUnParRang(1), 'sig-Voile'], 90, ['Lecture', 'Dissipation'], 'Voile'), prof: ['equilibre', 'lecteur'] },
  { id: 'Référence standard : 17 cartes, toutes variantes, PV 90/90', p1: seat(null, 90, ['Lecture', 'Ancrage'], 'Cendre', 'all'), p2: seat(null, 90, ['Sondage', 'Rupture'], 'Ronce', 'all'), prof: ['equilibre', 'offensif'] },
];

const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]!; };
console.log(`| Matchup | Duels | Victoires p1 | Tours (moyenne / médiane) | Prolongations |`);
console.log(`|---|---:|---:|---:|---:|`);
for (const m of M) {
  let w = 0; const turns: number[] = []; let ot = 0;
  for (let s = 1; s <= N; s++) {
    const cfg: GameConfig = { seed: 1000 + s, players: { p1: { ...m.p1, name: 'p1' }, p2: { ...m.p2, name: 'p2' } } };
    const r = autoplay(cfg, 200, [PROFILES[m.prof[0]]!, PROFILES[m.prof[1]]!]);
    if (r.state.winner === 'p1') w++;
    turns.push(r.state.turn);
    if (r.state.overtime > 0) ot++;
  }
  const mean = turns.reduce((a, b) => a + b, 0) / turns.length;
  console.log(`| ${m.id} (IA ${m.prof.join(' / ')}) | ${N} | ${(100 * w / N).toFixed(1)} % | ${mean.toFixed(1)} / ${med(turns)} | ${(100 * ot / N).toFixed(1)} % |`);
}
