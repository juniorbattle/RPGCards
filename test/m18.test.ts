/**
 * M18 — le tour fluide (contrat `docs/m18/01_TOUR_FLUIDE.md`) : réglage du tour (P1), annonces d'étape (R1), aperçu des
 * modes tactiques (G2), et, sur un vrai contrôleur, les dix-sept leçons M17 jouées de bout en bout par les seuls gestes du
 * tour assisté (questions sur place, menus ouverts d'office, « Engager », « Valider », enchaînement) : chaque commande
 * envoyée est celle que le maître de table attend (règle B6). Le tour classique ne change pas.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { choisirTour, readParams, tourDeLAdresse, type AppParams } from '../src/app/params';
import { annonceDe, type SituationAnnonce } from '../src/presentation/annonce';
import { Controller, resumeApercu, type Preview } from '../src/app/controller';
import { decide, PROFILES } from '../src/game/ai/policy';
import type { GameState, PlayerCommand, SlotIndex } from '../src/game/model/types';
import { viewFor } from '../src/game/visibility/view';
import { ecartGeste, gesteDe, LECON_IDS, LECONS, leconFinie, tourDe, type LeconId } from '../src/lecons/catalogue';
import { npcPersonality } from '../src/presentation/personalities';

beforeAll(() => {
  // le contrôleur programme ses minuteries sur `window` et retire ses bulles du `document` : bouchons minimaux (Node)
  const g = globalThis as unknown as Record<string, unknown>;
  g.window ??= { setTimeout, clearTimeout, addEventListener: () => {}, location: { search: '' } };
  g.document ??= { querySelector: () => null, querySelectorAll: () => [] };
  g.location ??= { search: '' };
});

describe('M18 (P1) — le réglage du tour', () => {
  it('l’adresse l’emporte, puis le QA (classique), puis le réglage du joueur (assisté par défaut)', () => {
    expect(choisirTour('', () => 'assiste')).toBe('assiste');
    expect(choisirTour('', () => 'classique')).toBe('classique');
    expect(choisirTour('?tour=classique', () => 'assiste')).toBe('classique');
    expect(choisirTour('?qa=1', () => 'assiste')).toBe('classique');
    expect(choisirTour('?qa=1&tour=assiste', () => 'classique')).toBe('assiste');
    expect(tourDeLAdresse('?tour=n-importe')).toBeNull();
    expect(readParams('?qa=1').tour).toBe('classique');
  });
});

describe('M18 (R1) — les annonces d’étape', () => {
  const s = (over: Partial<SituationAnnonce>): SituationAnnonce => ({ seed: 1, turn: 3, phase: 'COMMIT', awaitingMe: true, repelMine: false, handCount: 4, activeSlots: 0, lectureSeen: null, ...over });
  it('une annonce par étape où le joueur a la main, avec le numéro du tour', () => {
    expect(annonceDe(s({}))).toEqual({ cle: '1:3:COMMIT', titre: 'Tour 3', texte: 'Engagement : choisis ta Primaire' });
    expect(annonceDe(s({ phase: 'TACTICS', activeSlots: 1 }))?.texte).toBe('Choisis l’action de ta Secondaire');
    expect(annonceDe(s({ phase: 'TACTICS', activeSlots: 2 }))?.texte).toBe('Choisis l’action de chaque Secondaire');
    expect(annonceDe(s({ phase: 'TACTICS', activeSlots: 0 }))?.texte).toBe('Rupture possible');
    expect(annonceDe(s({ phase: 'PREPARE' }))?.texte).toMatch(/révèle ou garde/);
    expect(annonceDe(s({ phase: 'START', handCount: 5 }))?.texte).toMatch(/défausse/);
    expect(annonceDe(s({ phase: 'LECTURE_CHANGE', lectureSeen: 'guard' }))?.texte).toBe('Lecture : le rival est en GARDE');
    expect(annonceDe(s({ phase: 'REPEL', awaitingMe: false, repelMine: true }))?.texte).toMatch(/Repoussement/);
  });
  it('rien quand le joueur n’a pas la main (le rival joue, la Résolution se présente)', () => {
    expect(annonceDe(s({ awaitingMe: false }))).toBeNull();
    expect(annonceDe(s({ phase: 'RESOLVED' }))).toBeNull();
    expect(annonceDe(s({ phase: 'REPEL', awaitingMe: false, repelMine: false }))).toBeNull();
  });
});

describe('M18 (G2) — ce qu’un mode change au Clash', () => {
  const p = (over: Partial<Preview>): Preview => ({ myScore: '6', oppScore: '4', myMult: 1, dealt: 5, taken: 0, outcome: 'Vous dominez au Rang', gagne: 'me', ...over });
  it('gagné, perdu, égalité, en quelques mots', () => {
    expect(resumeApercu(p({}))).toBe('tu gagnes 6 contre 4 : 5 dégâts');
    expect(resumeApercu(p({ dealt: 1 }))).toBe('tu gagnes 6 contre 4 : 1 dégât');
    expect(resumeApercu(p({ gagne: 'opp', myScore: '4', oppScore: '6', dealt: 0, taken: 3 }))).toBe('tu perds 4 contre 6 : −3 PV');
    expect(resumeApercu(p({ gagne: null, myScore: '4', oppScore: '4', outcome: 'Deux Gardes : aucune blessure' }))).toBe('deux gardes : aucune blessure (4 contre 4)');
  });
});

// ---------------------------------------------------------------------------
// Les leçons M17 jouées par les seuls gestes du tour assisté

function controleur(id: LeconId, tour: 'assiste' | 'classique'): Controller {
  const l = LECONS[id];
  const cfg = l.config();
  const params: AppParams = { ...readParams('?qa=1&aiDelay=0&pace=instant'), tour };
  const perso = { ...npcPersonality('pnj-commis-48')!, aiProfile: 'novice' as const, techniques: [] };
  return new Controller(cfg, params, null, { id: `lecon-${id}`, title: l.titre, description: l.resume, config: cfg, build: l.build, rival: l.partenaire }, perso);
}

/** Les gestes du tour assisté qui produisent la commande `cmd` (aucun bouton de panneau, aucun « Tour suivant »). */
function gestesAssistes(c: Controller, cmd: PlayerCommand): void {
  const fois = (n: number, f: () => boolean) => { for (let i = 0; i < n && f(); i++); };
  const nb = c.match.commands.length;
  const parti = () => c.match.commands.slice(nb).some((x) => x.type !== 'nextTurn' && x.player === 'p1');
  switch (cmd.type) {
    case 'start': {
      const insight = c.view.me.insight;
      for (const id of cmd.discard) c.clickHandCard(id);
      // T1 : la défausse (plusieurs cartes à choisir) se conclut par « Défausser » ; rien ne part avant
      if (cmd.discard.length) {
        expect(parti(), 'la défausse attend « Défausser »').toBe(false);
        expect(c.defausseEnCours()).toBe(true);
        c.validerDefausse();
      }
      fois(4, () => {
        const q = c.questionTech();
        if (!q || c.view.phase !== 'START') return false;
        const veut = cmd.technique?.id === q;
        // T2 : un clic sur une carte avant « Utiliser » ne dépense rien ; le Recentrage : « Utiliser », puis la carte
        if (veut && cmd.technique && 'cardId' in cmd.technique) {
          c.clickHandCard(cmd.technique.cardId);
          expect(parti() || c.view.me.insight !== insight, 'un clic sur une carte ne dépense jamais d’Insight').toBe(false);
          c.repondreTech(q, true);
          expect(c.ui.recentrageArmed).toBe(true);
          c.clickHandCard(cmd.technique.cardId);
        } else c.repondreTech(q, veut);
        return true;
      });
      return;
    }
    case 'prepare':
      fois(3, () => { const i = c.reservesEnAttente()[0]; if (i === undefined) return false; c.repondreReserve(i, cmd.reveal.includes(i)); return true; });
      return;
    case 'dissipate': return c.repondreTech('Dissipation', cmd.targetSlot !== null);
    case 'lecture': return c.repondreTech('Lecture', cmd.use);
    case 'lectureStance': return c.setStance(cmd.stance);
    case 'commit': {
      c.clickHandCard(cmd.primaryId);
      c.placeSelected(cmd.stance);
      if (cmd.secondaryId) {
        const slot = cmd.slot ?? cmd.replaceSlot ?? null;
        if (slot === null) { c.clickHandCard(cmd.secondaryId); c.placeSelected('secondary'); } else c.dropCard(cmd.secondaryId, slot === 0 ? 'slot0' : 'slot1');
      }
      // T1 : aucune pose n'engage ; « Engager » conclut toujours
      expect(parti(), 'l’engagement ne part jamais seul').toBe(false);
      expect(c.engagementPret()).toBe(true);
      c.lockCommit();
      return;
    }
    case 'revise': {
      if (!cmd.commit) return c.keepRevision();
      // fiche de clôture (D1) : réviser, c'est poser une autre Primaire (ou changer de mode), puis « Engager la révision »
      const k = cmd.commit;
      if (c.ui.draft.primaryId !== k.primaryId) { c.clickHandCard(k.primaryId); c.placeSelected(k.stance); } else if (c.ui.draft.stance !== k.stance) c.setStance(k.stance);
      expect(c.revisionModifiee(), 'le brouillon de la révision diffère de l’engagement verrouillé').toBe(true);
      return c.lockCommit();
    }
    case 'tactics': {
      // les menus s'ouvrent d'eux-mêmes, l'un après l'autre
      fois(3, () => {
        const i = c.ui.menuSlot;
        if (i === null) return false;
        const plan = cmd.plans[i];
        // une cible unique est prise d'office ; sinon, le clic sur la cible
        if (plan?.mode === 'interfere') { c.choosePlan(i, 'interfere'); if (c.ui.targetingFor === i) c.clickOppSlot(plan.target!); } else c.choosePlan(i, plan?.mode ?? 'keep');
        return true;
      });
      expect(c.menusEnAttente()).toEqual([]);
      const t = cmd.technique;
      const q = c.questionTech();
      if (t) {
        expect(q).toBe(t.id);
        c.repondreTech(t.id, true);
        if (c.ui.techTargeting === t.id) { if (t.id === 'Ancrage') c.clickMySlot(t.slot); else c.clickOppSlot(t.targetSlot); }
      } else if (q) c.repondreTech(q, false);
      // T1 : avec une Secondaire active, les choix attendent « Valider » ; sans, la réponse à la Technique les a envoyés
      if (c.view.me.slots.some((s) => s?.state === 'active')) {
        expect(parti(), 'les choix tactiques attendent « Valider »').toBe(false);
        expect(c.tactiquesPretes()).toBe(true);
        c.validerTactiques();
      }
      expect(c.view.phase === 'TACTICS' && c.view.awaitingMe, 'choix tactiques envoyés').toBe(false);
      return;
    }
    case 'repel': return cmd.targetSlot === null ? c.skipRepel() : c.clickOppSlot(cmd.targetSlot as SlotIndex);
    default: throw new Error(`commande inattendue : ${(cmd as PlayerCommand).type}`);
  }
}

describe('M18 (B6) — les dix-neuf leçons au tour assisté', () => {
  it.each(LECON_IDS)('%s : chaque geste attendu passe par les questions sur place, la leçon se termine', (id) => {
    const l = LECONS[id];
    const c = controleur(id, 'assiste');
    let guides = 0;
    for (let n = 0; n < 120 && !leconFinie(l, c.match.state); n++) {
      const v = c.view;
      // R2 : le tour suivant s'enchaîne seul (ce que fait la session après la pause)
      if (v.phase === 'RESOLVED') { c.nextTurn(); continue; }
      if (!v.awaitingMe && !(v.phase === 'REPEL' && v.repel?.mine)) throw new Error(`bloqué au tour ${v.turn}, ${v.phase}`);
      const avant: GameState = structuredClone(c.match.state);
      const g = gesteDe(l, v.turn, v.phase);
      const attendu: PlayerCommand = g ? g.attendu(avant) : decide(viewFor(avant, 'p1'), PROFILES.equilibre!, 7)!;
      const nb = c.match.commands.length;
      gestesAssistes(c, attendu);
      const envoyee = c.match.commands.slice(nb).find((x) => x.type !== 'nextTurn' && x.player === 'p1') as PlayerCommand | undefined;
      expect(envoyee, `tour ${v.turn} ${v.phase} : aucune commande`).toBeDefined();
      if (g) { expect(ecartGeste(avant, attendu, envoyee!), `tour ${v.turn} ${v.phase}`).toBeNull(); guides++; }
      else expect(tourDe(l, v.turn)?.libre ?? true).toBe(true);
    }
    expect(leconFinie(l, c.match.state)).toBe(true);
    expect(guides).toBeGreaterThan(0);
    c.dispose();
  });
});

describe('M18 — le tour classique ne change pas', () => {
  it('ni question sur place, ni menu ouvert d’office, ni Engager anticipé', () => {
    const c = controleur('tactique', 'classique');
    for (let n = 0; n < 40 && !(c.view.phase === 'TACTICS' && c.view.awaitingMe); n++) {
      const v = c.view;
      if (v.phase === 'RESOLVED') { c.nextTurn(); continue; }
      const g = gesteDe(LECONS.tactique, v.turn, v.phase);
      c.apply(g ? g.attendu(c.match.state) : decide(viewFor(c.match.state, 'p1'), PROFILES.equilibre!, 7)!);
    }
    expect(c.view.phase).toBe('TACTICS');
    expect(c.ui.menuSlot).toBeNull();
    expect(c.questionTech()).toBeNull();
    expect(c.menusEnAttente()).toEqual([]);
    c.dispose();
  });
  it('au tour assisté, le menu de la première Secondaire active s’ouvre de lui-même, avec l’effet de chaque mode', () => {
    const c = controleur('tactique', 'assiste');
    for (let n = 0; n < 40 && !(c.view.phase === 'TACTICS' && c.view.awaitingMe); n++) {
      const v = c.view;
      if (v.phase === 'RESOLVED') { c.nextTurn(); continue; }
      const g = gesteDe(LECONS.tactique, v.turn, v.phase);
      c.apply(g ? g.attendu(c.match.state) : decide(viewFor(c.match.state, 'p1'), PROFILES.equilibre!, 7)!);
    }
    const i = c.ui.menuSlot;
    expect(i).not.toBeNull();
    expect(c.apercuMode(i!, 'rank')).toMatch(/contre/);
    // Échap referme : « Conserver » ; le menu suivant s'ouvre (ou plus rien)
    c.cancel();
    expect(c.ui.menusFaits).toContain(i);
    c.dispose();
  });
});

describe('M18 (G2) — gagner sans blesser', () => {
  it('c’est la Garde qui tient', () => {
    const p: Preview = { myScore: '4', oppScore: '4', myMult: 1, dealt: 0, taken: 0, outcome: 'Votre Garde l’emporte', gagne: 'me' };
    expect(resumeApercu(p)).toBe('ta Garde tient 4 contre 4 : aucun dégât');
    expect(resumeApercu({ ...p, gagne: 'opp' })).toBe('sa Garde tient 4 contre 4 : aucun dégât');
  });
});
