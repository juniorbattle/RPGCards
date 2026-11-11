/**
 * M17 — leçons du duel : chaque leçon se joue de bout en bout sur le vrai moteur, gestes attendus du joueur et
 * commandes du partenaire ; chaque Clash guidé donne l'issue que le maître de table explique ; un geste différent est
 * refusé avec une raison ; progression, profils et conseils éteints.
 */
import { describe, expect, it } from 'vitest';
import { decide, PROFILES } from '../src/game/ai/policy';
import { Match } from '../src/game/match';
import type { PlayerCommand } from '../src/game/model/types';
import { assertInvariants } from '../src/game/engine/invariants';
import { dernierTour, ecartGeste, gesteDe, LECON_IDS, LECONS, LECONS_BASE, leconFinie, tourDe, type LeconId } from '../src/lecons/catalogue';
import { conseilsEteints, leconsDuProfil, leconsDebloquees, lireLecons, marquerFaite, ecrireLecons, type EtatLecons } from '../src/lecons/progression';

interface Partie { match: Match; guidees: number; clashs: Map<number, ReturnType<Match['view']>['lastClash']> }

/** Joue une leçon : le joueur suit les gestes attendus (ou l'IA « équilibré » sur sa vue dans un tour libre). */
function jouer(id: LeconId): Partie {
  const l = LECONS[id];
  const cfg = l.config();
  const match = new Match(cfg);
  match.state = l.build(cfg);
  match.events = [];
  assertInvariants(match.state);
  let guidees = 0;
  const clashs = new Map<number, ReturnType<Match['view']>['lastClash']>();
  for (let n = 0; n < 80 && !leconFinie(l, match.state); n++) {
    const s = match.state;
    if (s.phase === 'RESOLVED') { clashs.set(s.turn, match.view('p1').lastClash); match.submit({ type: 'nextTurn' }); continue; }
    const v2 = match.view('p2');
    if (v2.awaitingMe) {
      const script = l.partenaire[`${s.turn}:${s.phase}`];
      const cmd = script ? script(s) : decide(v2, PROFILES.novice!, cfg.seed ^ 0xa7);
      if (cmd) { match.submit(cmd); continue; }
    }
    const v1 = match.view('p1');
    if (v1.awaitingMe) {
      const g = gesteDe(l, s.turn, s.phase);
      const tour = tourDe(l, s.turn);
      let cmd: PlayerCommand | null;
      if (g) { cmd = g.attendu(s); guidees++; }
      else if (!tour || tour.libre) cmd = decide(v1, PROFILES.equilibre!, 99);
      else throw new Error(`${id} : tour ${s.turn}, phase ${s.phase} attendue sans geste guidé`);
      if (cmd) { match.submit(cmd); continue; }
    }
    throw new Error(`${id} : aucun joueur attendu (tour ${s.turn}, ${s.phase})`);
  }
  if (match.state.phase === 'RESOLVED') clashs.set(match.state.turn, match.view('p1').lastClash);
  return { match, guidees, clashs };
}

describe('M17 — les leçons se jouent sur le vrai moteur', () => {
  it('six leçons de base et onze leçons des éléments', () => {
    // fiche de clôture (D1) : « Repousser et remplacer » (base) et « Réviser face à une Signature » (élément)
    expect(LECONS_BASE).toHaveLength(7);
    expect(LECON_IDS).toHaveLength(19);
    for (const id of LECON_IDS) expect(LECONS[id].id).toBe(id);
  });

  for (const id of LECON_IDS) {
    it(`« ${LECONS[id].titre} » : de bout en bout, issues expliquées`, () => {
      const l = LECONS[id];
      const p = jouer(id);
      expect(leconFinie(l, p.match.state)).toBe(true);
      expect(p.guidees).toBeGreaterThan(0);
      for (const t of l.tours) {
        if (!t.issue) continue;
        const r = p.clashs.get(t.tour);
        expect(r, `${id} : Clash du tour ${t.tour}`).toBeTruthy();
        expect(t.issue(r!), `${id} : issue du tour ${t.tour} (${JSON.stringify({ w: r!.winner, d: r!.damage, g: r!.guardWin, f: r!.fixedDamage, c: r!.cancelled })})`).toBe(true);
      }
      // une leçon de base finit par un tour libre (A2)
      if (l.groupe === 'base') expect(l.tours.some((t) => t.libre)).toBe(true);
      expect(dernierTour(l)).toBeGreaterThan(0);
    });
  }

  it('la prolongation passe bien par un double K.-O.', () => {
    const p = jouer('prolongation');
    expect(p.match.events.some((e) => e.kind === 'overtime')).toBe(true);
  });

  it('un geste différent est refusé avec sa raison ; le geste attendu passe', () => {
    const l = LECONS.clash;
    const cfg = l.config();
    const s = l.build(cfg);
    const g = gesteDe(l, 1, 'COMMIT')!;
    const ok = g.attendu(s);
    expect(ecartGeste(s, ok, ok)).toBeNull();
    const autre = { ...(ok as Extract<PlayerCommand, { type: 'commit' }>), stance: 'guard' as const };
    expect(ecartGeste(s, ok, autre)).toMatch(/ASSAUT/);
    const p1 = s.players.p1.hand.find((x) => s.cards[x]!.defId === 'neutre-1')!;
    expect(ecartGeste(s, ok, { ...(ok as Extract<PlayerCommand, { type: 'commit' }>), primaryId: p1 })).toMatch(/Neutre IV/);
  });
});

describe('M17 — progression, profils, conseils', () => {
  const memoire = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

  it('profils : découverte (six), habitué (trois), connaisseur (rien d’imposé)', () => {
    expect(leconsDuProfil('decouverte')).toEqual([...LECONS_BASE]);
    expect(leconsDuProfil('habitue')).toEqual(['clash', 'secondaires', 'tactique']);
    expect(leconsDuProfil('connaisseur')).toEqual([]);
  });

  it('stockage tolérant et leçons faites sans doublon', () => {
    const st = memoire();
    expect(lireLecons(st)).toEqual({ profil: null, faites: [], proposees: [], aRevoir: [], demande: false });
    let e: EtatLecons = marquerFaite(lireLecons(st), 'clash');
    e = marquerFaite(e, 'clash');
    ecrireLecons(st, e);
    expect(lireLecons(st).faites).toEqual(['clash']);
    st.setItem('lqv.lecons', '{pas du json');
    expect(lireLecons(st).faites).toEqual([]);
    expect(lireLecons(null).faites).toEqual([]);
  });

  it('une leçon faite éteint les conseils qu’elle couvre (B5)', () => {
    expect(conseilsEteints([])).toEqual([]);
    expect(conseilsEteints(['secondaires', 'effets'])).toEqual(expect.arrayContaining(['prepare', 'commit', 'reveler', 'arme', 'pastille', 'temps']));
  });

  it('leçons débloquées par ce que le joueur possède (B1)', () => {
    expect(leconsDebloquees({ familles: false, variantes: [], techniques: ['Sondage'], signature: false })).toEqual(['tech-Sondage']);
    const d = leconsDebloquees({ familles: true, variantes: ['Voile-1-eclaireur'], techniques: ['Sondage', 'Recentrage', 'Lecture'], signature: true });
    expect(d).toEqual(expect.arrayContaining(['familles', 'effets', 'regard', 'tech-Recentrage', 'tech-Lecture', 'signature']));
    expect(d).not.toContain('prolongation');
  });
});

describe('M17 (B3) — « Ce qui vient de se passer »', () => {
  it('l’Interférence réussie du rival, puis la prolongation, une fois chacune, avec leur leçon', async () => {
    const { duelTip } = await import('../src/shell/tips');
    const { viewFor } = await import('../src/game/visibility/view');
    const fauxControleur = (m: Match) => ({ view: viewFor(m.state, 'p1'), match: { events: m.events } }) as never;
    // leçon Ancrage : le partenaire Interfère avec succès au tour 3 ; on s'arrête au Clash résolu
    const l = LECONS['tech-Ancrage'];
    const cfg = l.config();
    const m = new Match(cfg);
    m.state = l.build(cfg);
    m.events = [];
    for (let n = 0; n < 20 && m.state.phase !== 'RESOLVED'; n++) {
      const s = m.state;
      const script = l.partenaire[`${s.turn}:${s.phase}`];
      const c2 = m.view('p2').awaitingMe && script ? script(s) : null;
      if (c2) { m.submit(c2); continue; }
      const g = gesteDe(l, s.turn, s.phase);
      if (m.view('p1').awaitingMe && g) m.submit(g.attendu(s));
    }
    const t = duelTip(fauxControleur(m), []);
    expect(t?.id).toBe('adv-interference');
    expect(t?.lecon).toBe('interferer');
    expect(duelTip(fauxControleur(m), ['adv-interference'])?.id).not.toBe('adv-interference');
    // prolongation
    const p = jouer('prolongation');
    const m2 = new Match(LECONS.prolongation.config());
    m2.state = structuredClone(p.match.state);
    m2.events = p.match.events.filter((e) => e.turn <= 5);
    m2.state.turn = 5;
    m2.state.phase = 'RESOLVED';
    expect(duelTip(fauxControleur(m2), [])?.id).toBe('adv-prolongation');
  });
});
