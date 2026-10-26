/**
 * M11-A — les rencontres « en vue » (`docs/m11/01_RENCONTRES_EN_VUE.md`, ADR 037) : le cône, la ligne de vue coupée par
 * les obstacles et les personnages, le front montant, les guetteurs qui peuvent forcer (après l'affiliation, repos après
 * un duel), le point d'approche, le point où surgit le rival ; sur les îlots réels de la ville en rangs.
 */
import { describe, expect, it } from 'vitest';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { battre, conclure, decider, nouveauDirecteur, noterVu, type Pose } from '../src/aventure/directeur';
import { ilotAventure } from '../src/aventure/ilots';
import { dansLeCone, detecter, estGuetteur, guetteursActifs, ligneDegagee, peutForcer, pointApproche, pointSurgissement, voit, VUE } from '../src/aventure/vue';
import { figureDe, ROLES } from '../src/aventure/modele';
import { blocked, type Ilot } from '../src/ville/monde';
import type { IlotId } from '../src/ville/ilots';

const AT = '2026-10-26T08:00:00.000Z';
const F0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const run = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => appliquer(x, ev, AT).etat, e);
const prologue = () => run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: F0 }]);
const affilie = () => run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }, { type: 'scene', id: 'P8' }]);
const chefs = (e: AventureEtat) => run(e, ROLES.flatMap((r): Evenement[] => [{ type: 'lancerDefi', figure: figureDe('Ronce', r).id }, { type: 'duelStructurant', figure: figureDe('Ronce', r).id, issue: 'victoire', duel: r }]));

const vide: Ilot = { id: 't', name: 't', bounds: { x0: -20, z0: -20, x1: 20, z1: 20 }, rects: [{ x0: 1, z0: 2, x1: 2, z1: 3 }], discs: [{ x: -2, z: 2, r: 0.32 }], zones: [], spawns: { arrivee: { x: 0, z: 0 } } };
const pose = (id: string, x: number, z: number, facing: Pose['facing']): Pose => ({ id, apparence: id, nom: id, at: { x, z }, facing, repere: '!', genre: 'facultative' });

describe('M11-A — le champ de vision (contrat 1, §2)', () => {
  it('cône : portée 4,5 m, demi-angle 32°, dans la direction du regard', () => {
    const o = { x: 0, z: 0 };
    expect(dansLeCone(o, 'face', { x: 0, z: 4.4 })).toBe(true);
    expect(dansLeCone(o, 'face', { x: 0, z: 4.6 })).toBe(false);
    expect(dansLeCone(o, 'face', { x: 0, z: -2 })).toBe(false);
    expect(dansLeCone(o, 'face', { x: 1.8, z: 3 })).toBe(true); // 31°
    expect(dansLeCone(o, 'face', { x: 1.9, z: 3 })).toBe(false); // 32,3°
    expect(dansLeCone(o, 'face', { x: 2.2, z: 3 })).toBe(false); // 36°
    expect(dansLeCone(o, 'droite', { x: 3, z: 0.5 })).toBe(true);
    expect(dansLeCone(o, 'gauche', { x: 3, z: 0.5 })).toBe(false);
    expect(dansLeCone(o, 'dos', { x: 0.3, z: -3 })).toBe(true);
  });
  it('la ligne de vue est coupée par un obstacle et par un autre personnage, pas par le guetteur lui-même', () => {
    expect(ligneDegagee(vide, { x: 1.5, z: 0 }, { x: 1.5, z: 4 })).toBe(false); // rectangle entre les deux
    expect(ligneDegagee(vide, { x: -2, z: 0 }, { x: -2, z: 4 })).toBe(false); // disque d'un personnage
    expect(ligneDegagee(vide, { x: -2, z: 2 }, { x: -2, z: 5 })).toBe(true); // le guetteur est ce disque
    expect(voit(vide, { at: { x: 1.5, z: 0 }, facing: 'face' }, { x: 1.5, z: 4 })).toBe(false);
    expect(voit(vide, { at: { x: 4, z: 0 }, facing: 'face' }, { x: 4, z: 4 })).toBe(true);
  });
  it('front montant : apparaître dans le champ ne déclenche rien ; sortir puis entrer déclenche', () => {
    const g = [pose('rue-docker', 4, 0, 'face')];
    const dedans = new Set(g.map((x) => x.id));
    expect(detecter(vide, g, { x: 4, z: 3 }, dedans).repere).toBeNull();
    const hors = detecter(vide, g, { x: 8, z: 3 }, dedans);
    expect(hors.dedans.size).toBe(0);
    expect(detecter(vide, g, { x: 4, z: 3 }, hors.dedans).repere?.id).toBe('rue-docker');
  });
  it('le plus proche des guetteurs qui viennent de voir le joueur le repère', () => {
    const g = [pose('rue-docker', 4, 0, 'face'), pose('rue-commis', 4, 6, 'dos')];
    expect(detecter(vide, g, { x: 4, z: 4 }, new Set()).repere?.id).toBe('rue-commis');
  });
});

describe('M11-A — qui force un duel (contrat 1, §1, §3, §5)', () => {
  it('seuls les duels de rue et les membres des familles guettent', () => {
    for (const id of ['rue-docker', 'rue-joueuse', 'rue-commis', 'rue-cour', 'rue-port', 'rue-haute', 'membre-Cendre', 'membre-Astre']) expect(estGuetteur(id)).toBe(true);
    for (const id of ['rival-kai', 'cadet-Ronce', 'chef-Voile', 'epreuve-Cendre', 'joute-Ronce', 'heraut', 'rumeur-quai', 'kai-prologue']) expect(estGuetteur(id)).toBe(false);
  });
  it('rien avant l’affiliation ; puis oui ; un refusé sur le départ ne force pas', () => {
    const d = nouveauDirecteur(7);
    expect(peutForcer(d, prologue(), 'rue-docker')).toBe(false);
    expect(peutForcer(d, affilie(), 'rue-docker')).toBe(true);
    expect(peutForcer(conclure(d, 'rue-docker', false), affilie(), 'rue-docker')).toBe(false);
  });
  it('repos : battu par le joueur, il attend le chapitre suivant ; vainqueur, deux battements', () => {
    const e = affilie();
    let d = noterVu(battre(nouveauDirecteur(7)), 'rue-docker', 'victoire', 'I');
    expect(peutForcer(d, e, 'rue-docker')).toBe(false);
    for (let i = 0; i < 6; i++) d = battre(d);
    expect(peutForcer(d, e, 'rue-docker')).toBe(false);
    expect(peutForcer(d, chefs(e), 'rue-docker')).toBe(true); // chapitre II
    let d2 = noterVu(battre(nouveauDirecteur(7)), 'rue-joueuse', 'defaite', 'I');
    expect(peutForcer(d2, e, 'rue-joueuse')).toBe(false);
    d2 = battre(d2);
    expect(peutForcer(d2, e, 'rue-joueuse')).toBe(false);
    d2 = battre(d2);
    expect(peutForcer(d2, e, 'rue-joueuse')).toBe(true);
    expect(VUE.reposDefaite).toBe(2);
  });
  it('les guetteurs actifs d’un îlot réel sont des facultatives posées par le directeur (le directeur pose, la vue déclenche)', () => {
    let d = nouveauDirecteur(11);
    const e = affilie();
    const vus = new Set<string>();
    for (let i = 0; i < 12; i++) {
      for (const il of ['quai', 'parvis', 'ruelles', 'cour'] as IlotId[]) {
        const r = decider(d, e, il, true, { rivalFixe: true });
        d = r.directeur;
        for (const g of guetteursActifs(d, e, r.poses)) { vus.add(g.id); expect(g.genre).toBe('facultative'); }
        expect(r.poses.some((p) => p.id === 'rival-kai')).toBe(false);
      }
      d = battre(d);
    }
    expect(vus.size).toBeGreaterThan(2);
  });
});

describe('M11-A — approche et surgissement (contrat 1, §4 ; contrat 2, §3)', () => {
  it('le guetteur s’arrête à 0,95 m du joueur sur un point praticable, sur la ligne', () => {
    const p = pointApproche(vide, { x: 4, z: 0 }, { x: 4, z: 4 });
    expect(Math.hypot(p.x - 4, p.z - 4)).toBeCloseTo(VUE.approche, 2);
    expect(blocked(vide, p, 0.28)).toBe(false);
  });
  it('sur les îlots réels de la ville en rangs : chaque guetteur posé qui voit un point y arrive par un chemin praticable', () => {
    const e = affilie();
    let d = nouveauDirecteur(23);
    let essais = 0;
    for (let i = 0; i < 10; i++) {
      for (const il of ['quai', 'parvis', 'ruelles', 'cour'] as IlotId[]) {
        const r = decider(d, e, il, true, { rivalFixe: true });
        d = r.directeur;
        const ilot = ilotAventure(il, r.poses, true).ilot;
        for (const g of guetteursActifs(d, e, r.poses)) {
          const u = { face: [0, 1], dos: [0, -1], gauche: [-1, 0], droite: [1, 0] }[g.facing];
          const cible = { x: g.at.x + u[0]! * 3, z: g.at.z + u[1]! * 3 };
          if (blocked(ilot, cible) || !voit(ilot, g, cible)) continue;
          const p = pointApproche(ilot, g.at, cible);
          expect(Math.hypot(p.x - cible.x, p.z - cible.z)).toBeLessThan(1.2);
          essais++;
        }
      }
      d = battre(d);
    }
    expect(essais).toBeGreaterThan(0);
  });
  it('Kaï surgit à 3,5 m sur un point praticable d’où il voit le joueur', () => {
    const p = pointSurgissement(vide, { x: 0, z: 0 })!;
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(3.5, 5);
    expect(blocked(vide, p, 0.35)).toBe(false);
    expect(ligneDegagee(vide, p, { x: 0, z: 0 }, [p])).toBe(true);
  });
});
