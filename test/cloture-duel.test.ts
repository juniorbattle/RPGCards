/**
 * Lot de correction de clôture (passe 226) — duel et apprentissage : textes des leçons accordés au tour assisté ;
 * révision (avenant 08) au tour assisté ; deux cases pleines (REMPLACE, la case choisie avant d'engager) ; aperçu tactique
 * sur deux lignes (D3, information visible seulement) ; leçons D1 ; propositions D4 au Duel standard ; mouvement réduit
 * propre, désactivé par défaut (§6 bis).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readParams, type AppParams } from '../src/app/params';
import { Controller } from '../src/app/controller';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { fixture } from '../src/game/fixtures/fixture';
import { Match } from '../src/game/match';
import type { GameConfig, PlayerCommand } from '../src/game/model/types';
import { viewFor } from '../src/game/visibility/view';
import { LECON_IDS, LECONS, type LeconId } from '../src/lecons/catalogue';
import { conseilsEteints } from '../src/lecons/progression';
import { DEFAULT_OPTIONS } from '../src/product/save';
import { npcPersonality } from '../src/presentation/personalities';
import { duelTip, TIP_IDS } from '../src/shell/tips';

beforeAll(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window ??= { setTimeout, clearTimeout, addEventListener: () => {}, location: { search: '' } };
  g.document ??= { querySelector: () => null, querySelectorAll: () => [] };
  g.location ??= { search: '' };
});

const perso = () => ({ ...npcPersonality('pnj-commis-48')!, aiProfile: 'novice' as const, techniques: [] });
const params = (tour: 'assiste' | 'classique'): AppParams => ({ ...readParams('?qa=1&aiDelay=0&pace=instant'), tour });
function controleurLecon(id: LeconId, tour: 'assiste' | 'classique' = 'assiste'): Controller {
  const l = LECONS[id];
  const cfg = l.config();
  return new Controller(cfg, params(tour), null, { id: `lecon-${id}`, title: l.titre, description: l.resume, config: cfg, build: l.build, rival: l.partenaire }, perso());
}
const cfgBase = (): GameConfig => ({ seed: 2260, players: { p1: { ...DEFAULT_CONFIG.players.p1, variants: 'none', techniques: [] }, p2: { ...DEFAULT_CONFIG.players.p2, variants: 'none', techniques: [] } } });

describe('les phrases du maître de table, accordées au tour assisté', () => {
  it('aucun « Valider », « verrouille » ni « valide » dans les dix-neuf leçons (consignes, explications, résumés)', () => {
    const textes = LECON_IDS.flatMap((id) => {
      const l = LECONS[id];
      return [l.resume, ...l.tours.flatMap((t) => [...(t.dire ?? []), ...(t.apres ?? []), ...(t.gestes ?? []).flatMap((g) => [...g.dire])])];
    });
    for (const x of textes) expect(x, x).not.toMatch(/valider|verrouille|\bvalide\b/i);
    // T1 (retours du 2026-11-13) : aucune phrase n'annonce d'engagement ni d'envoi automatique
    for (const x of textes) expect(x, x).not.toMatch(/engage le tour|elle engage|engage aussi|envoie (le tour|les choix|tes choix)/i);
  });
});

describe('révision au tour assisté (avenant 08, amendement 1)', () => {
  it('le brouillon reprend l’engagement verrouillé ; une autre carte ou l’autre mode le modifie ; « Engager la révision » envoie le nouvel engagement', () => {
    const c = controleurLecon('revision');
    const cmd = (x: PlayerCommand) => c.apply(x);
    // le joueur engage d'abord (le partenaire attend), puis le partenaire engage sa Signature : la révision s'ouvre
    const s0 = c.match.state;
    const n4 = s0.players.p1.hand.find((x) => s0.cards[x]!.defId === 'neutre-4')!;
    cmd({ type: 'commit', player: 'p1', primaryId: n4, stance: 'assault', secondaryId: null, replaceSlot: null });
    expect(c.view.phase).toBe('REVISION');
    expect(c.view.reveal.signatures.opp).toBe('sig-Cendre');
    expect(c.ui.draft.primaryId).toBe(n4);
    expect(c.revisionModifiee()).toBe(false);
    c.setStance('guard');
    expect(c.revisionModifiee()).toBe(true);
    c.setStance('assault');
    expect(c.revisionModifiee()).toBe(false);
    const n1 = c.match.state.players.p1.hand.find((x) => c.match.state.cards[x]!.defId === 'neutre-1')!;
    c.clickHandCard(n1);
    c.placeSelected('guard');
    expect(c.revisionModifiee()).toBe(true);
    c.lockCommit();
    const rev = c.match.commands.find((x) => x.type === 'revise') as Extract<PlayerCommand, { type: 'revise' }>;
    expect(rev.commit?.primaryId).toBe(n1);
    expect(rev.commit?.stance).toBe('guard');
    c.dispose();
  });
});

describe('deux cases pleines : REMPLACE, la case choisie avant d’engager', () => {
  it('« Poser cachée » sur deux cases pleines n’engage rien : le joueur désigne la case ; la case 2 choisie, « Engager » l’envoie', () => {
    for (const tour of ['assiste', 'classique'] as const) {
      const cfg = cfgBase();
      const scenario = { id: 'remplace', title: 'remplace', description: '', config: cfg, build: (k: GameConfig) => fixture(k, { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Cendre-2' }, { def: 'Voile-3', active: true }] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-2', 'Cendre-1'] }), rival: {} };
      const c = new Controller(cfg, params(tour), null, scenario, perso());
      const s = c.match.state;
      const id = (def: string) => s.players.p1.hand.find((x) => s.cards[x]!.defId === def)!;
      c.clickHandCard(id('Cendre-4-basic'));
      c.placeSelected('assault');
      c.clickHandCard(id('Voile-1-basic'));
      c.placeSelected('secondary');
      expect(c.ui.choixCase, tour).toBe(true);
      expect(c.ui.draft.secondaryId).toBeNull();
      expect(c.match.commands.some((x) => x.type === 'commit' && x.player === 'p1')).toBe(false);
      const voile = id('Voile-1-basic');
      c.clickZone('slot1');
      // T1 (retours du 2026-11-13) : aux deux tours, la case choisie reste au brouillon ; « Engager » (« Valider ») l'envoie
      expect(c.ui.draft.secondaryId, tour).toBe(voile);
      expect(c.ui.draft.slot, tour).toBe(1);
      expect(c.match.commands.some((x) => x.type === 'commit' && x.player === 'p1'), tour).toBe(false);
      c.lockCommit();
      const commit = c.match.commands.find((x) => x.type === 'commit' && x.player === 'p1') as Extract<PlayerCommand, { type: 'commit' }>;
      expect(commit.replaceSlot, tour).toBe(1);
      c.dispose();
    }
  });
});

describe('aperçu tactique sur deux lignes (D3)', () => {
  const tactique = (oppSlots: Parameters<typeof fixture>[2]['slots'], masque = false) => {
    const cfg: GameConfig = { ...cfgBase(), players: { ...cfgBase().players, p2: { ...cfgBase().players.p2, variants: masque ? ['Voile-3'] : 'none' } } };
    const scenario = { id: 'apercu', title: 'apercu', description: '', config: cfg, build: (k: GameConfig) => fixture(k, { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-1'], slots: [{ def: 'Cendre-2', active: true }, null] }, { hand: ['Cendre-3', 'Astre-1', 'Voile-2', 'Ronce-2'], slots: oppSlots }, { phase: masque ? 'PREPARE' : 'COMMIT' }),
      rival: { '5:PREPARE': () => ({ type: 'prepare' as const, player: 'p2' as const, reveal: [0, 1] as Array<0 | 1> }), '5:COMMIT': (s: ReturnType<typeof fixture>) => ({ type: 'commit' as const, player: 'p2' as const, primaryId: s.players.p2.hand.find((x) => s.cards[x]!.defId === 'Cendre-3-basic')!, stance: 'assault' as const, secondaryId: null, replaceSlot: null }) } };
    const c = new Controller(cfg, params('assiste'), null, scenario, perso());
    const s = c.match.state;
    if (masque) c.apply({ type: 'prepare', player: 'p1', reveal: [] });
    const cendre4 = c.match.state.players.p1.hand.find((x) => s.cards[x]!.defId === 'Cendre-4-basic')!;
    c.apply({ type: 'commit', player: 'p1', primaryId: cendre4, stance: 'assault', secondaryId: null, replaceSlot: null });
    return c;
  };
  it('le rival a une Secondaire active visible : « si le rival conserve » et « s’il amplifie » diffèrent, le pire cas visible', () => {
    const c = tactique([{ def: 'Ronce-4', active: true }, null]);
    expect(c.view.phase).toBe('TACTICS');
    // Cendre IV (4) contre Cendre III (3) : conserve → je gagne ; s'il amplifie avec sa Ronce IV (+4) → 7 contre 4 au Rang
    expect(c.apercuMode(0, 'keep')).toMatch(/^tu gagnes 4 contre 3/);
    expect(c.apercuAmplifie(0, 'keep')).toMatch(/^tu perds 4 contre 7/);
    expect(c.apercuAmplifie(0, 'rank')).toMatch(/contre 7/);
    c.dispose();
  });
  it('aucune Secondaire adverse active : une seule ligne ; masquée : signalée, jamais estimée', () => {
    const sans = tactique([null, null]);
    expect(sans.apercuAmplifie(0, 'rank')).toBeNull();
    sans.dispose();
    const m = tactique([{ def: 'Voile-3-dissimulation' }, { def: 'Ronce-4' }], true);
    expect(m.view.phase).toBe('TACTICS');
    expect(m.view.opp.slots[1]?.masked).toBe(true);
    expect(m.apercuAmplifie(0, 'keep')).toMatch(/masquée/);
    expect(m.apercuAmplifie(0, 'keep')).not.toMatch(/7/);
    m.dispose();
  });
});

describe('leçons D1 et propositions D4', () => {
  it('« Repousser et remplacer » rejoint les bases, « Réviser face à une Signature » les éléments ; la leçon du début du tour commence par la défausse', () => {
    expect(LECONS.repousser.groupe).toBe('base');
    expect(LECONS.revision.groupe).toBe('element');
    const g = LECONS.insight.tours[0]!.gestes![0]!;
    expect(g.phase).toBe('START');
    const s = LECONS.insight.build(LECONS.insight.config());
    expect(s.players.p1.hand).toHaveLength(5);
    expect((g.attendu(s) as Extract<PlayerCommand, { type: 'start' }>).discard).toHaveLength(1);
  });

  it('au Duel standard, un élément nouveau propose sa leçon une fois (« el-… ») ; refusée ou faite, plus jamais ; jamais sans le Duel standard', () => {
    const l = LECONS.revision;
    const m = new Match(l.config());
    m.state = l.build(l.config());
    m.events = [];
    const s = m.state;
    const n4 = s.players.p1.hand.find((x) => s.cards[x]!.defId === 'neutre-4')!;
    m.submit({ type: 'commit', player: 'p1', primaryId: n4, stance: 'assault', secondaryId: null, replaceSlot: null });
    m.submit(l.partenaire['1:COMMIT']!(m.state)!);
    m.submit({ type: 'revise', player: 'p1', commit: null });
    expect(m.state.phase).toBe('RESOLVED');
    const faux = (assiste: boolean) => ({ view: viewFor(m.state, 'p1'), match: { events: m.events }, assiste }) as never;
    for (const assiste of [true, false]) {
      const t = duelTip(faux(assiste), [], true);
      // le rival a engagé sa Signature : « Ce qui vient de se passer » d'abord, puis la révision
      expect(t?.id).toBe('adv-signature');
      const t2 = duelTip(faux(assiste), ['adv-signature'], true);
      expect(t2).toMatchObject({ id: 'el-revision', lecon: 'revision', nouveau: true });
      expect(duelTip(faux(assiste), ['adv-signature', 'el-revision'], true)?.id ?? null).not.toBe('el-revision');
      expect(duelTip(faux(assiste), ['adv-signature'], false)?.id ?? null).not.toBe('el-revision');
      expect(duelTip(faux(assiste), ['adv-signature', ...conseilsEteints(['revision'])], true)?.id ?? null).not.toBe('el-revision');
    }
    for (const id of ['el-revision', 'el-repousser', 'el-signature', 'el-tech-Sondage', 'el-regard', 'el-effet']) expect(TIP_IDS).toContain(id);
  });
});

describe('mouvement réduit du Duel standard (§6 bis)', () => {
  it('désactivé par défaut, jamais déduit du système ; l’adresse l’emporte', () => {
    const g = globalThis as unknown as { window: Record<string, unknown> };
    const avant = g.window.matchMedia;
    g.window.matchMedia = () => ({ matches: true });
    try {
      expect(readParams('').reducedMotion).toBe(false);
      expect(readParams('?reducedMotion=1').reducedMotion).toBe(true);
      expect(DEFAULT_OPTIONS.reducedMotion).toBe(false);
    } finally { g.window.matchMedia = avant; }
  });
});
