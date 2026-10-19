// RC 0.8 (M08 C5, étape 3) — contraste du chiffre de rang des vignettes de l’éditeur de deck, mesuré de deux façons :
//   - « qa-rc » : méthode de `qa-rc` S (couleur du texte contre la médiane des pixels de sa boîte, glyphe compris) ;
//   - « fond seul » (pire cas) : même boîte, glyphe rendu invisible (couleur et ombre transparentes), donc la médiane
//     est le fond réel du conteneur. Ce pire cas ne dépend plus de l’épaisseur du glyphe (rendu des polices de Windows,
//     mesuré à 3,5:1 sur le poste du responsable alors que le conteneur Linux donne 7:1 par la méthode qa-rc) ;
//   - « boîte élargie » (marge Windows) : fond seul dans la boîte agrandie de 3 px de chaque côté, comme si les
//     métriques d’une autre police (Georgia réelle sous Windows) faisaient chevaucher le liseré de la carte.
// Usage : npm run build && node tools/rc08-contraste-rang.mjs [rapport.json] [capture.png]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/rc08/contraste-rang.json';
const SHOT = process.argv[3] ?? null;
const SEL = process.env.LQV_RANK_SEL ?? '.sh-ver .card .rank';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4263, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const report = { date: new Date().toISOString(), commit, dist: process.env.LQV_DIST || 'dist', selector: SEL, viewports: {}, issues };
const measure = (helper, png, items) => helper.evaluate(async ({ src, items }) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  return items.map((it) => {
    const d = g.getImageData(Math.round(it.x), Math.round(it.y), Math.max(1, Math.round(it.w)), Math.max(1, Math.round(it.h))).data;
    const px = [];
    for (let i = 0; i < d.length; i += 4) px.push(L(d[i], d[i + 1], d[i + 2]));
    px.sort((a, b) => a - b);
    const bg = px[Math.floor(px.length / 2)];
    const fg = L(...it.rgb);
    const ratio = Math.round(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)) * 10) / 10;
    return { ratio, median: bg, p95: px[Math.floor(px.length * 0.95)] };
  });
}, { src: `data:image/png;base64,${png.toString('base64')}`, items });
try {
  const helper = await (await browser.newContext()).newPage();
  for (const [w, hgt] of [[1280, 720], [1920, 1080]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    watchConsole(p, issues);
    await p.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1`);
    await p.waitForSelector('[data-screen="home"]');
    await p.click('[data-key="home-new"]');
    await p.click('[data-key="new-create"]');
    await p.waitForSelector('[data-screen="board"]');
    await p.click('[data-key="board-deck"]');
    await p.waitForTimeout(600);
    const items = await p.evaluate((sel) => [...document.querySelectorAll(sel)].map((el) => {
      const r = el.getBoundingClientRect();
      const nums = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), w: r.width, h: r.height, rgb: nums.slice(0, 3), text: el.textContent, card: el.closest('[data-def],[data-card]')?.getAttribute('data-def') ?? null };
    }).filter((it) => it.w >= 4 && it.h >= 4 && it.y + it.h <= innerHeight), SEL);
    const png = await p.screenshot();
    if (SHOT && w === 1280) { mkdirSync(dirname(SHOT), { recursive: true }); writeFileSync(SHOT, png); }
    const glyph = await measure(helper, png, items);
    const withGlyph = glyph.map((m) => m.ratio);
    await p.addStyleTag({ content: `${SEL} { color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; }` });
    await p.waitForTimeout(200);
    const hidden = await p.screenshot();
    const bgRaw = await measure(helper, hidden, items);
    const bgOnly = bgRaw.map((m) => m.ratio);
    const wide = (await measure(helper, hidden, items.map((it) => ({ ...it, x: Math.max(0, it.x - 3), y: Math.max(0, it.y - 3), w: it.w + 6, h: it.h + 6 })))).map((m) => m.ratio);
    // « glyphe réel » : luminance du glyphe tel qu’affiché (95e centile de sa boîte, filtres CSS compris : vignettes non
    // choisies assombries) contre le fond seul (médiane, glyphe masqué).
    const real = items.map((_, i) => { const f = glyph[i].p95; const b = bgRaw[i].median; return Math.round(((Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05)) * 10) / 10; });
    const rows = items.map((it, i) => ({ text: it.text, box: [it.x, it.y, it.w, it.h].map(Math.round), qaRc: withGlyph[i], fondSeul: bgOnly[i], boiteElargie: wide[i], glypheReel: real[i] }));
    const by = (k, t) => rows.filter((r) => !t || r.text === t).map((r) => r[k]);
    report.viewports[`${w}x${hgt}`] = { n: rows.length, minQaRc: Math.min(...by('qaRc')), minFondSeul: Math.min(...by('fondSeul')), minFondSeulII: Math.min(...by('fondSeul', 'II')), minBoiteElargie: Math.min(...by('boiteElargie')), minBoiteElargieII: Math.min(...by('boiteElargie', 'II')), minGlypheReel: Math.min(...by('glypheReel')), minGlypheReelII: Math.min(...by('glypheReel', 'II')), rows };
    console.log(`${w}×${hgt} : ${rows.length} rangs · min qa-rc ${Math.min(...by('qaRc'))}:1 · min fond seul ${Math.min(...by('fondSeul'))}:1 (« II » ${Math.min(...by('fondSeul', 'II'))}:1) · min boîte élargie ${Math.min(...by('boiteElargie'))}:1 (« II » ${Math.min(...by('boiteElargie', 'II'))}:1) · min glyphe réel ${Math.min(...by('glypheReel'))}:1 (« II » ${Math.min(...by('glypheReel', 'II'))}:1)`);
    await ctx.close();
  }
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  server.stop();
}
