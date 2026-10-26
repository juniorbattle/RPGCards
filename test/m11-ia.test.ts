/**
 * M11-D — l'IA de niveau 2 (`docs/m11/05_IA_DE_COMBAT.md`, ADR 041) : les nouveaux profils jouent des duels complets
 * sans commande refusée (Duel standard et decks d'aventure à cartes grises), de façon déterministe, sur leur seule vue ;
 * les profils historiques ne passent jamais par le niveau 2 ; la mémoire étendue ne lit que les événements visibles.
 */
import { describe, expect, it } from 'vitest';
import { decide, PROFILES } from '../src/game/ai/policy';
import { assaultPriorByRank, buildMemory } from '../src/game/ai/memory';
import { autoplay, Match } from '../src/game/match';
import { visibleEvents } from '../src/game/visibility/view';
import { siegeAventure } from '../src/aventure/deck';
import { adversaire, deckPopulace } from '../src/aventure/paliers';
import { config } from './helpers';

const N2 = ['tacticien', 'agressif', 'ruse', 'vicieux'] as const;
const VIEUX = ['equilibre', 'offensif', 'prudent', 'lecteur', 'novice', 'timide'] as const;

describe('M11-D — niveau 2 : des duels complets, déterministes', () => {
  it('Duel standard : chaque profil de niveau 2 contre chaque profil historique, l’adversaire verrouillant d’abord', () => {
    for (const a of N2) for (const b of VIEUX) for (const seed of [3, 17]) {
      const m = autoplay(config({ seed, sig1: 'Cendre', sig2: 'Voile', t1: ['Sondage', 'Recentrage'], t2: ['Lecture', 'Rupture'] }), 200, [PROFILES[a]!, PROFILES[b]!], ['p2', 'p1']);
      expect(m.state.phase, `${a}/${b}/${seed}`).toBe('ENDED');
    }
  }, 120000);
  it('aventure : contre un deck de cartes grises (neutres) et avec les Techniques de la rue', () => {
    for (const a of N2) for (const seed of [5, 9, 21]) {
      const adv = adversaire('rue', 'Ronce', 2, ['Sondage', 'Recentrage']);
      const cfg = { seed, players: { p1: siegeAventure(deckPopulace(['Sondage', 'Recentrage']), 'Joueur', 56), p2: siegeAventure(adv.deck, 'Rue', adv.pv) } };
      const m = autoplay(cfg, 200, [PROFILES.equilibre!, PROFILES[a]!], ['p2', 'p1']);
      expect(m.state.phase, `${a}/${seed}`).toBe('ENDED');
    }
  }, 60000);
  it('même graine, même duel (empreinte)', () => {
    const run = () => autoplay(config({ seed: 77 }), 200, [PROFILES.tacticien!, PROFILES.vicieux!]).hash();
    expect(run()).toBe(run());
  });
  it('les profils historiques n’ont pas de niveau (ancien chemin, tirage pour tirage)', () => {
    for (const k of VIEUX) expect(PROFILES[k]!.niveau).toBeUndefined();
    // une décision historique ne dépend pas des champs ajoutés à la mémoire
    const m = new Match(config({ seed: 12 }), {});
    const v = m.view('p2');
    const mem = buildMemory(visibleEvents(m.events, 'p2'), 'p2');
    expect(decide(v, PROFILES.offensif!, 9, mem)).toEqual(decide(v, PROFILES.offensif!, 9, { ...mem, oppStancesByRank: { 4: ['guard', 'guard'] }, oppNeutral: true }));
  });
  it('mémoire étendue : habitudes publiques selon le Rang, cartes grises vues', () => {
    const adv = adversaire('rue', 'Ronce', 1);
    const cfg = { seed: 4, players: { p1: siegeAventure(deckPopulace(), 'Joueur', 60), p2: siegeAventure(adv.deck, 'Rue', adv.pv) } };
    const m = autoplay(cfg, 200, [PROFILES.equilibre!, PROFILES.tacticien!], ['p2', 'p1']);
    const mem = buildMemory(visibleEvents(m.events, 'p2'), 'p2');
    expect(mem.oppNeutral).toBe(true);
    const n = Object.values(mem.oppStancesByRank).reduce((a, xs) => a + xs.length, 0);
    expect(n).toBe(mem.oppStances.length);
    const p = assaultPriorByRank(mem, 4);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});
