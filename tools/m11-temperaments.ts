// M11-B — mesures des tempéraments (`docs/m11/03_PROGRESSION_DES_PNJ.md`) : à chaque chapitre de la trame (points de
// départ `departs.ts` : deck et PV du joueur au début du chapitre), un duel de rue (deck et PV du palier `rue` au niveau
// du joueur, annexe de calibrage inchangée) contre chaque profil de tempérament ; le joueur est joué par l'IA
// « équilibré », l'adversaire verrouille en premier (comme le rival du jeu). Référence : le profil `novice` de l'annexe.
// Un ordre de grandeur (±4 points pour 300 duels), pas une mesure du plaisir de jeu.
// Usage : npx tsx tools/m11-temperaments.ts [duels par case] [sortie.md]
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { Family } from '../src/game/catalog/cards';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import { siegeAventure } from '../src/aventure/deck';
import { aventureAuDepart, DEPARTS } from '../src/aventure/departs';
import { adversaire, pvJoueur } from '../src/aventure/paliers';
import { niveauDe } from '../src/aventure/rencontres';
import { PROFIL_TEMPERAMENT, TEMPERAMENTS } from '../src/aventure/temperaments';

const N = Number(process.argv[2] ?? 200);
const OUT = process.argv[3];
const AT = '2026-10-26T12:00:00.000Z';
const FAMS: Family[] = ['Cendre', 'Voile', 'Ronce', 'Astre'];
const lignes: string[] = [];
const head = execSync('git rev-parse --short HEAD').toString().trim();
lignes.push(`# M11-B — duels de rue par tempérament (commit ${head}, ${N} duels par case et par famille d'accueil, 4 familles)`, '');
lignes.push(`| Chapitre | Niveau | PV joueur | PV rue | ${TEMPERAMENTS.map((t) => `${t} (${PROFIL_TEMPERAMENT[t]})`).join(' | ')} |`);
lignes.push(`|---|---:|---:|---:|${TEMPERAMENTS.map(() => '---:').join('|')}|`);
const t0 = Date.now();
for (const ch of DEPARTS) {
  const res: Record<string, { w: number; n: number; tours: number }> = {};
  let niv = 0; let pv = 0; let pvAdv = 0;
  for (const f of FAMS) {
    const e = aventureAuDepart(ch, f, AT);
    niv = niveauDe(e);
    pv = pvJoueur(e.combats);
    // un membre d'une autre famille que celle du joueur (la rue de son quartier)
    const adv = adversaire('rue', FAMS[(FAMS.indexOf(f) + 1) % 4]!, niv);
    pvAdv = adv.pv;
    for (const t of TEMPERAMENTS) {
      const r = (res[t] ??= { w: 0, n: 0, tours: 0 });
      for (let i = 0; i < N; i++) {
        const seed = (0x11b000 + i * 7919 + DEPARTS.indexOf(ch) * 131 + FAMS.indexOf(f) * 17) >>> 0;
        const cfg = { seed, players: { p1: siegeAventure(e.deck, 'Joueur', pv), p2: siegeAventure(adv.deck, 'Rue', adv.pv) } };
        const m = autoplay(cfg, 200, [PROFILES.equilibre!, PROFILES[PROFIL_TEMPERAMENT[t]]!], ['p2', 'p1']);
        r.n++;
        if (m.state.winner === 'p1') r.w++;
        r.tours += m.state.turn;
      }
    }
  }
  lignes.push(`| ${ch} | ${niv} | ${pv} | ${pvAdv} | ${TEMPERAMENTS.map((t) => { const r = res[t]!; return `${((100 * r.w) / r.n).toFixed(1)} % (${(r.tours / r.n).toFixed(1)} t.)`; }).join(' | ')} |`);
  console.log(lignes[lignes.length - 1]);
}
lignes.push('', `Victoires du joueur (IA « équilibré »), tours par duel entre parenthèses ; ${Math.round((Date.now() - t0) / 1000)} s.`);
if (OUT) writeFileSync(OUT, `${lignes.join('\n')}\n`);
