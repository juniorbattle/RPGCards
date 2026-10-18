// M07 L4 (ADR 020) — mesures des écrans hors duel sur un build donné (`LQV_DIST`, défaut dist/) :
//  1. mots visibles à l’écran (texte réellement affiché dans #shell : boîte non vide, opacité > 0) sur l’accueil,
//     les rencontres, la préparation et le résultat d’un duel joué par l’interface ;
//  2. fluidité des changements d’écran : intervalles rAF pendant 900 ms après chaque clic (images en retard =
//     intervalle > 1,5 × l’intervalle médian au repos), temps jusqu’à la première image après le clic ;
//  3. images 3D calculées sur l’accueil pendant 4 s.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=…] [LQV_DIST=…] [LQV_L4_OUT=…] node tools/l4-measure.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const OUT = process.env.LQV_L4_OUT ?? 'artifacts/qa/m07/l4-mesures.json';
const server = await startPreview();
const browser = await launch();
const res = { dist: process.env.LQV_DIST ?? 'dist', date: new Date().toISOString(), words: {}, transitions: [], issues: [] };
try {
  const QUICK = process.env.LQV_L4_QUICK === '1';
  // LQV_L4_WARM=1 : un parcours jetable d’abord (caches du navigateur et shaders Skia de ce profil neuf chauds) ;
  // sans lui, la première ronde mesure aussi les coûts « première fois » du navigateur (froid).
  res.mode = process.env.LQV_L4_WARM === '1' ? 'chaud' : 'froid';
  if (res.mode === 'chaud') {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=0&seed=101`);
    for (const k of ['home-new', 'new-create', 'board-deck', 'deck-back', 'board-collection', 'coll-back', 'enc-libre-braise', 'prep-back', 'board-home']) { await page.click(`[data-key="${k}"]`); await page.waitForTimeout(700); }
    await ctx.close();
  }
  for (const vp of QUICK ? [{ width: 1280, height: 720 }] : [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    watchConsole(page, res.issues);
    const tag = String(vp.width);
    await page.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=${process.env.LQV_L4_RM === "1" ? 1 : 0}&pace=fast&seed=101`);
    await page.waitForSelector('[data-screen="home"]');
    res.renderer ??= await webglRenderer(page);
    const words = () => page.evaluate(() => {
      const scope = document.querySelector('#shell');
      const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      let n = 0;
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        const el = t.parentElement;
        const txt = t.textContent.trim();
        if (!el || !txt) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
        let op = 1;
        for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.visibility === 'hidden' || cs.display === 'none') { op = 0; break; } op *= Number(cs.opacity); }
        if (op === 0) continue;
        n += txt.split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;
      }
      return n;
    });
    // Intervalles rAF autour d’un clic (pendant la transition).
    const transition = async (name, sel, screen) => {
      await page.waitForTimeout(1200);
      const r = await page.evaluate(async ({ sel, screen }) => {
        const idle = [];
        let last = performance.now();
        await new Promise((ok) => { let k = 0; const f = (t) => { idle.push(t - last); last = t; if (++k < 40) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
        const med = [...idle].sort((a, b) => a - b)[idle.length >> 1];
        const d = [];
        const t0 = performance.now();
        let first = null;
        last = t0;
        document.querySelector(sel).click();
        await new Promise((ok) => { const f = (t) => { if (first === null) first = t - t0; d.push(t - last); last = t; if (t - t0 < 900) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
        const late = d.filter((x) => x > med * 1.5).length;
        let acc = 0;
        const lateAt = d.map((x) => { acc += x; return x > med * 1.5 ? [Math.round(acc), Math.round(x)] : null; }).filter(Boolean);
        return { idleMedianMs: Math.round(med * 100) / 100, frames: d.length, late, latePct: Math.round((late / d.length) * 1000) / 10, worstMs: Math.round(Math.max(...d) * 10) / 10, firstFrameMs: Math.round(first * 10) / 10, lateAt, ok: !!document.querySelector(`[data-screen="${screen}"]`) };
      }, { sel, screen });
      res.transitions.push({ viewport: tag, name, ...r });
      console.log(`  ${tag} ${name} : ${r.frames} images, ${r.late} en retard (${r.latePct} %) ${JSON.stringify(r.lateAt)}, pire ${r.worstMs} ms, 1re image ${r.firstFrameMs} ms (repos ${r.idleMedianMs} ms)`);
    };
    // Accueil vide → création → rencontres.
    await page.waitForTimeout(1500);
    const f0 = await page.evaluate(() => window.__lqvShell.d.arena()?.stats().frame ?? null);
    await page.waitForTimeout(4000);
    const f1 = await page.evaluate(() => window.__lqvShell.d.arena()?.stats().frame ?? null);
    res[`framesAccueil4s_${tag}`] = f1 - f0;
    res.words[`accueil-vide-${tag}`] = await words();
    await transition('accueil → création', '[data-key="home-new"]', 'new');
    await transition('création → rencontres', '[data-key="new-create"]', 'board');
    await page.waitForTimeout(900);
    res.words[`rencontres-${tag}`] = await words();
    await transition('rencontres → deck', '[data-key="board-deck"]', 'deck');
    await transition('deck → rencontres', '[data-key="deck-back"]', 'board');
    await transition('rencontres → collection', '[data-key="board-collection"]', 'collection');
    await transition('collection → rencontres', '[data-key="coll-back"]', 'board');
    await transition('rencontres → préparation', '[data-key="enc-libre-braise"]', 'prep');
    await page.waitForTimeout(900);
    res.words[`preparation-${tag}`] = await words();
    if (vp.width === 1280 && !QUICK) {
      await page.click('[data-key="prep-start"]');
      await page.waitForFunction(() => !!window.__lqv);
      const st = newStats();
      let out = 'running';
      for (let t = 0; t < 90 && out !== 'ended' && out !== 'stuck'; t++) out = await playTurn(page, { name: 'l4', useLecture: false, mode: 'click', watchSequence: false }, st);
      await page.waitForSelector('[data-screen="result"]', { timeout: 60000 });
      await page.waitForTimeout(3000);
      res.words[`resultat-${tag}`] = await words();
      await transition('résultat → rencontres', '[data-key="result-board"]', 'board');
      await transition('rencontres → accueil', '[data-key="board-home"]', 'home');
      await page.waitForTimeout(900);
      res.words[`accueil-profil-${tag}`] = await words();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.stop();
}
console.log('mots visibles :', JSON.stringify(res.words));
console.log('images 3D sur l’accueil en 4 s :', res.framesAccueil4s_1280, '/', res.framesAccueil4s_1920, '· console :', res.issues.length);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(res, null, 2));
