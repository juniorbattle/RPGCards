// M09 — preuve de bout en bout des feuilles de personnages de la ville (ADR 027 : contrat v2, approbation, préparation
// avant l'entrée, recoloration), SANS aucune image externe : nos propres atlas dessinés par code, exportés à l'échelle 2
// (feuilles de 960 × 960), en tons clés réservés (recoloration) ou teintés (pour reconnaître la feuille à l'écran), dans
// une COPIE TEMPORAIRE du build, avec un manifeste v2 (empreintes SHA-256) et des entrées volontairement fautives.
// Parcours (Chrome ; GPU réel avec LQV_GPU=1 CHROMIUM_PATH=…) :
//   A  QA (`?qa=1`) : feuilles chargées, non approuvées signalées, refus motivés, aucune image rendue avec un personnage
//      en attente ; captures et découpes du joueur et des dockers ;
//   A0 même cadre en `sprites=code` (atlas par code), pour la comparaison ;
//   B  politique du jeu (`sprites=approuvees`) : seule la feuille approuvée passe ;
//   C  `sprites=code` : aucune feuille lue ;
//   D  recoloration par famille : même feuille du joueur en Voile (`sig=Voile`) ;
//   E  manifeste v1 (ancien contrat) toujours accepté ;
//   F  démo : passage au Parvis, feuille d'Orin préparée pendant le fondu (mesures du changement d'îlot) ;
//   G  première entrée (laboratoire) : manifeste vide du build, feuilles du parcours, `sprites=code` (rondes alternées).
// Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-sprites-externes.mjs [dossier] [rapport.json] [rondes=5]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/sprites-v2';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/sprites-v2.json';
const ROUNDS = Number(process.argv[4] ?? 5);
const DIST = process.env.LQV_DIST || 'dist';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src tools public').toString().trim() ? '+arbre de travail' : '';
const tmp = mkdtempSync(join(tmpdir(), 'lqv-feuilles-'));
cpSync(DIST, tmp, { recursive: true });
mkdirSync(DIR, { recursive: true });
const browser = await launch();
const report = { date: new Date().toISOString(), commit: `${head}${dirty}`, dist: DIST, renderer: null, checks: [], console: [], runs: {} };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const sha = (b) => createHash('sha256').update(b).digest('hex');
let srv = null;
const serve = async (port, dir = tmp) => { srv?.stop(); srv = await startPreview(port, dir); return srv; };
const page = async (w, h) => {
  const p = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, report.console);
  return p;
};
/** Laboratoire prêt (crochet publié une fois les feuilles décidées). */
const lab = async (p, query) => {
  await p.goto(`${srv.base}/?ville=1&qa=1${query}`);
  await p.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
  return p.evaluate(() => ({ rep: window.__lqvVille.town.externalReport(), st: window.__lqvVille.town.stats() }));
};
/** Place le joueur, rend, et renvoie la boîte écran du joueur (pieds → sommet de la tête). */
const frame = (p, x, z, f) => p.evaluate(({ x, z, f }) => {
  const t = window.__lqvVille.town;
  t.place({ x, z }, f);
  t.renderNow();
  const w = t.walker().pos;
  const feet = t.project({ x: w.x, y: 0, z: w.z });
  const top = t.project({ x: w.x, y: t.walkerH(), z: w.z });
  return { feet, top };
}, { x, z, f });
const crop = async (p, box, name, pad = 0.35) => {
  const h = box.feet.y - box.top.y;
  const clip = { x: Math.round(box.feet.x - h * 0.55), y: Math.round(box.top.y - h * pad * 0.5), width: Math.round(h * 1.1), height: Math.round(h * (1 + pad)) };
  const buf = await p.screenshot({ clip });
  writeFileSync(join(DIR, `${name}.png`), buf);
  return { buf, clip };
};
const diff = (p, a, b) => p.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const [P, Q] = [await load(a), await load(b)];
  if (P.width !== Q.width || P.height !== Q.height) return { error: 'tailles différentes' };
  let sum = 0; let px = 0; let max = 0;
  for (let i = 0; i < P.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = Math.abs(P.data[i + c] - Q.data[i + c]); sum += e; d = Math.max(d, e); }
    if (d > 8) px++;
    max = Math.max(max, d);
  }
  return { meanAbs: Math.round((sum / (P.data.length / 4 * 3)) * 100) / 100, over8: px, total: P.data.length / 4, max };
}, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });

const SPOT_ETAL = [-0.6, 0.2, 'face'];
try {
  // ---- 0) export des feuilles (laboratoire, atlas par code) -----------------------------------------------------
  await serve(4391);
  const p0 = await page(800, 600);
  await lab(p0, '&freeze=1&sprites=code');
  report.renderer = rendererLabel(await webglRenderer(p0));
  const sheets = await p0.evaluate(async () => {
    const V = window.__lqvVille;
    const tint = async (url, filter) => { const i = new Image(); i.src = url; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.filter = filter; g.drawImage(i, 0, 0); return c.toDataURL('image/png'); };
    return {
      player: V.atlasAt('player-Cendre', 2, ['tenue']),
      docker: V.atlasAt('pnj-docker-1', 2, ['peau', 'cheveux', 'tenue', 'chemise']),
      braise: await tint(V.atlasAt('braise', 2), 'hue-rotate(160deg) saturate(1.6)'),
      astre: await tint(V.atlasAt('astre', 2), 'hue-rotate(160deg) saturate(1.6)'),
      legacy: await tint(V.atlasAt('player-Cendre', 1), 'hue-rotate(160deg) saturate(1.6)'),
    };
  });
  await p0.context().close();
  const buf = Object.fromEntries(Object.entries(sheets).map(([k, v]) => [k, Buffer.from(v.split(',')[1], 'base64')]));
  mkdirSync(join(tmp, 'sprites'), { recursive: true });
  for (const [k, b] of Object.entries(buf)) writeFileSync(join(tmp, 'sprites', `${k}.png`), b);
  writeFileSync(join(DIR, 'feuille-player-tons-cles.png'), buf.player);
  writeFileSync(join(DIR, 'feuille-pnj-docker-tons-cles.png'), buf.docker);
  report.sheets = Object.fromEntries(Object.entries(buf).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }]));
  const v2 = (file, o = {}) => ({ file, sha256: sha(buf[file.replace('.png', '')]), cell: [96, 160], cols: 5, rows: 3, scale: 2, anchor: [48, 152], figureH: 148, source: 'QA : atlas dessiné par code, exporté (aucune image externe)', fiche: 'art-src/sprites/qa/fiche.json', approved: false, ...o });
  const manifestV2 = {
    version: 2,
    sprites: {
      player: v2('player.png', { recolor: ['tenue'] }),
      'pnj-docker': v2('docker.png', { recolor: ['peau', 'cheveux', 'tenue', 'chemise'] }),
      braise: v2('braise.png', { approved: true }),
      astre: v2('astre.png'),
      // fautives : empreinte, dimensions (échelle déclarée 1,5 pour une feuille de 960 × 960), teinte sans couleur cible
      'pnj-joueuse': v2('braise.png', { sha256: '0'.repeat(64) }),
      'pnj-commis-5': v2('braise.png', { scale: 1.5 }),
      'pnj-marchande': v2('docker.png', { recolor: ['accent'] }),
    },
  };
  writeFileSync(join(tmp, 'sprites', 'manifest.json'), JSON.stringify(manifestV2, null, 2));
  report.manifest = manifestV2;
  await serve(4392);

  // ---- A) QA : feuilles chargées, non approuvées signalées, refus motivés --------------------------------------
  const pa = await page(1920, 1080);
  const A = await lab(pa, '&freeze=1');
  report.runs.A = A;
  check(A.rep.policy === 'qa', 'A : politique QA');
  for (const id of ['player-Cendre', 'pnj-docker-1', 'pnj-docker-9', 'braise']) check(A.rep.loaded.includes(id), `A : ${id} dessiné par sa feuille`);
  check(['player-Cendre', 'pnj-docker-1', 'pnj-docker-9'].every((id) => A.rep.unapproved.includes(id)) && !A.rep.unapproved.includes('braise'), 'A : feuilles non approuvées affichées en QA et signalées (pas Kaï, approuvée)');
  const why = (id) => A.rep.issues.find((x) => x.startsWith(id)) ?? 'aucun refus';
  check(!A.rep.loaded.includes('pnj-joueuse-1') && /empreinte/.test(why('pnj-joueuse-1')), `A : feuille de la joueuse refusée, empreinte (${why('pnj-joueuse-1')})`);
  check(!A.rep.loaded.includes('pnj-commis-5') && /960×960 au lieu de 720×720/.test(why('pnj-commis-5')), `A : feuille du commis refusée, dimensions (${why('pnj-commis-5')})`);
  check(!A.rep.loaded.includes('pnj-marchande-9') && /accent/.test(why('pnj-marchande-9')), `A : feuille de la marchande refusée, teinte sans couleur cible (${why('pnj-marchande-9')})`);
  check(A.rep.hiddenFrames === 0, `A : aucune image rendue avec un personnage en attente de sa feuille (${A.rep.hiddenFrames})`);
  console.log(`A : première entrée ${A.st.firstFrameMs} ms (construction ${A.st.buildMs} ms) ; feuilles ${JSON.stringify(A.rep.timings)}`);
  const boxA = await frame(pa, ...SPOT_ETAL);
  await pa.waitForTimeout(300);
  writeFileSync(join(DIR, 'A-qa-etal-1920.png'), await pa.screenshot());
  const cropA = await crop(pa, boxA, 'A-joueur-feuille-cendre');
  await pa.context().close();

  // ---- A0) même cadre, atlas par code ---------------------------------------------------------------------------
  const pc = await page(1920, 1080);
  const A0 = await lab(pc, '&freeze=1&sprites=code');
  report.runs.A0 = A0;
  const boxC = await frame(pc, ...SPOT_ETAL);
  await pc.waitForTimeout(300);
  const cropC = await crop(pc, boxC, 'A0-joueur-code');
  report.compare = { joueur_code_vs_feuille_recoloree: await diff(pc, cropC.buf, cropA.buf), clip: cropA.clip };
  await pc.context().close();

  // ---- B) politique du jeu : seule la feuille approuvée -----------------------------------------------------------
  const pb = await page(1280, 720);
  const B = await lab(pb, '&freeze=1&sprites=approuvees');
  report.runs.B = B;
  check(B.rep.policy === 'approuvees' && B.rep.loaded.length === 1 && B.rep.loaded[0] === 'braise', `B : hors QA, seule la feuille approuvée (Kaï) est chargée (${B.rep.loaded.join(', ')})`);
  check(B.rep.issues.some((x) => x.startsWith('player-Cendre (feuille player)') && /non approuvée/.test(x)), 'B : la feuille non approuvée du joueur est refusée, raison rapportée');
  await pb.context().close();

  // ---- C) sprites=code ------------------------------------------------------------------------------------------
  const pq = await page(1280, 720);
  const C = await lab(pq, '&freeze=1&sprites=code');
  report.runs.C = C;
  check(C.rep.policy === 'code' && C.rep.loaded.length === 0 && C.rep.issues.length === 0, '`sprites=code` : aucune feuille lue, atlas par code');
  await pq.context().close();

  // ---- D) recoloration par famille ------------------------------------------------------------------------------
  const pd = await page(1920, 1080);
  const D = await lab(pd, '&freeze=1&sig=Voile');
  report.runs.D = D;
  check(D.rep.loaded.includes('player-Voile'), 'D : le duelliste joueur Voile prend la même feuille (clé « player »)');
  const boxD = await frame(pd, ...SPOT_ETAL);
  await pd.waitForTimeout(300);
  const cropD = await crop(pd, boxD, 'D-joueur-feuille-voile');
  report.compare.joueur_cendre_vs_voile = await diff(pd, cropA.buf, cropD.buf);
  check(report.compare.joueur_cendre_vs_voile.over8 > 2000, `D : la tenue change de couleur avec la famille (${report.compare.joueur_cendre_vs_voile.over8} pixels)`);
  await pd.context().close();
  const pd0 = await page(1920, 1080);
  await lab(pd0, '&freeze=1&sig=Voile&sprites=code');
  const cropD0 = await crop(pd0, await frame(pd0, ...SPOT_ETAL), 'D0-joueur-code-voile');
  report.compare.joueur_voile_code_vs_feuille = await diff(pd0, cropD0.buf, cropD.buf);
  await pd0.context().close();

  // ---- docker 1 : feuille de gabarit recolorée à ses couleurs (graine) contre son atlas par code ------------------
  const dk = {};
  for (const [q, name] of [['', 'feuille'], ['&sprites=code', 'code']]) {
    const pk = await page(1920, 1080);
    await lab(pk, `&freeze=1${q}`);
    // joueur à l'écart (à plus de 2,5 m, le docker garde sa pose) ; docker 1 en (-2,4 ; 1,4), quai.ts
    const box = await pk.evaluate(() => {
      const t = window.__lqvVille.town;
      t.place({ x: -6.5, z: -1.4 }, 'droite');
      t.renderNow();
      return { feet: t.project({ x: -2.4, y: 0, z: 1.4 }), top: t.project({ x: -2.4, y: t.walkerH(), z: 1.4 }) };
    });
    await pk.waitForTimeout(300);
    dk[name] = await crop(pk, box, `docker-1-${name}`);
    if (name === 'code') report.compare.docker1_code_vs_feuille_recoloree = await diff(pk, dk.code.buf, dk.feuille.buf);
    await pk.context().close();
  }

  // ---- E) manifeste v1 (ancien contrat) -------------------------------------------------------------------------
  writeFileSync(join(tmp, 'sprites', 'manifest.json'), JSON.stringify({ version: 1, sprites: { 'player-Cendre': { file: 'legacy.png', sha256: sha(buf.legacy), cell: [96, 160], cols: 5, rows: 3, source: 'QA : atlas par code teinté (contrat v1)', approved: false } } }, null, 2));
  await serve(4393);
  const pe = await page(1280, 720);
  const E = await lab(pe, '&freeze=1');
  report.runs.E = E;
  check(E.rep.loaded.includes('player-Cendre') && E.rep.issues.length === 0, 'E : manifeste v1 toujours accepté (feuille de 480 × 480, échelle 1)');
  const boxE = await frame(pe, ...SPOT_ETAL);
  await pe.waitForTimeout(300);
  await crop(pe, boxE, 'E-joueur-v1-teinte');
  await pe.context().close();
  writeFileSync(join(tmp, 'sprites', 'manifest.json'), JSON.stringify(manifestV2, null, 2));
  await serve(4394);

  // ---- F) démo : passage au Parvis, feuille d'Orin préparée pendant le fondu -------------------------------------
  const pf = await page(1280, 720);
  await pf.goto(`${srv.base}/?demo=1&qa=1&aiDelay=0`);
  await pf.waitForSelector('[data-key="home-new"]', { state: 'visible' });
  await pf.click('[data-key="home-new"]');
  await pf.fill('[data-key="new-name"]', 'Feuilles');
  await pf.click('[data-key="new-create"]');
  await pf.waitForFunction(() => !!window.__lqvDemo?.townHandle && window.__lqvDemo.townHandle.stats().frames > 1);
  const F0 = await pf.evaluate(() => { const t = window.__lqvDemo.townHandle; return { rep: t.externalReport(), st: t.stats(), parvisPret: t.isPrepared('parvis') }; });
  const F1 = await pf.evaluate(async () => {
    const d = window.__lqvDemo;
    const t = d.townHandle;
    const t0 = performance.now();
    // même préparation que celle du passage (dédoublonnée) : sa durée seule
    const prep = t.prepare('parvis').then(() => Math.round(performance.now() - t0));
    d.travel('parvis', 'arrivee');
    while (t.ilotId() !== 'parvis') await new Promise((r) => setTimeout(r, 5));
    const swapMs = Math.round(performance.now() - t0);
    const f0 = t.stats().frames;
    while (t.stats().frames < f0 + 2) await new Promise((r) => requestAnimationFrame(r));
    return { swapMs, prepMs: await prep, rep: t.externalReport(), st: t.stats(), parvisPret: t.isPrepared('parvis') };
  });
  report.runs.F = { avant: F0, apres: F1 };
  check(!F0.parvisPret && F1.rep.loaded.includes('astre'), 'F : la feuille d’Orin (Parvis) n’était pas prête avant le passage, elle l’est à l’arrivée');
  check(F1.rep.hiddenFrames === 0, `F : aucune image rendue avec un personnage en attente pendant le passage (${F1.rep.hiddenFrames})`);
  check(F1.swapMs >= 300 && F1.swapMs < 1500, `F : changement d’îlot derrière le fondu (${F1.swapMs} ms après le départ, préparation ${F1.prepMs} ms, construction ${F1.st.mountMs} ms, première image ${F1.st.mountFrameMs} ms ; feuille d’Orin ${JSON.stringify(F1.rep.timings.astre)})`);
  await pf.waitForTimeout(800);
  writeFileSync(join(DIR, 'F-parvis-orin-feuille.png'), await pf.screenshot());
  await pf.context().close();

  // ---- G) première entrée : manifeste vide (build), feuilles, atlas par code ------------------------------------
  const srvEmpty = await startPreview(4395, DIST);
  const G = { vide: [], feuilles: [], code: [] };
  try {
    for (let r = 0; r < ROUNDS; r++) {
      for (const [k, base, q] of [['vide', srvEmpty.base, ''], ['feuilles', srv.base, ''], ['code', srv.base, '&sprites=code']]) {
        const pg = await page(1920, 1080);
        await pg.goto(`${base}/?ville=1&qa=1${q}`);
        await pg.waitForFunction(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 2, null, { timeout: 90000 });
        const s = await pg.evaluate(() => { const t = window.__lqvVille.town; return { ...t.stats(), rep: t.externalReport() }; });
        G[k].push({ buildMs: s.buildMs, firstFrameMs: s.firstFrameMs, textures: s.textures, loaded: s.rep.loaded.length, hidden: s.rep.hiddenFrames });
        await pg.context().close();
      }
    }
  } finally { srvEmpty.stop(); }
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
  report.runs.G = Object.fromEntries(Object.entries(G).map(([k, xs]) => [k, { rounds: xs, buildMs: med(xs.map((x) => x.buildMs)), firstFrameMs: med(xs.map((x) => x.firstFrameMs)), textures: med(xs.map((x) => x.textures)) }]));
  check(Object.values(G).every((xs) => xs.every((x) => x.hidden === 0)), 'G : première entrée sans image rendue avec un personnage en attente (toutes les rondes)');
  // mémoire GPU des feuilles chargées sur le Quai (calculée : RGBA 8 bits, mipmaps comprises)
  const distinct = new Set(['player', 'pnj-docker', 'braise']);
  report.gpuMemory = { feuilles: distinct.size, octetsParFeuille: Math.round(960 * 960 * 4 * 4 / 3), totalMo: Math.round((distinct.size * 960 * 960 * 4 * 4 / 3) / 1e5) / 10 };
  console.log('Première entrée (médianes) :', JSON.stringify(Object.fromEntries(Object.entries(report.runs.G).map(([k, v]) => [k, { buildMs: v.buildMs, firstFrameMs: v.firstFrameMs }]))));

  // ---- planche : joueur code | feuille recolorée (Cendre) | code Voile | feuille Voile | v1 teinté ----------------
  const pp = await page(1200, 700);
  const tiles = ['A0-joueur-code', 'A-joueur-feuille-cendre', 'D0-joueur-code-voile', 'D-joueur-feuille-voile', 'docker-1-code', 'docker-1-feuille'];
  const labels = ['Cendre : atlas par code (×1,5)', 'Cendre : feuille ×2, tons clés recolorés', 'Voile : atlas par code', 'Voile : même feuille, recolorée', 'Docker 1 : atlas par code', 'Docker 1 : feuille de gabarit recolorée'];
  const urls = tiles.map((t) => `data:image/png;base64,${readFileSync(join(DIR, `${t}.png`)).toString('base64')}`);
  const sheetUrl = `data:image/png;base64,${buf.player.toString('base64')}`;
  const planche = await pp.evaluate(async ({ urls, labels, sheetUrl }) => {
    const imgs = await Promise.all(urls.map(async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; }));
    const sh = new Image(); sh.src = sheetUrl; await sh.decode();
    const H = 300;
    const ws = imgs.map((i) => Math.round(i.width * H / i.height));
    const W = ws.reduce((a, b) => a + b, 0) + 16 * (imgs.length + 1);
    const c = document.createElement('canvas');
    c.width = Math.max(W, 900); c.height = H + 60 + 340;
    const g = c.getContext('2d');
    g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = '15px system-ui';
    let x = 16;
    imgs.forEach((i, k) => { g.drawImage(i, x, 16, ws[k], H); g.fillText(labels[k], x, H + 36); x += ws[k] + 16; });
    g.drawImage(sh, 16, H + 56, 320, 320);
    g.fillText('Feuille de preuve du joueur (960 × 960, tenue en tons clés réservés, magenta)', 352, H + 80);
    g.fillText('Aucune image externe : atlas dessinés par code, exportés à l’échelle 2.', 352, H + 104);
    return c.toDataURL('image/png');
  }, { urls, labels, sheetUrl });
  writeFileSync(join(DIR, 'planche-feuilles-v2.png'), Buffer.from(planche.split(',')[1], 'base64'));
  await pp.context().close();
} finally {
  const bad = report.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
  check(bad.length === 0, `aucune erreur ni avertissement de console (${bad.length})`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  srv?.stop();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
