// M10-C — planche des quatre chefs de famille en « vectoriel V2 » (identités `chef-<famille>`, `src/scene/v2/chefs.ts`),
// sur le build courant, à côté des quatre bras droits (rivaux signatures) en référence :
//   - par figure : vue A du duel (rendu figé, éclairage HD-2D) recadrée sur le buste, et portrait des affiches et du HUD ;
//   - par chef : quatre humeurs imposées (repos, surprise, colère, triomphe ; paramètre QA `pose=`) ;
//   - vue A complète (HUD compris) d'un duel contre chaque chef ;
//   - déterminisme (couches générées deux fois, empreintes identiques ; sinon, écart mesuré pixel par pixel) et coût
//     de génération.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=<Chrome>] [LQV_VP=1280x720] node tools/m10c-chefs.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/m10c/chefs';
const REPORT = process.argv[3] ?? 'artifacts/qa/m10c/chefs.json';
const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
mkdirSync(OUT, { recursive: true });
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4243);
const browser = await launch();
const issues = [];
let renderer = null;
const png = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const files = [];
const save = (name, buf, desc) => { writeFileSync(`${OUT}/${name}`, buf); files.push({ file: `${OUT}/${name}`, desc }); };
const CHEFS = ['chef-cendre', 'chef-ronce', 'chef-voile', 'chef-astre'];
const RIVALS = ['braise', 'ronce', 'voile', 'astre'];
const MOODS = [['', 'repos'], ['surprised', 'surprise'], ['angry', 'colère'], ['triumphant', 'triomphe']];
const duel = (id, pose = '') => `seed=202&autostart=1&rival=${id}&qa=1&aiDelay=0&intro=1&view=A&reducedMotion=1&freeze=1${pose ? `&pose=${pose}` : ''}`;
const FINGERPRINT = (id) => {
  const fnv = (data) => { let h = 0x811c9dc5; for (let i = 0; i < data.length; i += 7) { h ^= data[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  const layers = window.__lqvFigureLayers(id);
  return { fp: layers.map((c) => `${c.width}x${c.height}:${fnv(c.getContext('2d').getImageData(0, 0, c.width, c.height).data)}`).join(','), urls: layers.map((c) => c.toDataURL('image/png')) };
};
/** Écart entre deux couches (PNG sans perte) : pixels différents et écart maximal d'une composante (0 à 255). */
const DIFF = async ([a, b]) => {
  const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const c = document.createElement('canvas');
  c.width = ia.width;
  c.height = ia.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  const read = (img) => { x.clearRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  const da = read(ia);
  const db = read(ib);
  let pixels = 0;
  let max = 0;
  for (let i = 0; i < da.length; i += 4) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(da[i + k] - db[i + k]));
    if (d) { pixels += 1; max = Math.max(max, d); }
  }
  return { pixels, total: da.length / 4, max };
};
const report = { date: new Date().toISOString(), commit, viewport: VP, chromeArgs: EXTRA_ARGS, renderer: null, determinism: {}, ecarts: {}, cost: {}, files, issues };
const urls = {};

async function page(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  return { ctx, p };
}

try {
  for (const pass of [0, 1]) {
    const { ctx, p } = await page([1280, 720]);
    await p.goto(`${server.base}/?${duel('braise')}`);
    await p.waitForFunction(() => !!window.__lqv);
    renderer ??= await webglRenderer(p);
    // amorce : une figure déjà connue d'abord (le navigateur peut changer de mode de tramage des canvas après les
    // premières relectures ; les empreintes se comparent ensuite dans le même régime)
    await p.evaluate(FINGERPRINT, 'braise');
    for (const id of CHEFS) {
      const r = await p.evaluate(FINGERPRINT, id);
      (report.determinism[id] ??= []).push(r.fp);
      (urls[id] ??= []).push(r.urls);
      if (pass === 1) report.cost[id] = await p.evaluate((id) => window.__lqvFigureCost(9, id), id);
    }
    await ctx.close();
  }
  const cells = {};
  const { ctx, p } = await page(VP);
  // Couches qui diffèrent d'une page à l'autre : écart mesuré (tramage des canvas par le GPU, ou vraie dérive du dessin).
  for (const [id, fps] of Object.entries(report.determinism)) {
    if (fps[0] === fps[1]) continue;
    const a = fps[0].split(',');
    const b = fps[1].split(',');
    for (const [i, x] of a.entries()) if (x !== b[i]) (report.ecarts[id] ??= {})[i] = await p.evaluate(DIFF, [urls[id][0][i], urls[id][1][i]]);
    // Écart de tramage du GPU (quelques pixels, d’un cran ou deux sur 255 ; identique en rendu logiciel) : noté, pas une
    // dérive du dessin. Au-delà : problème.
    if (!Object.values(report.ecarts[id]).every((x) => x.max <= 2 && x.pixels / x.total < 1e-4)) issues.push(`déterminisme : ${id} diffère d’une page à l’autre (${JSON.stringify(report.ecarts[id])})`);
  }
  const k = VP[0] / 1280;
  const clip = { x: Math.round(500 * k), y: 0, width: Math.round(280 * k), height: Math.round(300 * k) };
  for (const id of [...RIVALS, ...CHEFS]) {
    for (const [mood] of CHEFS.includes(id) ? MOODS : [['', '']]) {
      await p.goto(`${server.base}/?${duel(id, mood)}`);
      await p.waitForFunction(() => !!window.__lqv);
      await p.waitForTimeout(700);
      const meta = await p.evaluate(() => { const r = window.__lqv.controller.rival; return { name: r.name, title: r.title, family: r.family }; });
      const cell = (cells[id] ??= { meta, moods: {} });
      cell.moods[mood || 'repos'] = png(await p.screenshot({ clip }));
      if (!mood) {
        cell.portrait = await p.evaluate(() => document.querySelector('.hud.opp .portrait img, .portrait.mini img')?.src ?? null);
        if (CHEFS.includes(id)) save(`vueA-${id}-${VP[0]}.png`, await p.screenshot(), `Vue A complète du duel contre ${meta.name} (${id}), ${VP[0]}×${VP[1]}`);
      }
    }
  }
  await ctx.close();
  // Gros plans des visages (1920×1080, densité 2) pour la relecture des détails.
  {
    const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
    const p2 = await ctx2.newPage();
    watchConsole(p2, issues);
    for (const id of CHEFS) {
      await p2.goto(`${server.base}/?${duel(id)}`);
      await p2.waitForFunction(() => !!window.__lqv);
      await p2.waitForTimeout(700);
      save(`gros-plan-${id}.png`, await p2.screenshot({ clip: { x: 800, y: 40, width: 320, height: 420 } }), `Gros plan du visage de ${id} (1920×1080, densité 2)`);
    }
    await ctx2.close();
  }
  report.renderer = rendererLabel(renderer);
  const pw = await page([2400, 1400]);
  const fig = (id, ref) => {
    const c = cells[id];
    const pd = Math.round(99 * k);
    const moods = ref ? '' : MOODS.slice(1).map(([m, l]) => `<figure style="margin:0"><img src="${c.moods[m]}" style="display:block;border:1px solid #3a3040"><figcaption style="color:#9a8e78;font-size:11px;text-align:center">${l}</figcaption></figure>`).join('');
    return `<div style="display:flex;gap:6px;align-items:flex-end;margin:0 0 12px">
      <figure style="margin:0"><img src="${c.moods.repos}" style="display:block;border:1px solid ${ref ? '#8a6a2a' : '#c9a24a'}"><figcaption style="color:#d8ccb4;font-size:13px;text-align:center">${c.meta.name} — ${c.meta.title}<br><span style="color:#9a8e78;font-size:11px">${ref ? 'bras droit (rival signature)' : 'chef'} · ${c.meta.family}</span></figcaption></figure>
      <img src="${c.portrait}" style="display:block;width:${pd}px;height:${pd}px;border:1px solid #3a3040;margin-bottom:34px">${moods}</div>`;
  };
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:16px 20px">
<h1 style="font:600 26px Georgia,serif;color:#ffe2a6;margin:0 0 4px">Les quatre chefs de famille en vectoriel V2 — M10-C (${VP[0]}×${VP[1]})</h1>
<p style="margin:0 0 12px;color:#b9ad98">Build ${commit}, seed 202, graine d’art 7 — ${report.renderer}. Vue A du duel recadrée sur le buste (échelle 1:1), portrait du HUD, et trois humeurs imposées (paramètre QA <code>pose=</code>). En haut, les bras droits de chaque famille en référence.</p>
<div style="display:grid;grid-template-columns:repeat(4,auto);gap:4px 24px;justify-content:start">${RIVALS.map((id) => fig(id, true)).join('')}</div>
<div style="display:grid;grid-template-columns:repeat(2,auto);gap:8px 32px;justify-content:start">${CHEFS.map((id) => fig(id, false)).join('')}</div></body>`;
  await pw.p.setContent(html);
  await pw.p.waitForTimeout(400);
  save(`planche-chefs-${VP[0]}.png`, await pw.p.screenshot({ fullPage: true }), `Planche des quatre chefs (buste, portrait, humeurs) et des quatre bras droits, ${VP[0]}×${VP[1]}`);
  await pw.ctx.close();
} finally {
  await browser.close();
  server.stop();
}
report.renderer ??= rendererLabel(renderer);
report.deterministic = Object.values(report.determinism).every((fps) => fps[0] === fps[1]);
report.tramageSeul = !report.deterministic && Object.values(report.ecarts).every((e) => Object.values(e).every((x) => x.max <= 2 && x.pixels / x.total < 1e-4));
mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(`${report.deterministic ? 'déterministe' : report.tramageSeul ? `déterministe au tramage du GPU près (${JSON.stringify(report.ecarts)})` : 'NON DÉTERMINISTE'} ; coût ${JSON.stringify(report.cost)} ; ${issues.length ? `problèmes : ${issues.join(' | ')}` : 'console : aucune erreur'}`);
