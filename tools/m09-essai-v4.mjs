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
import { processPlate, processSheet } from './m09-traitement-images.mjs';

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
