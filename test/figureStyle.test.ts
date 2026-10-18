import { afterEach, describe, expect, it } from 'vitest';
import { readParams } from '../src/app/params';
import { figureStyle, setFigureStyle, usesV2 } from '../src/scene/figureStyle';
import { moodsFor, MOODS_V2, RIG_V2 } from '../src/scene/figureV2';
import { kitV2, V2_IDS } from '../src/scene/v2';
import { PERSONALITIES } from '../src/presentation/personalities';
import { FAMILIES } from '../src/game/catalog/cards';
import { playerFigure } from '../src/art/portrait';

// M07 L5 : le modèle « vectoriel V2 » est le rendu par défaut des quatre rivaux et, depuis la passe 26, du portrait du
// duelliste joueur ; l’ancien rendu reste en `?qa=1&figure=v1`.
describe('interrupteur du modèle des personnages (L5)', () => {
  afterEach(() => setFigureStyle('v2'));

  it('V2 par défaut ; V1 seulement avec ?qa=1&figure=v1', () => {
    expect(readParams('').figure).toBe('v2');
    expect(readParams('?figure=v1').figure).toBe('v2');
    expect(readParams('?qa=1').figure).toBe('v2');
    expect(readParams('?qa=1&figure=v1').figure).toBe('v1');
    expect(figureStyle()).toBe('v2');
  });

  it('les quatre rivaux et le duelliste joueur sont dessinés en V2 ; tout repasse en V1 avec figure=v1', () => {
    for (const p of PERSONALITIES) expect(usesV2(p.id)).toBe(true);
    for (const fam of FAMILIES) expect(usesV2(playerFigure(fam).id)).toBe(true);
    expect(usesV2('player-Inconnue')).toBe(false);
    expect(usesV2('inconnu')).toBe(false);
    setFigureStyle('v1');
    for (const p of PERSONALITIES) expect(usesV2(p.id)).toBe(false);
    for (const fam of FAMILIES) expect(usesV2(playerFigure(fam).id)).toBe(false);
  });

  it('passe 26 : une identité V2 du joueur par famille de Signature, distincte des rivaux', () => {
    const ids = FAMILIES.map((fam) => kitV2(playerFigure(fam).id)!.id);
    expect(ids).toEqual(FAMILIES.map((fam) => `player-${fam}`));
    expect(kitV2('player-Voile')).toBe(kitV2('player-Voile'));
    for (const id of ids) expect(V2_IDS).not.toContain(id);
    const kit = kitV2('player-Cendre')!;
    expect(kit.colors.iris).toBe(playerFigure('Cendre').look.eyes);
    expect(moodsFor(kit).neutral.lid).toBe(MOODS_V2.neutral.lid);
  });

  it('une identité V2 par rival, chacune avec ses humeurs (repos des paupières commun)', () => {
    expect([...V2_IDS].sort()).toEqual(PERSONALITIES.map((p) => p.id).sort());
    for (const id of V2_IDS) {
      const kit = kitV2(id)!;
      expect(kit.id).toBe(id);
      const m = moodsFor(kit);
      expect(Object.keys(m)).toHaveLength(14);
      expect(m.neutral.lid).toBe(MOODS_V2.neutral.lid);
    }
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
