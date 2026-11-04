import { describe, expect, it } from 'vitest';
import { TONALS, transposition } from '../src/son/moteur';
import { classeDe } from '../src/son/musique/orchestre';

// Retour du test du responsable (2026-11-03) : « j'ai l'impression parfois d'entendre 2 musiques en même temps », en duel.
// Le lecteur ne joue jamais deux morceaux (sonde `tools/m14-musique-double.mjs`) ; mais les bruitages tonals, écrits en
// do et en sol, tombaient sur des thèmes dans d'autres tonalités : sous la musique, ils suivent l'accord qui sonne.
describe('les bruitages sous la musique', () => {
  it('la fondamentale d’un symbole d’accord', () => {
    expect(classeDe('Cmaj7')).toBe(0);
    expect(classeDe('E7')).toBe(4);
    expect(classeDe('Ebm7')).toBe(3);
    expect(classeDe('F#m7b5')).toBe(6);
    expect(classeDe('Bb13')).toBe(10);
    expect(classeDe('Cb')).toBe(11);
    expect(classeDe(null)).toBeNull();
    expect(classeDe('N.C.')).toBeNull();
  });
  it('do porté sur la fondamentale, au plus près (de -6 à +5 demi-tons)', () => {
    expect(transposition(null)).toBe(1);
    expect(transposition(0)).toBe(1);
    expect(transposition(4)).toBeCloseTo(2 ** (4 / 12), 10); // mi : quatre demi-tons plus haut
    expect(transposition(7)).toBeCloseTo(2 ** (-5 / 12), 10); // sol : cinq demi-tons plus bas
    expect(transposition(6)).toBeCloseTo(2 ** (-6 / 12), 10);
    for (let n = 0; n < 12; n++) { const k = transposition(n); expect(k).toBeGreaterThan(0.7); expect(k).toBeLessThan(1.34); }
  });
  it('seuls les bruitages qui ont une hauteur sont transposés (pas l’interface, les pas, le choc du Clash)', () => {
    for (const id of ['ui', 'ui-retour', 'pas', 'clash', 'carte-pose', 'voyage'] as const) expect(TONALS.has(id)).toBe(false);
    for (const id of ['revelation', 'garde', 'signature', 'sceau', 'regard', 'activation'] as const) expect(TONALS.has(id)).toBe(true);
  });
});
