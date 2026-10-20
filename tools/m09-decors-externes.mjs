// M09 V4 — preuve de bout en bout des plans de décor de la ville (ADR 028, B2 : contrat, approbation, préparation avant
// l'entrée, diorama), SANS aucune image externe ni générée : nos propres plans dessinés par code (canvas 2D, dans la
// page), exportés en PNG dans une COPIE TEMPORAIRE du build, avec un manifeste (empreintes SHA-256) et des entrées
// volontairement fautives. Le Quai en six plans (ciel, ville haute, façades posées sur le plan pur, rue et lampadaires,
// premier plan, eau couchée), lumières du moteur sur les lanternes peintes ; le Parvis en trois plans dont un non
// approuvé ; les Ruelles en plans fautifs.
// Parcours (Chrome ; GPU réel avec LQV_GPU=1 CHROMIUM_PATH=…) :
//   A  QA (`?qa=1`) : le Quai en diorama, plans non approuvés signalés, aucune image rendue en attente ; captures ;
//   A0 même cadre, `decors=code` (décor par code), pour la comparaison ;
//   B  politique du jeu (`decors=approuvees`) : le Quai (plans approuvés) en diorama ; le Parvis (un plan non approuvé)
//      refusé en entier, décor par code ;
//   C  `decors=code` : aucun plan lu ;
//   D  les Ruelles : refus motivés (empreinte, dimensions), décor par code ; D2 ordre contraire à la profondeur ;
//   E  entrée sans préparation (`goTo` direct) : décor par code construit, image retenue, diorama substitué avant la
//      première image ;
//   F  démo : passage au Parvis, plans préparés pendant le fondu (mesures du changement d'îlot) ;
//   G  première entrée (laboratoire) : manifeste vide du build, diorama du Quai, `decors=code` (rondes alternées).
// Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-decors-externes.mjs [dossier] [rapport.json] [rondes=5]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { FACADES, paintPlates } from './m09-plans-preuve.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/v4-decors';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/v4-decors.json';
const ROUNDS = Number(process.argv[4] ?? 5);
const DIST = process.env.LQV_DIST || 'dist';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src tools public').toString().trim() ? '+arbre de travail' : '';
const tmp = mkdtempSync(join(tmpdir(), 'lqv-decors-'));
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
const hideUi = () => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; };
/** Laboratoire prêt (crochet publié une fois les feuilles et le décor décidés). */
const lab = async (p, query) => {
  const t0 = Date.now();
  await p.goto(`${srv.base}/?ville=1&qa=1${query}`);
  await p.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
  const hookMs = Date.now() - t0;
  return p.evaluate((hookMs) => { const t = window.__lqvVille.town; return { hookMs, dec: t.decorReport(), st: t.stats() }; }, hookMs);
};
const shot = async (p, x, z, f, name) => {
  await p.evaluate(({ x, z, f }) => { const t = window.__lqvVille.town; t.place({ x, z }, f); t.renderNow(); }, { x, z, f });
  await p.evaluate(hideUi);
  await p.waitForTimeout(250);
  const buf = await p.screenshot();
  writeFileSync(join(DIR, `${name}.png`), buf);
  return buf;
};


const SPOTS = { etal: [-0.6, 0.2, 'face'], arrivee: [-15.4, 0.6, 'droite'] };
try {
  // ---- 0) plans dessinés par code (laboratoire) -------------------------------------------------------------------
  await serve(4401);
  const p0 = await page(800, 600);
  await lab(p0, '&freeze=1&decors=code');
  report.renderer = rendererLabel(await webglRenderer(p0));
  const urls = await p0.evaluate(paintPlates, FACADES);
  await p0.context().close();
  const buf = Object.fromEntries(Object.entries(urls).map(([k, v]) => [k, Buffer.from(v.split(',')[1], 'base64')]));
  mkdirSync(join(tmp, 'decors'), { recursive: true });
  for (const [k, b] of Object.entries(buf)) writeFileSync(join(tmp, 'decors', `${k}.png`), b);
  report.plates = Object.fromEntries(Object.entries(buf).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b), size: [b.readUInt32BE(16), b.readUInt32BE(20)] }]));
  const plate = (name, o) => ({
    file: `${name}.png`, sha256: sha(buf[name]), size: [buf[name].readUInt32BE(16), buf[name].readUInt32BE(20)],
    source: 'QA : plan dessiné par code dans la page (aucune image externe ni générée)', fiche: 'art-src/decors/qa/fiche.json', approved: false, ...o,
  });
  // lumières du moteur posées sur les lanternes peintes (lampadaires du plan pur, portes de la salle et du Fanal)
  const lamps = [-13, -4, 5, 14].map((x) => ({ at: [x, 4.0, 2.95], color: 'Astre', intensity: 3.2, radius: 10, halo: 2.0, flicker: 'lantern' }));
  const quai = {
    plans: {
      ciel: plate('ciel', { at: [0, -6, -70], width: 240, orient: 'face', order: 0, blend: 'fondu', fog: 0, approved: true }),
      'ville-haute': plate('ville-haute', { at: [0, 0, -24], width: 100, orient: 'face', order: 1, blend: 'decoupe', approved: true }),
      facades: plate('facades', { at: [0, 0, -3], width: 48, orient: 'face', order: 2, blend: 'decoupe', lit: 0.35, approved: true }),
      rue: plate('rue', { at: [0, 0, 2.95], width: 48, orient: 'face', order: 3, blend: 'decoupe', approved: true }),
      'premier-plan': plate('premier-plan', { at: [0, -2, 4.6], width: 48, orient: 'face', order: 4, blend: 'decoupe', approved: true }),
      eau: plate('eau', { at: [0, -1.15, 12], width: 64, orient: 'sol', order: 5, blend: 'decoupe', approved: true }),
    },
    lumieres: [...lamps, { at: [-6.75, 2.2, -2.3], color: 'Astre', intensity: 2.6, radius: 7, halo: 1.2, flicker: 'candle' }, { at: [7.2, 2.2, -2.3], color: 'Cendre', intensity: 2.6, radius: 7, halo: 1.2, flicker: 'candle' }],
  };
  const parvis = {
    plans: {
      ciel: plate('parvis-ciel', { at: [0, -6, -70], width: 240, orient: 'face', order: 0, blend: 'fondu', fog: 0, approved: true }),
      amphi: plate('parvis-amphi', { at: [0, 0, -4], width: 40, orient: 'face', order: 1, blend: 'decoupe', approved: false }),
      avant: plate('parvis-avant', { at: [0, -1, 4.2], width: 40, orient: 'face', order: 2, blend: 'decoupe', approved: true }),
    },
    lumieres: [{ at: [-4, 3, 0], color: 'Cendre', intensity: 3, radius: 9, halo: 1.5 }, { at: [4, 3, 0], color: 'Cendre', intensity: 3, radius: 9, halo: 1.5 }],
  };
  // les Ruelles, fautives : empreinte d'un autre fichier, dimensions déclarées fausses
  const ruelles = {
    plans: {
      ciel: plate('parvis-ciel', { sha256: '0'.repeat(64), at: [0, -6, -70], width: 240, orient: 'face', order: 0, blend: 'fondu', approved: true }),
      maisons: plate('parvis-amphi', { size: [1024, 512], at: [0, 0, -4], width: 40, orient: 'face', order: 1, blend: 'decoupe', approved: true }),
    },
  };
  const manifest = { version: 1, ilots: { quai, parvis, ruelles } };
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify(manifest, null, 2));
  report.manifest = manifest;
  await serve(4402);

  // ---- A) QA : le Quai en diorama ------------------------------------------------------------------------------
  const shotsA = {};
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    const pa = await page(w, h);
    const A = await lab(pa, '&freeze=1');
    if (w === 1920) {
      report.runs.A = A;
      check(A.dec.policy === 'qa' && A.dec.world === 'diorama' && A.dec.loaded.includes('quai'), `A : le Quai est dessiné par son diorama (${A.dec.world})`);
      check(A.dec.unapproved.length === 0, `A : plans du Quai tous approuvés, aucun signalé (${A.dec.unapproved.join(', ') || 'aucun'})`);
      check(A.dec.pendingFrames === 0 && A.dec.late.length === 0, `A : aucune image rendue avant la décision du décor (${A.dec.pendingFrames}), aucun diorama en retard`);
      check(Object.keys(A.dec.timings).length === 6, `A : six plans préparés : ${JSON.stringify(A.dec.timings)}`);
      check(A.dec.gpuBytes.quai > 0 && A.dec.gpuBytes.quai < 160 * 1048576, `A : mémoire GPU des plans du Quai ${Math.round(A.dec.gpuBytes.quai / 1048576 * 10) / 10} Mo`);
    }
    for (const [k, [x, z, f]] of Object.entries(SPOTS)) shotsA[`${k}-${w}`] = await shot(pa, x, z, f, `A-diorama-${k}-${w}`);
    await pa.context().close();
    // A0 : même cadre, décor par code
    const pc = await page(w, h);
    const A0 = await lab(pc, '&freeze=1&decors=code');
    if (w === 1920) {
      report.runs.A0 = A0;
      check(A0.dec.policy === 'code' && A0.dec.world === 'code' && Object.keys(A0.dec.timings).length === 0, '`decors=code` : décor par code, aucun plan lu');
    }
    for (const [k, [x, z, f]] of Object.entries(SPOTS)) await shot(pc, x, z, f, `A0-code-${k}-${w}`);
    await pc.context().close();
  }

  // ---- B) politique du jeu --------------------------------------------------------------------------------------
  const pb = await page(1280, 720);
  const B = await lab(pb, '&freeze=1&decors=approuvees');
  report.runs.B = B;
  check(B.dec.policy === 'approuvees' && B.dec.world === 'diorama', 'B : hors QA, le diorama du Quai (plans approuvés) est admis');
  const Bp = await pb.evaluate(async () => { const t = window.__lqvVille.town; t.goTo('parvis', 'arrivee'); await t.ready(); return t.decorReport(); });
  report.runs.B.parvis = Bp;
  check(Bp.world === 'code' && Bp.issues.some((x) => /parvis\/amphi : plan non approuvé/.test(x)), `B : le Parvis (un plan non approuvé) est refusé en entier, décor par code (${Bp.issues.filter((x) => x.startsWith('parvis')).join(' ; ')})`);
  await pb.context().close();

  // ---- C) decors=code -------------------------------------------------------------------------------------------
  const pq = await page(1280, 720);
  const C = await lab(pq, '&freeze=1&decors=code&ilot=parvis');
  report.runs.C = C;
  check(C.dec.world === 'code' && C.dec.loaded.length === 0 && C.dec.issues.length === 0, '`decors=code` au Parvis : décor par code, aucun plan lu, aucun refus');
  await pq.context().close();

  // ---- D) les Ruelles : refus motivés ---------------------------------------------------------------------------
  const pd = await page(1280, 720);
  const D = await lab(pd, '&freeze=1&ilot=ruelles');
  report.runs.D = D;
  const whyD = D.dec.issues.join(' ; ');
  check(D.dec.world === 'code' && /ruelles\/ciel : empreinte/.test(whyD) && /ruelles\/maisons : 2048×512 au lieu de 1024×512/.test(whyD), `D : Ruelles refusées, décor par code gardé (${whyD})`);
  check(D.dec.pendingFrames === 0, `D : aucune image rendue avant la décision (${D.dec.pendingFrames})`);
  await pd.context().close();
  // D2 : ordre contraire à la profondeur (refus avant tout décodage)
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify({ version: 1, ilots: { ruelles: { plans: { avant: plate('parvis-avant', { at: [0, -1, 4], width: 40, orient: 'face', order: 0, blend: 'decoupe' }), ciel: plate('parvis-ciel', { at: [0, -6, -70], width: 240, orient: 'face', order: 1, blend: 'fondu' }) } } } }, null, 2));
  await serve(4403);
  const pd2 = await page(1280, 720);
  const D2 = await lab(pd2, '&freeze=1&ilot=ruelles');
  report.runs.D2 = D2;
  check(D2.dec.world === 'code' && D2.dec.issues.some((x) => /plus lointain.*dessiné après/.test(x)) && Object.keys(D2.dec.timings).length === 0, `D2 : ordre contraire à la profondeur, refusé sans décodage (${D2.dec.issues.join(' ; ')})`);
  await pd2.context().close();
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify(manifest, null, 2));
  await serve(4404);

  // ---- E) entrée sans préparation : décor par code, image retenue, diorama substitué avant la première image -------
  const pe = await page(1280, 720);
  await lab(pe, '&freeze=1');
  const E = await pe.evaluate(async () => {
    const t = window.__lqvVille.town;
    const f0 = t.stats().frames;
    const t0 = performance.now();
    t.goTo('parvis', 'arrivee');
    const atMount = t.decorReport().world;
    await t.ready();
    const readyMs = Math.round(performance.now() - t0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { atMount, readyMs, framesDuringWait: t.stats().frames - f0, rep: t.decorReport(), st: t.stats() };
  });
  report.runs.E = E;
  check(E.atMount === 'code' && E.rep.world === 'diorama' && E.rep.pendingFrames === 0 && E.rep.late.length === 0, `E : sans préparation, décor par code construit puis diorama substitué avant la première image (${E.readyMs} ms ; ${E.rep.pendingFrames} image en attente)`);
  await pe.evaluate(hideUi);
  writeFileSync(join(DIR, 'E-parvis-diorama-1280.png'), await pe.screenshot());
  await pe.context().close();

  // ---- F) démo : passage au Parvis, plans préparés pendant le fondu ----------------------------------------------
  const pf = await page(1280, 720);
  await pf.goto(`${srv.base}/?demo=1&qa=1&aiDelay=0`);
  await pf.waitForSelector('[data-key="home-new"]', { state: 'visible' });
  await pf.click('[data-key="home-new"]');
  await pf.fill('[data-key="new-name"]', 'Décors');
  await pf.click('[data-key="new-create"]');
  await pf.waitForFunction(() => !!window.__lqvDemo?.townHandle && window.__lqvDemo.townHandle.stats().frames > 1);
  const F0 = await pf.evaluate(() => { const t = window.__lqvDemo.townHandle; return { dec: t.decorReport(), parvisPret: t.isPrepared('parvis') }; });
  const F1 = await pf.evaluate(async () => {
    const d = window.__lqvDemo;
    const t = d.townHandle;
    const t0 = performance.now();
    const prep = t.prepare('parvis').then(() => Math.round(performance.now() - t0));
    d.travel('parvis', 'arrivee');
    while (t.ilotId() !== 'parvis') await new Promise((r) => setTimeout(r, 5));
    const swapMs = Math.round(performance.now() - t0);
    const worldAtSwap = t.decorReport().world;
    const f0 = t.stats().frames;
    while (t.stats().frames < f0 + 2) await new Promise((r) => requestAnimationFrame(r));
    return { swapMs, worldAtSwap, prepMs: await prep, dec: t.decorReport(), st: t.stats() };
  });
  report.runs.F = { avant: F0, apres: F1 };
  check(F0.dec.world === 'diorama' && !F0.parvisPret, `F : démo sur le Quai en diorama (pré-lu au chargement), plans du Parvis pas encore prêts (${F0.dec.world})`);
  check(F1.worldAtSwap === 'diorama' && F1.dec.pendingFrames === 0 && F1.dec.late.length === 0, `F : le Parvis arrive directement en diorama, préparé pendant le fondu, aucune image en attente (${F1.dec.pendingFrames})`);
  check(F1.swapMs >= 300 && F1.swapMs < 1500, `F : changement d'îlot derrière le fondu (${F1.swapMs} ms après le départ, préparation ${F1.prepMs} ms, construction ${F1.st.mountMs} ms, première image ${F1.st.mountFrameMs} ms)`);
  report.runs.F.liberation = await pf.evaluate(async () => {
    // retour au Quai : les plans du Parvis sont libérés, ceux du Quai préparés de nouveau pendant le fondu
    const d = window.__lqvDemo; const t = d.townHandle;
    d.travel('quai', 'sortie-arene');
    while (t.ilotId() !== 'quai') await new Promise((r) => setTimeout(r, 5));
    const f0 = t.stats().frames;
    while (t.stats().frames < f0 + 2) await new Promise((r) => requestAnimationFrame(r));
    return { dec: t.decorReport(), textures: t.stats().textures };
  });
  check(report.runs.F.liberation.dec.world === 'diorama' && report.runs.F.liberation.dec.pendingFrames === 0, 'F : retour au Quai en diorama, sans image en attente');
  await pf.waitForTimeout(500);
  writeFileSync(join(DIR, 'F-demo-retour-quai-1280.png'), await pf.screenshot());
  await pf.context().close();

  // ---- G) première entrée : manifeste vide (build), diorama du Quai, décor par code ------------------------------
  const srvEmpty = await startPreview(4405, DIST);
  const G = { vide: [], diorama: [], code: [] };
  try {
    for (let r = 0; r < ROUNDS; r++) {
      for (const [k, base, q] of [['vide', srvEmpty.base, ''], ['diorama', srv.base, ''], ['code', srv.base, '&decors=code']]) {
        const pg = await page(1920, 1080);
        const t0 = Date.now();
        await pg.goto(`${base}/?ville=1&qa=1${q}`);
        await pg.waitForFunction(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 2, null, { timeout: 90000 });
        const wall = Date.now() - t0;
        const s = await pg.evaluate(() => { const t = window.__lqvVille.town; return { ...t.stats(), dec: t.decorReport() }; });
        G[k].push({ wallMs: wall, buildMs: s.buildMs, firstFrameMs: s.firstFrameMs, textures: s.textures, calls: s.calls, world: s.dec.world, pending: s.dec.pendingFrames });
        await pg.context().close();
      }
    }
  } finally { srvEmpty.stop(); }
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
  report.runs.G = Object.fromEntries(Object.entries(G).map(([k, xs]) => [k, { rounds: xs, wallMs: med(xs.map((x) => x.wallMs)), buildMs: med(xs.map((x) => x.buildMs)), firstFrameMs: med(xs.map((x) => x.firstFrameMs)), calls: med(xs.map((x) => x.calls)) }]));
  check(G.vide.every((x) => x.world === 'code') && G.code.every((x) => x.world === 'code') && G.diorama.every((x) => x.world === 'diorama'), 'G : décor attendu à chaque ronde (vide : code ; diorama ; code)');
  check(Object.values(G).every((xs) => xs.every((x) => x.pending === 0)), 'G : aucune image rendue avant la décision du décor (toutes les rondes)');
  console.log('Première entrée (médianes) :', JSON.stringify(Object.fromEntries(Object.entries(report.runs.G).map(([k, v]) => [k, { wallMs: v.wallMs, buildMs: v.buildMs, firstFrameMs: v.firstFrameMs, calls: v.calls }]))));

  // ---- planche : décor par code | diorama de preuve, deux positions (1920 × 1080 réduites) ------------------------
  const pp = await page(1300, 800);
  const tiles = ['A0-code-etal-1920', 'A-diorama-etal-1920', 'A0-code-arrivee-1920', 'A-diorama-arrivee-1920'];
  const labels = ['Décor par code (direction D, provisoire) — centre du Quai', 'Diorama de preuve : six plans dessinés par code — centre du Quai', 'Décor par code — arrivée', 'Diorama de preuve — arrivée'];
  const tileUrls = tiles.map((t) => `data:image/png;base64,${readFileSync(join(DIR, `${t}.png`)).toString('base64')}`);
  const planche = await pp.evaluate(async ({ tileUrls, labels }) => {
    const imgs = await Promise.all(tileUrls.map(async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; }));
    const W = 960; const H = 540; const pad = 16;
    const c = document.createElement('canvas');
    c.width = W * 2 + pad * 3; c.height = (H + 40) * 2 + pad * 2 + 30;
    const g = c.getContext('2d');
    g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = '16px system-ui';
    g.fillText('Plans de décor (ADR 028) : preuve du chargeur avec des plans dessinés par code — aucune image externe ni générée', pad, 24);
    imgs.forEach((im, k) => {
      const x = pad + (k % 2) * (W + pad); const y = 40 + Math.floor(k / 2) * (H + 40);
      g.drawImage(im, x, y, W, H);
      g.fillText(labels[k], x, y + H + 24);
    });
    return c.toDataURL('image/png');
  }, { tileUrls, labels });
  writeFileSync(join(DIR, 'planche-decors-preuve.png'), Buffer.from(planche.split(',')[1], 'base64'));
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
