/**
 * Avenant 09 (M12) — récompenses de l'aventure par choix : `choixVariante` (quand une victoire laisse choisir A, B ou C),
 * `conclureDuel` avec la variante choisie (comme l'écran du choix), une variante déjà équipée qui reste en place.
 */
import { describe, expect, it } from 'vitest';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { choixVariante, conclureDuel, ouvrirDuel } from '../src/aventure/fin';
import { collectionDe, variantesIdentite } from '../src/aventure/registre';
import { duelEpreuve, duelFigure, duelJoute } from '../src/aventure/rencontres';
import { nouvelleSauvegarde } from '../src/aventure/sauvegarde';

const AT = '2026-10-27T12:00:00.000Z';
const FAITS0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const run = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => appliquer(x, ev, AT).etat, e);
const affilie = (f: 'Cendre' | 'Ronce'): AventureEtat =>
  run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: FAITS0 }, { type: 'confirmer', famille: f }]);

describe('avenant 09 — le choix de la variante à la victoire', () => {
  it('choixVariante : cadet pas encore battu, Épreuve à son dernier duel, Joute pas encore gagnée ; rien ensuite', () => {
    let e = affilie('Cendre');
    expect(choixVariante(e, 'cadet-Cendre')).toEqual(variantesIdentite('Cendre-3'));
    expect(choixVariante(e, 'chef-Cendre')).toBeNull(); // la Signature ne se choisit pas
    expect(choixVariante(e, 'rue-docker')).toBeNull();
    // Épreuve : seulement quand la victoire achève la série (troisième duel)
    expect(choixVariante(e, 'epreuve:Cendre')).toBeNull();
    e = run(e, [{ type: 'epreuve', famille: 'Cendre', issue: 'victoire', duel: 'e1' }, { type: 'epreuve', famille: 'Cendre', issue: 'victoire', duel: 'e2' }]);
    expect(choixVariante(e, 'epreuve:Cendre')).toEqual(variantesIdentite('Cendre-1'));
    e = run(e, [{ type: 'epreuve', famille: 'Cendre', issue: 'victoire', duel: 'e3', variante: 'Cendre-1-escarbille' }]);
    expect(collectionDe(e.registre).variantes).toEqual(['Cendre-1-escarbille']);
    e = run(e, [{ type: 'epreuve', famille: 'Cendre', issue: 'victoire', duel: 'e4' }, { type: 'epreuve', famille: 'Cendre', issue: 'victoire', duel: 'e5' }]);
    expect(choixVariante(e, 'epreuve:Cendre')).toBeNull(); // la série regagnée donne la suivante qui manque
    // Joute : jusqu'à sa première victoire
    expect(choixVariante(e, 'joute:Cendre')).toEqual(variantesIdentite('Cendre-2'));
  });

  it('conclureDuel avec la variante choisie : elle entre au registre et remplace la Basic ; la revanche donne la suivante sans toucher au deck', () => {
    const s = nouvelleSauvegarde(new Date(AT), 'Test', 3);
    s.etat = affilie('Ronce');
    const o = ouvrirDuel(s, duelFigure('cadet-Ronce', s.etat, 11, false), AT);
    expect(o.refus).toBeUndefined();
    const fin = conclureDuel(s, o.duel, [], 'victoire', 9, AT, 'Ronce-3-profondes');
    expect(fin.gains.map((g) => g.key)).toEqual(['variante:Ronce-3-profondes']);
    expect(s.etat.deck.cartes).toContain('Ronce-3-profondes');
    expect(s.etat.deck.cartes).not.toContain('Ronce-3-basic');
    // revanche : la première qui manque (A), le deck garde la variante choisie
    const o2 = ouvrirDuel(s, duelFigure('cadet-Ronce', s.etat, 12, false), AT);
    expect(conclureDuel(s, o2.duel, [], 'victoire', 9, AT, 'Ronce-3-mur').gains.map((g) => g.key)).toEqual(['variante:Ronce-3-entrave']);
    expect(s.etat.deck.cartes).toContain('Ronce-3-profondes');
    // un choix d'une autre identité est ignoré : la suivante qui manque
    const o3 = ouvrirDuel(s, duelFigure('cadet-Ronce', s.etat, 13, false), AT);
    expect(conclureDuel(s, o3.duel, [], 'victoire', 9, AT, 'Ronce-1-epine').gains.map((g) => g.key)).toEqual(['variante:Ronce-3-mur']);
    const o4 = ouvrirDuel(s, duelFigure('cadet-Ronce', s.etat, 14, false), AT);
    expect(conclureDuel(s, o4.duel, [], 'victoire', 9, AT).gains).toEqual([]);
  });

  it('Épreuve et Joute menées par conclureDuel : le choix passe jusqu’au registre', () => {
    const s = nouvelleSauvegarde(new Date(AT), 'Test', 4);
    s.etat = affilie('Cendre');
    for (const [i, v] of (['', '', 'Cendre-1-tison'] as const).entries()) {
      const o = ouvrirDuel(s, duelEpreuve('Cendre', i, s.etat, 20 + i, false), AT);
      conclureDuel(s, o.duel, [], 'victoire', 8, AT, v || undefined);
    }
    expect(collectionDe(s.etat.registre).variantes).toEqual(['Cendre-1-tison']);
    s.etat = run(s.etat, [{ type: 'lancerDefi', figure: 'cadet-Cendre' }, { type: 'duelStructurant', figure: 'cadet-Cendre', issue: 'victoire', duel: 'x1' }, { type: 'lancerDefi', figure: 'brasDroit-Cendre' }, { type: 'duelStructurant', figure: 'brasDroit-Cendre', issue: 'victoire', duel: 'x2' }]);
    const o = ouvrirDuel(s, duelJoute('Cendre', s.etat, 30, false), AT);
    expect(conclureDuel(s, o.duel, [], 'victoire', 8, AT, 'Cendre-2-bravade').gains.map((g) => g.key)).toEqual(['variante:Cendre-2-bravade']);
  });
});
