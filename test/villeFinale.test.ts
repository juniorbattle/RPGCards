/**
 * Finalisation de la ville (M09, passe 136 ; décision du responsable : « vie facultative » des quartiers ajoutés, aucune
 * figure déplacée) : dans l'aventure, la Place du Fanal et la Ville haute ont un duel de rue, une rumeur, une place pour
 * le membre de la Ronce (Port) et celui de l'Astre (Ville haute), et une place de l'ombre de Kaï ; jamais plus de deux
 * rencontres facultatives à la fois ; aucun personnage structurant ni aucune compétition n'y est posé ; rien n'y existe
 * dans la ville d'aujourd'hui (secours).
 */
import { describe, expect, it } from 'vitest';
import type { Family } from '../src/game/catalog/cards';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { battre, conclure, decider, MAX_FACULTATIVES, nouveauDirecteur, poses, RENCONTRES } from '../src/aventure/directeur';
import { ilotAventure, ilotNu } from '../src/aventure/ilots';
import { figureDe, ROLES } from '../src/aventure/modele';
import { duelFacultatif } from '../src/aventure/rencontres';
import { QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';
import { blocked } from '../src/ville/monde';

const AT = '2026-10-25T20:00:00.000Z';
const FAITS0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const run = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => appliquer(x, ev, AT).etat, e);
const prologue = (): AventureEtat => run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: FAITS0 }]);
const conquerir = (f: Family): Evenement[] => ROLES.flatMap((r) => [{ type: 'lancerDefi', figure: figureDe(f, r).id }, { type: 'duelStructurant', figure: figureDe(f, r).id, issue: 'victoire', duel: `${f}-${r}` }] as Evenement[]);

/** Chapitres I à V : la Ronce rejointe, puis chaque autre famille vaincue (l'Astre en dernier). */
function trame(): AventureEtat[] {
  const i = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }]);
  const ii = run(i, conquerir('Ronce'));
  const iii = run(ii, [{ type: 'engager', famille: 'Cendre' }, ...conquerir('Cendre')]);
  const iv = run(iii, [{ type: 'engager', famille: 'Voile' }, ...conquerir('Voile')]);
  const v = run(iv, [{ type: 'engager', famille: 'Astre' }, ...conquerir('Astre')]);
  return [i, ii, iii, iv, v];
}

const OUVERTS = new Set<IlotId>(QUARTIERS_AJOUTES);
const ATTENDUES: Record<'port' | 'haute', readonly string[]> = {
  port: ['membre-Ronce', 'rival-kai', 'rue-port', 'rumeur-port'],
  haute: ['membre-Astre', 'rival-kai', 'rue-haute', 'rumeur-haute'],
};

describe('finalisation de la ville : la vie de la Place du Fanal et de la Ville haute dans l’aventure', () => {
  it('chaque rencontre y a une place praticable, dans la ville en rangs seulement, à plus de 1,4 m des autres', () => {
    for (const il of ['port', 'haute'] as const) {
      const pts = RENCONTRES.flatMap((r) => r.lieux.filter((l) => l.ilot === il).map((l) => ({ id: r.id, ...l })));
      expect(pts.map((p) => p.id).sort()).toEqual([...ATTENDUES[il]]);
      for (const p of pts) {
        expect(p.rangs, p.id).toBe(true);
        expect(blocked(ilotNu(il, true, OUVERTS), p.at, 0.32), `${p.id} @ ${il}`).toBe(false);
        for (const q of pts) if (q.id < p.id) expect(Math.hypot(p.at.x - q.at.x, p.at.z - q.at.z), `${p.id} / ${q.id}`).toBeGreaterThan(1.4);
      }
    }
  });

  it('le directeur y tire ses rencontres aux points de décision, jamais plus de deux à la fois ; aucune figure n’y est posée', () => {
    const vues: Record<string, Set<string>> = { port: new Set(), haute: new Set() };
    for (const [n, e] of trame().entries()) {
      let d = nouveauDirecteur(30 + n);
      for (let k = 0; k < 40; k++) {
        for (const il of ['port', 'haute'] as const) {
          const r = decider(d, e, il, true);
          d = r.directeur;
          expect((d.actives[il] ?? []).length).toBeLessThanOrEqual(MAX_FACULTATIVES);
          // aucune figure structurante ni aucune compétition n'est déplacée vers les quartiers ajoutés
          expect(r.poses.filter((p) => p.genre === 'structurante' || p.genre === 'competition'), il).toEqual([]);
          for (const p of r.poses) vues[il]!.add(p.id);
          // une fois sur deux, le joueur accepte (le personnage repart), sinon il refuse (il repart au point suivant)
          for (const a of [...(d.actives[il] ?? [])]) d = conclure(d, a.id, k % 2 === 0);
        }
        d = battre(d);
      }
    }
    expect([...vues.port!].sort()).toEqual([...ATTENDUES.port]);
    expect([...vues.haute!].sort()).toEqual([...ATTENDUES.haute]);
  });

  it('dans la ville d’aujourd’hui (secours), rien n’est tiré ni posé dans les quartiers ajoutés', () => {
    const e = trame()[4]!;
    let d = nouveauDirecteur(7);
    for (let k = 0; k < 20; k++) {
      for (const il of ['port', 'haute'] as const) {
        const r = decider(d, e, il, false);
        d = r.directeur;
        expect(r.poses, il).toEqual([]);
        expect(poses(d, e, il, false)).toEqual([]);
      }
      d = battre(d);
    }
  });

  it('les duels de rue des quartiers ajoutés sont sans enjeu, dans la rue ; leurs personnages s’abordent dans l’îlot', () => {
    const e = trame()[1]!;
    for (const id of ['rue-port', 'rue-haute']) {
      const p = duelFacultatif(id, e, 5);
      expect(p.enjeu).toBeNull();
      expect(p.venue).toBe('rue');
    }
    let d = nouveauDirecteur(3);
    for (let k = 0; k < 30 && !(d.actives.port ?? []).length; k++) d = battre(decider(d, e, 'port', true).directeur);
    const ps = poses(d, e, 'port', true);
    expect(ps.length).toBeGreaterThan(0);
    const def = ilotAventure('port', ps, true, OUVERTS);
    for (const p of ps) {
      expect(def.ilot.zones.some((z) => z.kind === 'parler' && z.target === p.id)).toBe(true);
      expect(def.ilot.spawns[`npc-${p.id}`]).toBeDefined();
    }
  });
});
