/**
 * Retours du test du 2026-11-13 (`docs/RETOURS_TEST_2026-11-13.md`), décisions T1 et T2, sur un vrai contrôleur :
 * T1 — un bouton dès qu'il y a plusieurs choix : l'engagement ne part jamais seul (dans les deux ordres de pose), le
 * brouillon complet reste modifiable jusqu'à « Engager » ; les choix tactiques attendent « Valider » (un menu répondu se
 * rouvre) ; la défausse du début du tour se conclut par « Défausser » ; les questions oui/non avancent à la réponse.
 * T2 — toutes les Techniques passent par « Utiliser / Non » : un clic sur une carte au début du tour ne dépense jamais
 * d'Insight ; la carte du Recentrage se choisit après « Utiliser » ; « Annuler » ramène la question sans rien dépenser.
 * Le tour classique garde ses boutons (Recentrage armé par sa pastille, « Valider » du début du tour).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readParams, type AppParams } from '../src/app/params';
import { Controller } from '../src/app/controller';
import { SCENARIOS } from '../src/app/scenarios';
import type { PlayerCommand } from '../src/game/model/types';
import { npcPersonality } from '../src/presentation/personalities';

beforeAll(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window ??= { setTimeout, clearTimeout, addEventListener: () => {}, location: { search: '' } };
  g.document ??= { querySelector: () => null, querySelectorAll: () => [] };
  g.location ??= { search: '' };
});

const perso = () => ({ ...npcPersonality('pnj-commis-48')!, aiProfile: 'novice' as const, techniques: [] });
function controleur(tour: 'assiste' | 'classique' = 'assiste'): Controller {
  const params: AppParams = { ...readParams('?qa=1&aiDelay=0&pace=instant'), tour };
  const sc = SCENARIOS['tour-t1']!;
  return new Controller(sc.config, params, null, sc, perso());
}
const main = (c: Controller, def: string) => { const s = c.match.state; return s.players.p1.hand.find((x) => s.cards[x]!.defId === def)!; };
const envoyees = (c: Controller) => c.match.commands.filter((x) => x.type !== 'nextTurn' && x.player === 'p1') as PlayerCommand[];
const derniere = <T extends PlayerCommand['type']>(c: Controller, type: T) => envoyees(c).filter((x) => x.type === type).pop() as Extract<PlayerCommand, { type: T }> | undefined;

/** Le début du tour du scénario : défausser Cendre I, ne pas recentrer. */
function debutSansTechnique(c: Controller): void {
  c.clickHandCard(main(c, 'Cendre-1-basic'));
  c.validerDefausse();
  c.repondreTech('Recentrage', false);
  expect(c.view.phase).toBe('COMMIT');
}

describe('T2 — un clic sur une carte au début du tour ne dépense jamais d’Insight', () => {
  it('la défausse attend « Défausser » ; la question du Recentrage suit ; un clic sur une carte n’y répond pas', () => {
    const c = controleur();
    expect(c.view.phase).toBe('START');
    expect(c.view.me.insight).toBe(1);
    expect(c.defausseEnCours()).toBe(true);
    expect(c.questionTech()).toBeNull();
    // un clic marque la carte à défausser, rien ne part, rien n'est dépensé
    c.clickHandCard(main(c, 'Cendre-1-basic'));
    expect(c.ui.trim.length).toBe(1);
    expect(envoyees(c)).toEqual([]);
    expect(c.view.me.insight).toBe(1);
    // modifiable : un second clic rend la carte, un autre en choisit une autre
    c.clickHandCard(main(c, 'Cendre-1-basic'));
    expect(c.ui.trim).toEqual([]);
    const astre = main(c, 'Astre-1-basic');
    c.clickHandCard(astre);
    c.validerDefausse();
    expect(c.defausseEnCours()).toBe(false);
    expect(c.questionTech()).toBe('Recentrage');
    // un clic sur une carte pendant la question du Recentrage : la défausse rouvre, rien n'est dépensé
    c.clickHandCard(main(c, 'Voile-2-basic'));
    expect(envoyees(c)).toEqual([]);
    expect(c.view.me.insight).toBe(1);
    expect(c.ui.recentrageArmed).toBe(false);
    expect(c.defausseEnCours()).toBe(true);
    c.clickHandCard(main(c, 'Voile-2-basic'));
    c.validerDefausse();
    // « Utiliser » arme le Recentrage (rien n'est dépensé tant que la carte n'est pas choisie) ; « Annuler » ramène la question
    c.repondreTech('Recentrage', true);
    expect(c.ui.recentrageArmed).toBe(true);
    expect(envoyees(c)).toEqual([]);
    c.annulerTech('Recentrage');
    expect(c.ui.recentrageArmed).toBe(false);
    expect(c.questionTech()).toBe('Recentrage');
    expect(c.view.me.insight).toBe(1);
    // « Utiliser », puis la carte : le Début part, avec la défausse et le Recentrage
    c.repondreTech('Recentrage', true);
    const ronce = main(c, 'Ronce-2-basic');
    c.clickHandCard(ronce);
    const start = derniere(c, 'start')!;
    expect(start.discard).toEqual([astre]);
    expect(start.technique).toEqual({ id: 'Recentrage', cardId: ronce });
    expect(c.view.me.insight).toBe(0);
    c.dispose();
  });
  it('« Non » au Recentrage : le Début part avec la seule défausse', () => {
    const c = controleur();
    debutSansTechnique(c);
    const start = derniere(c, 'start')!;
    expect(start.technique).toBeNull();
    expect(start.discard.length).toBe(1);
    expect(c.view.me.insight).toBe(1);
    c.dispose();
  });
  it('au tour classique, la pastille arme le Recentrage, la carte le choisit, « Valider » envoie le Début', () => {
    const c = controleur('classique');
    c.clickHandCard(main(c, 'Cendre-1-basic'));
    c.toggleStartTech('Recentrage');
    expect(c.ui.recentrageArmed).toBe(true);
    const ronce = main(c, 'Ronce-2-basic');
    c.clickHandCard(ronce);
    expect(c.ui.startTech).toEqual({ id: 'Recentrage', cardId: ronce });
    expect(envoyees(c)).toEqual([]);
    c.lockStart();
    expect(derniere(c, 'start')?.technique).toEqual({ id: 'Recentrage', cardId: ronce });
    c.dispose();
  });
});

describe('T1 — l’engagement ne part jamais seul ; le brouillon reste modifiable jusqu’à « Engager »', () => {
  it('Primaire, posture, puis Secondaire : rien ne part ; « Engager » envoie le brouillon', () => {
    const c = controleur();
    debutSansTechnique(c);
    c.clickHandCard(main(c, 'Cendre-4-basic'));
    c.placeSelected('assault');
    expect(c.engagementPret()).toBe(true);
    const voile = main(c, 'Voile-2-basic');
    c.clickHandCard(voile);
    c.placeSelected('secondary');
    expect(c.ui.draft.secondaryId).toBe(voile);
    expect(derniere(c, 'commit')).toBeUndefined();
    expect(c.view.phase).toBe('COMMIT');
    c.lockCommit();
    const k = derniere(c, 'commit')!;
    expect([k.stance, k.secondaryId, k.slot]).toEqual(['assault', voile, 1]);
    c.dispose();
  });
  it('Secondaire d’abord, puis Primaire et posture : rien ne part ; le brouillon complet se modifie (mode, Secondaire reprise, autre Primaire)', () => {
    const c = controleur();
    debutSansTechnique(c);
    const voile = main(c, 'Voile-2-basic');
    const cendre = main(c, 'Cendre-4-basic');
    const astre = main(c, 'Astre-1-basic');
    c.clickHandCard(voile);
    c.placeSelected('secondary');
    c.clickHandCard(cendre);
    c.placeSelected('guard');
    expect(c.engagementPret()).toBe(true);
    expect(derniere(c, 'commit')).toBeUndefined();
    // l'autre mode
    c.setStance('assault');
    expect(c.ui.draft.stance).toBe('assault');
    // la Secondaire reprise en main (clic sur sa case), puis une autre posée
    c.clickZone('slot1');
    expect(c.ui.draft.secondaryId).toBeNull();
    c.clickHandCard(astre);
    c.placeSelected('secondary');
    // une autre Primaire (la carte posée remplace l'ancienne, qui revient en main)
    c.clickHandCard(voile);
    c.placeSelected('guard');
    expect(c.ui.draft.primaryId).toBe(voile);
    expect(derniere(c, 'commit')).toBeUndefined();
    c.lockCommit();
    const k = derniere(c, 'commit')!;
    expect([k.primaryId, k.stance, k.secondaryId]).toEqual([voile, 'guard', astre]);
    c.dispose();
  });
  it('sans Secondaire possible (Signature, main vide) comme avec : toujours « Engager »', () => {
    const c = controleur();
    debutSansTechnique(c);
    c.clickHandCard(main(c, 'Cendre-4-basic'));
    c.placeSelected('assault');
    expect(c.view.phase).toBe('COMMIT');
    expect(c.peutAjouterSecondaire()).toBe(true);
    c.lockCommit();
    expect(derniere(c, 'commit')?.secondaryId).toBeNull();
    c.dispose();
  });
});

describe('T1 — les choix tactiques attendent « Valider »', () => {
  it('le menu répondu ne les envoie pas ; un menu se rouvre et se change ; « Valider » envoie le dernier choix', () => {
    const c = controleur();
    debutSansTechnique(c);
    c.clickHandCard(main(c, 'Cendre-4-basic'));
    c.placeSelected('assault');
    c.lockCommit();
    expect(c.view.phase).toBe('TACTICS');
    expect(c.ui.menuSlot).toBe(0);
    expect(c.tactiquesPretes()).toBe(false);
    c.choosePlan(0, 'rank');
    expect(c.ui.menuSlot).toBeNull();
    expect(derniere(c, 'tactics')).toBeUndefined();
    expect(c.tactiquesPretes()).toBe(true);
    // rouvrir le menu (clic sur la Secondaire), choisir autre chose
    c.clickMySlot(0);
    expect(c.ui.menuSlot).toBe(0);
    expect(c.tactiquesPretes()).toBe(false);
    c.choosePlan(0, 'damage');
    expect(derniere(c, 'tactics')).toBeUndefined();
    c.validerTactiques();
    expect(derniere(c, 'tactics')?.plans[0]).toEqual({ mode: 'damage' });
    c.dispose();
  });
  it('Échap sur le menu ouvert d’office : « Conserver », puis « Valider »', () => {
    const c = controleur();
    debutSansTechnique(c);
    c.clickHandCard(main(c, 'Cendre-4-basic'));
    c.placeSelected('guard');
    c.lockCommit();
    c.cancel();
    expect(derniere(c, 'tactics')).toBeUndefined();
    expect(c.tactiquesPretes()).toBe(true);
    c.validerTactiques();
    const t = derniere(c, 'tactics')!;
    expect(t.plans[0] === null || t.plans[0]?.mode === 'keep').toBe(true);
    c.dispose();
  });
});
