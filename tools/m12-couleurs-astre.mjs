// ADR 046 (décision du responsable du 2026-10-27 : l'Astre et le Voile ne doivent plus se confondre) — la feuille de ville
// de Halvard, chef de l'Astre, passe du manteau marine (le même que celui d'Ilse, cheffe du Voile) au manteau ocre de
// l'Astre, PAR SCRIPT : recoloration exacte, ton par ton, des seuls tons bleus de la palette réduite de la feuille (teinte
// 205 à 235°, saturation ≥ 0,4, clarté 0,04 à 0,4 : le manteau) vers la même rampe à la teinte de l'ocre (44°), sous la
// ligne du col de chaque rangée de cellules (les yeux, du même bleu, et les reflets des cheveux restent tels quels) ;
// contours, peau, cheveux, barbe, or, cuir et yeux inchangés. Aucune image générée.
// Empreinte nouvelle : l'approbation de la passe 128 devient caduque (registre `art-src/approbations.json`, AGENTS,
// « Images de la ville ») ; hors QA, Halvard revient au dessin par code (lui aussi en ocre) jusqu'à un nouvel ordre
// d'approbation du responsable, dans une passe à part. Planche avant / après : screenshots/qa/m12/couleurs/.
// Usage : node tools/m12-couleurs-astre.mjs            (recolore, met à jour manifeste, fiche et registre)
//         node tools/m12-couleurs-astre.mjs --planche  (planche seulement, depuis l'original gardé dans art-src)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './browser.mjs';
import { appliquer, REGISTRE } from './m09-approbations.mjs';

const ID = 'chef-astre';
const FEUILLE = `public/sprites/${ID}.png`;
const ORIGINAL = `art-src/sprites/${ID}/avant-adr046.png`;
const FICHE = `art-src/sprites/${ID}/fiche.json`;
const MANIFESTE = 'public/sprites/manifest.json';
const OUT = 'screenshots/qa/m12/couleurs';
const HUE = 44;
/** Première ligne d'art (sur 96) recolorée, par rangée de cellules : face (yeux aux lignes 27 à 30, col dès 35), dos (col
 *  dès 37), profil (œil aux lignes 23 à 26, col dès 31) ; mesuré sur la feuille approuvée. */
const COL = [33, 33, 30];
const planche = process.argv.includes('--planche');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;

mkdirSync(OUT, { recursive: true });
if (!existsSync(ORIGINAL)) writeFileSync(ORIGINAL, readFileSync(FEUILLE));
const avant = readFileSync(ORIGINAL);

const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 1720, height: 760 } })).newPage();
// recoloration dans un canvas : tons de la palette classés, rampe ocre de même clarté
const r = await page.evaluate(async ({ url, hue, col }) => {
  const img = new Image(); img.src = url; await img.decode();
  const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, img.width, img.height); const d = id.data;
  const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const dd = mx - mn; const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); const h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; return [h * 60, s, l]; };
  const rgb = (h, s, l) => { const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]; };
  const map = new Map(); let pixels = 0;
  const ch = img.height / col.length; const px = ch / 96;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const y = (i / 4 / img.width) | 0;
    if (Math.floor((y % ch) / px) < col[Math.floor(y / ch)]) continue;
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let to = map.get(key);
    if (to === undefined) {
      const [h, s, l] = hsl(d[i], d[i + 1], d[i + 2]);
      to = h >= 205 && h <= 235 && s >= 0.4 && l >= 0.04 && l <= 0.4 ? rgb(hue, Math.min(0.72, s * 1.15), Math.min(0.45, l * 1.08)) : null;
      map.set(key, to);
    }
    if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; pixels++; }
  }
  x.putImageData(id, 0, 0);
  const blob = await c.convertToBlob({ type: 'image/png' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  const tons = [...map.entries()].filter(([, v]) => v).map(([k, v]) => [`#${k.toString(16).padStart(6, '0')}`, `#${v.map((n) => n.toString(16).padStart(2, '0')).join('')}`]);
  return { url: `data:image/png;base64,${btoa(bin)}`, pixels, tons };
}, { url: dataUrl(avant), hue: HUE, col: COL });
const apres = Buffer.from(r.url.split(',')[1], 'base64');
console.log(`${r.tons.length} tons recolorés, ${r.pixels} pixels :`, r.tons.map(([a, b]) => `${a}→${b}`).join(' '));

if (!planche) {
  writeFileSync(FEUILLE, apres);
  const h = sha(apres);
  const man = JSON.parse(readFileSync(MANIFESTE, 'utf8'));
  man.sprites[ID].sha256 = h;
  man.sprites[ID].source = `${man.sprites[ID].source.replace(/ ; manteau recoloré.*$/, '')} ; manteau recoloré en ocre par script (ADR 046, tools/m12-couleurs-astre.mjs)`;
  writeFileSync(MANIFESTE, `${JSON.stringify(man, null, 2)}\n`);
  // registre : l'approbation de la passe 128 devient caduque (empreinte nouvelle)
  const reg = JSON.parse(readFileSync(REGISTRE, 'utf8'));
  const i = reg.images.findIndex((x) => x.fichier === FEUILLE);
  if (i >= 0) {
    const [img] = reg.images.splice(i, 1);
    reg.caduques.push({ ...img, caduque: '2026-10-27', raison: 'feuille retraitée par script sur décision du responsable (2026-10-27 : « appliquer définitivement cette distinction », l’Astre et le Voile ne doivent plus se confondre ; ADR 046) : manteau marine recoloré en ocre, ton par ton ; empreinte nouvelle : approbation caduque (AGENTS, « Images de la ville »), nouvelle approbation sur ordre explicite, dans une passe à part' });
    writeFileSync(REGISTRE, `${JSON.stringify(reg, null, 2)}\n`);
  }
  const f = JSON.parse(readFileSync(FICHE, 'utf8'));
  f.statut = `NON APPROUVÉ : approbation de la passe 128 caduque depuis la recoloration du manteau (ADR 046, 2026-10-27) ; admis en QA seulement jusqu’à un nouvel ordre explicite du responsable (empreinte ${h.slice(0, 12)}…)`;
  delete f.approbation;
  f.retouches = [...(f.retouches ?? []).filter((x) => x.adr !== '046'), { adr: '046', date: '2026-10-27', outil: 'tools/m12-couleurs-astre.mjs', quoi: `manteau marine recoloré en ocre (teinte ${HUE}°), ${r.tons.length} tons de la palette, ${r.pixels} pixels ; original gardé : ${ORIGINAL}`, tons: r.tons }];
  writeFileSync(FICHE, `${JSON.stringify(f, null, 2)}\n`);
  const a = appliquer();
  console.log(`registre appliqué : ${a.images} images approuvées, ${a.changes} entrée(s) changée(s)${a.ecarts.length ? ` ; ÉCARTS : ${a.ecarts.join(' | ')}` : ''}`);
}

// planche : vue de face (première cellule) avant / après, à côté d'Ilse (Voile) et d'Orin (Astre), agrandie ×2
const cell = (buf, col = 0, row = 0) => ({ url: dataUrl(buf), col, row });
const ilse = readFileSync('public/sprites/chef-voile.png');
const orin = readFileSync('public/sprites/astre.png');
await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#141119;color:#e8dcc4;font:14px system-ui;padding:16px}h1{font:600 18px Georgia;margin:0 0 12px}.row{display:flex;gap:18px;align-items:flex-end}figure{margin:0;text-align:center}canvas{image-rendering:pixelated;background:#2a2633;border-radius:8px}</style><h1>ADR 046 — Halvard (Astre) : manteau marine → ocre, à côté d'Ilse (Voile) et d'Orin (Astre)</h1><div class="row" id="r"></div>`);
await page.evaluate(async (items) => {
  const root = document.getElementById('r');
  for (const it of items) {
    const img = new Image(); img.src = it.url; await img.decode();
    const cw = img.width / 5; const ch = img.height / 3;
    const c = document.createElement('canvas'); c.width = cw * 2; c.height = ch * 2;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, cw, ch, 0, 0, cw * 2, ch * 2);
    const f = document.createElement('figure'); const cap = document.createElement('figcaption'); cap.textContent = it.label;
    f.append(c, cap); root.append(f);
  }
}, [{ ...cell(avant), label: 'Halvard, avant (approuvé, passe 128)' }, { ...cell(apres), label: 'Halvard, après (ADR 046)' }, { ...cell(ilse), label: 'Ilse (Voile)' }, { ...cell(orin), label: 'Orin (Astre)' }]);
await page.locator('body').screenshot({ path: `${OUT}/halvard-avant-apres.png` });
await browser.close();
console.log(`planche : ${OUT}/halvard-avant-apres.png`);
