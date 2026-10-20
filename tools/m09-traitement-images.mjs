// M09 V4 — traitement PAR SCRIPTS des images générées de la ville (ADR 028, B3) : fonctions autonomes exécutées dans la
// page (`page.evaluate(fonction, argument)`, canvas), partagées par l'essai (`m09-essai-v4.mjs`) et la porte du Quai
// (`m09-porte-quai.mjs`). Aucune retouche à la main : détourage d'un fond uni, recadrage, repérage des lanternes peintes,
// découpe des accessoires, grille d'art, alignement, palette, tons clés.
/**
 * Dans la page : détoure le plan (fond magenta uni), le recadre, repère les lanternes peintes. Argument : l'URL de l'image
 * (réglages par défaut, ceux de l'essai) ou { url, key, crop, lanternFrom, maxLanterns } : `key` 'magenta' (défaut) ou
 * 'aucun' (image opaque : ciel, eau) ; `crop` 'pied' (défaut : bas sur le pied des murs, rangée opaque à plus de 50 %),
 * 'contenu' (boîte des pixels non transparents) ou 'aucun' ; `lanternFrom` : fraction du haut au-delà de laquelle on
 * cherche les lanternes (défaut 0,5) ; `maxLanterns` (défaut 8 ; 0 : aucune).
 */
export async function processPlate(arg) {
  const url = typeof arg === 'string' ? arg : arg.url;
  const o = typeof arg === 'string' ? {} : arg;
  const crop = o.crop ?? 'pied';
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
    let a = o.key === 'aucun' ? 1 : 1 - Math.min(1, Math.max(0, (m - M0) / (M1 - M0)));
    if (a < 0.04) a = 0;
    A[i] = a;
    if (a > 0 && a < 1) for (let k = 0; k < 3; k++) p[i * 4 + k] = Math.max(0, Math.min(255, Math.round((p[i * 4 + k] - (1 - a) * K[k]) / a)));
    p[i * 4 + 3] = Math.round(a * 255);
    if (a === 1 && m > 30 && o.key !== 'aucun') spill++;
  }
  const opaque = (x, y) => A[y * W + x] > 0.5;
  let bottom = H - 1;
  if (crop === 'pied') for (let y = H - 1; y >= 0; y--) { let n = 0; for (let x = 0; x < W; x++) if (opaque(x, y)) n++; if (n > 0.5 * W) { bottom = y; break; } }
  if (crop === 'contenu') for (let y = H - 1; y >= 0; y--) { let any = false; for (let x = 0; x < W; x++) if (A[y * W + x] > 0) { any = true; break; } if (any) { bottom = y; break; } }
  let top = 0;
  if (crop !== 'aucun') for (let y = 0; y <= bottom; y++) { let any = false; for (let x = 0; x < W; x++) if (A[y * W + x] > 0) { any = true; break; } if (any) { top = Math.max(0, y - 2); break; } }
  const colCover = (x) => { let n = 0; for (let y = top; y <= bottom; y++) if (opaque(x, y)) n++; return n / (bottom - top + 1); };
  const colAny = (x) => { for (let y = top; y <= bottom; y++) if (A[y * W + x] > 0) return true; return false; };
  let left = 0; let right = W - 1;
  if (crop === 'pied') { while (left < W - 1 && colCover(left) < 0.3) left++; while (right > 0 && colCover(right) < 0.3) right--; }
  if (crop === 'contenu') { while (left < W - 1 && !colAny(left)) left++; while (right > 0 && !colAny(right)) right--; }
  const w = right - left + 1; const h = bottom - top + 1;
  const outC = new OffscreenCanvas(w, h); const og = outC.getContext('2d');
  const out = og.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const si = ((y + top) * W + x + left) * 4; out.data.set(p.subarray(si, si + 4), (y * w + x) * 4); }
  og.putImageData(out, 0, 0);
  // lanternes peintes : taches chaudes et claires du rez-de-chaussée (moitié basse), par blocs de 4 × 4 px
  const B = 4; const bw = Math.floor(w / B); const bh = Math.floor(h / B);
  const hot = new Uint8Array(bw * bh);
  for (let by = Math.floor(bh * (o.lanternFrom ?? 0.5)); by < bh; by++) for (let bx = 0; bx < bw; bx++) {
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
  for (const b of blobs) if (lanterns.length < (o.maxLanterns ?? 8) && lanterns.every((l) => Math.hypot(l.x - b.x, l.y - b.y) > 50)) lanterns.push(b);
  const blob = await outC.convertToBlob({ type: 'image/png' });
  const res = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  let transparent = 0; for (let i = 0; i < w * h; i++) if (out.data[i * 4 + 3] === 0) transparent++;
  return { url: res, size: [w, h], crop: { left, top, right, bottom }, transparentShare: Math.round((transparent / (w * h)) * 1000) / 1000, magentaSpill: spill, lanterns };
}

/**
 * Dans la page : feuille du joueur. Fond cyan uni détouré (alpha binaire) ; pas des pixels d'art mesuré sur les arêtes
 * de couleur (longueur de résultante maximale, plus grand pas parmi les quasi-maxima) ; cases ramenées à la grille d'art
 * (couleur majoritaire du cœur de chaque bloc) ; pieds sur une même ligne, tête centrée ; tons clés exacts.
 * Argument : l'URL (réglages de l'essai : cases aux cinquièmes et aux tiers de l'image, niveaux des tons clés rapportés au
 * plus clair) ou { url, figures, levels } : `figures` : chaque figure repérée par les bandes vides entre rangées et
 * colonnes (le modèle ne pose pas toujours ses rangées aux tiers), case taillée sur la plus grande figure ; `levels`
 * 'kmeans' : les quatre niveaux d'un ton clé tirés de quatre groupes de valeurs (ombre profonde, ombre, aplat, rehaut).
 */
export async function processSheet(arg) {
  const url = typeof arg === 'string' ? arg : arg.url;
  const o = typeof arg === 'string' ? {} : arg;
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
  let cw = Math.round(cellW / P); let ch = Math.round(cellH / P);
  /** Couleur majoritaire (5 bits par canal) du cœur du bloc d'art d'origine (x0, y0), dans la boîte `box` ; null : vide. */
  const vote = (x0, y0, box) => {
    const votes = new Map(); let total = 0; let filled = 0;
    for (let yy = y0 + P * 0.25; yy < y0 + P * 0.75; yy += 0.5) for (let xx = x0 + P * 0.25; xx < x0 + P * 0.75; xx += 0.5) {
      const X = Math.floor(xx); const Y = Math.floor(yy);
      if (X < box[0] || Y < box[1] || X > box[2] || Y > box[3]) continue;
      total++;
      const si = Y * W + X;
      if (!op[si]) continue;
      filled++;
      const key = ((d[si * 4] >> 3) << 10) | ((d[si * 4 + 1] >> 3) << 5) | (d[si * 4 + 2] >> 3);
      const v = votes.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }; v.n++; v.r += d[si * 4]; v.g += d[si * 4 + 1]; v.b += d[si * 4 + 2]; votes.set(key, v);
    }
    if (!total || filled * 2 < total) return null;
    let best = null; for (const v of votes.values()) if (!best || v.n > best.n) best = v;
    return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
  };
  let art; let AW; let figures = null;
  if (o.figures) {
    // figures repérées : rangées puis colonnes séparées par des bandes vides
    const runsOf = (counts, minGap, minLen) => {
      const runs = []; let s0 = -1; let last = -1e9;
      for (let i = 0; i < counts.length; i++) if (counts[i] > 0) { if (s0 < 0 || i - last > minGap) { if (s0 >= 0) runs.push([s0, last]); s0 = i; } last = i; }
      if (s0 >= 0) runs.push([s0, last]);
      return runs.filter((r) => r[1] - r[0] + 1 >= minLen);
    };
    const largest = (runs, n) => [...runs].sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, n).sort((a, b) => a[0] - b[0]);
    const rowCounts = new Int32Array(H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rowCounts[y] += op[y * W + x];
    const rows = largest(runsOf(rowCounts, 12, 40), 3);
    figures = [];
    for (const [y0, y1] of rows) {
      const colCounts = new Int32Array(W); for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) colCounts[x] += op[y * W + x];
      for (const [x0, x1] of largest(runsOf(colCounts, 6, 15), 5)) {
        let t = y1; let b = y0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (op[y * W + x]) { if (y < t) t = y; if (y > b) b = y; }
        figures.push([x0, t, x1, b]);
      }
    }
    if (figures.length !== 15) throw new Error(`feuille : ${figures.length} figures repérées au lieu de 15 (${rows.length} rangées)`);
    const maxW = Math.max(...figures.map((f) => (f[2] - f[0] + 1) / P)); const maxH = Math.max(...figures.map((f) => (f[3] - f[1] + 1) / P));
    cw = Math.min(96, Math.ceil(maxW * 1.5) + 4); ch = Math.min(160, Math.ceil(maxH) + 8);
    AW = cw * 5; art = new Uint8ClampedArray(AW * ch * 3 * 4);
    figures.forEach((f, k) => {
      const r = Math.floor(k / 5); const col = k % 5;
      const gi0 = Math.floor((f[0] - px.ph) / P) - 1; const gi1 = Math.ceil((f[2] - px.ph) / P) + 1;
      const gj0 = Math.floor((f[1] - py.ph) / P) - 1; const gj1 = Math.ceil((f[3] - py.ph) / P) + 1;
      for (let gj = gj0; gj <= gj1; gj++) for (let gi = gi0; gi <= gi1; gi++) {
        const v = vote(px.ph + gi * P, py.ph + gj * P, f);
        if (!v) continue;
        const i = gi - gi0 + 1; const j = gj - gj0 + 1;
        if (i < 0 || j < 0 || i >= cw || j >= ch) continue;
        const oo = ((r * ch + j) * AW + col * cw + i) * 4;
        art[oo] = v[0]; art[oo + 1] = v[1]; art[oo + 2] = v[2]; art[oo + 3] = 255;
      }
    });
  } else {
  // grille d'art de chaque case : couleur majoritaire (5 bits par canal) du cœur de chaque bloc
  art = new Uint8ClampedArray(cw * 5 * ch * 3 * 4);
  AW = cw * 5;
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
  // option figures : l'accent (bandeau, écharpe) n'existe que dans le haut de la figure (sous 45 % de sa hauteur)
  const accentOk = (i) => {
    if (!o.figures) return true;
    const j = Math.floor(i / AW) % ch; const k = Math.floor(Math.floor(i / AW) / ch) * 5 + Math.floor((i % AW) / cw);
    const sh = shifts[k]; return !sh || j <= BASE - sh.h + 1 + 0.45 * sh.h;
  };
  for (let i = 0; i < cls.length; i++) {
    if (!aligned[i * 4 + 3]) continue;
    const [hh, s, v] = hsv(aligned[i * 4], aligned[i * 4 + 1], aligned[i * 4 + 2]);
    if (s > 0.45 && v > 0.12 && hh >= 280 && hh <= 345) { cls[i] = 1; vs[1].push(v); }
    else if (s > 0.35 && v > 0.12 && hh >= 85 && hh <= 165 && accentOk(i)) { cls[i] = 2; vs[2].push(v); }
  }
  const vmax = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.98)] ?? 1; };
  const VM = { 1: vmax(vs[1]), 2: vmax(vs[2]) };
  // niveaux par groupes (option `levels: 'kmeans'`) : quatre groupes de valeurs (k-moyennes à une dimension), rangés ;
  // le groupe le plus peuplé est l'aplat (niveau 191), les plus clairs le rehaut, les plus sombres l'ombre et l'ombre
  // profonde
  const groups = (a) => {
    const s1 = [...a].sort((x, y) => x - y); if (!s1.length) return [];
    let cs = [0.1, 0.4, 0.7, 0.95].map((q) => s1[Math.floor(q * (s1.length - 1))]);
    for (let it = 0; it < 20; it++) { const acc = cs.map(() => [0, 0]); for (const v of s1) { let bi = 0; for (let k = 1; k < cs.length; k++) if (Math.abs(v - cs[k]) < Math.abs(v - cs[bi])) bi = k; acc[bi][0] += v; acc[bi][1]++; } cs = cs.map((c0, k) => (acc[k][1] ? acc[k][0] / acc[k][1] : c0)); }
    cs = cs.sort((x, y) => x - y);
    const n = cs.map(() => 0); for (const v of s1) { let bi = 0; for (let k = 1; k < cs.length; k++) if (Math.abs(v - cs[k]) < Math.abs(v - cs[bi])) bi = k; n[bi]++; }
    const m = n.indexOf(Math.max(...n));
    return cs.map((c0, k) => ({ c: c0, level: Math.max(0, Math.min(3, 2 + k - m)) }));
  };
  const GC = o.levels === 'kmeans' ? { 1: groups(vs[1]), 2: groups(vs[2]) } : null;
  const counts = { tenue: [0, 0, 0, 0], accent: [0, 0, 0, 0] };
  for (let i = 0; i < cls.length; i++) {
    if (!cls[i]) continue;
    const vv = Math.max(aligned[i * 4], aligned[i * 4 + 1], aligned[i * 4 + 2]) / 255;
    const v = vv / VM[cls[i]] * 255;
    const l = GC ? GC[cls[i]].reduce((bi, x) => (Math.abs(x.c - vv) < Math.abs(bi.c - vv) ? x : bi)).level : LV.reduce((bi, x, k) => (Math.abs(x - v) < Math.abs(LV[bi] - v) ? k : bi), 0);
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
    shifts, clipped, counts, nudged, colors: colors.size, figures,
  };
}


/**
 * Dans la page : planche d'accessoires sur fond magenta uni. Détourage (comme `processPlate`), puis découpe des objets
 * (composantes connexes de l'alpha ; une petite tache dans la boîte d'un objet lui est rattachée, les autres écartées),
 * triés de gauche à droite ; chaque objet recadré sur sa boîte.
 */
export async function extractProps(url) {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.width; const H = img.height;
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const src = g.getImageData(0, 0, W, H); const p = src.data;
  const M0 = 45; const M1 = 205; const K = [255, 0, 255];
  const A = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const m = Math.min(p[i * 4], p[i * 4 + 2]) - p[i * 4 + 1];
    let a = 1 - Math.min(1, Math.max(0, (m - M0) / (M1 - M0)));
    if (a < 0.04) a = 0;
    A[i] = a;
    if (a > 0 && a < 1) for (let k = 0; k < 3; k++) p[i * 4 + k] = Math.max(0, Math.min(255, Math.round((p[i * 4 + k] - (1 - a) * K[k]) / a)));
    p[i * 4 + 3] = Math.round(a * 255);
  }
  // composantes connexes (8 voisins) de l'alpha > 0,1
  const lab = new Int32Array(W * H).fill(-1); const comps = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (A[i0] <= 0.1 || lab[i0] >= 0) continue;
    const id = comps.length; const q = [i0]; lab[i0] = id;
    let x0 = W; let y0 = H; let x1 = 0; let y1 = 0; let n = 0;
    while (q.length) {
      const i = q.pop(); const x = i % W; const y = (i / W) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx; const ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (A[j] > 0.1 && lab[j] < 0) { lab[j] = id; q.push(j); } }
    }
    comps.push({ id, x0, y0, x1, y1, n });
  }
  const big = comps.filter((k) => k.n > 0.002 * W * H);
  // une petite tache proche d'un grand objet (corde, filet détaché) lui est rattachée
  const objs = big.map((k) => ({ ...k, ids: [k.id] }));
  for (const k of comps) {
    if (big.includes(k) || k.n < 20) continue;
    const o = objs.find((b) => k.x0 >= b.x0 - 12 && k.x1 <= b.x1 + 12 && k.y0 >= b.y0 - 12 && k.y1 <= b.y1 + 12);
    if (o) o.ids.push(k.id);
  }
  objs.sort((a, b) => a.x0 - b.x0);
  const out = [];
  for (const o of objs) {
    const w = o.x1 - o.x0 + 1; const h = o.y1 - o.y0 + 1;
    const oc = new OffscreenCanvas(w, h); const og = oc.getContext('2d'); const d = og.createImageData(w, h);
    const ids = new Set(o.ids);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const si = (y + o.y0) * W + x + o.x0; if (ids.has(lab[si])) d.data.set(p.subarray(si * 4, si * 4 + 4), (y * w + x) * 4); }
    og.putImageData(d, 0, 0);
    const blob = await oc.convertToBlob({ type: 'image/png' });
    const u = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
    out.push({ url: u, box: [o.x0, o.y0, w, h], pixels: o.n });
  }
  return { size: [W, H], objects: out, ignored: comps.length - objs.length };
}

/**
 * Dans la page : lanternes peintes d'une image déjà détourée (alpha conservé) : taches chaudes et claires, par blocs de
 * 4 × 4 px, sous la fraction `from` du haut ; au plus `max`, espacées de 50 px.
 */
export async function findLanterns({ url, from = 0, max = 8 }) {
  const img = new Image(); img.src = url; await img.decode();
  const w = img.width; const h = img.height;
  const c = new OffscreenCanvas(w, h); const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  const B = 4; const bw = Math.floor(w / B); const bh = Math.floor(h / B);
  const hot = new Uint8Array(bw * bh);
  for (let by = Math.floor(bh * from); by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    let n = 0;
    for (let yy = 0; yy < B; yy++) for (let xx = 0; xx < B; xx++) {
      const i = ((by * B + yy) * w + bx * B + xx) * 4;
      if (d[i + 3] > 200 && d[i] > 210 && d[i + 1] > 140 && d[i + 2] < 150 && d[i] - d[i + 2] > 90) n++;
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
  const out = [];
  for (const b of blobs) if (out.length < max && out.every((l) => Math.hypot(l.x - b.x, l.y - b.y) > 50)) out.push(b);
  return out;
}

/**
 * Dans la page : assemble des images côte à côte, pieds alignés, à une même densité (px par mètre) : chaque partie
 * occupe sa largeur au monde ; `overlap` (m) : recouvrement fondu entre deux parties voisines (bord gauche de la
 * suivante en rampe d'alpha) ; `cropL` (fraction) : début d'une partie retiré (reprise du bout de la précédente). Renvoie
 * l'image, sa taille, la rangée la plus haute couverte à plus de 80 %.
 */
export async function composeRow({ parts, density, overlap = 0 }) {
  const imgs = await Promise.all(parts.map(async (p) => { const i = new Image(); i.src = p.url; await i.decode(); return i; }));
  const cl = parts.map((p, k) => Math.round((p.cropL ?? 0) * imgs[k].width));
  const ws = parts.map((p) => Math.round(p.worldW * density));
  const hs = imgs.map((im, k) => Math.round((im.height / (im.width - cl[k])) * ws[k]));
  const ov = Math.round(overlap * density);
  const W = ws.reduce((a, b) => a + b, 0) - ov * (parts.length - 1);
  const H = Math.max(...hs);
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  let x = 0; const offsets = [];
  imgs.forEach((im, k) => {
    const tmp = new OffscreenCanvas(ws[k], hs[k]); const tg = tmp.getContext('2d', { willReadFrequently: true });
    tg.imageSmoothingQuality = 'high';
    tg.drawImage(im, cl[k], 0, im.width - cl[k], im.height, 0, 0, ws[k], hs[k]);
    if (k > 0 && ov > 0) {
      const d = tg.getImageData(0, 0, ov, hs[k]);
      for (let y = 0; y < hs[k]; y++) for (let xx = 0; xx < ov; xx++) d.data[(y * ov + xx) * 4 + 3] *= (xx + 0.5) / ov;
      tg.putImageData(d, 0, 0);
    }
    g.drawImage(tmp, x, H - hs[k]);
    offsets.push({ x, y: H - hs[k], w: ws[k], h: hs[k] });
    x += ws[k] - ov;
  });
  const d = g.getImageData(0, 0, W, H).data;
  let fullTop = -1;
  for (let y = 0; y < H && fullTop < 0; y++) { let n = 0; for (let xx = 0; xx < W; xx++) if (d[(y * W + xx) * 4 + 3] > 200) n++; if (n > 0.8 * W) fullTop = y; }
  const blob = await c.convertToBlob({ type: 'image/png' });
  const url = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  return { url, size: [W, H], offsets, fullTop };
}

/**
 * Dans la page : bande d'accessoires posés au monde : largeur `widthM` (x de −widthM/2 à widthM/2), hauteur `heightM`,
 * densité `density` ; chaque objet posé pied au sol (bas de la bande) au centre x, à sa hauteur au monde `h` (m).
 */
export async function composeStrip({ widthM, heightM, density, items }) {
  const W = Math.round(widthM * density); const H = Math.round(heightM * density);
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  const placed = [];
  for (const it of items) {
    const im = new Image(); im.src = it.url; await im.decode();
    const h = Math.round(it.h * density); const w = Math.round((im.width / im.height) * h);
    const x = Math.round((it.x + widthM / 2) * density - w / 2);
    g.drawImage(im, x, H - h, w, h);
    placed.push({ name: it.name, x, y: H - h, w, h });
  }
  const blob = await c.convertToBlob({ type: 'image/png' });
  const url = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  return { url, size: [W, H], placed };
}

/**
 * Dans la page : au-dessus de la rangée `row`, ne garde que les composantes de pixels pleins (8 voisins, alpha > 0,5) qui atteignent la
 * fraction `topFrac` du haut de l'image (mâts et gréements des bateaux, et ce qui y est relié) ; le reste y est effacé
 * (objets posés sur le haut du mur du quai, qui se trouveraient devant la rue). Les composantes sont tirées au-dessus de
 * la crête irrégulière du mur (`margin` px sous la rangée pleine), qui sinon relie tout ; dans la crête, seul ce qui est
 * sous un objet retiré est effacé. Renvoie l'image et ce qui a été effacé.
 */
export async function clearAbove({ url, row, topFrac = 0.15, margin = 14 }) {
  const img = new Image(); img.src = url; await img.decode();
  const W = img.width; const H = img.height;
  const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, W, H); const d = id.data;
  // composantes des pixels pleins (alpha > 128, 8 voisins) au-dessus de la crête du mur (rangée - marge)
  const R = Math.max(1, row - margin);
  const lab = new Int32Array(W * R).fill(-1); const keep = [];
  for (let i0 = 0; i0 < W * R; i0++) {
    if (d[i0 * 4 + 3] <= 128 || lab[i0] >= 0) continue;
    const k = keep.length; const q = [i0]; lab[i0] = k; let top = R;
    while (q.length) {
      const i = q.pop(); const x = i % W; const y = (i / W) | 0; if (y < top) top = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx; const ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= R) continue; const j = ny * W + nx; if (d[j * 4 + 3] > 128 && lab[j] < 0) { lab[j] = k; q.push(j); } }
    }
    keep.push(top < topFrac * H);
  }
  // pixels gardés : pleins d'une composante gardée, ou à bord doux à deux pixels au plus de l'un d'eux
  const kept = new Uint8Array(W * R);
  for (let i = 0; i < W * R; i++) if (lab[i] >= 0 && keep[lab[i]]) kept[i] = 1;
  let cleared = 0;
  const removedCol = new Uint8Array(W);
  for (let i = 0; i < W * R; i++) {
    if (!d[i * 4 + 3] || kept[i]) continue;
    let near = false;
    if (lab[i] < 0) { const x = i % W; const y = (i / W) | 0; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx; const ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < R && kept[ny * W + nx]) { near = true; break; } } }
    if (!near) { d[i * 4 + 3] = 0; cleared++; if (((i / W) | 0) >= R - 3 && lab[i] >= 0) removedCol[i % W] = 1; }
  }
  // crête du mur : effacée seulement sous un objet retiré (même colonne, touchant le bas de la zone examinée)
  for (let y = R; y < row; y++) for (let x = 0; x < W; x++) if (removedCol[x] && d[(y * W + x) * 4 + 3]) { d[(y * W + x) * 4 + 3] = 0; cleared++; }
  g.putImageData(id, 0, 0);
  const blob = await c.convertToBlob({ type: 'image/png' });
  const out = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  return { url: out, size: [W, H], cleared, components: keep.length, kept: keep.filter(Boolean).length };
}
