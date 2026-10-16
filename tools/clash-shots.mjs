// Démonstrations de chaque type de Clash, jouées PAR L’INTERFACE dans des scénarios déterministes.
// Pour chaque cas : captures figées (freeze=1&beat=N) aux temps Rang (présentation), Issue (impact),
// Blessures ; + une capture en mouvement réduit ; + une pellicule de l’animation réelle, échantillonnée
// à des instants exacts (séquence en pause + stageSeek) — ce n’est PAS un enregistrement temps réel.
// Sortie : $CLASH_OUT (défaut screenshots/qa/m03-2/clash ; les preuves M03 restent dans m03/clash)
// *.png + pellicule-*.png (planches) + clash-manifest.json
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, startPreview, waitDecision, watchConsole } from './browser.mjs';

const OUT = process.env.CLASH_OUT ?? 'screenshots/qa/m03-2/clash';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const ONLY = process.env.CLASH_ONLY ?? '';

const CASES = [
  { name: 'aa-gagne', scenario: 'clash-aa', prim: 'Cendre-4', stance: 'assault', expect: 'aa-win', label: 'ASSAUT contre ASSAUT — vous dominez (IV contre III)' },
  { name: 'aa-perd', scenario: 'clash-aa', prim: 'Astre-2', stance: 'assault', expect: 'aa-win', label: 'ASSAUT contre ASSAUT — le rival domine (III contre II)' },
  { name: 'aa-egalite', scenario: 'clash-aa', prim: 'Cendre-3', stance: 'assault', expect: 'aa-tie', label: 'ASSAUT contre ASSAUT — égalité III/III : impacts simultanés' },
  { name: 'ag-garde-tient', scenario: 'clash-ag', prim: 'Cendre-3', stance: 'assault', expect: 'guard-holds', label: 'Votre ASSAUT III contre GARDE IV — la Garde gagne au Rang, Assaut repoussé' },
  { name: 'ag-absorption', scenario: 'clash-ag', prim: 'Cendre-3', stance: 'assault', plan: 'rank', expect: 'guard-absorbs', label: 'T2 : ASSAUT 5 (III + Cendre I +2) contre GARDE IV P12 — victoire au Rang, 0 blessure (absorption)' },
  { name: 'ag-garde-cede', scenario: 'clash-ag', prim: 'sig-Cendre', stance: 'assault', expect: 'guard-breaks', label: 'Brasier Originel ∞ (P14) contre GARDE IV (P12) — la Garde cède, 2 blessures' },
  { name: 'gg-neutre', scenario: 'clash-ag', prim: 'Ronce-4', stance: 'guard', expect: 'gg-neutral', label: 'GARDE contre GARDE — neutralité' },
  { name: 'ga-votre-garde', scenario: 'clash-aa', prim: 'Cendre-4', stance: 'guard', expect: 'guard-holds', label: 'Votre GARDE IV contre ASSAUT III du rival — votre Garde tient' },
  { name: 'double-ko', scenario: 'doubleko', prim: 'Cendre-4-contrecoup', stance: 'assault', expect: 'aa-win', label: 'Double K.-O. : Contrecoup contre Signature ∞ — prolongation à 1 PV' },
  { name: 'interferences', scenario: 'interference', prim: 'Cendre-4', stance: 'assault', plans: [{ slot: 0, mode: 'damage' }, { slot: 1, mode: 'interfere', target: 0 }], expect: null, label: 'Interférences mutuelles : soutiens ANNULÉS, puis Clash' },
].filter((c) => !ONLY || ONLY.split(',').includes(c.name));

const FILM_MS = [0, 200, 380, 470, 620, 1000];
const films = [];
const manifest = { commit, date: new Date().toISOString(), note: 'Chromium headless + WebGL logiciel SwiftShader. Captures figées = pose FINALE de l’étape (freeze=1&beat=N) ; pellicule = animation réelle échantillonnée à des instants exacts (pause + stageSeek), pas un enregistrement temps réel.', cases: [] };

async function drive(page, c) {
  const v = await waitDecision(page);
  const card = v.me.hand.find((x) => x.defId === c.prim || x.defId.startsWith(c.prim));
  if (!card) throw new Error(`${c.name} : carte ${c.prim} absente de la main`);
  await page.click(`[data-key="hand-${card.cardId}"]`);
  await page.click('[data-drop="primary"]');
  await page.click(`[data-key="stance-${c.stance}"]`);
  await page.click('[data-key="act-commit"]');
  for (let i = 0; i < 6; i++) {
    const w = await waitDecision(page);
    if (w.phase === 'LECTURE') { await page.click('[data-key="act-lecture-pass"]'); continue; }
    if (w.phase === 'TACTICS' && w.awaitingMe) {
      const plans = c.plans ?? (c.plan ? [{ slot: 0, mode: c.plan }] : []);
      for (const p of plans) {
        await page.click(`[data-key="zone-me-${p.slot}"]`);
        await page.click(`[data-key="menu-${p.slot}-${p.mode}"]`);
        if (p.mode === 'interfere') await page.click(`[data-key="zone-opp-${p.target}"]`);
      }
      await page.click('[data-key="act-tactics"]');
      continue;
    }
    break;
  }
}

const server = await startPreview(4193);
const browser = await launch();
const issues = [];
try {
  for (const c of CASES) {
    const base = `${server.base}/?scenario=${c.scenario}&qa=1&aiDelay=0`;
    const entry = { ...c, shots: [] };
    // 1. Repérage des temps (séquence complète figée).
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      watchConsole(page, issues);
      await page.goto(`${base}&freeze=1&beat=99`);
      await page.waitForFunction(() => !!window.__lqv);
      await drive(page, c);
      await page.waitForTimeout(300);
      const info = await page.evaluate(() => ({ kinds: window.__lqv.controller.seq?.beats.map((b) => b.kind) ?? [], script: window.__lqv.controller.seq?.script ?? null }));
      entry.beats = info.kinds;
      entry.outcome = info.script?.outcome ?? null;
      entry.verdict = info.script?.verdict ?? null;
      if (c.expect && entry.outcome !== c.expect) issues.push(`${c.name} : chorégraphie ${entry.outcome}, attendue ${c.expect}`);
      await ctx.close();
    }
    // 2. Poses figées aux temps clés.
    const targets = [['rank', 'presentation'], ['interference', 'interference'], ['outcome', 'impact'], ['damage', 'blessures'], ['overtime', 'prolongation']];
    for (const [kind, tag] of targets) {
      const idx = entry.beats.indexOf(kind);
      if (idx < 0) continue;
      if (kind === 'interference' && c.name !== 'interferences') continue;
      if (kind === 'overtime' && c.name !== 'double-ko') continue;
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      watchConsole(page, issues);
      await page.goto(`${base}&freeze=1&beat=${idx}`);
      await page.waitForFunction(() => !!window.__lqv);
      await drive(page, c);
      await page.waitForTimeout(500);
      const file = `${c.name}-${String(idx).padStart(2, '0')}-${tag}.png`;
      await page.screenshot({ path: `${OUT}/${file}` });
      const p = await page.evaluate(() => window.__lqv.presentation());
      entry.shots.push({ file, beat: kind, stage: p.stage, rival: p.rival?.mood ?? null });
      await ctx.close();
    }
    // 3. Mouvement réduit (pose de l’issue, sans déplacement).
    {
      const idx = entry.beats.indexOf('outcome');
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      watchConsole(page, issues);
      await page.goto(`${base}&freeze=1&reducedMotion=1&beat=${idx}`);
      await page.waitForFunction(() => !!window.__lqv);
      await drive(page, c);
      await page.waitForTimeout(500);
      const file = `${c.name}-mvt-reduit.png`;
      await page.screenshot({ path: `${OUT}/${file}` });
      entry.shots.push({ file, beat: 'outcome', reducedMotion: true });
      await ctx.close();
    }
    manifest.cases.push(entry);
    console.log(`✓ ${c.name} : ${entry.outcome} — ${entry.verdict} [${entry.beats.join(', ')}]`);
  }
  // 4. Pellicule en mouvement réel (non figée) : absorption T2 et Assaut gagnant.
  for (const name of ['ag-absorption', 'aa-gagne', 'ag-garde-tient']) {
    const c = CASES.find((x) => x.name === name);
    if (!c) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    watchConsole(page, issues);
    await page.goto(`${server.base}/?scenario=${c.scenario}&qa=1&aiDelay=0&reducedMotion=0`);
    await page.waitForFunction(() => !!window.__lqv);
    await drive(page, c);
    await page.waitForFunction(() => window.__lqv.presentation().beat === 'outcome', null, { timeout: 15000 });
    // Le rendu logiciel est trop lent pour filmer en temps réel : la séquence est figée sur le temps
    // « issue » et les animations de la scène sont placées à des instants précis (pellicule exacte).
    await page.evaluate(() => window.__lqv.pauseSequence());
    const frames = [];
    for (const [i, ms] of FILM_MS.entries()) {
      await page.evaluate((t) => window.__lqv.stageSeek(t), ms);
      await page.waitForTimeout(120);
      const file = `${c.name}-film-${i}-${ms}ms.png`;
      await page.screenshot({ path: `${OUT}/${file}` });
      frames.push(file);
    }
    manifest.cases.find((x) => x.name === name)?.shots.push({ film: frames, instantsMs: FILM_MS, method: 'pause + stageSeek (positions exactes, pas temps réel)' });
    films.push({ name, label: c.label, frames });
    await page.click('[data-key="act-skip"]');
    await page.waitForTimeout(300);
    const ghosts = await page.evaluate(() => document.querySelectorAll('#stage .clash-stage').length);
    if (ghosts) issues.push(`${name} : ${ghosts} scène(s) de Clash fantôme(s) après « Passer »`);
    await ctx.close();
  }
  // Planches de pellicule : instants explicitement indiqués, méthode rappelée en titre.
  for (const f of films) {
    const cells = f.frames.map((file, i) => `<figure style="margin:0"><img src="data:image/png;base64,${readFileSync(`${OUT}/${file}`).toString('base64')}" style="width:300px;border:1px solid #4a3f2a;border-radius:4px;display:block"><figcaption style="font-size:12px;color:#e2c48a;margin-top:3px">t = ${FILM_MS[i]} ms</figcaption></figure>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0a10;color:#f3ece0;font-family:system-ui;padding:12px">
<h2 style="font-family:Georgia;color:#ffe7b0;margin:0 0 4px;font-size:17px">Pellicule — ${f.label}</h2>
<div style="font-size:12px;color:#ff9a7a;margin-bottom:8px">Positions EXACTES de l’animation réelle de la scène de Clash (séquence en pause, stageSeek à chaque instant) — PAS un enregistrement en temps réel. Build ${commit}, 1280×720, SwiftShader (CPU).</div>
<div style="display:flex;gap:8px;flex-wrap:wrap;max-width:1880px">${cells}</div></body>`;
    const page = await browser.newPage({ viewport: { width: 1900, height: 400 } });
    await page.setContent(html);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/pellicule-${f.name}.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}
manifest.issues = issues;
writeFileSync(`${OUT}/clash-manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`${manifest.cases.length} cas · problèmes : ${issues.length}${issues.length ? `\n${issues.join('\n')}` : ''}`);
if (issues.length) process.exitCode = 1;
