// QA M06 — porte de release candidate (complète qa:product, qa:browser, qa:techniques) :
//   I  sans WebGL : le jeu reste jouable de l’accueil au résultat (repli CSS documenté) ;
//   J  longévité : 12 duels ouverts / quittés à la suite, 4 rivaux échangés dans la même scène —
//      textures, géométries, nœuds DOM et tas JS (après GC) ne croissent pas ;
//   K  moteur identique avec animations : duel joué par l’interface (séquences et chorégraphies
//      réelles), enregistrement rejoué HORS navigateur ⇒ même hash ;
//   L  mode démo réversible : toute Signature / paire de Techniques équipable puis jouée ; retour en
//      progression ⇒ deck signalé illégal et refusé ;
//   M  stockage refusé : jouable, signalé une fois, aucune avalanche d’erreurs ;
//   N  Recommencer / Effacer : confirmations (annuler conserve tout ; confirmer agit) ;
//   P  coût CPU des écrans (CDP Performance : temps de tâches par seconde) — SwiftShader, CPU.
// Sortie : artifacts/qa/qa-rc.json
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { chromium } from 'playwright-core';
import { CHROMIUM, launch, startPreview, view, waitDecision, watchConsole } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const OUT = 'artifacts/qa';
mkdirSync(`${OUT}/tmp`, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
// LQV_QA_QUERY=… : paramètres d’URL en plus (M07 L5 : `figure=v2`, personnages vectoriels V2).
const Q = `qa=1&aiDelay=0${process.env.LQV_QA_QUERY ? `&${process.env.LQV_QA_QUERY}` : ''}`;
const report = { commit, date: new Date().toISOString(), machine: { cpu: os.cpus()[0]?.model, cores: os.cpus().length }, renderer: 'Chromium headless + SwiftShader (CPU) — jamais une mesure de GPU', runs: {} };
const only = process.env.QA_ONLY?.split(',') ?? null;
const wanted = (name) => !only || only.some((o) => name.includes(o));

const screenIs = (page, id, timeout = 20000) => page.waitForSelector(`[data-screen="${id}"]`, { timeout });
const shell = (page) => page.evaluate(() => { const s = window.__lqvShell; return { screen: s.flow.screen, save: s.save ? JSON.parse(JSON.stringify(s.save)) : null, last: s.lastResult, load: s.load.status }; });

async function newProfile(page, sig = 'Cendre') {
  await screenIs(page, 'home');
  await page.click('[data-key="home-new"]');
  await page.click(`[data-key="new-sig-${sig}"]`);
  await page.click('[data-key="new-create"]');
  await screenIs(page, 'board');
}

async function decisions(page, n, mode = 'click') {
  const st = newStats();
  for (let i = 0; i < n; i++) {
    const v = await waitDecision(page);
    if (v.phase === 'ENDED') break;
    await playTurn(page, { name: 'rc', useLecture: false, mode, maxDecisions: 1 }, st);
  }
  return st;
}

async function abandonFromMenu(page) {
  await page.click('[data-key="tool-menu"]');
  await page.click('[data-key="menu-abandon"]');
  await page.click('[data-key="confirm-ok"]');
  await screenIs(page, 'result');
}

async function run(name, browser, vp, fn, ctxOpts = {}) {
  if (!wanted(name)) return;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, ...ctxOpts.context });
  if (ctxOpts.init) await ctx.addInitScript(ctxOpts.init);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const consoleIssues = [];
  watchConsole(page, consoleIssues);
  const res = { checks: [], fails: [], consoleIssues };
  const check = (ok, what) => { res.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); if (!ok) res.fails.push(what); };
  const t0 = Date.now();
  try { await fn(page, check, res); } catch (err) {
    res.fails.push(`exception : ${String(err.message).split('\n')[0]}`);
    await page.screenshot({ path: `${OUT}/tmp/rc-${name}.png` }).catch(() => {});
  }
  res.ms = Date.now() - t0;
  await ctx.close();
  report.runs[name] = res;
  const allowed = ctxOpts.allowConsole ?? (() => false);
  res.consoleIssues = res.consoleIssues.filter((x) => !allowed(x));
  console.log(`${name}: ${res.checks.length - res.fails.length}/${res.checks.length} contrôles · console ${res.consoleIssues.length} · ${res.ms} ms`);
  for (const f of res.fails) console.log(`   ÉCHEC ${f}`);
  for (const c of res.consoleIssues.slice(0, 3)) console.log(`   console : ${c}`);
}

/** Sauvegarde de TEST : progression qui ouvre les 4 duels libres (mise en place d’état, pas un résultat affiché). */
const OPEN_ALL = () => {
  const s = JSON.parse(localStorage.getItem('lqv.save'));
  s.progress.met = ['braise', 'ronce', 'voile', 'astre'];
  s.progress.series = { step: 0, completed: 1 };
  localStorage.setItem('lqv.save', JSON.stringify(s));
};

const server = await startPreview();
const browser = await launch();
try {
  // --- I : sans WebGL --------------------------------------------------------------------------
  if (wanted('I-sans-webgl')) {
    const noGl = await chromium.launch({ executablePath: CHROMIUM, args: ['--disable-webgl', '--disable-3d-apis', '--disable-gpu'] });
    await run('I-sans-webgl', noGl, { width: 1280, height: 720 }, async (page, check, res) => {
      await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
      check(await page.evaluate(() => !document.createElement('canvas').getContext('webgl')), 'WebGL réellement indisponible dans ce navigateur');
      await newProfile(page);
      check(await page.evaluate(() => document.getElementById('arena').classList.contains('no-webgl') && !document.querySelector('#arena canvas')), 'repli CSS de l’arène (aucun canvas)');
      await page.click('[data-key="enc-quai-1"]');
      await page.click('[data-key="prep-start"]');
      await page.waitForFunction(() => !!window.__lqv);
      const st = newStats();
      let out = 'running';
      for (let t = 0; t < 90 && out !== 'ended' && out !== 'stuck'; t++) out = await playTurn(page, { name: 'I', useLecture: false, mode: 'click' }, st);
      check(out === 'ended', `duel complet sans WebGL (${st.turns} tours)`);
      await screenIs(page, 'result', 40000);
      check((await shell(page)).save.history.length === 1, 'résultat enregistré sans WebGL');
      res.leaks = st.leaks.length;
      check(!st.leaks.length, 'aucune fuite de secret');
    });
    await noGl.close();
  }

  // --- J : longévité ---------------------------------------------------------------------------
  if (wanted('J-longevite-12-duels')) {
    const gcBrowser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'] });
    await run('J-longevite-12-duels', gcBrowser, { width: 1280, height: 720 }, async (page, check, res) => {
      await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
      await newProfile(page);
      await page.evaluate(OPEN_ALL);
      await page.reload();
      await page.click('[data-key="home-continue"]');
      await screenIs(page, 'board');
      const order = ['braise', 'ronce', 'voile', 'astre'];
      res.samples = [];
      // M08 C1 : les rivaux à venir sont préparés aux temps morts (rig et textures au GPU) : chaque relevé se fait une
      // fois la préparation achevée (comme un joueur qui regarde l’écran), sinon il dépendrait du minutage.
      const prepIdle = () => page.waitForFunction(() => !window.__lqvPrep || window.__lqvPrep().pending === 0, null, { timeout: 20000 });
      const prepState = () => page.evaluate(() => window.__lqvPrep?.() ?? null);
      for (let i = 0; i < 12; i++) {
        const rival = order[i % 4];
        await prepIdle();
        const onBoard = await prepState();
        const frameBefore = await page.evaluate(() => window.__lqvShell.d.arena().stats().frame);
        await page.click(`[data-key="enc-libre-${rival}"]`);
        // Mesure à l’écran de préparation : rival tout juste installé, scène figée, expression de repos
        // (en plein duel, le nombre de formes de bouche déjà montrées varie d’un duel à l’autre).
        // Le clic remplace le rival (`setRival` libère l’ancien) et demande UNE image au rAF suivant : les
        // textures et géométries du nouveau rival n’existent au GPU qu’après cette image. Attendre deux rAF
        // (enregistrés après celui de `requestRender`, donc exécutés après lui) — et non un seuil de
        // textures : l’ancien seuil (≥ 15, « scène sans rival : 11 ») ne valait plus rien depuis le
        // post-traitement de L3 (scène sans rival : 25 textures), d’où des relevés tantôt avant, tantôt
        // après l’image (25/32 contre 33/47, passe 21).
        const atClick = await page.evaluate(() => window.__lqvShell.d.arena().stats().textures);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await prepIdle();
        const inDuel = await page.evaluate(() => window.__lqvShell.d.arena().stats());
        const atPrep = await prepState();
        await page.click('[data-key="prep-start"]');
        await page.waitForFunction(() => !!window.__lqv);
        await decisions(page, 3);
        await abandonFromMenu(page);
        await page.click('[data-key="result-board"]');
        await screenIs(page, 'board');
        const m = await page.evaluate(() => { window.gc?.(); return { heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576 * 10) / 10, dom: document.querySelectorAll('*').length, stage: document.querySelectorAll('#stage *').length, app: document.getElementById('app').childElementCount, hooks: !!window.__lqv }; });
        res.samples.push({ i: i + 1, rival, textures: inDuel.textures, geometries: inDuel.geometries, texturesAtClick: atClick, rendered: inDuel.frame > frameBefore, preparedOnBoard: onBoard?.ready.length ?? null, preparedAtPrep: atPrep?.ready.length ?? null, ...m });
      }
      const s = res.samples;
      // Par rival, d’un tour à l’autre. La toute première mesure précède toute image en vue B : 6 géométries
      // fixes du décor, visibles seulement en vue B, ne sont envoyées au GPU qu’à leur première image
      // (vérifié : 45 → 51 dès une image en vue B, puis constant) — elle est exclue pour les géométries.
      const byRival = (k, from = 0) => order.every((r) => { const xs = s.slice(from).filter((x) => x.rival === r).map((x) => x[k]); return Math.max(...xs) === Math.min(...xs); });
      check(s.every((x) => x.rendered), 'une image de la scène rendue après chaque changement de rival, avant le relevé');
      check(byRival('textures'), `textures GPU stables par rival sur 3 tours (${order.map((r) => s.find((x) => x.rival === r).textures).join('/')})`);
      check(byRival('geometries', 1), `géométries stables par rival après la première image en vue B (${order.map((r) => s.slice(1).find((x) => x.rival === r).geometries).join('/')} ; 1re mesure ${s[0].geometries})`);
      if (s[0].preparedOnBoard !== null) {
        // Au plus 6 adversaires préparés au tableau (MAX_PREPARED ; avec les duels de la ville, le tableau en compte 7
        // autres que celui assis), toujours le même nombre ; aucun à l’écran de préparation.
        const n = s[0].preparedOnBoard;
        check(n > 0 && n <= 6 && s.every((x) => x.preparedOnBoard === n && x.preparedAtPrep === 0), `adversaires préparés bornés : ${n} au tableau (≤ 6), 0 à la préparation (${[...new Set(s.map((x) => `${x.preparedOnBoard}/${x.preparedAtPrep}`))].join(', ')})`);
      }
      check(s.every((x) => x.stage === 0 && x.app === 0 && !x.hooks), 'aucune scène de Clash, plateau ni crochet résiduel hors duel');
      check(Math.max(...s.map((x) => x.dom)) - Math.min(...s.map((x) => x.dom)) < 60, `nœuds DOM stables au tableau (${Math.min(...s.map((x) => x.dom))}–${Math.max(...s.map((x) => x.dom))})`);
      const h4 = s[3].heapMB;
      const h12 = s[11].heapMB;
      check(h12 <= h4 * 1.15 + 2, `tas JS après GC : ${h4} Mo (4e duel) → ${h12} Mo (12e)`);
    });
    await gcBrowser.close();
  }

  // --- K : moteur identique avec animations réelles ------------------------------------------------
  await run('K-moteur-independant-des-animations', browser, { width: 1280, height: 720 }, async (page, check, res) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=0&pace=normal&profileSeed=31337`);
    await newProfile(page, 'Voile');
    await page.click('[data-key="enc-quai-1"]');
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    const st = newStats();
    let out = 'running';
    for (let t = 0; t < 6 && out !== 'ended' && out !== 'stuck'; t++) out = await playTurn(page, { name: 'K', useLecture: true, mode: 'click', watchSequence: true }, st);
    res.sequencesWatched = st.sequencesWatched;
    check(st.sequencesWatched >= 3 && st.stagesSeen >= 3, `séquences de résolution jouées en entier (${st.sequencesWatched}, scènes de Clash ${st.stagesSeen})`);
    const { rec, hash } = await page.evaluate(() => ({ rec: window.__lqv.record(), hash: window.__lqv.hash() }));
    writeFileSync(`${OUT}/tmp/rc-record.json`, JSON.stringify(rec));
    const node = JSON.parse(execSync(`npx tsx tools/replay-hash.ts ${OUT}/tmp/rc-record.json`).toString().trim().split('\n').pop());
    res.replay = node;
    check(node.hash === hash, `rejeu hors navigateur : même hash (${hash}, ${node.commands} commandes)`);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lqv.save')).activeDuel);
    check(saved.hash === hash && saved.commands.length === rec.commands.length, 'duel en cours sauvegardé = enregistrement du moteur');
  });

  // --- L : mode démo (collection complète) ---------------------------------------------------------
  await run('L-mode-demo-reversible', browser, { width: 1280, height: 720 }, async (page, check) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await newProfile(page);
    await page.click('[data-key="board-home"]');
    await page.click('[data-key="home-options"]');
    await page.click('[data-key="opt-full-on"]');
    await page.click('[data-key="opt-back"]');
    await page.click('[data-key="home-deck"]');
    await page.click('[data-key="deck-sig-Astre"]');
    await page.click('[data-key="deck-tech-Lecture"]');
    await page.click('[data-key="deck-tech-Ancrage"]');
    await page.click('[data-key="deck-tech-Rupture"]');
    await page.click('[data-key="deck-tech-Dissipation"]');
    for (const id of ['Cendre-4', 'Voile-3', 'Ronce-2', 'Astre-4']) await page.click(`[data-key="ver-${id}-variant"]`);
    await page.click('[data-key="deck-save"]');
    let s = await shell(page);
    check(s.save.deck.signature === 'Astre' && s.save.deck.techniques.join() === 'Rupture,Dissipation' && s.save.deck.variants.length === 8, 'démo : Signature Astre, Rupture + Dissipation, 8 variantes enregistrées');
    await page.click('[data-key="deck-back"]');
    await page.click('[data-key="home-continue"]');
    await page.click('[data-key="enc-quai-1"]');
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    const p1 = await page.evaluate(() => { const p = window.__lqv.state().players.p1; return { sig: p.signatureFamily, techs: p.techniques, deck: [...p.deck, ...p.hand].length }; });
    check(p1.sig === 'Astre' && p1.techs.join() === 'Rupture,Dissipation' && p1.deck === 17, 'le moteur reçoit exactement ce deck (17 cartes, Signature et Techniques)');
    await abandonFromMenu(page);
    await page.click('[data-key="result-home"]');
    await page.click('[data-key="home-options"]');
    await page.click('[data-key="opt-full-off"]');
    await page.click('[data-key="opt-back"]');
    check((await page.textContent('.sh-save-status')).includes('plus légal'), 'retour en progression : deck signalé illégal');
    await page.click('[data-key="home-continue"]');
    await page.click('[data-key="enc-quai-1"]');
    check(await page.locator('[data-key="prep-start"][disabled]').count() === 1, 'et refusé au lancement');
    s = await shell(page);
    check(s.save.history.length === 1 && s.save.history[0].outcome === 'abandon', 'historique intact (le mode démo ne touche pas aux résultats)');
  });

  // --- M : stockage refusé ---------------------------------------------------------------------------
  await run('M-stockage-refuse', browser, { width: 1280, height: 720 }, async (page, check) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    check((await page.textContent('.sh-save-status')).includes('indisponible'), 'accueil : stockage indisponible signalé');
    await newProfile(page);
    await page.click('[data-key="enc-quai-1"]');
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    await decisions(page, 4);
    const toasts = await page.evaluate(() => window.__toastCount ?? 0);
    check(toasts <= 1, `au plus un message d’échec d’écriture (${toasts})`);
    await abandonFromMenu(page);
    check((await shell(page)).save.history.length === 1, 'la partie continue en mémoire (résultat présent)');
  }, {
    init: () => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('refusé', 'SecurityError'); } });
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('sh-toast') && n.classList.contains('tone-error')) window.__toastCount = (window.__toastCount ?? 0) + 1; }).observe(document, { childList: true, subtree: true });
    },
  });

  // --- N : Recommencer / Effacer avec confirmations ---------------------------------------------------
  await run('N-recommencer-effacer-confirmes', browser, { width: 1280, height: 720 }, async (page, check) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await newProfile(page);
    await page.click('[data-key="board-home"]');
    const seed0 = (await shell(page)).save.profile.seed;
    await page.click('[data-key="home-restart"]');
    await page.click('[data-key="confirm-cancel"]');
    check((await shell(page)).save.profile.seed === seed0, 'Recommencer annulé : profil conservé');
    await page.click('[data-key="home-restart"]');
    await page.click('[data-key="confirm-ok"]');
    await page.click('[data-key="new-create"]');
    await screenIs(page, 'board');
    check((await shell(page)).save.profile.seed !== seed0, 'Recommencer confirmé : nouveau profil');
    check(await page.evaluate((s0) => JSON.parse(localStorage.getItem('lqv.save.backup')).profile.seed === s0, seed0), 'l’ancien profil reste en copie de secours');
    await page.click('[data-key="board-home"]');
    await page.click('[data-key="home-options"]');
    await page.click('[data-key="opt-erase"]');
    await page.click('[data-key="confirm-cancel"]');
    check(await page.evaluate(() => !!localStorage.getItem('lqv.save')), 'Effacer annulé : sauvegarde conservée');
    await page.click('[data-key="opt-erase"]');
    await page.click('[data-key="confirm-ok"]');
    await screenIs(page, 'home');
    check(await page.evaluate(() => !localStorage.getItem('lqv.save') && !localStorage.getItem('lqv.save.backup')) && await page.locator('[data-key="home-new"]').count() === 1, 'Effacer confirmé : plus de sauvegarde, accueil vierge');
  });

  // --- S : contraste des textes des écrans de l’enveloppe (mesuré sur la capture, comme M03.2) -------
  await run('S-contraste-ecrans', browser, { width: 1280, height: 720 }, async (page, check, res) => {
    const helper = await (await browser.newContext()).newPage();
    res.screens = {};
    const audit = async (name) => {
      await page.waitForTimeout(400);
      const items = await page.evaluate(() => {
        const out = [];
        const scope = document.querySelector('#shell:not([hidden])') ?? document.body;
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement;
          if (!el || seen.has(el) || !n.textContent.trim()) continue;
          seen.add(el);
          const r = el.getBoundingClientRect();
          const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom);
          if (x1 - x0 < 4 || y1 - y0 < 4) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          let op = 1;
          for (let a = el; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
          if (op === 0) continue;
          // rgb()/rgba() en 0–255 ; color(srgb …) (produit par color-mix) en 0–1.
          const nums = cs.color.match(/[\d.]+/g).map(Number);
          const k = cs.color.startsWith('color(') ? 255 : 1;
          const [cr, cg, cb] = [nums[0] * k, nums[1] * k, nums[2] * k];
          const ca = nums[3] ?? 1;
          const size = parseFloat(cs.fontSize);
          const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
          const disabled = !!el.closest('button:disabled, [aria-disabled="true"]');
          out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, rgba: [cr, cg, cb, ca * op], large, disabled, what: `${el.className || el.tagName.toLowerCase()} « ${n.textContent.trim().slice(0, 32)} »` });
        }
        return out;
      });
      const png = await page.screenshot();
      const ratios = await helper.evaluate(async ({ src, items }) => {
        const img = new Image(); img.src = src; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
        return items.map((it) => {
          const d = g.getImageData(Math.round(it.x), Math.round(it.y), Math.max(1, Math.round(it.w)), Math.max(1, Math.round(it.h))).data;
          const px = [];
          for (let i = 0; i < d.length; i += 4) px.push([L(d[i], d[i + 1], d[i + 2]), d[i], d[i + 1], d[i + 2]]);
          px.sort((a, b) => a[0] - b[0]);
          const [bg, br, bgG, bb] = px[Math.floor(px.length / 2)];
          const [r, gg, b, a] = it.rgba;
          const fg = L(a * r + (1 - a) * br, a * gg + (1 - a) * bgG, a * b + (1 - a) * bb);
          return { ...it, ratio: Math.round(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)) * 10) / 10 };
        });
      }, { src: `data:image/png;base64,${png.toString('base64')}`, items });
      const active = ratios.filter((x) => !x.disabled);
      const bad = active.filter((x) => x.ratio < (x.large ? 3 : 4.5));
      res.screens[name] = { textes: active.length, min: Math.min(...active.map((x) => x.ratio)), sousSeuil: bad.map((x) => `${x.what} ${x.ratio}:1`), desactives: ratios.length - active.length, minDesactives: ratios.length > active.length ? Math.min(...ratios.filter((x) => x.disabled).map((x) => x.ratio)) : null };
      check(!bad.length, `${name} : ${active.length} textes, min ${res.screens[name].min}:1${bad.length ? ` — sous le seuil : ${bad.slice(0, 3).map((x) => `${x.what} ${x.ratio}:1`).join(' ; ')}` : ''}`);
    };
    await page.goto(`${server.base}/?${Q}&reducedMotion=1&freeze=1`);
    await screenIs(page, 'home');
    await audit('accueil vide');
    await page.click('[data-key="home-new"]');
    await audit('nouveau duelliste');
    await page.click('[data-key="new-create"]');
    await screenIs(page, 'board');
    await audit('rencontres');
    await page.click('[data-key="board-deck"]');
    await audit('deck');
    await page.click('[data-key="deck-back"]');
    await page.click('[data-key="board-collection"]');
    await audit('collection');
    await page.click('[data-key="coll-back"]');
    await page.click('[data-key="enc-quai-1"]');
    await audit('préparation');
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    await page.click('[data-key="tool-menu"]');
    await audit('menu du duel');
    await page.click('[data-key="menu-options"]');
    await audit('options (duel)');
    await page.click('[data-key="opt-back"]');
    await page.click('[data-key="menu-abandon"]');
    await page.click('[data-key="confirm-ok"]');
    await screenIs(page, 'result');
    await audit('résultat');
    await page.click('[data-key="result-home"]');
    await audit('accueil avec sauvegarde');
    await page.click('[data-key="home-help"]');
    await audit('aide');
    await helper.context().close();
  });

  // --- T : clavier seul, de l’accueil au duel (Tab / Entrée / Échap, aucune souris) -------------------
  await run('T-clavier-seul', browser, { width: 1280, height: 720 }, async (page, check) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await screenIs(page, 'home');
    const focused = () => page.evaluate(() => document.activeElement?.dataset?.key ?? document.activeElement?.tagName);
    check(await focused() === 'home-new', `focus initial sur l’action principale (${await focused()})`);
    await page.keyboard.press('Enter');
    check(await focused() === 'new-create', 'création : focus sur « Créer le duelliste »');
    await page.keyboard.press('Enter');
    await screenIs(page, 'board');
    let k = null;
    for (let i = 0; i < 12 && k !== 'enc-quai-1'; i++) { await page.keyboard.press('Tab'); k = await focused(); }
    check(k === 'enc-quai-1', 'rencontres : « Jouer la manche » atteint au Tab');
    await page.keyboard.press('Enter');
    await screenIs(page, 'prep');
    check(await focused() === 'prep-start', 'préparation : focus sur « Commencer le duel »');
    await page.keyboard.press('Escape');
    check((await shell(page)).screen === 'prep', 'Échap sur un écran de jeu ne fait rien perdre');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!window.__lqv);
    const st = newStats();
    for (let i = 0; i < 2; i++) await playTurn(page, { name: 'T', useLecture: false, mode: 'keyboard' }, st);
    check(st.keyboard >= 1 && !st.lostClicks.length, `duel joué au clavier (${st.keyboard} engagement(s), ${st.turns} tour(s))`);
  });

  // --- P : coût CPU des écrans (CDP) -----------------------------------------------------------------
  await run('P-cout-cpu-ecrans', browser, { width: 1280, height: 720 }, async (page, check, res) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const cpuPerSecond = async (ms = 4000) => {
      const a = await metric();
      await page.waitForTimeout(ms);
      const b = await metric();
      return Math.round(((b.TaskDuration - a.TaskDuration) / ((b.Timestamp - a.Timestamp))) * 1000);
    };
    const t0 = Date.now();
    await page.goto(`${server.base}/?${Q}&reducedMotion=0`);
    await screenIs(page, 'home');
    res.homeReadyMs = Date.now() - t0;
    res.cpu = {};
    const frames = () => page.evaluate(() => window.__lqvShell.d.arena()?.stats().frame ?? null);
    await page.waitForTimeout(1500);
    const f0 = await frames();
    res.cpu.accueil = await cpuPerSecond();
    const f1 = await frames();
    res.framesAccueil = f1 - f0;
    check(f1 === f0, `accueil : aucune image 3D calculée pendant 4 s (scène figée ; ${f1 - f0} image)`);
    await page.click('[data-key="home-new"]');
    await page.click('[data-key="new-create"]');
    await screenIs(page, 'board');
    await page.waitForTimeout(800);
    res.cpu.rencontres = await cpuPerSecond();
    await page.click('[data-key="enc-quai-1"]');
    await page.waitForTimeout(800);
    res.cpu.preparation = await cpuPerSecond();
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    await page.waitForTimeout(2500);
    const d0 = await frames();
    res.cpu.duel = await cpuPerSecond();
    const d1 = await frames();
    res.arena = await page.evaluate(() => window.__lqv.arenaStats());
    res.framesDuel4s = d1 - d0;
    console.log(`   fil principal (ms de tâches par seconde) : ${JSON.stringify(res.cpu)} · images 3D : accueil ${res.framesAccueil} / duel ${res.framesDuel4s} en 4 s (${res.arena.fps} FPS SwiftShader) · accueil prêt en ${res.homeReadyMs} ms · ${res.arena.drawCalls} draw calls`);
    check(res.framesDuel4s > 0, `duel : la scène est rendue en continu (${res.framesDuel4s} images en 4 s)`);
  });
} finally {
  await browser.close();
  server.stop();
}
writeFileSync(`${OUT}/qa-rc${only ? `-${only.join('-')}` : ''}.json`, JSON.stringify(report, null, 2));
const bad = Object.entries(report.runs).filter(([, r]) => r.fails.length || r.consoleIssues.length);
if (bad.length) { console.error(`ÉCHEC QA RC : ${bad.map(([n]) => n).join(', ')}`); process.exit(1); }
console.log(`QA RC OK (${Object.keys(report.runs).length} campagnes) — ${OUT}/qa-rc.json`);
