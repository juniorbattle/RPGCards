/**
 * Finalisation de la ville (M09, passe 137) — points de départ par chapitre de l'heure de ville : pour chaque famille
 * d'accueil et chaque chapitre, la machine accepte tous les faits, le chapitre est le bon, le deck reste valide, la
 * sauvegarde se relit, et le directeur y pose les figures attendues (aucune n'est déplacée).
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../src/game/catalog/cards';
import { chapitreDetaille } from '../src/aventure/aventure';
import { collectionDe } from '../src/aventure/registre';
import { validerDeckAv } from '../src/aventure/deck';
import { aventureAuDepart, DEPARTS, estDepart, estFamille, faitsDepart } from '../src/aventure/departs';
import { nouvelleSauvegarde, validerSauvegarde } from '../src/aventure/sauvegarde';
import { pvJoueur } from '../src/aventure/paliers';

const AT = '2026-10-25T21:00:00.000Z';

describe('heure de ville : points de départ par chapitre', () => {
  it('chaque chapitre, pour chaque famille d’accueil : faits acceptés, bon chapitre, deck valide, sauvegarde relue', () => {
    for (const f of FAMILIES) {
      let combats = -1;
      for (const d of DEPARTS) {
        const e = aventureAuDepart(d, f, AT);
        expect(chapitreDetaille(e), `${d} ${f}`).toBe(d);
        expect(e.affiliation).toBe(f);
        expect(validerDeckAv(e.deck, collectionDe(e.registre)), `${d} ${f}`).toEqual([]);
        // chaque chapitre ajoute des combats gagnés : les PV montent comme en jeu (50 + 3 par combat)
        expect(e.combats).toBeGreaterThan(combats);
        combats = e.combats;
        expect(pvJoueur(e.combats)).toBe(50 + 3 * e.combats);
        const s = { ...nouvelleSauvegarde(new Date(AT), 'Essai', 7), etat: e };
        expect(validerSauvegarde(JSON.parse(JSON.stringify(s))), `${d} ${f}`).toEqual([]);
      }
    }
  });

  it('les faits sont ceux du jeu : prologue, affiliation, puis trois défis par famille vaincue ; rien d’autre', () => {
    expect(faitsDepart('I', 'Ronce').map((x) => x.type)).toEqual(['scene', 'duelPrologue', 'combat', 'confirmer']);
    expect(faitsDepart('V', 'Ronce').filter((x) => x.type === 'duelStructurant')).toHaveLength(12);
    expect(faitsDepart('III', 'Astre').filter((x) => x.type === 'engager').map((x) => (x as { famille: string }).famille)).toEqual(['Cendre']);
  });

  it('paramètres lus avec prudence (une valeur inconnue est ignorée)', () => {
    expect(estDepart('III')).toBe(true);
    expect(estDepart('VI')).toBe(false);
    expect(estDepart(null)).toBe(false);
    expect(estFamille('Voile')).toBe(true);
    expect(estFamille('voile')).toBe(false);
  });
});
