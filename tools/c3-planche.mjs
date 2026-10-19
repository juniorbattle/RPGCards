// M08 C3 — porte de validation des duellistes PNJ de la ville, sur le build courant :
//   - planche de 12 PNJ (trois par gabarit) : vue A du duel (rendu figé, éclairage HD-2D) recadrée sur le buste et
//     portrait (celui des affiches et du HUD), à 1280×720 et 1920×1080, avec les quatre rivaux signatures en référence ;
//   - vue A complète (HUD compris) d’un PNJ par gabarit, aux deux tailles ;
//   - écran Rencontres avec la rubrique « Duels de la ville » ;
//   - déterminisme : couches V2 de chaque PNJ générées deux fois (deux pages neuves), empreintes FNV-1a identiques ;
//   - coût de génération des couches (`__lqvFigureCost`, médiane) des PNJ et des rivaux.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=…] node tools/c3-planche.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/m08/c3';
const REPORT = process.argv[3] ?? 'artifacts/qa/m08/c3-planche.json';
const COST_ONLY = process.env.COUT_SEUL === '1';
mkdirSync(OUT, { recursive: true });
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4241);
const browser = await launch();
const issues = [];
let renderer = null;
const png = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const files = [];
const save = (name, buf, desc) => { writeFileSync(`${OUT}/${name}`, buf); files.push({ file: `${OUT}/${name}`, desc }); };

/** Les PNJ de la planche : trois graines par gabarit (1, 5, 9 : les trois coupes et trois accessoires). */
const NPCS = (process.env.LQV_NPCS ?? 'pnj-docker-1,pnj-docker-5,pnj-docker-9,pnj-marchande-1,pnj-marchande-5,pnj-marchande-9,pnj-commis-1,pnj-commis-5,pnj-commis-9,pnj-joueuse-1,pnj-joueuse-5,pnj-joueuse-9').split(',');
const RIVALS = ['braise', 'ronce', 'voile', 'astre'];
const duel = (id) => `seed=202&autostart=1&rival=${id}&qa=1&aiDelay=0&intro=1&view=A&reducedMotion=1&freeze=1`;

async function page(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  return { ctx, p };
}

/** Empreinte FNV-1a des pixels de toutes les couches V2 d’une figure (génération fraîche dans la page). */
const FINGERPRINT = (id) => {
  const fnv = (data) => { let h = 0x811c9dc5; for (let i = 0; i < data.length; i += 7) { h ^= data[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  return window.__lqvFigureLayers(id).map((c) => `${c.width}x${c.height}:${fnv(c.getContext('2d').getImageData(0, 0, c.width, c.height).data)}`).join(',');
};

const report = { date: new Date().toISOString(), commit, chromeArgs: EXTRA_ARGS, renderer: null, npcs: {}, rivals: {}, determinism: {}, files, issues };
try {
  // Déterminisme et coût : deux pages neuves, mêmes empreintes ; coût médian de 15 générations.
  for (const pass of [0, 1]) {
    const { ctx, p } = await page([1280, 720]);
    await p.goto(`${server.base}/?${duel('braise')}`);
    await p.waitForFunction(() => !!window.__lqv);
    renderer ??= await webglRenderer(p);
    for (const id of [...NPCS, ...RIVALS]) {
      const fp = await p.evaluate(FINGERPRINT, id);
      (report.determinism[id] ??= []).push(fp);
      if (pass === 1) {
        const cost = await p.evaluate((id) => window.__lqvFigureCost(15, id), id);
        (NPCS.includes(id) ? report.npcs : report.rivals)[id] = { cost: cost.v2 };
      }
    }
    await ctx.close();
  }
  for (const [id, fps] of Object.entries(report.determinism)) if (fps[0] !== fps[1]) issues.push(`déterminisme : ${id} diffère d’une page à l’autre`);
  if (!COST_ONLY) {
    const cells = {};
    for (const vp of [[1280, 720], [1920, 1080]]) {
      const v = `${vp[0]}`;
      const { ctx, p } = await page(vp);
      // Buste du rival à l’écran (vue A) : même cadre relatif aux deux tailles.
      const clip = vp[0] === 1280 ? { x: 500, y: 0, width: 280, height: 300 } : { x: 750, y: 0, width: 420, height: 450 };
      for (const id of [...RIVALS, ...NPCS]) {
        await p.goto(`${server.base}/?${duel(id)}`);
        await p.waitForFunction(() => !!window.__lqv);
        await p.waitForTimeout(700);
        const meta = await p.evaluate(() => { const r = window.__lqv.controller.rival; return { name: r.name, title: r.title, family: r.family, npc: r.npc ?? null }; });
        const bust = png(await p.screenshot({ clip }));
        const portrait = await p.evaluate(() => document.querySelector('.hud.opp .portrait img, .portrait.mini img')?.src ?? null);
        (cells[id] ??= { meta })[v] = { bust, portrait };
        if (NPCS.includes(id) && ['pnj-docker-5', 'pnj-marchande-5', 'pnj-commis-5', 'pnj-joueuse-5'].includes(id)) save(`vueA-${id}-${v}.png`, await p.screenshot(), `Vue A complète du duel contre ${meta.name} (${id}), ${vp[0]}×${vp[1]}`);
      }
      await ctx.close();
    }
    for (const id of NPCS) report.npcs[id] = { ...report.npcs[id], ...cells[id].meta };
    // Écran Rencontres : rubrique « Duels de la ville ».
    {
      const { ctx, p } = await page([1280, 720]);
      await p.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5`);
      await p.click('[data-key="home-new"]');
      await p.fill('[data-key="new-name"]', 'Capture');
      await p.click('[data-key="new-sig-Ronce"]');
      await p.click('[data-key="new-create"]');
      await p.waitForSelector('[data-screen="board"]');
      await p.waitForTimeout(800);
      save('rencontres-1280.png', await p.screenshot({ fullPage: true }), 'Écran Rencontres (page entière), rubrique « Duels de la ville », 1280×720');
      const town = p.locator('.sh-town');
      if (await town.count()) save('duels-de-la-ville-1280.png', await town.screenshot(), 'Rubrique « Duels de la ville » seule, 1280×720');
      await ctx.close();
    }
    // Planches : une par taille ; rivaux en référence, puis les PNJ par gabarit.
    report.renderer = rendererLabel(renderer);
    for (const v of ['1280', '1920']) {
      const { ctx, p } = await page([v === '1280' ? 2300 : 3000, 1200]);
      const cell = (id, ref) => {
        const c = cells[id];
        const m = c.meta;
        return `<figure style="margin:0;display:flex;flex-direction:column;gap:4px;align-items:center">
          <div style="display:flex;gap:4px;align-items:flex-end"><img src="${c[v].bust}" style="display:block;border:1px solid ${ref ? '#8a6a2a' : '#3a3040'}"><img src="${c[v].portrait}" style="display:block;width:${v === '1280' ? 99 : 133}px;height:${v === '1280' ? 99 : 133}px;border:1px solid #3a3040"></div>
          <figcaption style="color:#d8ccb4;font-size:13px;text-align:center">${m.name}${m.npc ? '' : ` — ${m.title}`}<br><span style="color:#9a8e78;font-size:11px">${m.npc ? `${id} · ${m.title}` : 'rival signature'} · ${m.family}</span></figcaption></figure>`;
      };
      const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:16px 20px">
<h1 style="font:600 26px Georgia,serif;color:#ffe2a6;margin:0 0 4px">Duellistes PNJ de la ville — porte de validation C3 (${v === '1280' ? '1280×720' : '1920×1080'})</h1>
<p style="margin:0 0 12px;color:#b9ad98">Build ${commit}, seed 202, graine d’art 7 — ${report.renderer}. Pour chaque figure : vue A du duel recadrée sur le buste (rendu du jeu, échelle 1:1) et portrait des affiches et du HUD affiché à sa taille du HUD. Quatre gabarits, trois PNJ chacun (graine de l’identifiant) ; en haut, les quatre rivaux signatures en référence.</p>
<h2 style="font:600 17px Georgia,serif;color:#f0d08c;margin:8px 0 6px">Rivaux signatures (référence)</h2>
<div style="display:flex;gap:16px;flex-wrap:wrap">${RIVALS.map((id) => cell(id, true)).join('')}</div>
${['docker', 'marchande', 'commis', 'joueuse'].map((t) => `<h2 style="font:600 17px Georgia,serif;color:#f0d08c;margin:14px 0 6px">Gabarit « ${t} »</h2><div style="display:flex;gap:16px;flex-wrap:wrap">${NPCS.filter((id) => id.startsWith(`pnj-${t}-`)).map((id) => cell(id, false)).join('')}</div>`).join('')}
</body>`;
      await p.setContent(html);
      await p.waitForTimeout(400);
      save(`planche-pnj-${v}.png`, await p.screenshot({ fullPage: true }), `Planche des 12 PNJ (vue A recadrée et portrait) et des 4 rivaux, ${v === '1280' ? '1280×720' : '1920×1080'}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.stop();
}
report.renderer ??= rendererLabel(renderer);
report.deterministic = Object.values(report.determinism).every((fps) => fps[0] === fps[1]);
mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, JSON.stringify(report, null, 2));
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
console.log(JSON.stringify({
  renderer: report.renderer, deterministic: report.deterministic,
  npcGenMs: Object.fromEntries(Object.entries(report.npcs).map(([k, v]) => [k, v.cost?.medianMs])),
  rivalGenMs: Object.fromEntries(Object.entries(report.rivals).map(([k, v]) => [k, v.cost?.medianMs])),
  npcGenMedianMs: med(Object.values(report.npcs).map((v) => v.cost?.medianMs ?? 0)), issues: issues.length,
}, null, 2));
