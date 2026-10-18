// M07 L5 — planche « avant / après la passe de finition » du modèle V2 d’un rival (deux builds, V2 des deux côtés) :
// six humeurs (visage, scène 3D seule) à 1280×720 et 1920×1080, à l’échelle 1:1, affiche de rencontre et vue A.
// Usage : LQV_BEFORE=<dist avant finition> LQV_BEFORE_SHA=<sha> LQV_GPU=1 CHROMIUM_PATH=<Chrome>
//         node tools/l5-finition.mjs [sortie=screenshots/qa/m07/l5-finition] [rival=ronce]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE=<dist avant finition> requis');
const OUT = process.argv[2] ?? 'screenshots/qa/m07/l5-finition';
const RIVAL = process.argv[3] ?? 'ronce';
mkdirSync(OUT, { recursive: true });
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const servers = { avant: await startPreview(4193, BEFORE), apres: await startPreview(4194) };
const LABEL = { avant: `Avant finition (${process.env.LQV_BEFORE_SHA ?? '?'})`, apres: `Après finition (${commit})` };
const browser = await launch();
const MOODS = [['neutral', 'repos'], ['focused', 'prudence'], ['thinking', 'réflexion'], ['surprised', 'surprise'], ['pained', 'touchée'], ['angry', 'colère']];
const issues = [];
let renderer = null;
const png = (b) => `data:image/png;base64,${b.toString('base64')}`;
const shots = { avant: {}, apres: {} };
try {
  for (const which of ['avant', 'apres']) {
    const base = servers[which].base;
    for (const [W, H] of [[1280, 720], [1920, 1080]]) {
      const k = W / 1280;
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      p.setDefaultTimeout(30000);
      watchConsole(p, issues);
      shots[which][W] = { moods: [] };
      for (const [mood, label] of MOODS) {
        await p.goto(`${base}/?seed=202&autostart=1&rival=${RIVAL}&qa=1&aiDelay=0&intro=1&view=A&reducedMotion=1&freeze=1&pose=${mood}&figure=v2`);
        await p.waitForFunction(() => !!window.__lqv);
        renderer ??= await webglRenderer(p);
        await p.waitForTimeout(600);
        await p.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } });
        await p.waitForTimeout(120);
        shots[which][W].moods.push([png(await p.screenshot({ clip: { x: Math.round(540 * k), y: Math.round(28 * k), width: Math.round(200 * k), height: Math.round(240 * k) } })), label]);
      }
      if (W === 1280) {
        await p.goto(`${base}/?seed=202&autostart=1&rival=${RIVAL}&qa=1&aiDelay=0&intro=1&view=A&reducedMotion=1&freeze=1&figure=v2`);
        await p.waitForFunction(() => !!window.__lqv);
        await p.waitForTimeout(800);
        shots[which].vueA = png(await p.screenshot());
        await p.goto(`${base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5&figure=v2`);
        await p.click('[data-key="home-new"]');
        await p.fill('[data-key="new-name"]', 'Capture');
        await p.click('[data-key="new-sig-Ronce"]');
        await p.click('[data-key="new-create"]');
        await p.waitForSelector('[data-screen="board"]');
        await p.evaluate(() => { const sh = window.__lqvShell; const pr = sh.save.progress; pr.series.step = 2; pr.series.completed = Math.max(1, pr.series.completed ?? 0); for (const id of ['braise', 'ronce', 'voile', 'astre']) if (!pr.met.includes(id)) pr.met.push(id); sh.persist(); sh.render(); });
        await p.waitForSelector(`[data-encounter="libre-${RIVAL}"].st-open`);
        await p.waitForTimeout(600);
        shots[which].affiche = png(await p.locator(`[data-encounter="libre-${RIVAL}"]`).screenshot());
      }
      await ctx.close();
    }
  }
  const row = (which, items) => `<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 10px"><div style="width:150px;font:600 14px Georgia,serif;color:${which === 'apres' ? '#c8f08a' : '#e6c99a'}">${LABEL[which]}</div>${items.map(([src, cap]) => `<figure style="margin:0"><img src="${src}" style="display:block;border:1px solid #3a3040"><figcaption style="color:#b9ad98;font-size:12px;margin-top:3px">${cap}</figcaption></figure>`).join('')}</div>`;
  const h2 = (t) => `<h2 style="font:600 17px Georgia,serif;color:#f0d08c;margin:12px 0 2px">${t}</h2>`;
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:16px 20px">
<h1 style="font:600 26px Georgia,serif;color:#ffe2a6;margin:0 0 4px">Passe de finition V2 — ${RIVAL === 'ronce' ? 'Maëlle' : RIVAL} : avant / après</h1>
<p style="margin:0 0 10px;color:#b9ad98">Demande du responsable : plan d’ombre du visage moins tranché, cheveux avec mèches et reflets, yeux lisibles en prudence à 83 px. Seed 202, graine d’art 7 — ${rendererLabel(renderer)}. Échelle 1:1 ; humeurs imposées par <code>pose=</code> (intensité 1).</p>
${h2('Six humeurs — 1280×720 (≈ 83 px des yeux au menton)')}${['avant', 'apres'].map((w) => row(w, shots[w][1280].moods)).join('')}
${h2('Six humeurs — 1920×1080 (≈ 125 px)')}${['avant', 'apres'].map((w) => row(w, shots[w][1920].moods)).join('')}
${h2('Affiche de rencontre et vue A du duel (1280×720)')}${['avant', 'apres'].map((w) => row(w, [[shots[w].affiche, 'affiche'], [shots[w].vueA, 'vue A']])).join('')}</body>`;
  const ctx = await browser.newContext({ viewport: { width: 2000, height: 1000 } });
  const p = await ctx.newPage();
  await p.setContent(html);
  await p.waitForTimeout(300);
  writeFileSync(`${OUT}/planche-finition-${RIVAL}.png`, await p.screenshot({ fullPage: true }));
  await ctx.close();
} finally {
  await browser.close();
  servers.avant.stop();
  servers.apres.stop();
}
writeFileSync(`${OUT}/manifest-${RIVAL}.json`, JSON.stringify({ date: new Date().toISOString(), renderer: rendererLabel(renderer), avant: process.env.LQV_BEFORE_SHA ?? '?', apres: commit, rival: RIVAL, issues }, null, 2));
console.log(JSON.stringify({ renderer: rendererLabel(renderer), issues }));
