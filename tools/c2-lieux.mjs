// M08 C2 — lieux de duel (ADR 022) : preuves et captures de la porte de validation.
//
// Modes (premier argument) :
//   identique  — la salle migrée est identique au pixel près au build d’avant (LQV_BEFORE, rendu par défaut) : scène 3D
//                seule des quatre rivaux (vue A, rendu figé, seed 202), duel complet (HUD compris), écrans Rencontres,
//                Accueil et Préparation (manche 1), scène seule et capture complète, 1280×720 et 1920×1080 ; témoin :
//                la même comparaison avec `venue=rue` côté « après » doit relever un écart.
//   invariance — d’un lieu à l’autre (même build) : calques DOM seuls (plateau, HUD, main ; canvas masqué) identiques
//                au pixel près, caméra (projection, vue) et rig du rival identiques, visage projeté identique.
//   planche    — captures par lieu (scène seule et duel complet, vues A et B, 1280 et 1920 ; Accueil, Préparation ;
//                repli « direct ») pour la planche du responsable.
//   bascule    — changement de lieu dans le produit (Rencontres → Préparation de la rue → retour → Préparation de la
//                salle…) : première image après le clic, temps de montage, textures / géométries / programmes GPU à
//                chaque aller-retour (mémoire stable).
// Usage : [LQV_BEFORE=<dist avant> LQV_BEFORE_SHA=<sha>] [LQV_GPU=1 CHROMIUM_PATH=…] node tools/c2-lieux.mjs <mode> [sortie]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const MODE = process.argv[2] ?? 'identique';
const OUT = process.argv[3] ?? `artifacts/qa/m08/c2-${MODE}.json`;
const SHOTS = process.env.SHOTS_OUT ?? 'screenshots/qa/m08/c2';
const VENUES = (process.env.LQV_VENUES ?? 'salle,rue').split(',');
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const PORT = Number(process.env.LQV_PREVIEW_PORT) || 4201;
const servers = { apres: await startPreview(PORT + 1) };
if (MODE === 'identique') {
  if (!process.env.LQV_BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
  servers.avant = await startPreview(PORT, process.env.LQV_BEFORE);
}
const browser = await launch();
const helper = await (await browser.newContext()).newPage();
const issues = [];
let renderer = null;
const VIEWPORTS = [[1280, 720], [1920, 1080]];
const DUEL = '?seed=202&autostart=1&qa=1&aiDelay=0&reducedMotion=1&freeze=1&intro=1';

/** Écart entre deux PNG : moyenne absolue (0–255), maximum, nombre de pixels différents, boîte englobante. */
const diff = (a, b) => helper.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const [p, q] = [await load(a), await load(b)];
  if (p.width !== q.width || p.height !== q.height) return { error: 'tailles différentes' };
  let sum = 0; let max = 0; let px = 0;
  let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1;
  for (let i = 0; i < p.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = Math.abs(p.data[i + c] - q.data[i + c]); sum += e; d = Math.max(d, e); }
    if (d) {
      px++;
      const k = i / 4; const x = k % p.width; const y = Math.floor(k / p.width);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    max = Math.max(max, d);
  }
  return { meanAbs: Math.round((sum / (p.data.length / 4 * 3)) * 1000) / 1000, max, pixels: px, box: px ? [x0, y0, x1, y1] : null };
}, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });

const hideDom = (p) => p.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } });
const hideCanvas = (p) => p.evaluate(() => { const c = document.querySelector('#arena canvas'); if (c) c.style.visibility = 'hidden'; });

async function page(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  return { ctx, p };
}

/** Duel en entrée directe : `scene` (canvas seul), `complet` (page entière), `dom` (canvas masqué). */
async function captureDuel(which, vp, kind, rival, extra = '') {
  const { ctx, p } = await page(vp);
  await p.goto(`${servers[which].base}/${DUEL}&rival=${rival}&view=A${extra}`);
  await p.waitForFunction(() => !!window.__lqv);
  renderer ??= await webglRenderer(p);
  await p.waitForTimeout(700);
  let buf;
  if (kind === 'scene') {
    await hideDom(p);
    await p.waitForTimeout(150);
    buf = await p.locator('#arena canvas').screenshot();
  } else if (kind === 'dom') {
    await hideCanvas(p);
    await p.waitForTimeout(150);
    buf = await p.screenshot();
  } else buf = await p.screenshot();
  const stats = await p.evaluate(() => window.__lqv.arenaStats());
  await ctx.close();
  return { buf, stats };
}

/** Écrans du produit : profil neuf (Ronce), puis Rencontres, Accueil ou Préparation d’une rencontre. */
async function captureProduct(which, vp, screen, extra = '', enc = 'quai-1', sceneOnly = false) {
  const { ctx, p } = await page(vp);
  await p.goto(`${servers[which].base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5${extra}`);
  await p.click('[data-key="home-new"]');
  await p.fill('[data-key="new-name"]', 'Capture');
  await p.click('[data-key="new-sig-Ronce"]');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-screen="board"]');
  if (screen === 'accueil') { await p.click('[data-key="board-home"]'); await p.waitForSelector('[data-screen="home"]'); }
  if (screen === 'preparation') { await p.click(`[data-key="enc-${enc}"]`); await p.waitForSelector('[data-screen="prep"]'); }
  await p.waitForTimeout(1200);
  if (sceneOnly) { await hideDom(p); await p.waitForTimeout(150); }
  const buf = sceneOnly ? await p.locator('#arena canvas').screenshot() : await p.screenshot({ fullPage: true });
  await ctx.close();
  return buf;
}

const save = (name, buf) => { mkdirSync(SHOTS, { recursive: true }); writeFileSync(join(SHOTS, name), buf); };
const report = {};

try {
  if (MODE === 'identique') {
    const results = [];
    const control = [];
    for (const vp of VIEWPORTS) {
      const tag = `${vp[0]}x${vp[1]}`;
      const cases = [...['braise', 'ronce', 'voile', 'astre'].map((r) => ['scene', r]), ['complet', 'ronce']];
      for (const [kind, rival] of cases) {
        const a = (await captureDuel('avant', vp, kind, rival)).buf;
        const b = (await captureDuel('apres', vp, kind, rival)).buf;
        const d = await diff(a, b);
        results.push({ viewport: tag, kind, rival, ...d });
        console.log(`${tag} duel ${kind} ${rival} : écart moyen ${d.meanAbs}/255, max ${d.max}, ${d.pixels} pixels différents`);
        if (kind === 'scene' && rival === 'ronce') {
          const t = await diff(a, (await captureDuel('apres', vp, kind, rival, '&venue=rue')).buf);
          control.push({ viewport: tag, ...t });
          console.log(`  témoin (venue=rue) : écart moyen ${t.meanAbs}/255, ${t.pixels} pixels différents`);
        }
      }
      for (const screen of ['rencontres', 'accueil', 'preparation']) {
        for (const sceneOnly of [true, false]) {
          const a = await captureProduct('avant', vp, screen, '', 'quai-1', sceneOnly);
          const b = await captureProduct('apres', vp, screen, '', 'quai-1', sceneOnly);
          const d = await diff(a, b);
          const kind = `${screen}${sceneOnly ? ' (scène seule)' : ''}`;
          results.push({ viewport: tag, kind, ...d });
          console.log(`${tag} ${kind} : écart moyen ${d.meanAbs}/255, max ${d.max}, ${d.pixels} pixels différents`);
        }
      }
    }
    report.identical = results.every((r) => r.pixels === 0) && control.every((r) => r.pixels > 0);
    Object.assign(report, { builds: { avant: process.env.LQV_BEFORE_SHA ?? '?', apres: commit }, results, control });
    console.log(report.identical ? 'IDENTIQUE au pixel près' : 'ÉCARTS relevés');
  }

  if (MODE === 'planche') {
    // LQV_QUICK=1 : 1280×720, vue A seulement (itération).
    const quick = process.env.LQV_QUICK === '1';
    const rival = process.env.RIVAL ?? 'braise';
    const shots = [];
    for (const vp of quick ? [VIEWPORTS[0]] : VIEWPORTS) {
      const tag = `${vp[0]}x${vp[1]}`;
      for (const venue of VENUES) {
        for (const view of quick ? ['A'] : ['A', 'B']) {
          for (const kind of ['scene', 'complet']) {
            const { ctx, p } = await page(vp);
            await p.goto(`${servers.apres.base}/${DUEL}&rival=${rival}&view=${view}&venue=${venue}`);
            await p.waitForFunction(() => !!window.__lqv);
            renderer ??= await webglRenderer(p);
            await p.waitForTimeout(700);
            if (kind === 'scene') { await hideDom(p); await p.waitForTimeout(150); }
            const name = `${venue}-${kind}-vue${view}-${tag}.png`;
            save(name, kind === 'scene' ? await p.locator('#arena canvas').screenshot() : await p.screenshot());
            const st = await p.evaluate(() => window.__lqv.arenaStats());
            shots.push({ name, venue, view, viewport: tag, drawCalls: st.drawCalls, textures: st.textures, geometries: st.geometries, programs: st.programs });
            console.log(`${name} : ${st.drawCalls} appels de dessin, ${st.textures} textures, ${st.programs} programmes`);
            await ctx.close();
          }
        }
        if (!quick) {
          for (const screen of ['accueil', 'preparation']) {
            const enc = venue === 'rue' ? 'libre-braise' : 'quai-1';
            const name = `${venue}-${screen}-${tag}.png`;
            save(name, await captureProduct('apres', vp, screen, `&venue=${venue}`, enc));
            shots.push({ name, venue, screen, viewport: tag });
          }
          const name = `${venue}-scene-direct-${tag}.png`;
          const { ctx, p } = await page(vp);
          await p.goto(`${servers.apres.base}/${DUEL}&rival=${rival}&view=A&venue=${venue}&fallback=direct`);
          await p.waitForFunction(() => !!window.__lqv);
          await p.waitForTimeout(700);
          save(name, await p.screenshot());
          shots.push({ name, venue, level: 'direct', viewport: tag });
          await ctx.close();
        }
      }
    }
    report.shots = shots;
  }

  if (MODE === 'invariance') {
    // Même build, même duel (seed 202, Kaï, début de tour) : seul le lieu change.
    const results = [];
    for (const vp of VIEWPORTS) {
      const tag = `${vp[0]}x${vp[1]}`;
      for (const view of ['A', 'B']) {
        const runs = {};
        for (const venue of VENUES) {
          const dom = await captureDuel('apres', vp, 'dom', 'braise', `&view=${view}&venue=${venue}`);
          const { ctx, p } = await page(vp);
          await p.goto(`${servers.apres.base}/${DUEL}&rival=braise&view=${view}&venue=${venue}`);
          await p.waitForFunction(() => !!window.__lqv);
          await p.waitForTimeout(700);
          const anchors = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('app')); return { head: cs.getPropertyValue('--a-head').trim(), edge: cs.getPropertyValue('--a-edge').trim() }; });
          const st = await p.evaluate(() => window.__lqv.arenaStats());
          await ctx.close();
          runs[venue] = { dom: dom.buf, framing: st.framing, anchors, venue: st.venue };
        }
        const [a, b] = VENUES;
        const d = await diff(runs[a].dom, runs[b].dom);
        const same = (k) => JSON.stringify(runs[a].framing[k]) === JSON.stringify(runs[b].framing[k]);
        const r = { viewport: tag, view, venues: [runs[a].venue, runs[b].venue], dom: d, projection: same('projection'), cameraView: same('view'), rival: same('rival'), anchors: JSON.stringify(runs[a].anchors) === JSON.stringify(runs[b].anchors) ? runs[a].anchors : null };
        results.push(r);
        console.log(`${tag} vue ${view} ${a}/${b} : calques DOM ${d.pixels} pixels différents · projection ${r.projection ? '=' : '≠'} · caméra ${r.cameraView ? '=' : '≠'} · rival ${r.rival ? '=' : '≠'} · ancres ${r.anchors ? `${r.anchors.head}/${r.anchors.edge}` : '≠'}`);
      }
      // Écran Préparation (manche 1) : calques DOM du shell seuls, lieu imposé.
      const doms = [];
      for (const venue of VENUES) {
        const { ctx, p } = await page(vp);
        await p.goto(`${servers.apres.base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5&venue=${venue}`);
        await p.click('[data-key="home-new"]');
        await p.fill('[data-key="new-name"]', 'Capture');
        await p.click('[data-key="new-sig-Ronce"]');
        await p.click('[data-key="new-create"]');
        await p.waitForSelector('[data-screen="board"]');
        await p.click('[data-key="enc-quai-1"]');
        await p.waitForSelector('[data-screen="prep"]');
        await p.waitForTimeout(1200);
        await hideCanvas(p);
        await p.waitForTimeout(150);
        doms.push(await p.screenshot());
        await ctx.close();
      }
      const d = await diff(doms[0], doms[1]);
      results.push({ viewport: tag, screen: 'preparation', dom: d });
      console.log(`${tag} préparation ${VENUES.join('/')} : calques DOM ${d.pixels} pixels différents`);
    }
    report.invariant = results.every((r) => r.dom.pixels === 0 && (r.screen || (r.projection && r.cameraView && r.rival && r.anchors)));
    report.results = results;
    console.log(report.invariant ? 'INVARIANT d’un lieu à l’autre' : 'ÉCARTS relevés');
  }

  if (MODE === 'bascule') {
    // Produit, 1280×720 : Rencontres → Préparation « Duel libre — Kaï » (rue) → retour → Préparation « manche 1 » (salle,
    // même rival) → retour…, N allers-retours ; puis 3 entrées sans changement de lieu (témoin).
    const N = Number(process.env.LQV_BASCULE_N ?? 6);
    const { ctx, p } = await page(VIEWPORTS[0]);
    const cdp = await ctx.newCDPSession(p);
    await p.goto(`${servers.apres.base}/?qa=1&aiDelay=0&profileSeed=5${process.env.LQV_BASCULE_QUERY ?? ""}`);
    renderer ??= await webglRenderer(p);
    await p.click('[data-key="home-new"]');
    await p.fill('[data-key="new-name"]', 'Bascule');
    await p.click('[data-key="new-sig-Ronce"]');
    await p.click('[data-key="new-create"]');
    await p.waitForSelector('[data-screen="board"]');
    await p.waitForTimeout(1500);
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return Math.round(((await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576) * 100) / 100; };
    /** Clic mesuré : durée du gestionnaire (changement de lieu compris), puis image suivante (rendu de l’arène). */
    const clickMeasured = (key) => p.evaluate(async (key) => {
      const el = document.querySelector(`[data-key="${key}"]`);
      const t0 = performance.now();
      el.click();
      const handler = performance.now() - t0;
      const f = await new Promise((res) => requestAnimationFrame((ts) => { const done = performance.now(); requestAnimationFrame((ts2) => res({ render: done - ts, interval: ts2 - ts, sinceClick: done - t0 })); }));
      const st = window.__lqvShell.d.arena().stats();
      return { handler: Math.round(handler * 10) / 10, render: Math.round(f.render * 10) / 10, interval: Math.round(f.interval * 10) / 10, firstFrame: Math.round(f.sinceClick * 10) / 10, venue: st.venue, venueMs: st.venueMs, switches: st.venueSwitches, textures: st.textures, geometries: st.geometries, programs: st.programs };
    }, key);
    const steps = [];
    const back = async () => { await p.click('[data-key="prep-back"]'); await p.waitForSelector('[data-screen="board"]'); await p.waitForTimeout(500); };
    for (let i = 0; i < N; i++) {
      for (const enc of ['libre-braise', 'quai-1']) {
        const r = await clickMeasured(`enc-${enc}`);
        await p.waitForSelector('[data-screen="prep"]');
        await p.waitForTimeout(600);
        r.heapMb = await heap();
        steps.push({ round: i + 1, enc, ...r });
        console.log(`aller-retour ${i + 1} ${enc} → ${r.venue} : gestionnaire ${r.handler} ms (lieu ${r.venueMs} ms), première image ${r.firstFrame} ms, rendu ${r.render} ms · ${r.textures} textures, ${r.geometries} géométries, ${r.programs} programmes, tas ${r.heapMb} Mo`);
        await back();
      }
    }
    const control = [];
    for (let i = 0; i < 3; i++) {
      const r = await clickMeasured('enc-quai-1');
      await p.waitForSelector('[data-screen="prep"]');
      await p.waitForTimeout(600);
      control.push(r);
      console.log(`témoin (même lieu) : gestionnaire ${r.handler} ms, première image ${r.firstFrame} ms, rendu ${r.render} ms`);
      await back();
    }
    await ctx.close();
    const byVenue = (v) => steps.filter((s) => s.venue === v && s.round > 1);
    const stable = (k) => ['rue', 'salle'].every((v) => new Set(byVenue(v).map((s) => s[k])).size === 1);
    report.memory = { textures: stable('textures'), geometries: stable('geometries'), programs: stable('programs'), heapFirst: steps[1]?.heapMb, heapLast: steps.at(-1)?.heapMb };
    report.steps = steps;
    report.control = control;
    console.log(`mémoire : textures ${report.memory.textures ? 'stables' : 'INSTABLES'}, géométries ${report.memory.geometries ? 'stables' : 'INSTABLES'}, programmes ${report.memory.programs ? 'stables' : 'INSTABLES'} ; tas ${report.memory.heapFirst} → ${report.memory.heapLast} Mo`);
  }
} finally {
  await browser.close();
  for (const s of Object.values(servers)) s.stop();
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), mode: MODE, renderer: rendererLabel(renderer), commit, ...report, issues }, null, 2));
console.log(`rapport : ${OUT}${issues.length ? ` — console : ${issues.length}` : ' — console 0'}`);
