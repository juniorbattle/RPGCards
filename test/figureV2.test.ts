import { describe, expect, it } from 'vitest';
import { readParams } from '../src/app/params';
import { moodsFor, MOODS_V2, RIG_V2 } from '../src/scene/figureV2';
import { figureKitV2, kitV2, V2_IDS } from '../src/scene/v2';
import { PERSONALITIES, personalityById } from '../src/presentation/personalities';
import { FAMILIES } from '../src/game/catalog/cards';
import { playerFigure } from '../src/art/portrait';
import { ENCOUNTERS } from '../src/product/encounters';

// M07 L5 : le modèle « vectoriel V2 » dessine les quatre rivaux, les PNJ de la ville (M08 C3) et le portrait du duelliste
// joueur (passe 26). M08 C5 : l’ancien rendu V1 est retiré, avec le paramètre `figure`.
describe('modèle des personnages : vectoriel V2 seul (M08 C5)', () => {
  it('paramètre `figure` retiré : `?qa=1&figure=v1` est sans effet', () => {
    const p = readParams('?qa=1&figure=v1');
    expect('figure' in p).toBe(false);
    expect(p).toEqual(readParams('?qa=1'));
    expect(readParams('?figure=v1')).toEqual(readParams(''));
  });

  it('toute figure du jeu a une identité V2 : rivaux, adversaires des rencontres (PNJ compris), joueur', () => {
    for (const p of PERSONALITIES) expect(kitV2(p.id)).not.toBeNull();
    for (const e of ENCOUNTERS) expect(kitV2(e.rival)).not.toBeNull();
    for (const fam of FAMILIES) expect(kitV2(playerFigure(fam).id)).not.toBeNull();
    expect(kitV2('player-Inconnue')).toBeNull();
    expect(kitV2('inconnu')).toBeNull();
  });

  it('repli sûr d’un identifiant sans identité V2 : le rival signature de sa famille, sinon l’identité de la figure', () => {
    for (const fam of FAMILIES) {
      const rival = PERSONALITIES.find((p) => p.family === fam)!;
      expect(figureKitV2({ id: 'inconnu', family: fam })).toBe(kitV2(rival.id));
      expect(figureKitV2(playerFigure(fam))).toBe(kitV2(`player-${fam}`));
    }
    for (const p of PERSONALITIES) expect(figureKitV2(p)).toBe(kitV2(p.id));
    const npc = personalityById('pnj-joueuse-9')!;
    expect(figureKitV2(npc)).toBe(kitV2('pnj-joueuse-9'));
  });

  it('passe 26 : une identité V2 du joueur par famille de Signature, distincte des rivaux', () => {
    const ids = FAMILIES.map((fam) => kitV2(playerFigure(fam).id)!.id);
    expect(ids).toEqual(FAMILIES.map((fam) => `player-${fam}`));
    expect(kitV2('player-Voile')).toBe(kitV2('player-Voile'));
    for (const id of ids) expect(V2_IDS).not.toContain(id);
    const kit = kitV2('player-Cendre')!;
    // Yeux bleus du duelliste joueur (même apparence qu’avant la passe 26).
    expect(kit.colors.iris).toBe('#4a6fd6');
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
