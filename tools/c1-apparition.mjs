// M08 C1 — apparition d’un rival : coût de la première image, avant / après la préparation aux temps morts.
// Parcours réel du jeu : profil de test (quatre duels libres ouverts), tableau des Rencontres, temps mort, clic sur
// l’affiche d’un rival, qui s’assoit à la table derrière l’écran de préparation. On chronomètre le clic (tâche
// synchrone : écran et `setRival`), puis les deux images suivantes (« première image » : tramage des canvas et envoi des
// textures au GPU s’ils n’ont pas été faits avant), et la plus longue image de la seconde qui suit ; retour au tableau,
// temps mort, puis TÉMOIN : même affiche une seconde fois (même écran, rival déjà assis : le coût du seul changement
// d’écran), rival suivant (Maëlle, Sélène, Orin, Kaï). Page neuve par build et par ronde, rondes entrelacées.
// Builds : LQV_BEFORE (avant C1) et `dist` (après) ; variantes de l’après (`?qa=1&prep=…`) : `full` (défaut), `art`
// (couches seules), `off` (aucune préparation : témoin).
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> LQV_BEFORE=<dist avant> [LQV_CHROME_ARGS=…]
//         node tools/c1-apparition.mjs <sortie.json> [rondes=5] [variantes=avant,full,art,off]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/m08/c1-apparition.json';
const ROUNDS = Number(process.argv[3] ?? 5);
const VARIANTS = (process.argv[4] ?? 'avant,full,art,off').split(',');
const BEFORE = process.env.LQV_BEFORE;
if (VARIANTS.includes('avant') && !BEFORE) throw new Error('LQV_BEFORE (dist du build avant C1) requis pour la variante « avant »');
const IDLE_MS = 2500; // temps mort sur le tableau avant chaque clic (identique pour tous les builds)
const TARGETS = ['ronce', 'voile', 'astre', 'braise'];
/** Clics mesurés : chaque rival, puis la même affiche une seconde fois (témoin, aucun changement de rival). */
const CLICKS = TARGETS.flatMap((id) => [{ id, control: false }, { id, control: true }]);
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const portA = Number(process.env.LQV_PREVIEW_PORT) || 4211;
const after = await startPreview(portA, 'dist');
const before = VARIANTS.includes('avant') ? await startPreview(portA + 1, BEFORE) : null;
const browser = await launch();
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (x) => Math.round(x * 100) / 100;
let renderer = null;
const samples = Object.fromEntries(VARIANTS.map((v) => [v, []]));

const OPEN_ALL = () => {
  const s = JSON.parse(localStorage.getItem('lqv.save'));
  s.progress.met = ['braise', 'ronce', 'voile', 'astre'];
  s.progress.series = { step: 0, completed: 1 };
  localStorage.setItem('lqv.save', JSON.stringify(s));
};

async function measureClick(page, key) {
  return page.evaluate(async (key) => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
    const btn = document.querySelector(`[data-key="${key}"]`);
    if (!btn) throw new Error(`bouton ${key} introuvable`);
    const t0 = performance.now();
    btn.click();
    const t1 = performance.now();
    await raf();
    const t2 = performance.now();
    await raf();
    const t3 = performance.now();
    const frames = [];
    let stop = false;
    const loop = (t) => { frames.push(t); if (!stop) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    await new Promise((r) => setTimeout(r, 1000));
    stop = true;
    const gaps = frames.slice(1).map((t, i) => t - frames[i]);
    const q = (x) => Math.round(x * 100) / 100;
    const arena = window.__lqvShell.d.arena();
    return {
      clickMs: q(t1 - t0), firstFrameMs: q(t3 - t1), frame1Ms: q(t2 - t1), frame2Ms: q(t3 - t2),
      maxGapAfterMs: q(Math.max(...gaps)), textures: arena?.stats().textures ?? null, programs: arena?.stats().programs ?? null,
      prep: window.__lqvPrep ? window.__lqvPrep() : null,
    };
  }, key);
}

async function idle(page, variant) {
  await page.waitForTimeout(IDLE_MS);
  if (variant !== 'avant') await page.waitForFunction(() => window.__lqvPrep().pending === 0, null, { timeout: 15000 });
}

try {
  for (let r = 0; r < ROUNDS; r++) {
    const order = VARIANTS.map((_, i) => VARIANTS[(i + r) % VARIANTS.length]);
    for (const variant of order) {
      const base = variant === 'avant' ? before.base : after.base;
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      const q = `qa=1&aiDelay=0&reducedMotion=0&profileSeed=4242${variant === 'avant' || variant === 'full' ? '' : `&prep=${variant}`}`;
      await page.goto(`${base}/?${q}`);
      renderer ??= await webglRenderer(page);
      await page.waitForSelector('[data-screen="home"]');
      await page.click('[data-key="home-new"]');
      await page.click('[data-key="new-sig-Cendre"]');
      await page.click('[data-key="new-create"]');
      await page.waitForSelector('[data-screen="board"]');
      await page.evaluate(OPEN_ALL);
      await page.reload();
      await page.click('[data-key="home-continue"]');
      await page.waitForSelector('[data-screen="board"]');
      for (const { id, control } of CLICKS) {
        await idle(page, variant);
        const res = await measureClick(page, `enc-libre-${id}`);
        await page.waitForSelector('[data-screen="prep"]');
        samples[variant].push({ round: r + 1, rival: id, control, ...res, errors: errors.splice(0) });
        console.log(`ronde ${r + 1} · ${variant} · ${id}${control ? ' (témoin)' : ''} : clic ${res.clickMs} ms, première image ${res.firstFrameMs} ms (${res.frame1Ms} + ${res.frame2Ms}), plus longue ensuite ${res.maxGapAfterMs} ms${res.prep ? ` · pris prêts ${res.prep.taken}, construits ${res.prep.built}` : ''}`);
        await page.click('[data-key="prep-back"]');
        await page.waitForSelector('[data-screen="board"]');
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  after.stop();
  before?.stop();
}

const summary = {};
for (const v of VARIANTS) {
  const xs = samples[v].filter((x) => !x.control);
  const ctl = samples[v].filter((x) => x.control);
  const med = (k) => r2(median(xs.map((x) => x[k])));
  const last = samples[v].at(-1)?.prep;
  summary[v] = {
    control: { n: ctl.length, clickMs: r2(median(ctl.map((x) => x.clickMs))), firstFrameMs: r2(median(ctl.map((x) => x.firstFrameMs))), firstFrameMaxMs: r2(Math.max(...ctl.map((x) => x.firstFrameMs))) },
    prep: last ? { maxStepMs: last.maxStepMs, totalMs: last.totalMs, steps: last.steps, finished: last.finished, uploaded: last.uploaded } : null,
    n: xs.length, clickMs: med('clickMs'), firstFrameMs: med('firstFrameMs'), frame1Ms: med('frame1Ms'), frame2Ms: med('frame2Ms'),
    firstFrameMaxMs: r2(Math.max(...xs.map((x) => x.firstFrameMs))), maxGapAfterMs: med('maxGapAfterMs'),
    byRival: Object.fromEntries(TARGETS.map((id) => [id, { clickMs: r2(median(xs.filter((x) => x.rival === id).map((x) => x.clickMs))), firstFrameMs: r2(median(xs.filter((x) => x.rival === id).map((x) => x.firstFrameMs))) }])),
    textures: [...new Set(xs.map((x) => x.textures))], programs: [...new Set(xs.map((x) => x.programs))],
    errors: xs.reduce((a, x) => a + x.errors.length, 0),
  };
}
const report = { date: new Date().toISOString(), commit, before: BEFORE ?? null, chromeArgs: EXTRA_ARGS, renderer: rendererLabel(renderer), idleMs: IDLE_MS, rounds: ROUNDS, summary, samples };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ renderer: report.renderer, summary }, null, 2));
