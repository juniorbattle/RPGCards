// ADR 046 (décision du responsable du 2026-10-27 : l'Astre en ocre et or partout, « cohérent dans un combat, en ville et
// autre ») — constat de la passe 157 : sur la façade de la Salle des Bannières du Quai (`public/decors/quai-facades.png`,
// image approuvée), la bannière de l'Astre est peinte en marine, comme celle du Voile (seul l'emblème d'or les distingue).
// PROPOSITION, par script : recoloration des seuls tons marine du drap de la quatrième bannière (rectangle mesuré ; teinte
// 200 à 240°, saturation ≥ 0,45, ≥ 0,22 dans la queue : les pierres du mur, moins saturées, restent telles quelles) vers
// l'ocre sombre de l'Astre, à la clarté des autres draps ;
// emblème, galons d'or, hampe et mur inchangés. Aucune image générée ; l'image du jeu N'EST PAS remplacée : la proposition
// est écrite à part (`art-src/decors/quai-facades/propose-adr046.png`) avec sa planche avant / après ; la poser en jeu
// rendrait caduque l'approbation de la façade (registre) : sur ordre du responsable seulement, dans une passe à part.
// Usage : node tools/m12-banniere-astre.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './browser.mjs';

const SRC = 'public/decors/quai-facades.png';
const OUT = 'art-src/decors/quai-facades/propose-adr046.png';
const PLANCHE = 'screenshots/qa/m12/couleurs/banniere-astre-quai-avant-apres.png';
/** Drap de la quatrième bannière (Astre), mesuré sur l'image approuvée : sous la tringle, jusqu'au bout de la queue ;
 *  `queue` : où le drap s'assombrit et se désature (seuil de saturation abaissé). */
const RECT = { x0: 1352, y0: 372, x1: 1437, y1: 632, queue: 545 };
const HUE = 38;
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;

mkdirSync('art-src/decors/quai-facades', { recursive: true });
mkdirSync('screenshots/qa/m12/couleurs', { recursive: true });
const avant = readFileSync(SRC);
const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const r = await page.evaluate(async ({ url, hue, R }) => {
  const img = new Image(); img.src = url; await img.decode();
  const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, img.width, img.height); const d = id.data;
  const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const dd = mx - mn; const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); const h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; return [h * 60, s, l]; };
  const rgb = (h, s, l) => { const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]; };
  let pixels = 0;
  for (let y = R.y0; y < R.y1; y++) for (let xx = R.x0; xx < R.x1; xx++) {
    const i = (y * img.width + xx) * 4;
    if (d[i + 3] < 8) continue;
    const [h, s, l] = hsl(d[i], d[i + 1], d[i + 2]);
    if (!(h >= 200 && h <= 240 && s >= (y < R.queue ? 0.45 : 0.22) && l >= 0.02 && l <= 0.42)) continue;
    // même modelé (plis), à la clarté d'un drap ocre sombre, comme les draps rouille et vert de ses voisines
    const to = rgb(hue, Math.min(0.52, Math.max(0.36, s * 0.72)), Math.min(0.36, 0.03 + l * 1.4));
    d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; pixels++;
  }
  x.putImageData(id, 0, 0);
  const blob = await c.convertToBlob({ type: 'image/png' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return { url: `data:image/png;base64,${btoa(bin)}`, pixels };
}, { url: dataUrl(avant), hue: HUE, R: RECT });
const apres = Buffer.from(r.url.split(',')[1], 'base64');
writeFileSync(OUT, apres);
console.log(`${r.pixels} pixels recolorés → ${OUT}`);
// planche : la Salle des Bannières avant / après, agrandie
await page.setContent(`<body style="margin:0;background:#0b0d14;color:#e9dfc8;font:15px system-ui">
  <div style="display:flex;gap:24px;padding:18px">${[['Avant (approuvée)', dataUrl(avant)], ['Proposition ADR 046 (non posée)', r.url]].map(([t, u]) => `
  <figure style="margin:0"><figcaption style="margin:0 0 8px">${t}</figcaption>
  <div style="width:620px;height:420px;overflow:hidden;position:relative;border:1px solid #333">
  <img src="${u}" style="position:absolute;left:${-930 * 1.2}px;top:${-300 * 1.2}px;width:${3263 * 1.2}px;image-rendering:auto"></div></figure>`).join('')}</div></body>`);
await page.waitForTimeout(400);
writeFileSync(PLANCHE, await page.screenshot({ clip: { x: 0, y: 0, width: 1320, height: 480 } }));
console.log(`planche → ${PLANCHE}`);
await browser.close();
