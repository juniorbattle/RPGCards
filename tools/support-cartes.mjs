// M08 — support de l’éventail de cartes du rival (demande du responsable, 2026-10-18) : captures avant / après sur le
// même parcours (entrée directe, seed 202, rendu figé), vue A complète et gros plan de l’éventail (densité 2), pour un
// rival et un PNJ, à 1280×720 et 1920×1080 ; plus une planche de comparaison.
// Usage : npm run build && LQV_BEFORE=<dist avant> LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/support-cartes.mjs [dossier]
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/m08/support';
const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE requis');
mkdirSync(OUT, { recursive: true });
const port = Number(process.env.LQV_PREVIEW_PORT) || 4281;
const servers = { avant: await startPreview(port, BEFORE), apres: await startPreview(port + 1) };
const browser = await launch();
const issues = [];
const png = (b) => `data:image/png;base64,${b.toString('base64')}`;
const shots = {};
try {
  for (const id of ['braise', 'ronce', 'pnj-marchande-9']) {
    for (const vp of [[1280, 720], [1920, 1080]]) {
      for (const which of ['avant', 'apres']) {
        const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2 });
        const p = await ctx.newPage();
        watchConsole(p, issues);
        await p.goto(`${servers[which].base}/?seed=202&autostart=1&rival=${id}&qa=1&aiDelay=0&intro=1&view=A&reducedMotion=1&freeze=1`);
        await p.waitForFunction(() => !!window.__lqv);
        await p.waitForTimeout(800);
        const k = vp[0] / 1280;
        const full = await p.screenshot({ scale: 'css' });
        const zoom = await p.screenshot({ clip: { x: 430 * k, y: 150 * k, width: 420 * k, height: 230 * k } });
        writeFileSync(`${OUT}/${id}-${which}-${vp[0]}.png`, full);
        writeFileSync(`${OUT}/${id}-${which}-${vp[0]}-gros-plan.png`, zoom);
        (shots[`${id}-${vp[0]}`] ??= {})[which] = png(zoom);
        await ctx.close();
      }
    }
  }
  const ctx = await browser.newContext({ viewport: { width: 1900, height: 900 } });
  const p = await ctx.newPage();
  const rows = Object.entries(shots).map(([k, v]) => `<h3 style="font:600 15px Georgia,serif;color:#f0d08c;margin:10px 0 4px">${k}</h3><div style="display:flex;gap:10px"><figure style="margin:0"><img src="${v.avant}" style="width:880px"><figcaption style="color:#b9ad98">avant</figcaption></figure><figure style="margin:0"><img src="${v.apres}" style="width:880px"><figcaption style="color:#b9ad98">après : éventail planté dans son support</figcaption></figure></div>`).join('');
  await p.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:14px 18px"><h1 style="font:600 24px Georgia,serif;color:#ffe2a6;margin:0 0 6px">Support de l’éventail du rival — avant / après (gros plans, densité 2)</h1>${rows}</body>`);
  await p.waitForTimeout(400);
  writeFileSync(`${OUT}/planche-support.png`, await p.screenshot({ fullPage: true }));
  await ctx.close();
} finally {
  await browser.close();
  servers.avant.stop();
  servers.apres.stop();
}
console.log(`captures dans ${OUT} · console ${issues.length}`);
for (const i of issues.slice(0, 5)) console.log(i);
