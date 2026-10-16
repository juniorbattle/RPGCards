// Captures M03 réelles du build + planches de comparaison avec la preview validée.
// La preview (`reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`) n’est utilisée QUE comme document de
// revue dans les planches (recadrages côte à côte) — jamais dans le runtime.
// Sortie : screenshots/qa/m03/*.png + comparaison-*.png + manifest.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dragTo, launch, startPreview, view, waitDecision, watchConsole } from './browser.mjs';

const OUT = 'screenshots/qa/m03';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const manifest = { commit, date: new Date().toISOString(), note: 'Chromium headless + WebGL logiciel SwiftShader ; freeze=1 sauf mention.', shots: [], comparisons: [] };
const server = await startPreview(4195);
const browser = await launch();
const issues = [];
const Q = 'qa=1&aiDelay=0&freeze=1';

async function open(url, viewport = { width: 1280, height: 720 }, extra = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, ...extra });
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  watchConsole(page, issues);
  await page.goto(`${server.base}/${url}`);
  await page.waitForFunction(() => !!window.__lqv);
  await page.waitForTimeout(400);
  return { ctx, page };
}

async function shot(page, id, desc, opts = {}) {
  await page.waitForTimeout(300);
  const path = `${OUT}/${id}.png`;
  await page.screenshot({ path, clip: opts.clip });
  const p = await page.evaluate(() => (window.__lqv?.presentation ? window.__lqv.presentation() : null)).catch(() => null);
  const v = await page.evaluate(() => (window.__lqv ? window.__lqv.view() : null)).catch(() => null);
  manifest.shots.push({ id, path, desc, url: page.url().replace(server.base, ''), viewport: page.viewportSize(), turn: v?.turn ?? null, phase: v?.phase ?? null, view: p?.view ?? null, rival: p?.rival ? `${p.personality}:${p.rival.mood}` : null });
  console.log(`✓ ${id} — ${desc}${p ? ` [vue ${p.view}${p.rival ? `, ${p.rival.mood}` : ''}]` : ''}`);
}

const pick = async (page, prefix) => (await view(page)).me.hand.find((c) => c.defId.startsWith(prefix));

/** Pose une Primaire par glisser, choisit le mode ; renvoie la page en vue B (Engagement). */
async function placePrimary(page, prefix, stance, mode = 'drag') {
  await waitDecision(page);
  const c = await pick(page, prefix);
  if (mode === 'drag') await dragTo(page, `[data-key="hand-${c.cardId}"]`, '[data-drop="primary"]');
  else { await page.click(`[data-key="hand-${c.cardId}"]`); await page.click('[data-drop="primary"]'); }
  await page.click(`[data-key="stance-${stance}"]`);
}

try {
  // 1–2. Vue A (confrontation) et vue B (placement), 1280 et 1920 — rival Maëlle comme la preview.
  for (const [w, h, tag] of [[1280, 720, '1280'], [1920, 1080, '1920']]) {
    const a = await open(`?seed=202&autostart=1&rival=ronce&${Q}&intro=1`, { width: w, height: h });
    await shot(a.page, `01-vue-A-confrontation-${tag}`, `Vue A frontale : rival face à vous, HUD rival haut-gauche, HUD joueur bas-gauche, emplacements sur la table, main en bas (${tag})`);
    await a.ctx.close();
    const b = await open(`?seed=202&autostart=1&rival=ronce&${Q}`, { width: w, height: h });
    await placePrimary(b.page, 'Cendre', 'assault');
    await shot(b.page, `02-vue-B-placement-${tag}`, `Vue B inclinée : Primaire posée par glisser, choix ASSAUT/GARDE, rival toujours visible (${tag})`);
    await b.ctx.close();
  }
  // 3. Tactique en vue A : Primaires révélées avec bandeaux ASSAUT / GARDE, Secondaires actives.
  {
    const { ctx, page } = await open(`?scenario=interference&${Q}`);
    await placePrimary(page, 'Cendre-4', 'assault', 'click');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
    await shot(page, '03-tactique-postures-revelees-1280', 'Tactique (vue A) : bandeaux ASSAUT (rouge, pointe) / GARDE (bleu, bouclier) sur les Primaires révélées');
    await page.click('[data-key="zone-me-0"]');
    await shot(page, '04-tactique-menu-1280', 'Menu tactique d’une Secondaire active, centre et commandes dégagés');
    await ctx.close();
  }
  // 5. Secret : avant révélation, aucun mode adverse affiché ; votre mode reste marqué « secret ».
  {
    const { ctx, page } = await open(`?scenario=clash-ag&${Q}`);
    await placePrimary(page, 'Cendre-3', 'assault', 'click');
    await page.click('[data-key="act-commit"]');
    await page.waitForTimeout(200);
    await shot(page, '05-avant-revelation-secret-1280', 'Avant la révélation : Primaire adverse face cachée, aucun bandeau de mode adverse');
    await ctx.close();
  }
  // 6. Mobile 390×844 : vue A, vue B, scène de Clash.
  {
    const mob = { width: 390, height: 844 };
    const ext = { isMobile: true, hasTouch: true };
    const a = await open(`?seed=404&autostart=1&rival=ronce&${Q}&intro=1`, mob, ext);
    await shot(a.page, '06-mobile-vue-A', 'Mobile : mini-HUD rival en haut (portrait), rival visible, deux rangées, consigne, main, mini-HUD joueur');
    await a.ctx.close();
    const b = await open(`?seed=404&autostart=1&rival=ronce&${Q}`, mob, ext);
    await waitDecision(b.page);
    const c = (await view(b.page)).me.hand.find((x) => !x.defId.startsWith('sig-'));
    await b.page.tap(`[data-key="hand-${c.cardId}"]`);
    await b.page.tap('[data-drop="primary"]');
    await b.page.tap('[data-key="stance-guard"]');
    await shot(b.page, '07-mobile-vue-B-pose-tactile', 'Mobile : vue B, pose tactile, GARDE choisie, rival visible');
    await b.ctx.close();
    const s = await open(`?scenario=clash-ag&${Q}&beat=2`, mob, ext);
    await placePrimary(s.page, 'Cendre-3', 'assault', 'click');
    await s.page.click('[data-key="act-commit"]');
    await waitDecision(s.page);
    await s.page.click('[data-key="zone-me-0"]');
    await s.page.click('[data-key="menu-0-rank"]');
    await s.page.click('[data-key="act-tactics"]');
    await s.page.waitForTimeout(500);
    await shot(s.page, '08-mobile-clash-absorption', 'Mobile : scène du Clash (victoire au Rang, 0 blessure, absorption)');
    await s.ctx.close();
  }
  // 9–11. Journal en tiroir, inspection flottante, mouvement réduit.
  {
    const { ctx, page } = await open(`?seed=101&autostart=1&${Q}`);
    await waitDecision(page);
    await page.click('[data-key="tool-journal"]');
    await shot(page, '09-journal-tiroir', 'Journal intégral dans un tiroir rétractable (plus de colonne permanente)');
    await page.click('[data-key="drawer-close"]');
    const c = (await view(page)).me.hand[0];
    await page.hover(`[data-key="hand-${c.cardId}"]`);
    await shot(page, '10-inspection-flottante', 'Inspection au survol : panneau flottant à gauche, sans masquer le centre');
    await ctx.close();
    const rm = await open(`?scenario=clash-aa&qa=1&aiDelay=0&reducedMotion=1`);
    await placePrimary(rm.page, 'Cendre-4', 'assault', 'click');
    await shot(rm.page, '11-mouvement-reduit', 'Mouvement réduit : mêmes informations, transitions instantanées');
    await rm.ctx.close();
  }
} finally {
  await browser.close();
}

// --- Planches de comparaison preview ↔ runtime --------------------------------------------------
const REF = 'reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg';
const refUrl = `data:image/jpeg;base64,${readFileSync(REF).toString('base64')}`;
const png = (f) => (existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : '');
// Recadrages de la preview (pixels de l’image 1672×941) : panneaux 1 à 6.
const PANELS = {
  1: [0, 0, 908, 516], 2: [906, 0, 766, 516], 3: [0, 516, 798, 292], 4: [796, 516, 876, 292], 5: [0, 806, 1340, 135], 6: [1338, 796, 334, 145],
};
const crop = ([x, y, w, h], width) => {
  const k = width / w;
  return `<div style="width:${width}px;height:${Math.round(h * k)}px;background:url(${refUrl}) no-repeat;background-size:${Math.round(1672 * k)}px ${Math.round(941 * k)}px;background-position:-${Math.round(x * k)}px -${Math.round(y * k)}px;border:1px solid #6b5530;border-radius:6px"></div>`;
};
const COMPARE = [
  { id: 'comparaison-1-vue-A', panel: 1, runtime: `${OUT}/01-vue-A-confrontation-1280.png`, title: '1. Vue frontale — confrontation' },
  { id: 'comparaison-2-vue-B', panel: 2, runtime: `${OUT}/02-vue-B-placement-1280.png`, title: '2. Manipulation — placement des cartes' },
  { id: 'comparaison-3-revelation', panel: 3, runtime: `${OUT}/clash/ag-absorption-01-presentation.png`, title: '3. Révélation — comparaison du Clash' },
  { id: 'comparaison-4-resolution', panel: 4, runtime: `${OUT}/clash/ag-absorption-02-impact.png`, title: '4. Résolution — conséquences (victoire au Rang, 0 blessure)' },
  { id: 'comparaison-5-cartes-postures', panel: 5, runtime: `${OUT}/03-tactique-postures-revelees-1280.png`, title: '5. Cartes et états d’action (ASSAUT / GARDE)' },
  { id: 'comparaison-6-mobile', panel: 6, runtime: `${OUT}/06-mobile-vue-A.png`, title: '6. Vue adaptative mobile', mobile: true },
];
const b2 = await launch();
try {
  for (const c of COMPARE) {
    if (!existsSync(c.runtime)) { issues.push(`comparaison ${c.id} : capture runtime absente (${c.runtime})`); continue; }
    const rw = c.mobile ? 300 : 760;
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0a10;color:#f3ece0;font-family:system-ui;padding:14px">
<h2 style="font-family:Georgia;color:#ffe7b0;margin:0 0 8px;font-size:20px">${c.title}</h2>
<div style="display:flex;gap:14px;align-items:flex-start">
<figure style="margin:0"><figcaption style="font-size:12px;color:#b9ae9c;margin-bottom:4px">Preview validée (document de revue, panneau ${c.panel})</figcaption>${crop(PANELS[c.panel], c.mobile ? 520 : 760)}</figure>
<figure style="margin:0"><figcaption style="font-size:12px;color:#b9ae9c;margin-bottom:4px">Capture RÉELLE du build ${commit} (SwiftShader)</figcaption><img src="${png(c.runtime)}" style="width:${rw}px;border:1px solid #6b5530;border-radius:6px;display:block"></figure>
</div></body>`;
    const page = await b2.newPage({ viewport: { width: c.mobile ? 880 : 1580, height: 600 } });
    await page.setContent(html);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${c.id}.png`, fullPage: true });
    await page.close();
    manifest.comparisons.push({ id: c.id, panel: c.panel, runtime: c.runtime });
    console.log(`✓ ${c.id}`);
  }
} finally {
  await b2.close();
  server.stop();
}
manifest.issues = issues;
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`${manifest.shots.length} captures · ${manifest.comparisons.length} planches · problèmes console/outil : ${issues.length}${issues.length ? `\n${issues.slice(0, 8).join('\n')}` : ''}`);
if (issues.length) process.exitCode = 1;
