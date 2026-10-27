/**
 * ADR 046 (décision du responsable du 2026-10-27) — les couleurs des familles ne se confondent pas : l'Astre est ocre, ambre
 * et or (comme les bannières peintes de la ville et le manteau d'Orin), le Voile marine et indigo. Vérifié sur la palette
 * commune (cartes, ville, tenues, lieux de duel), les cadres des cartes et les jetons de l'interface.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAMILY_PALETTE } from '../src/art/palette';
import { FAMILIES, type Family } from '../src/game/catalog/cards';

/** Teinte (degrés) d'une couleur `#rrggbb`. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}
const ecart = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const css = readFileSync('src/styles.css', 'utf8');
const shell = readFileSync('src/shell/shell.css', 'utf8') + readFileSync('src/aventure/styles.ts', 'utf8');

describe('couleurs des familles (ADR 046)', () => {
  it('palette commune : l’Astre ocre et or, le Voile bleu ; jamais la même teinte', () => {
    for (const k of ['deep', 'mid', 'light', 'accent', 'glow'] as const) {
      expect(hue(FAMILY_PALETTE.Astre[k]), `Astre ${k}`).toBeGreaterThanOrEqual(30);
      expect(hue(FAMILY_PALETTE.Astre[k]), `Astre ${k}`).toBeLessThanOrEqual(55);
    }
    for (const k of ['deep', 'mid', 'light'] as const) {
      expect(hue(FAMILY_PALETTE.Voile[k]), `Voile ${k}`).toBeGreaterThanOrEqual(200);
      expect(hue(FAMILY_PALETTE.Voile[k]), `Voile ${k}`).toBeLessThanOrEqual(250);
    }
    // les quatre familles deux à deux éloignées sur le ton principal (fond des cartes, tenues, fanions)
    for (const a of FAMILIES) for (const b of FAMILIES) if (a < b) expect(ecart(hue(FAMILY_PALETTE[a].light), hue(FAMILY_PALETTE[b].light)), `${a}/${b}`).toBeGreaterThan(20);
  });

  it('cadres des cartes et jetons de l’interface : l’Astre en or, le Voile en bleu', () => {
    const cadre = (f: Family) => css.match(new RegExp(`\\.card\\.fam-${f} \\{ --famc: (#[0-9a-f]{6}); \\}`, 'i'))?.[1];
    expect(hue(cadre('Astre')!)).toBeGreaterThanOrEqual(30);
    expect(hue(cadre('Astre')!)).toBeLessThanOrEqual(55);
    expect(hue(cadre('Voile')!)).toBeGreaterThanOrEqual(200);
    expect(ecart(hue(cadre('Astre')!), hue(cadre('Voile')!))).toBeGreaterThan(120);
    const jeton = (f: string) => css.match(new RegExp(`--${f}: (#[0-9a-f]{6});`, 'i'))?.[1];
    expect(ecart(hue(jeton('astre')!), hue(jeton('voile')!))).toBeGreaterThan(120);
    // écrans de l'aventure : l'Astre en or partout où une famille a sa couleur
    for (const m of shell.matchAll(/fam-Astre \{ --famc: (#[0-9a-f]{6}); \}/gi)) expect(hue(m[1]!)).toBeLessThanOrEqual(55);
  });

  it('étendards des lieux de duel : l’Astre en ocre, plus en marine', () => {
    const src = readFileSync('src/scene/venues/common.ts', 'utf8') + readFileSync('src/scene/venues/arene.ts', 'utf8');
    for (const m of src.matchAll(/Astre: \[?'(#[0-9a-f]{6})'/gi)) {
      expect(hue(m[1]!)).toBeGreaterThanOrEqual(30);
      expect(hue(m[1]!)).toBeLessThanOrEqual(55);
    }
  });
});
