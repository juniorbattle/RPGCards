/**
 * T4 (décision du responsable du 2026-11-13) : la marche de profil du protagoniste en huit temps, redessinée par code au
 * chargement (`src/ville/marcheProfil.ts`), sur les trente-deux feuilles `player*` du manifeste. Contrôles : huit temps
 * distincts ; contact, appui, passage, élan puis l'autre jambe (pieds écartés d'un pas au contact, rapprochés au passage) ;
 * le pied d'appui de la jambe proche recule d'un quart de pas à chaque temps (aucun glissement) et la foulée annoncée au
 * monde vaut deux pas ; les pieds d'appui touchent le sol ; le corps monte et descend d'un pixel d'art ; le haut du corps
 * (tête) est celui de la feuille ; aucune image ni approbation touchée.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appuisProche, BALANCEMENT, cycleProfil8, hancheDe, paletteJambes, hautDuCorps, pasDe, POINTE, posesProfil, TALON, TEMPS_PROFIL, type Case } from '../src/ville/marcheProfil';
import { lirePng } from './png';

const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const IDS = Object.keys(man.sprites).filter((id) => /^player/.test(id));

function casesProfil(id: string): { cases: Case[]; e: { cell: [number, number]; anchor: [number, number]; figureH: number; scale: number; profil: { contacts: [number, number] } } } {
  const e = man.sprites[id];
  const sheet = lirePng(`public/sprites/${e.file}`);
  const [CW, CH] = e.cell as [number, number];
  const S = e.scale as number;
  const cases = [0, 1, 2, 3, 4].map((col) => {
    const px = new Uint8ClampedArray(CW * CH * 4);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const i = (((2 * CH + y) * S + (S >> 1)) * sheet.width + (col * CW + x) * S + (S >> 1)) * 4;
      px.set(sheet.data.subarray(i, i + 4), (y * CW + x) * 4);
    }
    return { px, w: CW, h: CH };
  });
  return { cases, e };
}

/** Centre des pixels d'une couleur donnée sous une ligne (la botte proche, la lointaine). */
function centre(c: Case, rgb: readonly number[], y0: number): { x: number; bas: number } | null {
  let s = 0; let n = 0; let bas = -1;
  for (let y = y0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const i = (y * c.w + x) * 4;
    if (c.px[i + 3]! > 128 && c.px[i] === rgb[0] && c.px[i + 1] === rgb[1] && c.px[i + 2] === rgb[2]) { s += x; n++; bas = Math.max(bas, y); }
  }
  return n ? { x: s / n, bas } : null;
}

/** Plus basse ligne opaque d'une case. */
function plusBas(c: Case): number {
  for (let y = c.h - 1; y >= 0; y--) for (let x = 0; x < c.w; x++) if (c.px[(y * c.w + x) * 4 + 3]! > 128) return y;
  return -1;
}

describe('T4 — la marche de profil en huit temps, sur les trente-deux feuilles', () => {
  it('le manifeste compte trente-deux feuilles du protagoniste, chacune avec son plan de marche, approuvée', () => {
    expect(IDS.length).toBe(32);
    for (const id of IDS) { expect(man.sprites[id].profil, id).toBeTruthy(); expect(man.sprites[id].approved, id).toBe(true); }
  });

  it('le pas et l’appui : un quart de pas par temps, la foulée vaut deux pas', () => {
    expect(TEMPS_PROFIL).toBe(8);
    expect(BALANCEMENT).toEqual([0, 1, 0, -1, 0, 1, 0, -1]);
    for (const h of [85, 88, 91, 97]) {
      const E = pasDe(h);
      expect(E % 4).toBe(0);
      const a = appuisProche(h).filter((x): x is number => x !== null);
      expect(a.length).toBe(5);
      for (let k = 1; k < a.length; k++) expect(a[k - 1]! - a[k]!).toBe(E / 4);
      // du contact (devant de E/2) à la pointe qui quitte le sol (derrière de E/2) : un pas, soit une demi-foulée
      expect(a[0]! - a[4]!).toBe(E);
    }
  });

  for (const id of IDS) {
    it(`${id} : huit temps, jambes qui alternent, appui sans glissement, corps qui monte et descend, tête de la feuille`, () => {
      const { cases, e } = casesProfil(id);
      const f = { sol: e.anchor[1] - 1, ancreX: e.anchor[0], figureH: e.figureH };
      const cyc = cycleProfil8(cases, f, e.profil.contacts);
      expect(cyc.temps.length).toBe(8);
      expect(cyc.pas).toBe(pasDe(e.figureH));
      const hanche = hancheDe(f);
      const pal = paletteJambes(cases.slice(1).flatMap((c) => hautDuCorps(c, f.sol, hanche).retires));
      // huit temps distincts deux à deux
      const cle = cyc.temps.map((t) => Buffer.from(t.px).toString('base64'));
      expect(new Set(cle).size, 'huit temps distincts').toBe(8);
      // la botte proche (couleur principale) et la lointaine (ombre), sous la hanche
      const proche = cyc.temps.map((t) => centre(t, pal.botte, hanche));
      const loin = cyc.temps.map((t) => centre(t, pal.botteOmbre, hanche));
      for (let k = 0; k < 8; k++) { expect(proche[k], `botte proche, temps ${k + 1}`).not.toBeNull(); expect(loin[k], `botte lointaine, temps ${k + 1}`).not.toBeNull(); }
      const E = cyc.pas;
      // contact : la jambe proche devant, la lointaine derrière (au pixel, les bottes en partie sous le manteau) ; l'inverse au temps 5
      expect(proche[0]!.x - loin[0]!.x).toBeGreaterThan(E * 0.4);
      expect(loin[4]!.x - proche[4]!.x).toBeGreaterThan(E * 0.4);
      // passage : pieds rapprochés
      expect(Math.abs(proche[2]!.x - loin[2]!.x)).toBeLessThan(E / 2);
      expect(Math.abs(proche[6]!.x - loin[6]!.x)).toBeLessThan(E / 2);
      // aucun glissement, sur les jambes posées : le point d'appui (talon au contact, pied à plat, puis la pointe) recule
      // d'un quart de pas à chaque temps et reste au sol ; la jambe lointaine fait de même, quatre temps plus tard
      const poses = posesProfil(f);
      for (const [j, d] of [['proche', 0], ['loin', 4]] as const) {
        const pied = (k: number) => poses[(k + d) % 8]![j].pied;
        const appui = [pied(0)[TALON]!, pied(1)[TALON]!, pied(2)[TALON]!];
        const pointe = [pied(2)[POINTE]!, pied(3)[POINTE]!, pied(4)[POINTE]!];
        for (const suite of [appui, pointe]) for (let k = 1; k < suite.length; k++) {
          expect(Math.abs(suite[k - 1]!.x - suite[k]!.x - E / 4), `${j} : recul du point d’appui`).toBeLessThanOrEqual(0.6);
          expect(Math.abs(suite[k]!.y - f.sol), `${j} : appui au sol`).toBeLessThanOrEqual(0.6);
        }
      }
      // les pieds d'appui touchent le sol (la semelle sur la ligne du sol, son trait juste dessous au plus)
      for (const k of [1, 2]) expect(f.sol - proche[k]!.bas, `temps ${k + 1}`).toBeLessThanOrEqual(1);
      for (const k of [5, 6]) expect(f.sol - loin[k]!.bas, `temps ${k + 1}`).toBeLessThanOrEqual(1);
      // la jambe en l'air est levée au passage
      expect(f.sol - loin[2]!.bas).toBeGreaterThanOrEqual(2);
      // rien sous le sol (le trait de la semelle compris)
      for (const t of cyc.temps) expect(plusBas(t)).toBeLessThanOrEqual(f.sol);
      // la tête : celle de la feuille, décalée du balancement (haut de la case, au-dessus du buste)
      for (let k = 0; k < 8; k++) {
        const src = cases[cyc.hauts.repos === 0 && (k === 2 || k === 6) ? 0 : k === 7 || k <= 2 ? cyc.hauts.arriere : cyc.hauts.avant]!;
        const b = BALANCEMENT[k]!;
        let diff = 0;
        for (let y = 4; y < 24; y++) for (let x = 0; x < src.w; x++) {
          const i = (y * src.w + x) * 4;
          const j = ((y + b) * src.w + x) * 4;
          if (src.px[i + 3]! > 128 !== cyc.temps[k]!.px[j + 3]! > 128) diff++;
        }
        expect(diff, `tête du temps ${k + 1}`).toBe(0);
      }
    });
  }
});
