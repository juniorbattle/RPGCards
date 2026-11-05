import { describe, expect, it } from 'vitest';
import { directionDe, Repetition, voisin, zoneMorte, type Boite } from '../src/entree/manette';

const b = (x: number, y: number, w = 100, h = 40): Boite => ({ x, y, w, h });

describe('manette : stick', () => {
  it('zone morte radiale, remise à l’échelle', () => {
    expect(zoneMorte(0.1, 0.1)).toEqual({ x: 0, y: 0 });
    const plein = zoneMorte(1, 0);
    expect(plein.x).toBeCloseTo(1);
    const moitie = zoneMorte(0.61, 0);
    expect(moitie.x).toBeGreaterThan(0.4);
    expect(moitie.x).toBeLessThan(0.6);
    expect(Math.hypot(zoneMorte(0.9, 0.9).x, zoneMorte(0.9, 0.9).y)).toBeLessThanOrEqual(1.0001);
  });
  it('direction franche', () => {
    expect(directionDe(0.2, 0.1)).toBeNull();
    expect(directionDe(0.9, 0.2)).toBe('droite');
    expect(directionDe(-0.9, 0.2)).toBe('gauche');
    expect(directionDe(0.1, -0.8)).toBe('haut');
    expect(directionDe(0.1, 0.8)).toBe('bas');
  });
});

describe('manette : navigation spatiale', () => {
  // une rangée de trois boutons, et un bouton seul en dessous, à gauche
  const rangee = [b(0, 0), b(150, 0), b(300, 0), b(0, 100)];
  it('va au voisin aligné', () => {
    expect(voisin(rangee[0]!, rangee.slice(1), 'droite')).toBe(0);
    expect(voisin(rangee[1]!, [rangee[0]!, rangee[2]!, rangee[3]!], 'droite')).toBe(1);
    expect(voisin(rangee[2]!, rangee.slice(0, 2), 'gauche')).toBe(1);
  });
  it('rien au-delà du bord', () => {
    expect(voisin(rangee[2]!, [rangee[0]!, rangee[1]!, rangee[3]!], 'droite')).toBe(-1);
    expect(voisin(rangee[0]!, rangee.slice(1, 3), 'haut')).toBe(-1);
  });
  it('vers le bas, la case la plus alignée l’emporte sur une case plus proche mais décalée', () => {
    const o = b(300, 0);
    const proche = b(0, 60);
    const aligne = b(300, 120);
    expect(voisin(o, [proche, aligne], 'bas')).toBe(1);
  });
  it('un cône : à gauche d’un bouton de la barre du haut, pas la case loin en dessous', () => {
    const outil = b(864, 8, 82, 23);
    const caseBas = b(765, 453, 195, 115);
    expect(voisin(outil, [caseBas], 'gauche')).toBe(-1);
    expect(voisin(outil, [caseBas], 'bas')).toBe(0);
  });
  it('depuis la main, vers le haut : la case juste au-dessus', () => {
    const carte = b(400, 600, 80, 112);
    const cases = [b(100, 380, 90, 126), b(390, 380, 90, 126), b(700, 380, 90, 126)];
    expect(voisin(carte, cases, 'haut')).toBe(1);
  });
});

describe('manette : répétition', () => {
  it('un pas tout de suite, puis après le délai, puis à intervalles', () => {
    const r = new Repetition(380, 130);
    expect(r.suivre('bas', 0)).toBe('bas');
    expect(r.suivre('bas', 200)).toBeNull();
    expect(r.suivre('bas', 390)).toBe('bas');
    expect(r.suivre('bas', 450)).toBeNull();
    expect(r.suivre('bas', 525)).toBe('bas');
    expect(r.suivre(null, 600)).toBeNull();
    expect(r.suivre('haut', 610)).toBe('haut');
  });
});
