// M07 L5, passe 26 — portrait du duelliste joueur (HUD bas-gauche) en « vectoriel V2 » : captures avant / après,
// contrôles au pixel près et coût de génération. Avant : LQV_BEFORE (build de départ, portrait joueur en V1) ; après :
// dist/ (portrait joueur V2 par défaut). Duel seed 202 (Maëlle), vue A, rendu figé.
//  1. Captures : HUD joueur des quatre familles de Signature (`sig=`) à 1280×720 et 1920×1080 (échelle 1:1), portrait
//     source agrandi, duel complet (Cendre) aux deux tailles, et planche avant / après.
//  2. Contrôles : (b) portraits des quatre rivaux (après, défaut) = avant ; (c) duel complet, portrait du joueur masqué :
//     0 pixel différent aux deux tailles ; témoin : même comparaison portrait visible. Le contrôle (a), chemin V1 du
//     joueur (`?qa=1&figure=v1`), est retiré avec le rendu V1 (M08 C5).
//  3. Coût (`__lqvPortraitCost`, après) : portrait V2 (dessin + PNG) pour le joueur des quatre familles et les quatre
//     rivaux ; couches V2 toutes (`figureV2Art`) contre celles du portrait (`figureV2PortraitArt`).
// Usage : npm run build && LQV_BEFORE=<dist avant> LQV_BEFORE_SHA=<sha> LQV_GPU=1 CHROMIUM_PATH=<Chrome>
//         node tools/l5-joueur.mjs [captures=screenshots/qa/m07/l5-joueur] [rapport=artifacts/qa/m07/l5-joueur.json]
// COUT_SEUL=1 : coût seulement (autre adaptateur : LQV_CHROME_ARGS=--force_high_performance_gpu), sans LQV_BEFORE.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const COST_ONLY = process.env.COUT_SEUL === '1';
const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE && !COST_ONLY) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const OUT = process.argv[2] ?? 'screenshots/qa/m07/l5-joueur';
const REPORT = process.argv[3] ?? 'artifacts/qa/m07/l5-joueur.json';
mkdirSync(OUT, { recursive: true });
mkdirSync(dirname(REPORT), { recursive: true });
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const FAMS = ['Cendre', 'Voile', 'Ronce', 'Astre'];
const RIVALS = ['braise', 'ronce', 'voile', 'astre'];
const SIZES = [[1280, 720], [1920, 1080]];
const servers = { apres: await startPreview(4202) };
if (!COST_ONLY) servers.avant = await startPreview(4201, BEFORE);
const LABEL = { avant: `Avant (${process.env.LQV_BEFORE_SHA ?? '?'}) — joueur en V1`, apres: `Après (${commit}) — joueur en V2` };
const browser = await launch();
const helper = await (await browser.newContext()).newPage();
const issues = [];
let renderer = null;
const report = { date: new Date().toISOString(), commit, avant: process.env.LQV_BEFORE_SHA ?? null, chromeArgs: EXTRA_ARGS, renderer: null };
const url = (base, q) => `${base}/?seed=202&autostart=1&qa=1&aiDelay=0&intro=1&view=A&reducedMotion=1&freeze=1${q}`;
const png = (b) => `data:image/png;base64,${b.toString('base64')}`;

/** Écart entre deux PNG : moyenne absolue (0–255), maximum, nombre de pixels différents. */
const diff = (a, b) => helper.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const [p, q] = [await load(a), await load(b)];
  if (p.width !== q.width || p.height !== q.height) return { error: 'tailles différentes' };
  let sum = 0; let max = 0; let px = 0;
  const box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < p.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = Math.abs(p.data[i + c] - q.data[i + c]); sum += e; d = Math.max(d, e); }
    if (d) {
      px++;
      const x = (i / 4) % p.width;
      const y = Math.floor(i / 4 / p.width);
      box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
    }
    max = Math.max(max, d);
  }
  return { moyenne: Math.round((sum / (p.width * p.height * 3)) * 1000) / 1000, max, pixels: px, ...(px ? { zone: box } : {}) };
}, { a, b });

async function open(ctx, base, q) {
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  await p.goto(url(base, q));
  await p.waitForSelector('.hud.me .portrait img');
  await p.waitForFunction(() => [...document.querySelectorAll('.hud img')].every((i) => i.complete));
  renderer ??= await webglRenderer(p);
  await p.waitForTimeout(700);
  return p;
}
const srcOf = (p, sel) => p.locator(sel).getAttribute('src');

try {
  if (!COST_ONLY) {
    const shots = { avant: {}, apres: {} };
    const checks = { portraitsRivaux: [], duelHorsPortrait: [], temoin: [] };
    for (const [W, H] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      for (const fam of FAMS) {
        // Une page à la fois : deux pages ouvertes ensemble faisaient varier les illustrations de la main (≤ 10/255,
        // course connue entre le worker et le repli, passe 15), sans rapport avec le portrait.
        const full = {};
        const masked = {};
        for (const which of ['avant', 'apres']) {
          const p = await open(ctx, servers[which].base, `&sig=${fam}`);
          const hud = await p.locator('.hud.me').screenshot();
          writeFileSync(`${OUT}/hud-${which}-${fam}-${W}.png`, hud);
          (shots[which][W] ??= []).push([png(hud), fam]);
          if (W === 1280) {
            const src = await srcOf(p, '.hud.me .portrait img');
            writeFileSync(`${OUT}/portrait-${which}-${fam}.png`, Buffer.from(src.split(',')[1], 'base64'));
            (shots[which].portraits ??= []).push([src, fam]);
          }
          // (c) duel complet, puis portrait du joueur masqué (Cendre seulement).
          if (fam === 'Cendre') {
            full[which] = png(await p.screenshot());
            writeFileSync(`${OUT}/duel-${which}-${W}.png`, Buffer.from(full[which].split(',')[1], 'base64'));
            shots[which][`duel${W}`] = full[which];
            await p.evaluate(() => { document.querySelector('.hud.me .portrait img').style.visibility = 'hidden'; });
            await p.waitForTimeout(150);
            masked[which] = png(await p.screenshot());
          }
          await p.close();
        }
        if (fam === 'Cendre') {
          checks.temoin.push({ taille: `${W}x${H}`, ...(await diff(full.avant, full.apres)) });
          const d = await diff(masked.avant, masked.apres);
          checks.duelHorsPortrait.push({ taille: `${W}x${H}`, ...d });
          // Écart : garder les deux captures pour l’analyse.
          if (d.pixels) for (const which of ['avant', 'apres']) writeFileSync(`${OUT}/ecart-masque-${which}-${W}.png`, Buffer.from(masked[which].split(',')[1], 'base64'));
        }
      }
      // (b) portraits des rivaux (portrait du HUD rival, même cache que les affiches).
      if (W === 1280) {
        for (const id of RIVALS) {
          const a = await open(ctx, servers.avant.base, `&rival=${id}`);
          const sa = await srcOf(a, '.hud.opp .portrait img');
          await a.close();
          const b = await open(ctx, servers.apres.base, `&rival=${id}`);
          const sb = await srcOf(b, '.hud.opp .portrait img');
          await b.close();
          checks.portraitsRivaux.push({ rival: id, identique: sa === sb, ...(await diff(sa, sb)) });
        }
      }
      await ctx.close();
    }
    report.controles = checks;

    // Planche avant / après.
    const row = (which, items, w) => `<div style="display:flex;gap:10px;align-items:flex-start;margin:4px 0 10px"><div style="width:170px;font:600 14px Georgia,serif;color:${which === 'apres' ? '#c8f08a' : '#e6c99a'}">${LABEL[which]}</div>${items.map(([src, cap]) => `<figure style="margin:0"><img src="${src}" style="display:block;border:1px solid #3a3040${w ? `;width:${w}px` : ''}"><figcaption style="color:#b9ad98;font-size:12px;margin-top:3px">${cap}</figcaption></figure>`).join('')}</div>`;
    const h2 = (t) => `<h2 style="font:600 17px Georgia,serif;color:#f0d08c;margin:14px 0 2px">${t}</h2>`;
    const both = (f, w) => ['avant', 'apres'].map((x) => row(x, f(x), w)).join('');
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:16px 20px">
<h1 style="font:600 26px Georgia,serif;color:#ffe2a6;margin:0 0 4px">Portrait du duelliste joueur — V1 contre « vectoriel V2 » (M07 L5, passe 26)</h1>
<p style="margin:0 0 10px;color:#b9ad98">Même apparence (cheveux argent au carré, bandeau et manteau aux couleurs de la Signature, yeux bleus), redessinée sur le socle V2 des rivaux. Seed 202 (Maëlle), graine d’art 7, vue A, rendu figé — ${rendererLabel(renderer)}.</p>
${h2('HUD joueur, 1280×720 (échelle 1:1), quatre familles de Signature')}${both((x) => shots[x][1280])}
${h2('HUD joueur, 1920×1080 (échelle 1:1)')}${both((x) => shots[x][1920])}
${h2('Portrait source agrandi (affiché à 288 px ; V1 192 px, V2 384 px)')}${both((x) => shots[x].portraits, 288)}
${h2('Duel complet, 1280×720')}${both((x) => [[shots[x].duel1280, 'Cendre']], 900)}</body>`;
    const ctx = await browser.newContext({ viewport: { width: 2000, height: 1000 } });
    const p = await ctx.newPage();
    await p.setContent(html);
    await p.waitForTimeout(400);
    writeFileSync(`${OUT}/planche-joueur.png`, await p.screenshot({ fullPage: true }));
    await ctx.close();
  }

  // Coût de génération des portraits (après).
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url(servers.apres.base, ''));
  await page.waitForFunction(() => !!window.__lqvPortraitCost);
  renderer ??= await webglRenderer(page);
  report.cout = {};
  for (const id of [...FAMS.map((f) => `player-${f}`), ...RIVALS]) report.cout[id] = await page.evaluate((id) => window.__lqvPortraitCost(25, id), id);
  await page.close();
} finally {
  report.renderer = renderer;
  report.mode = rendererLabel(renderer);
  report.console = issues;
  await browser.close();
  servers.apres.stop();
  servers.avant?.stop();
}
const out = COST_ONLY ? REPORT.replace(/\.json$/, '-cout.json') : REPORT;
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
const c = report.controles;
if (c) {
  console.log(`portraits des rivaux : ${c.portraitsRivaux.map((x) => `${x.rival} ${x.identique ? 'identique' : `${x.pixels} px`}`).join(', ')}`);
  console.log(`duel hors portrait : ${c.duelHorsPortrait.map((x) => `${x.taille} ${x.pixels} px${x.zone ? ` (zone ${x.zone.join(',')})` : ''}`).join(', ')} ; témoin (portrait visible) : ${c.temoin.map((x) => `${x.taille} ${x.pixels} px`).join(', ')}`);
}
for (const [id, v] of Object.entries(report.cout ?? {})) console.log(`coût ${id} : portrait V2 ${v.portrait.medianMs} ms ; couches toutes ${v.couches.toutes.medianMs} ms → portrait ${v.couches.portrait.medianMs} ms`);
console.log(`console : ${issues.length} · ${out}`);
if (issues.length) process.exitCode = 1;
