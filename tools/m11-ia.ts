// M11-D — mesures IA contre IA de l'IA de niveau 2 (`docs/m11/05_IA_DE_COMBAT.md`) sur le moteur réel, mêmes graines pour
// chaque appariement ; l'adversaire (p2) verrouille en premier, comme le rival du jeu. Chaque profil de niveau 2 est
// comparé à son profil de base (tacticien ↔ equilibre, agressif ↔ offensif, vicieux ↔ lecteur) contre les mêmes
// adversaires historiques : Duel standard (Signatures et Techniques tournantes) et duels d'aventure à cartes grises.
// Usage : npx tsx tools/m11-ia.ts [duels par case] [sortie.md]
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { FAMILIES } from '../src/game/catalog/cards';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import type { GameConfig } from '../src/game/model/types';
import type { TechniqueId } from '../src/game/catalog/techniques';
import { siegeAventure } from '../src/aventure/deck';
import { adversaire, deckPopulace } from '../src/aventure/paliers';
import { config } from '../test/helpers';

const N = Number(process.argv[2] ?? 200);
const OUT = process.argv[3];
const head = execSync('git rev-parse --short HEAD').toString().trim();
const PAIRES: Array<[string, string]> = [['tacticien', 'equilibre'], ['agressif', 'offensif'], ['vicieux', 'lecteur']];
const ADVERSES = ['equilibre', 'offensif', 'prudent', 'lecteur', 'novice'];
const TECHS: TechniqueId[][] = [['Sondage', 'Lecture'], ['Ancrage', 'Rupture'], ['Lecture', 'Dissipation'], ['Recentrage', 'Ancrage']];

const standard = (i: number): GameConfig => config({ seed: 0x5e11 + i * 7919, sig1: FAMILIES[i % 4], sig2: FAMILIES[(i + 1) % 4], t1: TECHS[i % 4], t2: TECHS[(i + 2) % 4] });
/** Aventure : le profil mesuré tient un deck de rue au niveau 2 (membre), le joueur « équilibré » des cartes grises. */
const aventure = (i: number): GameConfig => {
  const adv = adversaire('rue', FAMILIES[i % 4]!, 2, ['Sondage', 'Recentrage']);
  return { seed: 0xa11 + i * 6151, players: { p1: siegeAventure(deckPopulace(['Sondage', 'Recentrage']), 'Joueur', 56), p2: siegeAventure(adv.deck, 'Rue', adv.pv) } };
};

function mesure(cfg: (i: number) => GameConfig, moi: string, contre: string): { taux: number; tours: number } {
  let w = 0; let t = 0;
  for (let i = 0; i < N; i++) {
    const m = autoplay(cfg(i), 200, [PROFILES[contre]!, PROFILES[moi]!], ['p2', 'p1']);
    if (m.state.winner === 'p2') w++;
    t += m.state.turn;
  }
  return { taux: (100 * w) / N, tours: t / N };
}

const L: string[] = [`# M11-D — IA de niveau 2 contre profils historiques (commit ${head}, ${N} duels par case, mêmes graines)`, ''];
const t0 = Date.now();
L.push('## Duel standard (taux de victoire du profil mesuré, en p2, qui verrouille en premier ; tours par duel)', '');
L.push(`| Profil mesuré | ${ADVERSES.map((a) => `contre ${a}`).join(' | ')} |`, `|---|${ADVERSES.map(() => '---:').join('|')}|`);
for (const [n2, base] of PAIRES) for (const p of [base, n2]) {
  L.push(`| ${p}${p === n2 ? ' (niveau 2)' : ''} | ${ADVERSES.map((a) => { const r = mesure(standard, p, a); return `${r.taux.toFixed(1)} % (${r.tours.toFixed(1)})`; }).join(' | ')} |`);
  console.log(L[L.length - 1]);
}
L.push('', '## Aventure : le profil mesuré tient un deck de rue (niveau 2) contre un joueur « équilibré » à seize cartes grises (PV 56)', '');
L.push('| Profil mesuré | victoires du profil | tours |', '|---|---:|---:|');
for (const p of ['novice', 'timide', 'lecteur', 'offensif', 'tacticien', 'agressif', 'vicieux']) {
  const r = mesure(aventure, p, 'equilibre');
  L.push(`| ${p} | ${r.taux.toFixed(1)} % | ${r.tours.toFixed(1)} |`);
  console.log(L[L.length - 1]);
}
L.push('', `Marge d'erreur ≈ ±${(100 / Math.sqrt(N)).toFixed(0)} points ; ${Math.round((Date.now() - t0) / 1000)} s.`);
if (OUT) writeFileSync(OUT, `${L.join('\n')}\n`);
