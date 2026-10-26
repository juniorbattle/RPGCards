/**
 * M11-B — la progression des PNJ (`docs/m11/03_PROGRESSION_DES_PNJ.md`, ADR 039) : la trajectoire de chaque PNJ récurrent
 * chapitre par chapitre (au tempérament près), le chapitre I au profil `novice` de l'annexe, un cran de plus après deux
 * défaites, les figures et Kaï au profil de l'annexe, le profil du duel préparé.
 */
import { describe, expect, it } from 'vitest';
import type { Family } from '../src/game/catalog/cards';
import { PROFILES } from '../src/game/ai/policy';
import { appliquer, chapitreDetaille, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { figureDe, ROLES } from '../src/aventure/modele';
import { PROFIL_ROLE } from '../src/aventure/paliers';
import { duelFacultatif, duelFigure, duelRival } from '../src/aventure/rencontres';
import { CRAN, PROFIL_TEMPERAMENT, profilTemperament, TEMPERAMENTS, TEMPERAMENTS_AU_JEU_FIGURES, temperamentDe, temperamentParole, TRAJECTOIRES } from '../src/aventure/temperaments';
import { GUETTEURS } from '../src/aventure/vue';

const AT = '2026-10-26T08:00:00.000Z';
const F0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const run = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => appliquer(x, ev, AT).etat, e);
const conquerir = (f: Family): Evenement[] => ROLES.flatMap((r): Evenement[] => [{ type: 'lancerDefi', figure: figureDe(f, r).id }, { type: 'duelStructurant', figure: figureDe(f, r).id, issue: 'victoire', duel: r }]);
function chapitres(): AventureEtat[] {
  const i = run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: F0 }, { type: 'confirmer', famille: 'Voile' }]);
  const ii = run(i, conquerir('Voile'));
  const iii = run(ii, [{ type: 'engager', famille: 'Cendre' }, ...conquerir('Cendre')]);
  const iv = run(iii, [{ type: 'engager', famille: 'Ronce' }, ...conquerir('Ronce')]);
  const v = run(iv, [{ type: 'engager', famille: 'Astre' }, ...conquerir('Astre')]);
  return [i, ii, iii, iv, v];
}

const ATTENDU: Record<string, string> = {
  'rue-docker': 'franc franc agressif agressif vicieux',
  'rue-joueuse': 'franc passif calculateur calculateur calculateur',
  'rue-commis': 'franc passif ruse vicieux vicieux',
  'rue-cour': 'franc agressif agressif vicieux vicieux',
  'rue-port': 'franc franc franc agressif agressif',
  'rue-haute': 'franc calculateur calculateur calculateur vicieux',
  'membre-Cendre': 'franc agressif agressif agressif vicieux',
  'membre-Ronce': 'franc passif franc calculateur calculateur',
  'membre-Voile': 'franc ruse ruse vicieux vicieux',
  'membre-Astre': 'franc calculateur calculateur calculateur calculateur',
};

describe('M11-B — trajectoires des PNJ récurrents (contrat 3, §3)', () => {
  const ch = chapitres();
  it('les états de test couvrent les chapitres I à V', () => {
    expect(ch.map(chapitreDetaille)).toEqual(['I', 'II', 'III', 'IV', 'V']);
  });
  it('chaque guetteur a une trajectoire, au tempérament près, chapitre par chapitre', () => {
    expect(Object.keys(TRAJECTOIRES).sort()).toEqual([...GUETTEURS].sort());
    for (const [id, t] of Object.entries(ATTENDU)) expect(ch.map((e) => temperamentDe(id, e)).join(' '), id).toBe(t);
  });
  it('au chapitre I, toute la rue joue le profil `novice` de l’annexe de calibrage', () => {
    for (const id of GUETTEURS) {
      expect(profilTemperament(id, ch[0]!)).toBe(PROFIL_ROLE.rue);
      expect(duelFacultatif(id, ch[0]!, 1).personnalite.aiProfile).toBe('novice');
    }
  });
  it('un passif peut devenir agressif ou vicieux ; le profil du duel préparé suit le tempérament', () => {
    expect(temperamentDe('rue-commis', ch[1]!)).toBe('passif');
    expect(temperamentDe('rue-commis', ch[3]!)).toBe('vicieux');
    expect(duelFacultatif('rue-commis', ch[3]!, 1).personnalite.aiProfile).toBe('vicieux');
    expect(duelFacultatif('rue-docker', ch[2]!, 1).personnalite.aiProfile).toBe('agressif');
    expect(duelFacultatif('membre-Astre', ch[1]!, 1).personnalite.aiProfile).toBe('tacticien');
  });
  it('deux défaites contre le joueur : un cran de plus ; ses victoires ne changent rien', () => {
    const h = (issue: 'victoire' | 'defaite', k: number) => Array.from({ length: k }, () => ({ rencontre: 'rue-docker', issue }));
    expect(temperamentDe('rue-docker', ch[0]!, h('victoire', 1))).toBe('franc');
    expect(temperamentDe('rue-docker', ch[0]!, h('victoire', 2))).toBe('agressif');
    expect(temperamentDe('rue-docker', ch[2]!, h('victoire', 3))).toBe('vicieux');
    expect(temperamentDe('rue-docker', ch[0]!, h('defaite', 5))).toBe('franc');
    expect(duelFacultatif('rue-docker', ch[0]!, 1, h('victoire', 2)).personnalite.aiProfile).toBe('agressif');
    expect(CRAN.calculateur).toBe('calculateur');
  });
  it('chaque tempérament a un profil d’IA qui existe ; les nouveaux sont de niveau 2, les anciens sans niveau', () => {
    for (const t of TEMPERAMENTS) expect(PROFILES[PROFIL_TEMPERAMENT[t]], t).toBeDefined();
    for (const k of ['tacticien', 'agressif', 'vicieux']) expect(PROFILES[k]!.niveau).toBe(2);
    for (const k of ['equilibre', 'offensif', 'prudent', 'lecteur', 'novice', 'timide']) expect(PROFILES[k]!.niveau).toBeUndefined();
  });
});

describe('M11-B — figures et rival : profil de l’annexe, tempérament dans la parole (contrat 3, §4)', () => {
  const ch = chapitres();
  it('les figures gardent le profil de leur rôle à tout chapitre ; Kaï garde « offensif »', () => {
    expect(TEMPERAMENTS_AU_JEU_FIGURES).toBe(false);
    for (const e of ch) {
      expect(duelFigure('cadet-Cendre', e, 1, true).personnalite.aiProfile).toBe('novice');
      expect(duelFigure('chef-Ronce', e, 1, true).personnalite.aiProfile).toBe('lecteur');
      expect(duelRival('K3', e, 1).personnalite.aiProfile).toBe('offensif');
    }
  });
  it('le tempérament de parole de Kaï évolue : franc, agressif, agressif, calculateur, vicieux', () => {
    expect(ch.map((e) => temperamentParole('kai', e)).join(' ')).toBe('franc agressif agressif calculateur vicieux');
    expect(temperamentParole('cadet-Ronce', ch[3]!)).toBe('agressif');
  });
});
