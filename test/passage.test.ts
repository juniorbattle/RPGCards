// Marche de profil du protagoniste (retour du responsable du 2026-10-29) : plan du manifeste, cycle, et passages
// redessinés par code sur la feuille approuvée (jambes ramenées sous le corps, haut du corps et manteau intacts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cyclePlan, ecartPieds, estManteau, planValable, posePassage } from '../src/ville/passage';
import { checkManifestEntry, specOf, type SpriteManifest } from '../src/ville/spritesExternes';
import { lirePng } from './png';

const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8')) as SpriteManifest;
const e = man.sprites.player as { file: string; cell: [number, number]; scale: number; anchor: [number, number]; figureH: number; profil: { contacts: readonly [number, number]; passages: readonly [number, number] } };
const sheet = lirePng(`public/sprites/${e.file}`);
const [CW, CH] = e.cell;
const sol = e.anchor[1] - 1;
const hanche = sol - Math.round(e.figureH / 3);

/** Case de profil de la feuille du joueur, en pixels d'art (centre des blocs agrandis). */
function caseProfil(col: number) {
  const px = new Uint8Array(CW * CH * 4);
  const S = e.scale;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = (((2 * CH + y) * S + (S >> 1)) * sheet.width + (col * CW + x) * S + (S >> 1)) * 4;
    px.set(sheet.data.subarray(i, i + 4), (y * CW + x) * 4);
  }
  return { px, w: CW, h: CH };
}

describe('marche de profil du protagoniste', () => {
  it('plan du manifeste valable, cycle contact, passage, contact, passage', () => {
    expect(planValable(e.profil)).toBe(true);
    expect(cyclePlan(e.profil)).toEqual([1, 3, 2, 4]);
    expect(specOf(man.sprites.player!, man.version).profil).toEqual(e.profil);
    expect(planValable({ contacts: [1, 1], passages: [3, 4] })).toBe(false);
    expect(planValable({ contacts: [0, 2], passages: [3, 4] })).toBe(false);
    expect(planValable({ contacts: [1, 2], passages: [3] })).toBe(false);
    expect(checkManifestEntry('player', { ...man.sprites.player, profil: { contacts: [1, 2], passages: [3, 5] } }, 3).join()).toMatch(/plan de marche/);
    // une feuille sans plan garde le cycle mesuré de la passe 162
    expect(specOf(man.sprites['pnj-docker']!, man.version).profil).toBeUndefined();
  });

  it('les contacts sont des foulées ouvertes (≈ 27 à 31 px d’art entre les pieds)', () => {
    for (const c of e.profil.contacts) expect(ecartPieds(caseProfil(c), sol)).toBeGreaterThan(24);
  });

  for (const col of e.profil.passages) {
    it(`passage tiré du temps ${col} : pieds rapprochés, haut du corps et manteau intacts`, () => {
      const avant = caseProfil(col);
      const apres = { ...avant, px: avant.px.slice() };
      posePassage(apres, sol, hanche);
      expect(ecartPieds(avant, sol)).toBeGreaterThan(24);
      expect(ecartPieds(apres, sol)).toBeLessThanOrEqual(0.35 * ecartPieds(avant, sol));
      let changes = 0;
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const i = (y * CW + x) * 4;
        const same = [0, 1, 2, 3].every((k) => avant.px[i + k] === apres.px[i + k]);
        if (same) continue;
        changes++;
        // rien au-dessus de la hanche (marge du trait) ; aucun pixel du manteau effacé ou recouvert
        expect(y).toBeGreaterThanOrEqual(hanche - 4);
        expect(avant.px[i + 3]! > 128 && estManteau(avant.px[i]!, avant.px[i + 1]!, avant.px[i + 2]!)).toBe(false);
      }
      expect(changes).toBeGreaterThan(50);
      // toujours posé sur la ligne des pieds
      const auSol = (c: typeof avant) => Array.from({ length: CW }, (_, x) => c.px[(sol * CW + x) * 4 + 3]! > 128).some(Boolean);
      expect(auSol(apres)).toBe(true);
    });
  }
});
