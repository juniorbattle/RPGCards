// M09 V3 — passe de qualité du Quai : captures avant / après sur le même cadre (panneau du laboratoire masqué), coût
// GPU par image en rondes ENTRELACÉES (avant, après, après, avant…), planche côte à côte avec la référence frontale.
//   shots   : laboratoire `?ville=1&qa=1&freeze=1`, positions du Quai (LQV_SPOTS), 1280×720 et 1920×1080 (LQV_SIZES) ;
//             LQV_V3_QUERY=… ajoute des paramètres d’URL (réglages de la caméra, par exemple `rig=10,24,30,4.4`).
//   cout    : page neuve par mesure, 3 s de mise en régime, puis 3 s de marche le long du Quai ; temps GPU de chaque
//             image mesuré par EXT_disjoint_timer_query_webgl2 sur le contexte du canvas de la ville (injecté par
//             l’outil, aucun code du jeu), intervalles d’images, appels de dessin, triangles, textures, programmes.
//   planche : référence frontale (`reference/generated/2026-10-19-quai-nuit-cameras/02.png`) et capture après, puis
//             chaque position avant | après.
// Usage :
//   node tools/m09-v3.mjs shots <dist> <dossier>
//   LQV_BEFORE=<dist avant> LQV_BEFORE_SHA=<sha> node tools/m09-v3.mjs cout <rapport.json> [rondes=3]
//   node tools/m09-v3.mjs planche <dossier avant> <dossier après> <sortie.png>
//   node tools/m09-v3.mjs cadrages <dossier contenant retenu/, serre/, large/> <sortie.png>
// GPU réel : LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=--force_high_performance_gpu].
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { EXTRA_ARGS, GPU, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const MODE = process.argv[2];
const SPOTS = {
  arrivee: [-17.4, 0.6, 'droite', 'Arrivée (ouest), la salle de jeu au fond'],
  etal: [-0.6, 0.2, 'face', 'Centre du Quai : l’étal et le docker'],
  fanal: [7.2, -1.4, 'dos', 'Devant le Fanal'],
  salle: [-6.75, -1.4, 'dos', 'Devant la salle de jeu de cartes'],
  kai: [12.0, 1.0, 'droite', 'Kaï, bout est du Quai'],
  // passe 49 : le Parvis et les Ruelles dans la direction D (5e élément : l'îlot)
  'parvis-porte': [0, -2.6, 'dos', 'Parvis : devant la porte du Tournoi', 'parvis'],
  'parvis-joueuse': [-4.8, 0.9, 'gauche', 'Parvis : la joueuse et les braseros', 'parvis'],
  'parvis-est': [7.6, 1.4, 'droite', 'Parvis : la table des inscriptions', 'parvis'],
  'ruelles-fontaine': [-1.8, 1.0, 'gauche', 'Ruelles : la fontaine du Voile', 'ruelles'],
  'ruelles-selene': [8.4, -0.3, 'droite', 'Ruelles : Sélène et l’étal de la liseuse', 'ruelles'],
  'ruelles-ouest': [-9.0, 1.4, 'gauche', 'Ruelles : l’ouest du canal', 'ruelles'],
};
const ONLY = process.env.LQV_SPOTS?.split(',') ?? Object.keys(SPOTS);
const SIZES = (process.env.LQV_SIZES ?? '1280x720,1920x1080').split(',').map((s) => s.split('x').map(Number));
const QUERY = process.env.LQV_V3_QUERY ? `&${process.env.LQV_V3_QUERY}` : '';
const ILOT = process.env.LQV_V3_ILOT ?? 'quai';
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
const r2 = (x) => Math.round(x * 100) / 100;
const hideUi = () => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; };

if (MODE === 'shots') {
  const [dist, dir] = process.argv.slice(3);
  if (!dist || !dir) throw new Error('usage : shots <dist> <dossier>');
  mkdirSync(dir, { recursive: true });
  const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4287, dist);
  const browser = await launch();
  const issues = [];
  try {
    for (const [w, h] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      p.setDefaultTimeout(90000);
      watchConsole(p, issues);
      await p.goto(`${server.base}/?ville=1&qa=1&freeze=1${QUERY}`);
      await p.waitForFunction(() => !!window.__lqvVille);
      for (const k of ONLY) {
        const [x, z, f, , ilot = 'quai'] = SPOTS[k];
        await p.evaluate(({ x, z, f, ilot }) => { const t = window.__lqvVille.town; if (t.ilotId() !== ilot) t.goTo(ilot, 'arrivee'); t.place({ x, z }, f); t.renderNow(); }, { x, z, f, ilot });
        await p.waitForTimeout(400);
        await p.evaluate(hideUi);
        const file = join(dir, `${k}-${w}x${h}.png`);
        writeFileSync(file, await p.screenshot());
        console.log(file);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.stop();
  }
  console.log('console :', issues.length ? issues.slice(0, 10) : 'aucune erreur');
} else if (MODE === 'cout') {
  const OUT = process.argv[3] ?? 'artifacts/qa/m09/v3/cout.json';
  const ROUNDS = Number(process.argv[4] ?? 3);
  const BEFORE = process.env.LQV_BEFORE;
  if (!BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
  const head = execSync('git rev-parse --short HEAD').toString().trim();
  const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
  const builds = {
    avant: { sha: process.env.LQV_BEFORE_SHA ?? '?', server: await startPreview(4291, BEFORE) },
    apres: { sha: commit, server: await startPreview(4292, process.env.LQV_DIST || 'dist') },
  };
  const browser = await launch();
  const issues = [];
  let renderer = null;
  /** Chronométrage GPU injecté (aucun code du jeu) : une requête TIME_ELAPSED par rappel rAF sur le contexte du canvas
   *  de la ville ; on garde les rappels qui dessinent (> 0,02 ms GPU). D’après `perf-compare.mjs` (arène). */
  function gpuTimer() {
    let gl = null;
    let ext = null;
    const pending = [];
    const bind = () => {
      const canvas = document.querySelector('canvas.ville-canvas');
      if (!canvas || gl?.canvas === canvas) return;
      gl = canvas.getContext('webgl2');
      ext = gl?.getExtension('EXT_disjoint_timer_query_webgl2') ?? null;
      pending.length = 0;
    };
    window.__gpuMs = [];
    window.__gpuDisjoint = 0;
    window.__gpuTimerOk = () => !!ext;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => {
      bind();
      let q = null;
      if (ext) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
      try { cb(t); } finally {
        if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q); }
        while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
          const pq = pending.shift();
          const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
          const ns = gl.getQueryParameter(pq, gl.QUERY_RESULT);
          gl.deleteQuery(pq);
          if (ns > 20000 && ns < 1e8) { window.__gpuMs.push(ns / 1e6); if (disjoint) window.__gpuDisjoint++; }
        }
      }
    });
  }
  const measure = async (base, w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    watchConsole(page, issues);
    await page.addInitScript(gpuTimer);
    await page.goto(`${base}/?ville=1&qa=1${QUERY}`);
    await page.waitForFunction(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 2);
    renderer ??= await webglRenderer(page);
    // LQV_V3_ILOT : îlot mesuré (défaut : le Quai) ; départ à x = −8, sur une ligne libre de l'îlot
    await page.evaluate((il) => { const t = window.__lqvVille.town; if (t.ilotId() !== il) t.goTo(il, 'arrivee'); t.place({ x: -8, z: il === 'ruelles' ? 1.6 : 0.6 }, 'droite'); }, ILOT);
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__gpuMs.length = 0; window.__gpuDisjoint = 0; window.__iv = []; let l = performance.now(); const f = (t) => { window.__iv.push(t - l); l = t; if (!window.__ivStop) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(3000);
    await page.keyboard.up('KeyD');
    const r = await page.evaluate(() => { window.__ivStop = true; return { ok: window.__gpuTimerOk(), ms: window.__gpuMs.slice(), disjoint: window.__gpuDisjoint, iv: window.__iv.slice(1), st: window.__lqvVille.town.stats(), x: window.__lqvVille.town.walker().pos.x }; });
    await page.close();
    return {
      gpuMs: r.ok && r.ms.length ? r2(median(r.ms)) : null, gpuP95Ms: r.ok && r.ms.length ? r2(pct(r.ms, 0.95)) : null, gpuFrames: r.ms.length, gpuDisjoint: r.disjoint,
      intervalMs: r2(median(r.iv)), over16_7: r2(r.iv.filter((d) => d > 1000 / 60).length / Math.max(1, r.iv.length)),
      calls: r.st.calls, triangles: r.st.triangles, textures: r.st.textures, programs: r.st.programs, lights: r.st.lights, cpuMs: r.st.cpuMs, buildMs: r.st.buildMs, walkedTo: r2(r.x),
    };
  };
  const runs = {};
  try {
    for (const [w, h] of SIZES) {
      const key = `${w}x${h}`;
      runs[key] = { avant: [], apres: [] };
      for (let r = 0; r < ROUNDS; r++) {
        for (const which of r % 2 ? ['apres', 'avant'] : ['avant', 'apres']) {
          const m = await measure(builds[which].server.base, w, h);
          runs[key][which].push(m);
          console.log(`${key} · ronde ${r + 1} · ${which} : ${m.gpuMs} ms GPU/image (p95 ${m.gpuP95Ms}), intervalle ${m.intervalMs} ms, ${m.calls} appels, ${Math.round(m.triangles / 1000)} k triangles, ${m.textures} textures, ${m.programs} programmes`);
        }
      }
    }
  } finally {
    await browser.close();
    builds.avant.server.stop();
    builds.apres.server.stop();
  }
  const summary = {};
  for (const [key, byBuild] of Object.entries(runs)) {
    summary[key] = {};
    for (const [which, xs] of Object.entries(byBuild)) {
      const g = xs.filter((x) => x.gpuMs != null);
      summary[key][which] = {
        medianGpuMs: g.length ? r2(median(g.map((x) => x.gpuMs))) : null, medianGpuP95Ms: g.length ? r2(median(g.map((x) => x.gpuP95Ms))) : null,
        medianIntervalMs: r2(median(xs.map((x) => x.intervalMs))), calls: xs.at(-1)?.calls, triangles: xs.at(-1)?.triangles, textures: xs.at(-1)?.textures, programs: xs.at(-1)?.programs, lights: xs.at(-1)?.lights, buildMs: r2(median(xs.map((x) => x.buildMs))),
      };
    }
  }
  const machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), node: process.version };
  const report = { date: new Date().toISOString(), machine, renderer: rendererLabel(renderer), gpu: GPU, chromeArgs: EXTRA_ARGS, ilot: ILOT, protocol: `${ROUNDS} rondes entrelacées par taille ; page neuve, 3 s de mise en régime, 3 s de marche vers l’est depuis x = −8 ; temps GPU par image (médiane et p95)`, builds: { avant: builds.avant.sha, apres: builds.apres.sha }, query: QUERY.slice(1) || null, summary, runs, console: issues };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('console :', issues.length ? issues.slice(0, 10) : 'aucune erreur');
} else if (MODE === 'planche') {
  const [avant, apres, out] = process.argv.slice(3);
  if (!avant || !apres || !out) throw new Error('usage : planche <dossier avant> <dossier après> <sortie.png>');
  // LQV_V3_REF : autre référence (direction D : reference/generated/2026-10-19-quai-direction-d/01.png) ;
  // LQV_V3_COLS : libellés des deux colonnes (« avant|après » par défaut) ; LQV_V3_TITLE : titre de la planche.
  const REF = process.env.LQV_V3_REF ?? 'reference/generated/2026-10-19-quai-nuit-cameras/02.png';
  const [CA, CB] = (process.env.LQV_V3_COLS ?? 'avant|après').split('|');
  const TITLE = process.env.LQV_V3_TITLE ?? 'M09 V3 — le Quai, la nuit : avant (gauche) | après (droite)';
  // LQV_V3_BIG : position montrée en 1920 × 1080 (première et dernière rangées ; défaut : le centre du Quai)
  const BIG = process.env.LQV_V3_BIG ?? 'etal';
  const bigLabel = SPOTS[BIG]?.[3] ?? BIG;
  const data = (f) => (existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : null);
  const rows = [
    { label: `Référence (image générée, jamais dans le jeu) | ${CB}, ${bigLabel} 1920×1080`, srcs: [data(REF), data(join(apres, `${BIG}-1920x1080.png`))] },
    ...ONLY.map((k) => ({ label: `${SPOTS[k][3]} — 1280×720 : ${CA} | ${CB}`, srcs: [data(join(avant, `${k}-1280x720.png`)), data(join(apres, `${k}-1280x720.png`))] })),
    { label: `${bigLabel} — 1920×1080 : ${CA} | ${CB}`, srcs: [data(join(avant, `${BIG}-1920x1080.png`)), data(join(apres, `${BIG}-1920x1080.png`))] },
  ].filter((r) => r.srcs.some(Boolean));
  const browser = await launch();
  const page = await (await browser.newContext()).newPage();
  const png = await page.evaluate(async ({ rows, title }) => {
    const W = 880; const H = 495; const PAD = 20; const LABEL = 30; const HEAD = 70;
    const c = document.createElement('canvas');
    c.width = PAD + 2 * (W + PAD);
    c.height = HEAD + rows.length * (LABEL + H + PAD);
    const x = c.getContext('2d');
    x.fillStyle = '#0b0c12'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#f2e4c4'; x.font = '600 28px Georgia, serif';
    x.fillText(title, PAD, 46);
    for (const [r, row] of rows.entries()) {
      const y = HEAD + r * (LABEL + H + PAD);
      x.fillStyle = '#c9b48a'; x.font = '18px system-ui, sans-serif';
      x.fillText(row.label, PAD, y + 21);
      for (const [i, src] of row.srcs.entries()) {
        if (!src) continue;
        const im = new Image(); im.src = src; await im.decode();
        // Référence 3:2 : recadrée au centre en 16:9 pour la comparaison (même largeur que les captures).
        const sh = Math.min(im.height, (im.width * 9) / 16);
        x.drawImage(im, 0, (im.height - sh) / 2, im.width, sh, PAD + i * (W + PAD), y + LABEL, W, H);
      }
    }
    return c.toDataURL('image/png');
  }, { rows, title: TITLE });
  await browser.close();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`planche : ${out}`);
} else if (MODE === 'cadrages') {
  // Variantes de cadrage côte à côte (même build, paramètre `rig=`) : sous-dossiers `retenu`, `serre`, `large` de
  // captures `shots` (LQV_V3_QUERY) ; une rangée par position.
  const [dir, out] = process.argv.slice(3);
  if (!dir || !out) throw new Error('usage : cadrages <dossier> <sortie.png>');
  const COLS = [['retenu', 'Retenu : rig=7,18.5,39,3.05'], ['serre', 'Plus serré : rig=6.5,18.5,37,3.2'], ['large', 'Plus large : rig=7.5,20,38,3']];
  const data = (f) => (existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : null);
  const rows = ONLY.map((k) => ({ label: SPOTS[k][3], srcs: COLS.map(([d]) => data(join(dir, d, `${k}-1280x720.png`))) })).filter((r) => r.srcs.some(Boolean));
  const browser = await launch();
  const page = await (await browser.newContext()).newPage();
  const png = await page.evaluate(async ({ rows, titles }) => {
    const W = 640; const H = 360; const PAD = 16; const LABEL = 26; const HEAD = 60;
    const c = document.createElement('canvas');
    c.width = PAD + titles.length * (W + PAD);
    c.height = HEAD + rows.length * (LABEL + H + PAD);
    const x = c.getContext('2d');
    x.fillStyle = '#0b0c12'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#f2e4c4'; x.font = '600 20px Georgia, serif';
    titles.forEach((t, i) => x.fillText(t, PAD + i * (W + PAD), 40));
    for (const [r, row] of rows.entries()) {
      const y = HEAD + r * (LABEL + H + PAD);
      x.fillStyle = '#c9b48a'; x.font = '16px system-ui, sans-serif';
      x.fillText(row.label, PAD, y + 18);
      for (const [i, src] of row.srcs.entries()) {
        if (!src) continue;
        const im = new Image(); im.src = src; await im.decode();
        x.drawImage(im, PAD + i * (W + PAD), y + LABEL, W, H);
      }
    }
    return c.toDataURL('image/png');
  }, { rows, titles: COLS.map(([, t]) => t) });
  await browser.close();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`planche des cadrages : ${out}`);
} else {
  throw new Error('mode : shots | cout | planche | cadrages');
}
