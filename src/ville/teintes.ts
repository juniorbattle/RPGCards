/**
 * Peau, cheveux et yeux du protagoniste repeints par code (apparence au choix, `apparence.ts`) : ses deux feuilles les
 * peignent au naturel (aucun ton clé), la peau partageant ses quatre tons avec le liseré doré du manteau. Reconnaissance
 * par case, en pixels d'art, lignes de haut en bas :
 * - cheveux : gris clairs peu saturés dans le haut de la figure (40 % de sa hauteur), en grandes plages (le blanc des
 *   yeux, petit, n'en est pas) ;
 * - peau : tons chauds clairs ; dans le haut, le visage ; plus bas, les mains, plages compactes qui ne touchent pas le
 *   manteau (le liseré le borde, en traits allongés) ; la boucle de ceinture, un anneau au milieu de la figure, écartée ;
 * - iris : bleus saturés du visage, tout près de la peau.
 * Chaque teinte reconnue est repeinte sur quatre niveaux (sombre, ombre, base, clair) selon sa luminance dans sa plage.
 * Pur.
 */
import type { Tone } from '../presentation/npcs';
import type { Yeux } from './apparence';

export const AUTRE = 0;
export const PEAU = 1;
export const CHEVEUX = 2;
export const IRIS = 3;

interface Feuille { px: Uint8ClampedArray | Uint8Array; w: number; h: number }

function hsv(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
}

/** Classe de chaque pixel d'art d'une feuille de 5 × 3 cases (`AUTRE`, `PEAU`, `CHEVEUX`, `IRIS`). */
export function classerTeintes(f: Feuille, cw: number, ch: number): Uint8Array {
  const cls = new Uint8Array(f.w * f.h);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) classerCase(f, cls, c * cw, r * ch, cw, ch, r === 2);
  return cls;
}

function classerCase(f: Feuille, cls: Uint8Array, x0: number, y0: number, cw: number, ch: number, profil: boolean): void {
  const k = (i: number, j: number) => ((y0 + j) * f.w + x0 + i) * 4;
  const opaque = (i: number, j: number) => i >= 0 && j >= 0 && i < cw && j < ch && f.px[k(i, j) + 3]! > 128;
  const teinte = (i: number, j: number) => hsv(f.px[k(i, j)]!, f.px[k(i, j) + 1]!, f.px[k(i, j) + 2]!);
  let top = ch;
  let bot = -1;
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (opaque(i, j)) { top = Math.min(top, j); bot = Math.max(bot, j); }
  if (bot < 0) return;
  const tete = top + Math.round(0.4 * (bot - top + 1));
  // tenue en magenta clé (feuille avant recoloration)
  const manteau = (i: number, j: number) => {
    if (!opaque(i, j)) return false;
    const r = f.px[k(i, j)]!;
    const b = f.px[k(i, j) + 2]!;
    return f.px[k(i, j) + 1]! < 20 && r > 15 && b > 15 && Math.abs(r - b) < 20;
  };
  const chaud = (i: number, j: number) => { if (!opaque(i, j)) return false; const [h, s, v] = teinte(i, j); return v > 0.5 && s > 0.25 && s < 0.7 && h >= 25 && h <= 50; };
  // gris des cheveux argentés, et gris beige d'une nuque rasée (passe 172)
  const gris = (i: number, j: number) => { if (!opaque(i, j)) return false; const [, s, v] = teinte(i, j); return s < 0.22 && v > 0.3; };
  const bleu = (i: number, j: number) => { if (!opaque(i, j)) return false; const [h, s, v] = teinte(i, j); return s > 0.4 && h >= 200 && h <= 250 && v > 0.2; };
  const poser = (pts: [number, number][], c: number) => { for (const [i, j] of pts) cls[(y0 + j) * f.w + x0 + i] = c; };
  const plages = (test: (i: number, j: number) => boolean, j0: number, j1: number): [number, number][][] => {
    const vu = new Uint8Array(cw * ch);
    const out: [number, number][][] = [];
    for (let j = j0; j <= j1; j++) for (let i = 0; i < cw; i++) {
      if (vu[j * cw + i] || !test(i, j)) continue;
      const pile: [number, number][] = [[i, j]];
      vu[j * cw + i] = 1;
      const pts: [number, number][] = [];
      while (pile.length) {
        const [a, b] = pile.pop()!;
        pts.push([a, b]);
        for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const na = a + da;
          const nb = b + db;
          if (na < 0 || nb < j0 || na >= cw || nb > j1 || vu[nb * cw + na] || !test(na, nb)) continue;
          vu[nb * cw + na] = 1;
          pile.push([na, nb]);
        }
      }
      out.push(pts);
    }
    return out;
  };
  // passe 172 : de petites plages aussi (côtés rasés, mèches isolées), pourvu qu'elles ne touchent pas un iris (le blanc de
  // l'œil)
  const bleuProche = (pts: [number, number][]) => pts.some(([i, j]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => bleu(i + di!, j + dj!)));
  for (const pts of plages(gris, top, tete)) if (pts.length >= 25 || (pts.length >= 6 && !bleuProche(pts))) poser(pts, CHEVEUX);
  // visage : aussi ses ombres (orbites, joues, cou ; passe 170 : sur une peau repeinte foncée, une ombre laissée au naturel
  // faisait une tache claire), tons chauds plus sombres ou plus saturés que ceux des mains
  const chaudTete = (i: number, j: number) => { if (!opaque(i, j)) return false; const [h, s, v] = teinte(i, j); return chaud(i, j) || (v > 0.35 && s > 0.2 && s < 0.85 && h >= 12 && h <= 52); };
  for (const pts of plages(chaudTete, top, tete)) if (pts.length >= 6) poser(pts, PEAU);
  const main = (i: number, j: number) => chaud(i, j) && !manteau(i + 1, j) && !manteau(i - 1, j) && !manteau(i, j + 1) && !manteau(i, j - 1);
  for (const pts of plages(main, tete + 1, bot)) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs) + 1;
    const bh = Math.max(...ys) - Math.min(...ys) + 1;
    if (pts.length < 10 || Math.min(bw, bh) < 3 || Math.max(bw, bh) > 2.5 * Math.min(bw, bh)) continue;
    // boucle de ceinture : de face et de dos, au milieu de la figure (les mains sont sur les côtés) ; un anneau (un trou dans sa boîte) tout
    // près (de profil, elle est un peu en avant) ; passe 167 : sur les feuilles des coupes, elle touche la sangle et n'est
    // pas toujours fermée
    const dans = new Set(pts.map(([i, j]) => j * cw + i));
    const cx = xs.reduce((s, v) => s + v, 0) / xs.length;
    let trou = false;
    for (let j = Math.min(...ys) + 1; j < Math.max(...ys) && !trou; j++) for (let i = Math.min(...xs) + 1; i < Math.max(...xs) && !trou; i++) {
      if (dans.has(j * cw + i)) continue;
      const voit = (di: number, dj: number) => { for (let a = i + di, b = j + dj; a >= 0 && b >= 0 && a < cw && b < ch; a += di, b += dj) if (dans.has(b * cw + a)) return true; return false; };
      trou = voit(1, 0) && voit(-1, 0) && voit(0, 1) && voit(0, -1);
    }
    if ((!profil && Math.abs(cx - cw / 2) <= 6) || (trou && Math.abs(cx - cw / 2) <= 9)) continue;
    poser(pts, PEAU);
  }
  const prochePeau = (i: number, j: number) => { for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const a = i + di; const b = j + dj; if (a >= 0 && b >= 0 && a < cw && b < ch && cls[(y0 + b) * f.w + x0 + a] === PEAU) return true; } return false; };
  for (let j = top; j <= tete; j++) for (let i = 0; i < cw; i++) if (bleu(i, j) && prochePeau(i, j)) cls[(y0 + j) * f.w + x0 + i] = IRIS;
}

const hex = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Repeint les teintes reconnues : chaque classe ciblée sur quatre niveaux (`deep`, `shade`, `base`, `hi`) selon la
 * luminance de chaque pixel entre la plus sombre et la plus claire de sa classe ; l'iris sur trois (sombre, iris, clair).
 */
export function repeindre(f: Feuille, cls: Uint8Array, cibles: { peau?: Tone; cheveux?: Tone; yeux?: Yeux }): void {
  const rampe = (c: number): [number, number, number][] | null => {
    if (c === PEAU && cibles.peau) return [cibles.peau.deep, cibles.peau.shade, cibles.peau.base, cibles.peau.hi].map(hex);
    if (c === CHEVEUX && cibles.cheveux) return [cibles.cheveux.deep, cibles.cheveux.shade, cibles.cheveux.base, cibles.cheveux.hi].map(hex);
    if (c === IRIS && cibles.yeux) return [cibles.yeux.deep, cibles.yeux.iris, cibles.yeux.iris, cibles.yeux.light].map(hex);
    return null;
  };
  for (const c of [PEAU, CHEVEUX, IRIS]) {
    const r = rampe(c);
    if (!r) continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (let p = 0; p < cls.length; p++) if (cls[p] === c) { const L = lum(f.px[p * 4]!, f.px[p * 4 + 1]!, f.px[p * 4 + 2]!); lo = Math.min(lo, L); hi = Math.max(hi, L); }
    if (hi < lo) continue;
    for (let p = 0; p < cls.length; p++) {
      if (cls[p] !== c) continue;
      const t = hi > lo ? (lum(f.px[p * 4]!, f.px[p * 4 + 1]!, f.px[p * 4 + 2]!) - lo) / (hi - lo) : 0.6;
      const n = t < 0.25 ? 0 : t < 0.55 ? 1 : t < 0.85 ? 2 : 3;
      f.px.set(r[n]!, p * 4);
    }
  }
}
