import { afterEach, describe, expect, it } from 'vitest';
import { readParams } from '../src/app/params';
import { figureStyle, setFigureStyle, usesV2 } from '../src/scene/figureStyle';
import { MOODS_V2, RIG_V2 } from '../src/scene/maelleV2';

// M07 L5 : le modèle « vectoriel V2 » reste derrière un interrupteur opt-in, et seulement pour Maëlle.
describe('interrupteur du modèle des personnages (L5)', () => {
  afterEach(() => setFigureStyle('v1'));

  it('V1 par défaut ; V2 seulement avec ?qa=1&figure=v2', () => {
    expect(readParams('').figure).toBe('v1');
    expect(readParams('?figure=v2').figure).toBe('v1');
    expect(readParams('?qa=1').figure).toBe('v1');
    expect(readParams('?qa=1&figure=v2').figure).toBe('v2');
    expect(figureStyle()).toBe('v1');
  });

  it('seule Maëlle (ronce) est dessinée en V2', () => {
    expect(usesV2('ronce')).toBe(false);
    setFigureStyle('v2');
    expect(usesV2('ronce')).toBe(true);
    for (const id of ['braise', 'voile', 'astre', 'player-Ronce']) expect(usesV2(id)).toBe(false);
  });
});

describe('humeurs et rig V2', () => {
  it('couvre les 14 humeurs avec des réglages bornés', () => {
    expect(Object.keys(MOODS_V2)).toHaveLength(14);
    for (const m of Object.values(MOODS_V2)) {
      expect(m.lid).toBeGreaterThanOrEqual(-0.35);
      expect(m.lid).toBeLessThanOrEqual(1);
      expect(m.squint).toBeGreaterThanOrEqual(0);
      expect(m.squint).toBeLessThanOrEqual(1);
    }
  });

  it('prudence plisse les yeux, surprise les ouvre, sourcils froncés têtes basses', () => {
    expect(MOODS_V2.focused.squint).toBeGreaterThan(0);
    expect(MOODS_V2.focused.lid).toBeGreaterThan(MOODS_V2.neutral.lid);
    expect(MOODS_V2.surprised.lid).toBeLessThan(0);
    expect(MOODS_V2.surprised.brow).toBe('arch');
    expect(MOODS_V2.angry.browAngle).toBeGreaterThan(0);
    expect(MOODS_V2.angry.brow).toBe('knit');
  });

  it('paupière : repos sans déplacement, fermeture vers le bas, ouverture large vers le haut', () => {
    expect(RIG_V2.lidShift(MOODS_V2.neutral.lid)).toBeCloseTo(0, 6);
    expect(RIG_V2.lidShift(1)).toBeGreaterThan(0);
    expect(RIG_V2.lidShift(-0.3)).toBeLessThan(0);
    expect(RIG_V2.squintShift(0)).toBe(0);
  });
});
