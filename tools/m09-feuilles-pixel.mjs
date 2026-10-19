// M09 V4 — preuve des feuilles de personnages en pixel art (ADR 028, A2 : contrat v3), SANS aucune image externe ni
// générée : nos propres atlas dessinés par code, réduits à une grille d'art de 48 × 80 par case (échelle 0,5), alpha
// binaire et tons clés ramenés exactement sur leurs niveaux, dans une COPIE TEMPORAIRE du build.
//   K  feuille en tons clés (tenue du joueur ; peau, cheveux, tenue, chemise du docker) ;
//   C  la même feuille où chaque ton clé est déjà peint de la couleur cible du personnage (aucune recoloration) ;
// Parcours (un manifeste v3 par parcours, serveur relancé) :
//   P1 K agrandie ×3 (720 × 720) recolorée dans le nuanceur ; P2 C ×3 sans recoloration : P1 = P2 au pixel près
//      attendu (recoloration exacte, sans liseré de filtrage) ;
//   P3 K à ×1 (240 × 240) : même image que P1 (l'agrandissement entier de la feuille ne change rien) ;
//   P4 témoin : K agrandie ×2 en feuille LISSE du contrat v2 (480 × 480, filtrage linéaire) : écart attendu avec P2 ;
//   P0 atlas par code (référence) ; refus motivé d'une feuille v3 aux dimensions fausses ; docker 1 et docker 9 sur la
//      même feuille de gabarit, chacun à ses couleurs ; agrandissement à l'écran (px d'écran par px d'art).
// Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-feuilles-pixel.mjs [dossier] [rapport.json]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/v4-pixel';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/v4-pixel.json';
const DIST = process.env.LQV_DIST || 'dist';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src tools public').toString().trim() ? '+arbre de travail' : '';
const tmp = mkdtempSync(join(tmpdir(), 'lqv-pixel-'));
cpSync(DIST, tmp, { recursive: true });
mkdirSync(DIR, { recursive: true });
const browser = await launch();
const report = { date: new Date().toISOString(), commit: `${head}${dirty}`, dist: DIST, renderer: null, checks: [], console: [], runs: {}, compare: {} };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const sha = (b) => createHash('sha256').update(b).digest('hex');
let srv = null;
let port = 4411;
const serve = async () => { srv?.stop(); srv = await startPreview(port++, tmp); return srv; };
const page = async (w, h) => {
  const p = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, report.console);
  return p;
};
const lab = async (p, query) => {
  await p.goto(`${srv.base}/?ville=1&qa=1${query}`);
  await p.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
  return p.evaluate(() => ({ rep: window.__lqvVille.town.externalReport(), st: window.__lqvVille.town.stats() }));
};
/** Place le joueur (ou le laisse à l'écart et vise le docker 1), rend, et renvoie la boîte écran du personnage visé. */
const frame = (p, who) => p.evaluate((who) => {
  const t = window.__lqvVille.town;
  if (who === 'docker') t.place({ x: -6.5, z: -1.4 }, 'droite'); else t.place({ x: -0.6, z: 0.2 }, 'face');
  t.renderNow();
  const at = who === 'docker' ? { x: -2.4, z: 1.4 } : t.walker().pos;
  return { feet: t.project({ x: at.x, y: 0, z: at.z }), top: t.project({ x: at.x, y: t.walkerH(), z: at.z }) };
}, who);
const crop = async (p, box, name, pad = 0.35) => {
  const h = box.feet.y - box.top.y;
  const clip = { x: Math.round(box.feet.x - h * 0.55), y: Math.round(box.top.y - h * pad * 0.5), width: Math.round(h * 1.1), height: Math.round(h * (1 + pad)) };
  await p.waitForTimeout(250);
  const buf = await p.screenshot({ clip });
  writeFileSync(join(DIR, `${name}.png`), buf);
  return { buf, clip, h };
};
const diff = (p, a, b) => p.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const [P, Q] = [await load(a), await load(b)];
  if (P.width !== Q.width || P.height !== Q.height) return { error: 'tailles différentes' };
  let sum = 0; let px = 0; let over8 = 0; let max = 0;
  for (let i = 0; i < P.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = Math.abs(P.data[i + c] - Q.data[i + c]); sum += e; d = Math.max(d, e); }
    if (d) px++;
    if (d > 8) over8++;
    max = Math.max(max, d);
  }
  return { meanAbs: Math.round((sum / (P.data.length / 4 * 3)) * 1000) / 1000, pixels: px, over8, total: P.data.length / 4, max };
}, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });

/**
 * Dans la page : réduit un atlas par code (échelle 0,5) en feuille de pixel art. Alpha binaire ; un pixel proche d'une
 * teinte clé des emplacements donnés est ramené exactement sur son niveau (64, 128, 191, 255) ; un pixel seulement
 * teinté vers une clé (mélange antialiasé avec une autre couleur) est désaturé, pour qu'aucune frange clé ne subsiste.
 * Renvoie K (tons clés), C (tons clés remplacés par les couleurs cibles du personnage) à ×1, ×2 et ×3.
 */
async function pixelSheets({ url, slots, targets }) {
  const MASK = { peau: [1, 0, 0], cheveux: [1, 1, 0], tenue: [1, 0, 1], chemise: [0, 1, 1], accent: [0, 1, 0] };
  const LV = [64, 128, 191, 255];
  const STEPS = ['deep', 'shade', 'base', 'hi'];
  const img = new Image(); img.src = url; await img.decode();
  const W = img.width; const H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const K = g.getImageData(0, 0, W, H);
  const C = new ImageData(W, H);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  let keyed = 0; let desat = 0;
  const d = K.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; C.data.set([0, 0, 0, 0], i); continue; }
    d[i + 3] = 255;
    const rgb = [d[i], d[i + 1], d[i + 2]];
    let best = null; let loose = false;
    for (const s of slots) {
      const m = MASK[s];
      const act = rgb.filter((_, k) => m[k]); const ina = rgb.filter((_, k) => !m[k]);
      const mean = act.reduce((a, b) => a + b, 0) / act.length;
      const err = Math.max(...act) - Math.min(...act) + (ina.length ? Math.max(...ina) : 0);
      if (mean >= 32 && err <= 0.35 * mean && (!best || err < best.err)) best = { s, mean, err };
      else if (mean >= 32 && err <= 0.9 * mean) loose = true;
    }
    if (best) {
      const l = LV.reduce((bi, v, k) => (Math.abs(v - best.mean) < Math.abs(LV[bi] - best.mean) ? k : bi), 0);
      const m = MASK[best.s];
      d[i] = m[0] * LV[l]; d[i + 1] = m[1] * LV[l]; d[i + 2] = m[2] * LV[l];
      C.data.set([...hex(targets[best.s][STEPS[l]]), 255], i);
      keyed++;
      continue;
    }
    if (loose) { const y = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]); d[i] = d[i + 1] = d[i + 2] = y; desat++; }
    C.data.set([d[i], d[i + 1], d[i + 2], 255], i);
  }
  const out = (data, k) => {
    const s = document.createElement('canvas'); s.width = W; s.height = H; s.getContext('2d').putImageData(data, 0, 0);
    const b = document.createElement('canvas'); b.width = W * k; b.height = H * k;
    const bg = b.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(s, 0, 0, W * k, H * k);
    return b.toDataURL('image/png');
  };
  return { K1: out(K, 1), K2: out(K, 2), K3: out(K, 3), C3: out(C, 3), keyed, desat, size: [W, H] };
}

try {
  // ---- 0) feuilles de pixel art tirées de nos atlas par code ------------------------------------------------------
  await serve();
  const p0 = await page(800, 600);
  await lab(p0, '&freeze=1&sprites=code');
  report.renderer = rendererLabel(await webglRenderer(p0));
  const src = await p0.evaluate(() => {
    const V = window.__lqvVille;
    return {
      player: { url: V.atlasAt('player-Cendre', 0.5, ['tenue']), slots: ['tenue'], targets: V.targets('player-Cendre') },
      docker: { url: V.atlasAt('pnj-docker-1', 0.5, ['peau', 'cheveux', 'tenue', 'chemise']), slots: ['peau', 'cheveux', 'tenue', 'chemise'], targets: V.targets('pnj-docker-1') },
    };
  });
  const sheets = { player: await p0.evaluate(pixelSheets, src.player), docker: await p0.evaluate(pixelSheets, src.docker) };
  await p0.context().close();
  const files = {};
  mkdirSync(join(tmp, 'sprites'), { recursive: true });
  for (const [who, s] of Object.entries(sheets)) {
    for (const k of ['K1', 'K2', 'K3', 'C3']) {
      const b = Buffer.from(s[k].split(',')[1], 'base64');
      files[`${who}-${k}`] = b;
      writeFileSync(join(tmp, 'sprites', `${who}-${k}.png`), b);
    }
    report[`feuille_${who}`] = { grille: s.size, pixelsCles: s.keyed, pixelsDesatures: s.desat };
  }
  writeFileSync(join(DIR, 'feuille-player-pixel-K3.png'), files['player-K3']);
  writeFileSync(join(DIR, 'feuille-pnj-docker-pixel-K3.png'), files['docker-K3']);
  const dims = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
  const px = (name, o = {}) => ({
    file: `${name}.png`, sha256: sha(files[name]), cell: [48, 80], cols: 5, rows: 3, pixel: true, scale: 3, anchor: [24, 76], figureH: 74,
    source: 'QA : atlas dessiné par code, réduit en pixel art (aucune image externe ni générée)', fiche: 'art-src/sprites/qa/fiche.json', approved: false, ...o,
  });
  const lisse = (name, o = {}) => ({
    file: `${name}.png`, sha256: sha(files[name]), cell: [96, 160], cols: 5, rows: 3, scale: 1, anchor: [48, 152], figureH: 148,
    source: 'QA : témoin lisse (contrat v2)', fiche: 'art-src/sprites/qa/fiche.json', approved: false, ...o,
  });
  report.dimensions = Object.fromEntries(Object.entries(files).map(([k, b]) => [k, dims(b)]));
  const runs = {
    P1: { player: px('player-K3', { recolor: ['tenue'] }), 'pnj-docker': px('docker-K3', { recolor: ['peau', 'cheveux', 'tenue', 'chemise'] }), 'pnj-commis': px('player-K3', { scale: 2 }) },
    P2: { player: px('player-C3'), 'pnj-docker-1': px('docker-C3') },
    P3: { player: px('player-K1', { scale: 1, recolor: ['tenue'] }) },
    P4: { player: lisse('player-K2', { recolor: ['tenue'] }), 'pnj-docker': lisse('docker-K2', { recolor: ['peau', 'cheveux', 'tenue', 'chemise'] }) },
  };
  const crops = {};
  for (const [name, sprites] of [['P0', null], ...Object.entries(runs)]) {
    if (sprites) writeFileSync(join(tmp, 'sprites', 'manifest.json'), JSON.stringify({ version: 3, sprites }, null, 2));
    await serve();
    for (const [w, h] of [[1920, 1080], [1280, 720]]) {
      const p = await page(w, h);
      const r = await lab(p, `&freeze=1${sprites ? '' : '&sprites=code'}`);
      if (w === 1920) report.runs[name] = r;
      crops[`${name}-joueur-${w}`] = await crop(p, await frame(p, 'joueur'), `${name}-joueur-${w}`);
      crops[`${name}-docker-${w}`] = await crop(p, await frame(p, 'docker'), `${name}-docker-${w}`);
      await p.context().close();
    }
  }
  const P = report.runs;
  check(P.P1.rep.loaded.includes('player-Cendre') && P.P1.rep.loaded.includes('pnj-docker-1') && P.P1.rep.loaded.includes('pnj-docker-9'), 'P1 : joueur et dockers dessinés par leurs feuilles en pixel art (contrat v3)');
  const why = P.P1.rep.issues.find((x) => x.startsWith('pnj-commis')) ?? 'aucun refus';
  check(!P.P1.rep.loaded.includes('pnj-commis-5') && /720×720 au lieu de 480×480 \(grille d'art 48×80, agrandissement 2\)/.test(why), `P1 : feuille v3 aux dimensions fausses refusée, raison rapportée (${why})`);
  check(Object.values(P).every((r) => r.rep.hiddenFrames === 0), 'aucune image rendue avec un personnage en attente de sa feuille (tous les parcours)');
  const hp = await page(400, 300);
  for (const w of [1920, 1280]) {
    report.compare[`exact_${w}`] = await diff(hp, crops[`P1-joueur-${w}`].buf, crops[`P2-joueur-${w}`].buf);
    report.compare[`agrandissement_${w}`] = await diff(hp, crops[`P1-joueur-${w}`].buf, crops[`P3-joueur-${w}`].buf);
    report.compare[`temoin_lisse_${w}`] = await diff(hp, crops[`P4-joueur-${w}`].buf, crops[`P2-joueur-${w}`].buf);
    report.compare[`docker_exact_${w}`] = await diff(hp, crops[`P1-docker-${w}`].buf, crops[`P2-docker-${w}`].buf);
    report.compare[`docker_temoin_lisse_${w}`] = await diff(hp, crops[`P4-docker-${w}`].buf, crops[`P2-docker-${w}`].buf);
    const ex = report.compare[`exact_${w}`];
    const dx = report.compare[`docker_exact_${w}`];
    check(ex.max <= 1 && dx.max <= 1, `${w} : recoloration exacte : feuille en tons clés recolorée = feuille déjà peinte (joueur ${ex.pixels} px, écart max ${ex.max} ; docker ${dx.pixels} px, écart max ${dx.max})`);
    const ag = report.compare[`agrandissement_${w}`];
    check(ag.max <= 1, `${w} : agrandissement entier sans effet : feuille ×1 = feuille ×3 (${ag.pixels} px, écart max ${ag.max})`);
    const tl = report.compare[`temoin_lisse_${w}`];
    check(tl.over8 > 50, `${w} : témoin : la même feuille en contrat v2 lisse diffère (${tl.over8} px au-delà de 8/255, écart moyen ${tl.meanAbs}/255)`);
    // agrandissement à l'écran : px d'écran par px d'art de la figure (74 px d'art = hauteur du personnage)
    report.compare[`ecran_${w}`] = { figurePx: Math.round(crops[`P1-joueur-${w}`].h * 10) / 10, pxEcranParPxArt: Math.round((crops[`P1-joueur-${w}`].h / 74) * 100) / 100 };
  }
  check(report.compare.ecran_1920.pxEcranParPxArt > 1, `agrandissement à l'écran du joueur : ${report.compare.ecran_1920.pxEcranParPxArt} px d'écran par px d'art en 1920 × 1080, ${report.compare.ecran_1280.pxEcranParPxArt} en 1280 × 720 (figure de 74 px d'art)`);

  // ---- planche ----------------------------------------------------------------------------------------------------
  const tiles = ['P0-joueur-1920', 'P1-joueur-1920', 'P2-joueur-1920', 'P4-joueur-1920', 'P0-docker-1920', 'P1-docker-1920', 'P4-docker-1920'];
  const labels = ['Atlas par code (lisse, ×1,5)', 'Pixel art v3 : tons clés recolorés', 'Pixel art : déjà peint (référence)', 'Témoin : même art en v2 lisse', 'Docker 1 : atlas par code', 'Docker 1 : pixel art recoloré', 'Docker 1 : témoin v2 lisse'];
  const urls = tiles.map((t) => `data:image/png;base64,${readFileSync(join(DIR, `${t}.png`)).toString('base64')}`);
  const sheetUrl = `data:image/png;base64,${files['player-K3'].toString('base64')}`;
  const pp = await page(1400, 800);
  const planche = await pp.evaluate(async ({ urls, labels, sheetUrl }) => {
    const imgs = await Promise.all(urls.map(async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; }));
    const sh = new Image(); sh.src = sheetUrl; await sh.decode();
    const H = 300;
    const ws = imgs.map((i) => Math.round(i.width * H / i.height));
    const W = ws.reduce((a, b) => a + b, 0) + 16 * (imgs.length + 1);
    const c = document.createElement('canvas');
    c.width = Math.max(W, 1000); c.height = H + 60 + 380;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = '14px system-ui';
    let x = 16;
    imgs.forEach((i, k) => { g.drawImage(i, x, 16, ws[k], H); g.fillText(labels[k], x, H + 36); x += ws[k] + 16; });
    g.drawImage(sh, 16, H + 56, 360, 360);
    g.fillText('Feuille de preuve du joueur, pixel art (grille d’art 48 × 80 par case, agrandie ×3 : 720 × 720 ; tenue en tons clés)', 392, H + 80);
    g.fillText('Aucune image externe ni générée : atlas dessinés par code, réduits en pixel art par l’outil de preuve.', 392, H + 104);
    return c.toDataURL('image/png');
  }, { urls, labels, sheetUrl });
  writeFileSync(join(DIR, 'planche-feuilles-pixel.png'), Buffer.from(planche.split(',')[1], 'base64'));
  await pp.context().close();
  await hp.context().close();
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
