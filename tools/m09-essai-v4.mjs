// M09 V4 — essai technique de la porte du Quai (ADR 028) : traitement PAR SCRIPTS des deux images générées
// (gpt-image-2, `tools/m09-generer-images.mjs`, bruts dans `art-gen/2026-10-19-v4-essai/` du dossier principal), puis
// vérification in situ en QA (`approved: false`), dans une COPIE TEMPORAIRE du build (rien n'entre dans `public/`).
//   Plan « façades » : fond magenta uni détouré (alpha tiré de l'écart au magenta, couleur des bords démêlée du fond),
//   recadré sur le pied des murs ; lanternes peintes repérées (taches ambrées du rez-de-chaussée) pour y poser les
//   lumières du moteur ; posé sur le plan pur du Quai (salle de jeu, maison étroite, le Fanal) devant les plans de preuve
//   dessinés par code (ciel, ville haute, façades des extrémités, rue, premier plan, eau ; `m09-plans-preuve.mjs`).
//   Feuille du joueur : fond cyan uni détouré (alpha binaire), pas des pixels d'art mesuré sur les arêtes, chaque case
//   ramenée à sa grille d'art (couleur majoritaire du cœur de chaque bloc), pieds alignés sur une même ligne et tête
//   centrée, tenue (magenta) et accent (vert) ramenés exactement sur les tons clés (quatre niveaux), feuille agrandie ×3
//   (contrat v3, `pixel: true`).
// Parcours (Chrome ; GPU réel avec LQV_GPU=1 CHROMIUM_PATH=…) : décor par code (actuel) contre essai, au centre du Quai et
// devant le Fanal, 1920 × 1080 et 1280 × 720 ; joueur Cendre et Voile (recoloration par famille) ; planche
// référence | actuel | essai.
// Images traitées et fiches : `art-src/decors/quai-facades-essai/` et `art-src/sprites/player-essai/` (hors du build).
// Usage : npm run build && node tools/m09-essai-v4.mjs [bruts] [captures] [rapport.json]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { FACADES, paintPlates } from './m09-plans-preuve.mjs';

const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const RAW = process.argv[2] ?? join(main, 'art-gen', '2026-10-19-v4-essai');
const ART_D = 'art-src/decors/quai-facades-essai';
const ART_S = 'art-src/sprites/player-essai';
const DIR = process.argv[3] ?? 'screenshots/qa/m09/v4-essai';
const OUT = process.argv[4] ?? 'artifacts/qa/m09/v4-essai.json';
const DIST = process.env.LQV_DIST || 'dist';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src tools public').toString().trim() ? '+arbre de travail' : '';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const tmp = mkdtempSync(join(tmpdir(), 'lqv-essai-'));
cpSync(DIST, tmp, { recursive: true });
for (const d of [DIR, ART_D, ART_S]) mkdirSync(d, { recursive: true });
const browser = await launch();
const report = { date: new Date().toISOString(), commit: `${head}${dirty}`, dist: DIST, renderer: null, checks: [], console: [], bruts: {}, traitement: {}, runs: {} };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let srv = null;
let port = 4421;
const serve = async () => { srv?.stop(); srv = await startPreview(port++, tmp); return srv; };
const page = async (w, h) => {
  const p = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, report.console);
  return p;
};
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const hideUi = () => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; };

/** Dans la page : détoure le plan (fond magenta uni), le recadre sur le pied des murs, repère les lanternes peintes. */
async function processPlate(url) {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.width; const H = img.height;
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const src = g.getImageData(0, 0, W, H); const p = src.data;
  // alpha : écart au magenta pur m = min(R, B) − G (fond ≈ 255, pierre, bois, lanternes et bannières ≤ 30) ;
  // couleur des bords démêlée du fond : C = a·F + (1 − a)·K, K = (255, 0, 255)
  const M0 = 45; const M1 = 205; const K = [255, 0, 255];
  const A = new Float32Array(W * H);
  let spill = 0;
  for (let i = 0; i < W * H; i++) {
    const r = p[i * 4]; const gg = p[i * 4 + 1]; const b = p[i * 4 + 2];
    const m = Math.min(r, b) - gg;
    let a = 1 - Math.min(1, Math.max(0, (m - M0) / (M1 - M0)));
    if (a < 0.04) a = 0;
    A[i] = a;
    if (a > 0 && a < 1) for (let k = 0; k < 3; k++) p[i * 4 + k] = Math.max(0, Math.min(255, Math.round((p[i * 4 + k] - (1 - a) * K[k]) / a)));
    p[i * 4 + 3] = Math.round(a * 255);
    if (a === 1 && m > 30) spill++;
  }
  const opaque = (x, y) => A[y * W + x] > 0.5;
  let bottom = H - 1;
  for (let y = H - 1; y >= 0; y--) { let n = 0; for (let x = 0; x < W; x++) if (opaque(x, y)) n++; if (n > 0.5 * W) { bottom = y; break; } }
  let top = 0;
  for (let y = 0; y <= bottom; y++) { let any = false; for (let x = 0; x < W; x++) if (A[y * W + x] > 0) { any = true; break; } if (any) { top = Math.max(0, y - 2); break; } }
  const colCover = (x) => { let n = 0; for (let y = top; y <= bottom; y++) if (opaque(x, y)) n++; return n / (bottom - top + 1); };
  let left = 0; while (left < W - 1 && colCover(left) < 0.3) left++;
  let right = W - 1; while (right > 0 && colCover(right) < 0.3) right--;
  const w = right - left + 1; const h = bottom - top + 1;
  const outC = new OffscreenCanvas(w, h); const og = outC.getContext('2d');
  const out = og.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const si = ((y + top) * W + x + left) * 4; out.data.set(p.subarray(si, si + 4), (y * w + x) * 4); }
  og.putImageData(out, 0, 0);
  // lanternes peintes : taches chaudes et claires du rez-de-chaussée (moitié basse), par blocs de 4 × 4 px
  const B = 4; const bw = Math.floor(w / B); const bh = Math.floor(h / B);
  const hot = new Uint8Array(bw * bh);
  for (let by = Math.floor(bh * 0.5); by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    let n = 0;
    for (let yy = 0; yy < B; yy++) for (let xx = 0; xx < B; xx++) {
      const i = ((by * B + yy) * w + bx * B + xx) * 4; const r = out.data[i]; const gg = out.data[i + 1]; const b = out.data[i + 2];
      if (out.data[i + 3] > 200 && r > 210 && gg > 140 && b < 150 && r - b > 90) n++;
    }
    if (n >= 6) hot[by * bw + bx] = 1;
  }
  const seen = new Uint8Array(bw * bh); const blobs = [];
  for (let i0 = 0; i0 < hot.length; i0++) {
    if (!hot[i0] || seen[i0]) continue;
    const q = [i0]; seen[i0] = 1; let sx = 0; let sy = 0; let n = 0;
    while (q.length) {
      const i = q.pop(); const x = i % bw; const y = (i / bw) | 0; sx += x; sy += y; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx; const ny = y + dy; const j = ny * bw + nx; if (nx >= 0 && ny >= 0 && nx < bw && ny < bh && hot[j] && !seen[j]) { seen[j] = 1; q.push(j); } }
    }
    if (n >= 3) blobs.push({ x: (sx / n + 0.5) * B, y: (sy / n + 0.5) * B, area: n * B * B });
  }
  blobs.sort((a, b) => b.area - a.area);
  const lanterns = [];
  for (const b of blobs) if (lanterns.length < 8 && lanterns.every((l) => Math.hypot(l.x - b.x, l.y - b.y) > 50)) lanterns.push(b);
  const blob = await outC.convertToBlob({ type: 'image/png' });
  const res = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  let transparent = 0; for (let i = 0; i < w * h; i++) if (out.data[i * 4 + 3] === 0) transparent++;
  return { url: res, size: [w, h], crop: { left, top, right, bottom }, transparentShare: Math.round((transparent / (w * h)) * 1000) / 1000, magentaSpill: spill, lanterns };
}

/**
 * Dans la page : feuille du joueur. Fond cyan uni détouré (alpha binaire) ; pas des pixels d'art mesuré sur les arêtes
 * de couleur (longueur de résultante maximale, plus grand pas parmi les quasi-maxima) ; cases ramenées à la grille d'art
 * (couleur majoritaire du cœur de chaque bloc) ; pieds sur une même ligne, tête centrée ; tons clés exacts.
 */
async function processSheet(url) {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.width; const H = img.height;
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  // fond : écart au cyan pur m = min(G, B) − R ; liseré : pixel teinté de cyan (teinte 165–200°, saturé) au bord, mélange
  // du fond et du trait (le personnage n'a aucun cyan ; les yeux bleus, vers 220°, restent)
  const op = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4]; const g2 = d[i * 4 + 1]; const b = d[i * 4 + 2];
    const mx = Math.max(r, g2, b); const mn = Math.min(r, g2, b); const dd = mx - mn;
    let hh = 0; if (dd) { if (mx === r) hh = ((g2 - b) / dd) % 6; else if (mx === g2) hh = (b - r) / dd + 2; else hh = (r - g2) / dd + 4; }
    hh = (hh * 60 + 360) % 360;
    const cyanCast = dd / Math.max(mx, 1) > 0.35 && mx > 38 && hh >= 165 && hh <= 200;
    op[i] = Math.min(g2, b) - r < 120 && !cyanCast ? 1 : 0;
  }
  // arêtes de couleur à l'intérieur de la figure
  const ex = []; const ey = [];
  const diff = (i, j) => Math.abs(d[i * 4] - d[j * 4]) + Math.abs(d[i * 4 + 1] - d[j * 4 + 1]) + Math.abs(d[i * 4 + 2] - d[j * 4 + 2]);
  for (let y = 0; y < H; y += 2) for (let x = 1; x < W; x++) { const i = y * W + x; if ((op[i] || op[i - 1]) && (op[i] !== op[i - 1] || diff(i, i - 1) > 90)) ex.push(x); }
  for (let x = 0; x < W; x += 2) for (let y = 1; y < H; y++) { const i = y * W + x; if ((op[i] || op[i - W]) && (op[i] !== op[i - W] || diff(i, i - W) > 90)) ey.push(y); }
  const pitch = (es) => {
    let best = { p: 0, r: 0 }; const all = [];
    for (let pp = 2.5; pp <= 8; pp += 0.005) {
      let sc = 0; let ss = 0; const k = (2 * Math.PI) / pp;
      for (const e of es) { sc += Math.cos(k * e); ss += Math.sin(k * e); }
      const r = Math.hypot(sc, ss) / es.length; all.push({ p: pp, r, ph: ((Math.atan2(ss, sc) / k) % pp + pp) % pp });
      if (r > best.r) best = { p: pp, r };
    }
    const near = all.filter((a) => a.r >= 0.85 * best.r);
    const top = near.reduce((a, b) => (b.p > a.p ? b : a));
    // affinage autour du plus grand pas retenu
    return all.filter((a) => Math.abs(a.p - top.p) < 0.15).reduce((a, b) => (b.r > a.r ? b : a));
  };
  const px = pitch(ex); const py = pitch(ey);
  const P = (px.p + py.p) / 2;
  const cellW = W / 5; const cellH = H / 3;
  const cw = Math.round(cellW / P); const ch = Math.round(cellH / P);
  // grille d'art de chaque case : couleur majoritaire (5 bits par canal) du cœur de chaque bloc
  const art = new Uint8ClampedArray(cw * 5 * ch * 3 * 4);
  const AW = cw * 5;
  for (let r = 0; r < 3; r++) for (let col = 0; col < 5; col++) {
    const k0x = Math.round((col * cellW - px.ph) / P); const k0y = Math.round((r * cellH - py.ph) / P);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const x0 = px.ph + (k0x + i) * P; const y0 = py.ph + (k0y + j) * P;
      const votes = new Map(); let total = 0; let filled = 0;
      for (let yy = y0 + P * 0.25; yy < y0 + P * 0.75; yy += 0.5) for (let xx = x0 + P * 0.25; xx < x0 + P * 0.75; xx += 0.5) {
        const X = Math.floor(xx); const Y = Math.floor(yy);
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        total++;
        const si = Y * W + X;
        if (!op[si]) continue;
        filled++;
        const key = ((d[si * 4] >> 3) << 10) | ((d[si * 4 + 1] >> 3) << 5) | (d[si * 4 + 2] >> 3);
        const v = votes.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }; v.n++; v.r += d[si * 4]; v.g += d[si * 4 + 1]; v.b += d[si * 4 + 2]; votes.set(key, v);
      }
      const o = ((r * ch + j) * AW + col * cw + i) * 4;
      if (!total || filled * 2 < total) continue;
      let best = null; for (const v of votes.values()) if (!best || v.n > best.n) best = v;
      art[o] = Math.round(best.r / best.n); art[o + 1] = Math.round(best.g / best.n); art[o + 2] = Math.round(best.b / best.n); art[o + 3] = 255;
    }
  }
  // alignement : pieds sur la ligne de base commune, tête (35 % du haut de la figure) centrée
  const BASE = ch - 4; const X0 = Math.floor(cw / 2);
  const aligned = new Uint8ClampedArray(art.length);
  const shifts = []; let figureH = 0; let clipped = 0;
  for (let r = 0; r < 3; r++) for (let col = 0; col < 5; col++) {
    let t = ch; let b = -1;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (art[((r * ch + j) * AW + col * cw + i) * 4 + 3]) { t = Math.min(t, j); b = Math.max(b, j); }
    if (b < 0) { shifts.push(null); continue; }
    let sx = 0; let n = 0; const headB = t + Math.round((b - t) * 0.35);
    for (let j = t; j <= headB; j++) for (let i = 0; i < cw; i++) if (art[((r * ch + j) * AW + col * cw + i) * 4 + 3]) { sx += i + 0.5; n++; }
    const dx = Math.round(X0 + 0.5 - sx / n); const dy = BASE - b;
    shifts.push({ dx, dy, h: b - t + 1 });
    if (col === 0) figureH = Math.max(figureH, b - t + 1);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const si = ((r * ch + j) * AW + col * cw + i) * 4;
      if (!art[si + 3]) continue;
      const ni = i + dx; const nj = j + dy;
      if (ni < 0 || nj < 0 || ni >= cw || nj >= ch) { clipped++; continue; }
      aligned.set(art.subarray(si, si + 4), ((r * ch + nj) * AW + col * cw + ni) * 4);
    }
  }
  // tons clés : tenue (magenta, teinte 280–345°) et accent (vert, 85–165°) ramenés sur quatre niveaux exacts
  const LV = [64, 128, 191, 255];
  const hsv = (r, g2, b) => { const mx = Math.max(r, g2, b); const mn = Math.min(r, g2, b); const dd = mx - mn; let hh = 0; if (dd) { if (mx === r) hh = ((g2 - b) / dd) % 6; else if (mx === g2) hh = (b - r) / dd + 2; else hh = (r - g2) / dd + 4; } return [(hh * 60 + 360) % 360, mx ? dd / mx : 0, mx / 255]; };
  const cls = new Uint8Array(aligned.length / 4);
  const vs = { 1: [], 2: [] };
  for (let i = 0; i < cls.length; i++) {
    if (!aligned[i * 4 + 3]) continue;
    const [hh, s, v] = hsv(aligned[i * 4], aligned[i * 4 + 1], aligned[i * 4 + 2]);
    if (s > 0.45 && v > 0.12 && hh >= 280 && hh <= 345) { cls[i] = 1; vs[1].push(v); }
    else if (s > 0.35 && v > 0.12 && hh >= 85 && hh <= 165) { cls[i] = 2; vs[2].push(v); }
  }
  const vmax = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.98)] ?? 1; };
  const VM = { 1: vmax(vs[1]), 2: vmax(vs[2]) };
  const counts = { tenue: [0, 0, 0, 0], accent: [0, 0, 0, 0] };
  for (let i = 0; i < cls.length; i++) {
    if (!cls[i]) continue;
    const v = Math.max(aligned[i * 4], aligned[i * 4 + 1], aligned[i * 4 + 2]) / 255 / VM[cls[i]] * 255;
    const l = LV.reduce((bi, x, k) => (Math.abs(x - v) < Math.abs(LV[bi] - v) ? k : bi), 0);
    if (cls[i] === 1) { aligned[i * 4] = LV[l]; aligned[i * 4 + 1] = 0; aligned[i * 4 + 2] = LV[l]; counts.tenue[l]++; }
    else { aligned[i * 4] = 0; aligned[i * 4 + 1] = LV[l]; aligned[i * 4 + 2] = 0; counts.accent[l]++; }
  }
  // palette : couleurs naturelles réduites à 32 (k-moyennes, départ sur les couleurs les plus fréquentes, 16 tours)
  const nat = []; for (let i = 0; i < cls.length; i++) if (!cls[i] && aligned[i * 4 + 3]) nat.push(i);
  const freq = new Map(); for (const i of nat) { const k = ((aligned[i * 4] >> 4) << 8) | ((aligned[i * 4 + 1] >> 4) << 4) | (aligned[i * 4 + 2] >> 4); freq.set(k, (freq.get(k) ?? 0) + 1); }
  const KC = 32;
  let cent = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, KC).map(([k]) => [((k >> 8) & 15) * 16 + 8, ((k >> 4) & 15) * 16 + 8, (k & 15) * 16 + 8]);
  const lab = new Uint8Array(nat.length);
  for (let it = 0; it < 16; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    nat.forEach((i, n) => { let bi = 0; let bd = Infinity; for (let c2 = 0; c2 < cent.length; c2++) { const dr = aligned[i * 4] - cent[c2][0]; const dg = aligned[i * 4 + 1] - cent[c2][1]; const db = aligned[i * 4 + 2] - cent[c2][2]; const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db; if (dist < bd) { bd = dist; bi = c2; } } lab[n] = bi; const a = acc[bi]; a[0] += aligned[i * 4]; a[1] += aligned[i * 4 + 1]; a[2] += aligned[i * 4 + 2]; a[3]++; });
    cent = cent.map((c2, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : c2));
  }
  nat.forEach((i, n) => { const c2 = cent[lab[n]]; aligned[i * 4] = Math.round(c2[0]); aligned[i * 4 + 1] = Math.round(c2[1]); aligned[i * 4 + 2] = Math.round(c2[2]); });
  // aucune couleur naturelle ne doit être exactement un ton clé (sinon elle serait recolorée)
  const keys = new Set(); for (const l of LV) for (const m of [[1, 0, 0], [1, 1, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]]) keys.add(m.map((x) => x * l).join(','));
  let nudged = 0;
  for (let i = 0; i < cls.length; i++) if (!cls[i] && aligned[i * 4 + 3] && keys.has(`${aligned[i * 4]},${aligned[i * 4 + 1]},${aligned[i * 4 + 2]}`)) { aligned[i * 4] = Math.max(0, aligned[i * 4] - 1) || 1; nudged++; }
  const toUrl = async (k) => {
    const s = new OffscreenCanvas(AW, ch * 3); s.getContext('2d').putImageData(new ImageData(aligned, AW, ch * 3), 0, 0);
    const o = new OffscreenCanvas(AW * k, ch * 3 * k); const og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(s, 0, 0, AW * k, ch * 3 * k);
    const blob = await o.convertToBlob({ type: 'image/png' });
    return new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  };
  const colors = new Set(); for (let i = 0; i < cls.length; i++) if (aligned[i * 4 + 3]) colors.add(`${aligned[i * 4]},${aligned[i * 4 + 1]},${aligned[i * 4 + 2]}`);
  return {
    K1: await toUrl(1), K3: await toUrl(3), cell: [cw, ch], anchor: [X0, BASE + 1], figureH,
    pitch: { x: Math.round(px.p * 1000) / 1000, y: Math.round(py.p * 1000) / 1000, rx: Math.round(px.r * 1000) / 1000, ry: Math.round(py.r * 1000) / 1000, phaseX: Math.round(px.ph * 100) / 100, phaseY: Math.round(py.ph * 100) / 100 },
    shifts, clipped, counts, nudged, colors: colors.size,
  };
}

try {
  const rawPlate = readFileSync(join(RAW, 'quai-facades-essai.png'));
  const rawSheet = readFileSync(join(RAW, 'player-pixel-essai.png'));
  report.bruts = { plan: { sha256: sha(rawPlate), bytes: rawPlate.length }, feuille: { sha256: sha(rawSheet), bytes: rawSheet.length } };

  // ---- 1) traitement par scripts ---------------------------------------------------------------------------------
  await serve();
  const pw = await page(800, 600);
  await pw.goto(`${srv.base}/?ville=1&qa=1&freeze=1&decors=code&sprites=code`);
  await pw.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
  report.renderer = rendererLabel(await webglRenderer(pw));
  const plate = await pw.evaluate(processPlate, dataUrl(rawPlate));
  const sheet = await pw.evaluate(processSheet, dataUrl(rawSheet));
  const proof = await pw.evaluate(paintPlates, FACADES);
  await pw.context().close();
  const plateBuf = fromUrl(plate.url);
  const k1 = fromUrl(sheet.K1);
  const k3 = fromUrl(sheet.K3);
  writeFileSync(join(ART_D, 'quai-facades-essai.png'), plateBuf);
  writeFileSync(join(ART_S, 'player-pixel-essai-x1.png'), k1);
  writeFileSync(join(ART_S, 'player-pixel-essai-x3.png'), k3);
  const { url: _u, ...plateInfo } = plate;
  const { K1: _a, K3: _b, ...sheetInfo } = sheet;
  report.traitement = {
    plan: { ...plateInfo, sha256: sha(plateBuf), bytes: plateBuf.length },
    feuille: { ...sheetInfo, x1: { sha256: sha(k1), bytes: k1.length }, x3: { sha256: sha(k3), bytes: k3.length } },
  };
  console.log('Plan :', JSON.stringify(report.traitement.plan));
  console.log('Feuille :', JSON.stringify({ ...sheetInfo, shifts: undefined }));
  check(plate.transparentShare > 0.05 && plate.magentaSpill < plate.size[0] * plate.size[1] * 0.002, `plan détouré : ${Math.round(plate.transparentShare * 100)} % transparent, ${plate.magentaSpill} pixels opaques encore teintés de magenta`);
  check(sheet.pitch.x > 2.5 && sheet.pitch.x < 8 && Math.abs(sheet.pitch.x - sheet.pitch.y) < 0.2 && sheet.pitch.rx > 0.1 && sheet.pitch.ry > 0.1, `feuille : pas des pixels d'art ${sheet.pitch.x} × ${sheet.pitch.y} px, même pas dans les deux sens (résultantes ${sheet.pitch.rx}, ${sheet.pitch.ry} : grille du modèle irrégulière, pas une vraie mise à l'échelle au plus proche) ; grille d'art ${sheet.cell.join(' × ')} par case`);
  check(sheet.shifts.every((s) => s) && sheet.clipped === 0, `feuille : 15 cases non vides, pieds alignés, aucun pixel rogné (${sheet.clipped})`);
  check(sheet.counts.tenue.reduce((a, b) => a + b, 0) > 500 && sheet.counts.accent.reduce((a, b) => a + b, 0) > 50, `feuille : tons clés tenue ${JSON.stringify(sheet.counts.tenue)}, accent ${JSON.stringify(sheet.counts.accent)} ; ${sheet.colors} couleurs ; ${sheet.nudged} couleurs naturelles écartées des tons clés`);

  // ---- 2) manifestes de l'essai (copie temporaire, QA, approved: false) -----------------------------------------
  const proofBuf = Object.fromEntries(Object.entries(proof).map(([k, v]) => [k, fromUrl(v)]));
  mkdirSync(join(tmp, 'decors'), { recursive: true });
  for (const [k, b] of Object.entries(proofBuf)) writeFileSync(join(tmp, 'decors', `${k}.png`), b);
  writeFileSync(join(tmp, 'decors', 'quai-facades-essai.png'), plateBuf);
  const ent = (file, buf, o) => ({ file, sha256: sha(buf), size: [buf.readUInt32BE(16), buf.readUInt32BE(20)], source: o.source ?? 'QA : plan de preuve dessiné par code', fiche: o.fiche ?? 'art-src/decors/qa/fiche.json', approved: false, ...o });
  // plan pur du Quai : salle de jeu (x −10,6), maison étroite, le Fanal (x 11,2) ; posé 2 cm devant les façades de preuve
  const X0w = -10.6; const Ww = 21.8;
  const Hw = Ww * plate.size[1] / plate.size[0];
  const lanternLights = plate.lanterns.map((l) => ({ at: [Math.round((X0w + (l.x / plate.size[0]) * Ww) * 100) / 100, Math.round(((plate.size[1] - l.y) / plate.size[1]) * Hw * 100) / 100, -2.4], color: 'ambre', intensity: 2.0, radius: 6, halo: 0.9, flicker: 'lantern' }));
  const lamps = [-13, -4, 5, 14].map((x) => ({ at: [x, 4.0, 2.95], color: 'Astre', intensity: 3.2, radius: 10, halo: 2.0, flicker: 'lantern' }));
  const quai = {
    plans: {
      ciel: ent('ciel.png', proofBuf.ciel, { at: [0, -6, -70], width: 240, orient: 'face', order: 0, blend: 'fondu', fog: 0 }),
      'ville-haute': ent('ville-haute.png', proofBuf['ville-haute'], { at: [0, 0, -24], width: 100, orient: 'face', order: 1, blend: 'decoupe' }),
      facades: ent('facades.png', proofBuf.facades, { at: [0, 0, -3], width: 48, orient: 'face', order: 2, blend: 'decoupe', lit: 0.35 }),
      'facades-essai': ent('quai-facades-essai.png', plateBuf, { at: [X0w + Ww / 2, 0, -2.98], width: Ww, orient: 'face', order: 3, blend: 'decoupe', lit: 0.25, source: 'gpt-image-2 (essai technique V4), détouré par script (tools/m09-essai-v4.mjs)', fiche: 'art-src/decors/quai-facades-essai/fiche.json' }),
      rue: ent('rue.png', proofBuf.rue, { at: [0, 0, 2.95], width: 48, orient: 'face', order: 4, blend: 'decoupe' }),
      'premier-plan': ent('premier-plan.png', proofBuf['premier-plan'], { at: [0, -2, 4.6], width: 48, orient: 'face', order: 5, blend: 'decoupe' }),
      eau: ent('eau.png', proofBuf.eau, { at: [0, -1.15, 12], width: 64, orient: 'sol', order: 6, blend: 'decoupe' }),
    },
    lumieres: [...lamps, ...lanternLights].slice(0, 16),
  };
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify({ version: 1, ilots: { quai } }, null, 2));
  mkdirSync(join(tmp, 'sprites'), { recursive: true });
  writeFileSync(join(tmp, 'sprites', 'player-pixel-essai.png'), k3);
  const playerEntry = {
    file: 'player-pixel-essai.png', sha256: sha(k3), cell: sheet.cell, cols: 5, rows: 3, pixel: true, scale: 3, anchor: sheet.anchor, figureH: sheet.figureH,
    recolor: ['tenue', 'accent'], source: 'gpt-image-2 (essai technique V4), grille d’art, alignement et tons clés par script (tools/m09-essai-v4.mjs)', fiche: 'art-src/sprites/player-essai/fiche.json', approved: false,
  };
  writeFileSync(join(tmp, 'sprites', 'manifest.json'), JSON.stringify({ version: 3, sprites: { player: playerEntry } }, null, 2));
  report.manifestes = { decors: { quai: { ...quai, plans: Object.fromEntries(Object.entries(quai.plans).map(([k, v]) => [k, { ...v }])) } }, sprites: { player: playerEntry } };
  await serve();

  // ---- 3) in situ : décor par code (actuel) contre essai -----------------------------------------------------------
  const SPOTS = { centre: [-0.6, 0.2, 'face'], fanal: [5.6, 0.6, 'droite'] };
  const shots = {};
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    for (const [mode, q] of [['actuel', '&decors=code&sprites=code'], ['essai', ''], ['essai-voile', '&sig=Voile']]) {
      if (mode === 'essai-voile' && w !== 1920) continue;
      const p = await page(w, h);
      await p.goto(`${srv.base}/?ville=1&qa=1&freeze=1${q}`);
      await p.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
      const st = await p.evaluate(() => { const t = window.__lqvVille.town; return { dec: t.decorReport(), spr: t.externalReport(), st: t.stats() }; });
      report.runs[`${mode}-${w}`] = st;
      for (const [k, [x, z, f]] of Object.entries(SPOTS)) {
        const box = await p.evaluate(({ x, z, f }) => { const t = window.__lqvVille.town; t.place({ x, z }, f); t.renderNow(); const pos = t.walker().pos; return { feet: t.project({ x: pos.x, y: 0, z: pos.z }), top: t.project({ x: pos.x, y: t.walkerH(), z: pos.z }) }; }, { x, z, f });
        await p.evaluate(hideUi);
        await p.waitForTimeout(250);
        const buf = await p.screenshot();
        const name = `${mode}-${k}-${w}`;
        if (mode !== 'essai-voile') writeFileSync(join(DIR, `${name}.png`), buf);
        shots[name] = buf;
        if (k === 'centre' && w === 1920) {
          const hh = box.feet.y - box.top.y;
          const clip = { x: Math.round(box.feet.x - hh * 0.55), y: Math.round(box.top.y - hh * 0.175), width: Math.round(hh * 1.1), height: Math.round(hh * 1.35) };
          const cb = await p.screenshot({ clip });
          writeFileSync(join(DIR, `joueur-${mode}-1920.png`), cb);
          report.runs[`${mode}-${w}`].figurePx = Math.round(hh * 10) / 10;
        }
      }
      await p.context().close();
    }
  }
  const E = report.runs['essai-1920'];
  check(E.dec.world === 'diorama' && E.dec.unapproved.includes('quai/facades-essai') && E.dec.pendingFrames === 0, `essai : le Quai en diorama (plan de l'essai non approuvé, admis en QA seulement), aucune image avant la décision ; ${JSON.stringify(E.dec.timings['quai/facades-essai'])}`);
  check(E.spr.loaded.includes('player-Cendre') && E.spr.unapproved.includes('player-Cendre') && E.spr.issues.length === 0, `essai : le joueur dessiné par la feuille de l'essai (contrat v3, non approuvée), aucun refus ; ${JSON.stringify(E.spr.timings)}`);
  check(report.runs['essai-voile-1920'].spr.loaded.includes('player-Voile'), 'essai : la même feuille prend les couleurs de la famille Voile (recoloration par tons clés)');
  check(report.runs['actuel-1920'].dec.world === 'code', 'actuel : décor par code (direction D, provisoire)');
  report.ecran = { figurePx: E.figurePx, pxEcranParPxArt: Math.round((E.figurePx / sheet.figureH) * 100) / 100, figureArt: sheet.figureH };
  check(true, `agrandissement à l'écran du joueur (1920 × 1080) : ${report.ecran.pxEcranParPxArt} px d'écran par px d'art (figure de ${sheet.figureH} px d'art, ${E.figurePx} px à l'écran)`);

  // ---- 4) planche : référence | actuel | essai ; images brutes et traitées ; joueur --------------------------------
  const refBuf = readFileSync('reference/generated/2026-10-19-quai-nuit-cameras/02.png');
  const pp = await page(1600, 1000);
  const planche = await pp.evaluate(async (u) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const [ref, act, ess, rawP, plate, rawS, k3, j0, j1, j2] = await Promise.all([u.ref, u.act, u.ess, u.rawP, u.plate, u.rawS, u.k3, u.j0, u.j1, u.j2].map(load));
    const pad = 16; const W = 3 * 640 + 4 * pad; const c = document.createElement('canvas'); c.width = W; c.height = 34 + 440 + 320;
    const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#e8dcc0'; g.font = '15px system-ui';
    g.fillText('Essai technique V4 (ADR 028) : 2 images gpt-image-2 traitées par scripts, en QA (approved: false) — Quai, centre, 1920 × 1080 réduit', pad, 22);
    const row = 34;
    g.drawImage(ref, pad, row, 640 * 1536 / 1536, 640 * 1024 / 1536); g.fillText('Référence initiale approuvée (02.png)', pad, row + 427 + 22 - 27);
    g.drawImage(act, 2 * pad + 640, row, 640, 360); g.fillText('Quai actuel (décor et personnages par code, provisoires)', 2 * pad + 640, row + 360 + 22);
    g.drawImage(ess, 3 * pad + 1280, row, 640, 360); g.fillText('Essai : plan des façades + feuille du joueur (le reste : plans de preuve)', 3 * pad + 1280, row + 360 + 22);
    const r2 = row + 440;
    // brut du plan sur damier, plan détouré sur damier
    const checker = (x, y, w, h) => { for (let yy = 0; yy < h; yy += 12) for (let xx = 0; xx < w; xx += 12) { g.fillStyle = ((xx + yy) / 12) % 2 ? '#2a2d38' : '#1c1f28'; g.fillRect(x + xx, y + yy, Math.min(12, w - xx), Math.min(12, h - yy)); } };
    g.drawImage(rawP, pad, r2, 400, 267); g.fillStyle = '#e8dcc0'; g.fillText('Plan brut (fond magenta demandé)', pad, r2 + 300);
    const pw2 = 400; const ph2 = Math.round(400 * plate.height / plate.width); checker(2 * pad + 400, r2, pw2, ph2); g.drawImage(plate, 2 * pad + 400, r2, pw2, ph2); g.fillStyle = '#e8dcc0'; g.fillText('Plan détouré et recadré par script', 2 * pad + 400, r2 + 300);
    g.drawImage(rawS, 3 * pad + 800, r2, 260, 260); g.fillText('Feuille brute (fond cyan)', 3 * pad + 800, r2 + 300);
    g.imageSmoothingEnabled = false; checker(4 * pad + 1060, r2, 260, 260); g.drawImage(k3, 4 * pad + 1060, r2, 260, 260); g.imageSmoothingEnabled = true; g.fillStyle = '#e8dcc0'; g.fillText('Feuille v3 : grille d’art, tons clés', 4 * pad + 1060, r2 + 300);
    const jw = 120; let x = 5 * pad + 1320;
    for (const [im, lab] of [[j0, 'code'], [j1, 'essai Cendre'], [j2, 'essai Voile']]) { const h2 = Math.round(jw * im.height / im.width); if (x + jw > W) break; g.drawImage(im, x, r2, jw, h2); g.fillText(lab, x, r2 + h2 + 18); x += jw + pad; }
    return c.toDataURL('image/png');
  }, {
    ref: dataUrl(refBuf), act: dataUrl(shots['actuel-centre-1920']), ess: dataUrl(shots['essai-centre-1920']), rawP: dataUrl(rawPlate), plate: dataUrl(plateBuf), rawS: dataUrl(rawSheet), k3: dataUrl(k3),
    j0: dataUrl(readFileSync(join(DIR, 'joueur-actuel-1920.png'))), j1: dataUrl(readFileSync(join(DIR, 'joueur-essai-1920.png'))), j2: dataUrl(readFileSync(join(DIR, 'joueur-essai-voile-1920.png'))),
  });
  writeFileSync(join(DIR, 'planche-essai-v4.png'), fromUrl(planche));
  await pp.context().close();
} finally {
  const bad = report.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
  check(bad.length === 0, `aucune erreur ni avertissement de console (${bad.length}${bad.length ? ` : ${bad.slice(0, 3).join(' | ')}` : ''})`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  srv?.stop();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
