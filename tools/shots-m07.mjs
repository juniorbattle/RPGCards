// Captures de comparaison M07 (avant / après) d’un même duel (seed 202, rendu figé) :
//   node tools/shots-m07.mjs <dossier dist> <préfixe> <dossier de sortie>
// États (SHOTS=…, défaut « debut,select,commit,tactics ») : début de tour, carte choisie (boutons de pose),
// Primaire + Secondaire posées, puis verrouillage jusqu’aux choix tactiques (au tour 1 de la graine 202, les Secondaires
// sont en chargement : pas de choix tactique, la capture montre le tour résolu). Tailles : SIZES=… (défaut « 1280x720,1920x1080 ») ;
// vue inclinée : VIEW=B (suffixe « -b » au fichier). GPU réel : LQV_GPU=1 CHROMIUM_PATH=…
// CONTRAST=<fichier.json> : contraste de chaque texte visible du duel, mesuré sur la capture (méthode de qa:rc :
// fond = médiane de luminance sous la boîte du texte, texte = couleur calculée) ; seuils 4,5:1, 3:1 en grand texte.
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dragTo, launch, startPreview, waitDecision } from './browser.mjs';

const [dist = 'dist', prefix = 'apres', outDir = 'screenshots/qa/m07'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const server = await startPreview(4195, dist);
const browser = await launch();
const errors = [];
const view = process.env.VIEW === 'B' ? 'B' : null;
const sizes = (process.env.SIZES ?? '1280x720,1920x1080').split(',').map((x) => x.split('x').map(Number));
const contrastOut = process.env.CONTRAST ?? null;
const contrast = {};
const helper = contrastOut ? await (await browser.newContext()).newPage() : null;

/** Textes lisibles à l’écran : boîte visible, non recouverte, hors filigrane décoratif de phase. */
function textSamples() {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent.trim() || el.closest('.phase-mark, script, style')) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom);
    if (x1 - x0 < 4 || y1 - y0 < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.fontSize) === 0) continue;
    // Recouvert (libellé de case sous une carte posée, etc.) : le texte n’est pas lu, on ne le mesure pas.
    const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
    if (!top || !(el === top || el.contains(top) || top.contains(el))) continue;
    let op = 1;
    for (let a = el; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
    if (op === 0) continue;
    const nums = cs.color.match(/[\d.]+/g).map(Number);
    const k = cs.color.startsWith('color(') ? 255 : 1;
    const size = parseFloat(cs.fontSize);
    out.push({
      x: x0, y: y0, w: x1 - x0, h: y1 - y0, rgba: [nums[0] * k, nums[1] * k, nums[2] * k, (nums[3] ?? 1) * op],
      large: size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700), px: Math.round(size * 10) / 10,
      disabled: !!el.closest('button:disabled, [aria-disabled="true"]'),
      what: `${(typeof el.className === 'string' && el.className) || el.tagName.toLowerCase()} « ${n.textContent.trim().slice(0, 28)} »`,
    });
  }
  return out;
}

async function measure(page, png) {
  const items = await page.evaluate(textSamples);
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
  return { textes: active.length, min: Math.min(...active.map((x) => x.ratio)), plusPetitPx: Math.min(...active.map((x) => x.px)), sousSeuil: bad.map((x) => `${x.what} ${x.ratio}:1`), desactives: ratios.length - active.length };
}

async function shot(w, h, action) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${action}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${action}: ${e.message}`));
  await page.goto(`${server.base}/?seed=202&autostart=1&qa=1&aiDelay=0&freeze=1${view ? `&view=${view}` : ''}`);
  await page.waitForFunction(() => !!window.__lqv);
  if (action === 'select') {
    const v = await waitDecision(page);
    const card = v.me.hand.find((x) => !x.defId.startsWith('sig-'));
    await page.click(`[data-key="hand-${card.cardId}"]`);
  } else if (action !== 'debut') {
    const v = await waitDecision(page);
    const cards = v.me.hand.filter((x) => !x.defId.startsWith('sig-'));
    await dragTo(page, `[data-key="hand-${cards[0].cardId}"]`, '[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    if (cards[1]) await dragTo(page, `[data-key="hand-${cards[1].cardId}"]`, '[data-drop="slot0"]').catch(() => {});
    if (action === 'tactics') {
      await page.click('[data-key="act-commit"]');
      for (let i = 0; i < 8; i++) {
        const v2 = await waitDecision(page);
        if (v2.phase === 'TACTICS') break;
        if (v2.phase === 'LECTURE') await page.click('[data-key="act-lecture-pass"]');
      }
    }
  }
  await page.waitForTimeout(1500);
  const name = `${action}-${w}${view ? '-b' : ''}`;
  const file = join(outDir, `${prefix}-${name}.png`);
  const png = await page.screenshot({ path: file });
  if (contrastOut) contrast[name] = await measure(page, png);
  console.log(`ok ${file}${contrastOut ? ` · contraste min ${contrast[name].min}:1, ${contrast[name].sousSeuil.length} sous le seuil` : ''}`);
  await ctx.close();
}
try {
  for (const [w, h] of sizes) {
    for (const action of (process.env.SHOTS ?? 'debut,select,commit,tactics').split(',')) await shot(w, h, action);
  }
} finally {
  await browser.close();
  server.stop();
}
if (contrastOut) writeFileSync(contrastOut, `${JSON.stringify({ dist, view: view ?? 'A', mesures: contrast }, null, 2)}\n`);
console.log(errors.length ? `console : ${errors.slice(0, 5).join(' | ')}` : 'console : 0 erreur');
