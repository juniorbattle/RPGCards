import { describe, expect, it } from 'vitest';
import { readParams } from '../src/app/params';
import { IdleWork } from '../src/scene/idleWork';
import { nextSeriesEncounter, upcomingRivals } from '../src/product/upcoming';
import { SERIES } from '../src/product/encounters';

// M08 C1 : les rivaux qu’un clic peut asseoir à la table sont préparés aux temps morts ; jamais pendant un duel.
describe('rivaux à venir (préparation aux temps morts)', () => {
  const ctx = { activeEncounter: null, playable: ['quai-2', 'libre-braise', 'libre-ronce', 'libre-voile'], lastEffect: null };

  it('tableau : toute rencontre jouable, une fois chacun, dans l’ordre du tableau', () => {
    expect(upcomingRivals('board', ctx)).toEqual(['ronce', 'braise', 'voile']);
  });

  it('un duel en cours : seul le rival à reprendre (accueil et tableau)', () => {
    const c = { ...ctx, activeEncounter: 'libre-voile' };
    expect(upcomingRivals('board', c)).toEqual(['voile']);
    expect(upcomingRivals('home', c)).toEqual(['voile']);
    expect(upcomingRivals('home', ctx)).toEqual([]);
  });

  it('résultat : la manche suivante de la série (la revanche garde le même rival)', () => {
    const won1 = { collection: null as never, progress: null as never, unlocked: [], series: { step: 1, completed: false } };
    expect(nextSeriesEncounter(won1)?.rival).toBe(SERIES.steps[1]);
    expect(upcomingRivals('result', { ...ctx, lastEffect: won1 })).toEqual([SERIES.steps[1]]);
    expect(upcomingRivals('result', { ...ctx, lastEffect: { ...won1, series: { step: 3, completed: true } } })).toEqual([]);
    expect(upcomingRivals('result', ctx)).toEqual([]);
  });

  it('préparation, deck, options… : rien de nouveau ne peut apparaître', () => {
    for (const s of ['prep', 'deck', 'collection', 'options', 'help', 'duel'] as const) expect(upcomingRivals(s, ctx)).toEqual([]);
  });

  it('mode de mesure `prep` réservé à la QA', () => {
    expect(readParams('').prep).toBe('full');
    expect(readParams('?prep=off').prep).toBe('full');
    expect(readParams('?qa=1&prep=off').prep).toBe('off');
    expect(readParams('?qa=1&prep=art').prep).toBe('art');
  });
});

describe('travail découpé aux temps morts', () => {
  function* job(log: string[], name: string, n: number): Generator<void, void, void> {
    try {
      for (let i = 0; i < n; i++) { log.push(`${name}${i}`); yield; }
      log.push(`${name}:fin`);
    } finally {
      log.push(`${name}:libéré`);
    }
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('s’exécute étape par étape aux temps morts, jusqu’au bout', async () => {
    const w = new IdleWork();
    const log: string[] = [];
    w.add('a', job(log, 'a', 3));
    expect(log).toEqual([]); // rien de synchrone
    for (let i = 0; i < 20 && w.has('a'); i++) await wait(20);
    expect(log).toEqual(['a0', 'a1', 'a2', 'a:fin', 'a:libéré']);
    expect(w.stats().steps).toBe(4);
  });

  it('suspendue (duel) : aucune étape ; reprise ensuite', async () => {
    const w = new IdleWork();
    const log: string[] = [];
    w.hold(true);
    w.add('a', job(log, 'a', 2));
    await wait(80);
    expect(log).toEqual([]);
    expect(w.stats()).toMatchObject({ steps: 0, pending: 1, held: true });
    w.hold(false);
    for (let i = 0; i < 20 && w.has('a'); i++) await wait(20);
    expect(log).toContain('a:fin');
  });

  it('achevée sur place quand son résultat est demandé ; annulée, elle libère ce qu’elle avait commencé', () => {
    const w = new IdleWork();
    const log: string[] = [];
    w.hold(true);
    w.add('a', job(log, 'a', 3));
    w.add('b', job(log, 'b', 3));
    w.finish('a');
    expect(log).toEqual(['a0', 'a1', 'a2', 'a:fin', 'a:libéré']);
    w.cancel('b');
    expect(log.at(-1)).toBe('a:libéré'); // `b` n’avait pas commencé : rien à libérer
    w.add('c', job(log, 'c', 3));
    w.finish('c');
    expect(w.has('c')).toBe(false);
    expect(w.stats()).toMatchObject({ finished: 2, pending: 0 });
  });

  it('remplacer une tâche de même clé annule l’ancienne', () => {
    const w = new IdleWork();
    const log: string[] = [];
    w.hold(true);
    const first = job(log, 'x', 3);
    first.next(); // déjà commencée
    w.add('k', first);
    w.add('k', job(log, 'y', 1));
    expect(log).toEqual(['x0', 'x:libéré']);
    expect(w.keys()).toEqual(['k']);
  });
});
