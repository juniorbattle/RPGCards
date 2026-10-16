/** M03 — bulle du rival : libellé d’humeur accordé + réplique, issus de l’Expression PUBLIQUE uniquement. */
import { describe, expect, it } from 'vitest';
import type { Expression } from '../src/presentation/expression';
import { PERSONALITIES } from '../src/presentation/personalities';
import { moodLabel, rivalLine } from '../src/presentation/rivalLines';

const ex = (mood: Expression['mood'], cause = 'vous observe'): Expression => ({ mood, intensity: 0.6, gaze: 'player', gesture: null, hold: 1, cause });

describe('Bulle du rival', () => {
  it('accorde le libellé d’humeur au genre de la personnalité', () => {
    const [kai, maelle] = PERSONALITIES;
    expect(moodLabel(ex('relieved'), kai!)).toBe('Soulagé');
    expect(moodLabel(ex('relieved'), maelle!)).toBe('Soulagée');
    expect(moodLabel(ex('surprised'), maelle!)).toBe('Surprise');
  });

  it('réplique déterministe : même expression publique + même graine → même réplique', () => {
    for (const p of PERSONALITIES) {
      for (const mood of ['neutral', 'focused', 'pained', 'triumphant'] as const) {
        expect(rivalLine(ex(mood), p, 7)).toBe(rivalLine(ex(mood), p, 7));
        expect(rivalLine(ex(mood), p, 7).length).toBeGreaterThan(1);
      }
    }
  });

  it('répliques dédiées aux faits publics clés (absorption, égalité, prolongation)', () => {
    const maelle = PERSONALITIES[1]!;
    expect(rivalLine(ex('relieved', 'perd au Rang mais absorbe tout'), maelle, 1)).toBe('Ma Garde absorbe tout.');
    expect(rivalLine(ex('shocked', 'impacts simultanés'), maelle, 1)).toMatch(/tous les deux/i);
    expect(rivalLine(ex('shocked', 'double K.-O.'), maelle, 1)).toMatch(/Prolongation/);
  });

  it('aucune réplique ne prétend lire une intention cachée (pas de tells)', () => {
    const forbidden = /je sais ce que|je lis dans vos|votre main contient|vous allez jouer|vous avez engagé en/i;
    for (const p of PERSONALITIES) {
      for (const mood of ['neutral', 'focused', 'confident', 'smug', 'pleased', 'triumphant', 'surprised', 'pained', 'annoyed', 'angry', 'relieved', 'defeated', 'thinking', 'shocked'] as const) {
        for (let seed = 0; seed < 6; seed++) expect(rivalLine(ex(mood, `cause-${seed}`), p, seed)).not.toMatch(forbidden);
      }
    }
  });
});
