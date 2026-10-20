// M10-D (mesure pour la fiche ; usage : npx tsx tools/m10d-changements.ts [duels par ligne] > sortie.json) : quatre affiliations successives avant le premier lieutenant (changements permis par
// AV-07) donnent les seize Basics d'un coup et font monter le niveau des adversaires à 4. Taux de victoire de la maison
// (cadet, bras droit, chef) : voie directe (une affiliation), un changement, et la voie « collection » (trois changements).
import { FAMILIES } from '../src/game/catalog/cards';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { siegeAventure } from '../src/aventure/deck';
import { adversaire, pvJoueur } from '../src/aventure/paliers';
import { personalityById } from '../src/presentation/personalities';
import { figureDe, ROLES } from '../src/aventure/modele';
import { collectionDe } from '../src/aventure/registre';

const N = Number(process.argv[2] ?? 150);
const AT = '2026-10-20T12:00:00.000Z';
const apply = (e: AventureEtat, evs: Evenement[]) => evs.reduce((x, ev) => { const r = appliquer(x, ev, AT); if (r.refus) throw new Error(r.refus); return r.etat; }, e);
const res: Record<string, Record<string, string>> = {};
// « -propose » : le niveau compté sur les seules familles rejointes ou engagées (option proposée au responsable : ici 1
// pendant toute la maison), au lieu de toutes les familles dont le joueur a les Basics (règle validée, K3).
for (const voie of ['directe', 'un-changement', 'collection', 'un-changement-propose', 'collection-propose'] as const) {
  for (const f of FAMILIES) {
    let e = apply(nouvelleAventure(AT), [{ type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 } }, { type: 'combat', issue: 'victoire' }]);
    const autres = FAMILIES.filter((x) => x !== f);
    e = voie === 'directe' ? apply(e, [{ type: 'confirmer', famille: f }]) : voie.startsWith('un-changement') ? apply(e, [{ type: 'confirmer', famille: autres[0]! }, { type: 'changer', famille: f }]) : apply(e, [{ type: 'confirmer', famille: autres[0]! }, { type: 'changer', famille: autres[1]! }, { type: 'changer', famille: autres[2]! }, { type: 'changer', famille: f }]);
    for (const r of ROLES) {
      const niveau = voie.endsWith('-propose') ? 1 : collectionDe(e.registre).basics.length;
      const adv = adversaire(r, f, niveau);
      const profil = adv.profil ?? personalityById(figureDe(f, 'brasDroit').apparence)!.aiProfile;
      let w = 0;
      for (let s = 1; s <= N; s++) {
        const m = autoplay({ seed: 1000 + 97 * s, players: { p1: siegeAventure(e.deck, 'p1', pvJoueur(e.combats)), p2: siegeAventure(adv.deck, 'p2', adv.pv) } }, 200, [PROFILES.equilibre!, PROFILES[profil]!]);
        if (m.state.winner === 'p1') w++;
      }
      (res[`${voie}`] ??= {})[`${f} ${r}`] = `niv ${niveau}, PV ${pvJoueur(e.combats)} contre ${adv.pv} : ${Math.round((100 * w) / N)} %`;
      const fig = figureDe(f, r);
      e = apply(e, [{ type: 'lancerDefi', figure: fig.id }, { type: 'duelStructurant', figure: fig.id, issue: 'victoire', duel: fig.id }, { type: 'combat', issue: 'victoire' }]);
    }
  }
}
console.log(JSON.stringify(res, null, 2));
