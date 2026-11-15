// Planches de l'essai de profondeur (retour du responsable du 2026-11-14 : « ce sont surtout les bâtiments dans les zones
// profondes ») : à partir des captures de `tools/relief-cour.mjs` (dossier `brut/`), pour chaque taille, une planche avant /
// après des rangs profonds de la Grande Cour (passage, Belvédère) et du Quai (rue Haute, place de la Halle, ruelle des
// Lanternes, placette du Puits, cour de la Chapelle), une du premier rang de la Grande Cour, et une planche des gros plans
// (1280). « Avant » : le rendu de la passe 162 (`?volume=0`) ; « après » : l'essai. Seules les planches sont suivies.
// Usage : node tools/relief-cour.mjs && node tools/relief-cour-planche.mjs [dossier]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { CHROMIUM } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/retours-2026-11-14';
const BRUT = join(DIR, 'brut');
const PLANCHES = [
  { nom: 'planche-profond-quai', titre: 'Quai, rangs profonds', vues: [
    ['quai', 'rue-haute-ouest', 'Rue Haute, côté ouest (la maison à l’escalier au fond)'],
    ['quai', 'rue-haute-est', 'Rue Haute, côté est'],
    ['quai', 'place-halle', 'Place de la Halle'],
    ['quai', 'ruelle-lanternes', 'Ruelle des Lanternes (la volée du fond en vrai 3D)'],
    ['quai', 'placette-puits', 'Placette du Puits (le perron en vrai 3D)'],
    ['quai', 'cour-chapelle', 'Cour de la Chapelle'],
  ] },
  { nom: 'planche-profond-cour', titre: 'Grande Cour, rangs profonds', vues: [
    ['cour', 'passage-est', 'Passage est, au pied de la maison à l’escalier'],
    ['cour', 'belvedere-est', 'Belvédère, côté est'],
    ['cour', 'belvedere-centre', 'Belvédère, au centre'],
    ['cour', 'belvedere-ouest', 'Belvédère, côté ouest'],
  ] },
  { nom: 'planche-cour', titre: 'Grande Cour, premier rang', vues: [
    ['cour', 'gauche', 'Le joueur à gauche'],
    ['cour', 'centre', 'Le joueur au centre'],
    ['cour', 'droite', 'Le joueur à droite'],
    ['cour', 'escalier', 'Devant l’escalier (maison de droite)'],
    ['cour', 'estrade', 'Devant l’estrade et ses marches'],
    ['cour', 'facade', 'Au pied de la Maison du Tournoi (halo)'],
  ] },
];
// gros plans (coordonnées en 1280 × 720) : îlot, vue, région, titre
const DETAILS = [
  ['quai', 'ruelle-lanternes', [250, 120, 700, 480], 'Ruelle des Lanternes : la volée du fond avance vers la rue, flanc de pierre, ombre au sol'],
  ['quai', 'placette-puits', [300, 180, 900, 520], 'Placette du Puits : le perron de la maison du Puits en vrai 3D, étages et balcon en volume'],
  ['quai', 'rue-haute-ouest', [0, 140, 520, 520], 'Rue Haute : la maison à l’escalier au fond, galerie et remise creusées'],
  ['quai', 'place-halle', [380, 130, 1000, 470], 'Place de la Halle : l’étage à colombages qui avance sur les arcades'],
  ['cour', 'droite', [1050, 190, 1280, 430], 'Grande Cour : la maison à l’escalier, la volée en vrai 3D'],
  ['cour', 'facade', [380, 120, 900, 380], 'Grande Cour : le balcon aux bannières, ombre sous la saillie, arêtes accrochées par le halo'],
];
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const fichier = (ilot, vue, v, W) => join(BRUT, `${ilot}-${vue}-${v}-${W}.png`);
const br = await chromium.launch({ executablePath: CHROMIUM });
const page = await br.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const compose = (spec) => page.evaluate(async (spec) => {
  const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const c = new OffscreenCanvas(spec.w, spec.h);
  const g = c.getContext('2d');
  g.fillStyle = '#151820'; g.fillRect(0, 0, spec.w, spec.h);
  for (const t of spec.textes) { g.fillStyle = t.c ?? '#e8dcc0'; g.font = t.f; g.fillText(t.s, t.x, t.y); }
  for (const im of spec.images) {
    const i = await load(im.src);
    const [sx, sy, sw, sh] = im.src_r ?? [0, 0, i.width, i.height];
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(i, sx, sy, sw, sh, im.x, im.y, im.w, im.h);
  }
  const b = await c.convertToBlob({ type: 'image/png' });
  return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
}, spec);
const ecrit = (nom, url) => { writeFileSync(join(DIR, nom), Buffer.from(url.split(',')[1], 'base64')); console.log(`écrit : ${join(DIR, nom)}`); };
try {
  for (const pl of PLANCHES) {
    for (const W of [1280, 1920]) {
      const H = Math.round((W * 9) / 16);
      const cw = 640; const ch = Math.round(H * (cw / W)); const pad = 10; const tete = 70; const rang = ch + 34;
      const vues = pl.vues.filter(([i, v]) => existsSync(fichier(i, v, 'avant', W)) && existsSync(fichier(i, v, 'apres', W)));
      if (!vues.length) continue;
      const spec = { w: 2 * cw + 3 * pad, h: tete + vues.length * rang + pad, textes: [], images: [] };
      spec.textes.push({ s: `${pl.titre}, essai de profondeur du décor (${W} × ${H})`, x: pad, y: 28, f: '600 18px system-ui' });
      spec.textes.push({ s: 'Avant (relief de la passe 162)', x: pad, y: 58, f: '600 16px system-ui', c: '#b9b2a0' });
      spec.textes.push({ s: 'Après : volumes éclairés, ombres au sol, escaliers en vrai 3D', x: 2 * pad + cw, y: 58, f: '600 16px system-ui', c: '#f0c878' });
      vues.forEach(([i, v, titre], j) => {
        const y = tete + j * rang;
        spec.textes.push({ s: titre, x: pad, y: y + 20, f: '500 15px system-ui' });
        spec.images.push({ src: b64(fichier(i, v, 'avant', W)), x: pad, y: y + 28, w: cw, h: ch });
        spec.images.push({ src: b64(fichier(i, v, 'apres', W)), x: 2 * pad + cw, y: y + 28, w: cw, h: ch });
      });
      ecrit(`${pl.nom}-${W}.png`, await compose(spec));
    }
  }
  const pad = 10; const largeur = 1400; const tete = 44;
  const rangs = DETAILS.filter(([i, v]) => existsSync(fichier(i, v, 'avant', 1280))).map(([ilot, vue, r, titre]) => {
    const z = (largeur / 2 - 1.5 * pad) / (r[2] - r[0]);
    return { ilot, vue, r, titre, z, h: Math.round((r[3] - r[1]) * z) };
  });
  const spec = { w: largeur, h: tete + rangs.reduce((s, r) => s + r.h + 34, 0) + pad, textes: [], images: [] };
  spec.textes.push({ s: 'Essai de profondeur : gros plans (1280 × 720), rangs profonds d’abord ; avant à gauche, après à droite', x: pad, y: 28, f: '600 18px system-ui' });
  let y = tete;
  for (const r of rangs) {
    const [x0, y0, x1, y1] = r.r; const w = Math.round((x1 - x0) * r.z);
    spec.textes.push({ s: r.titre, x: pad, y: y + 20, f: '500 15px system-ui' });
    spec.images.push({ src: b64(fichier(r.ilot, r.vue, 'avant', 1280)), src_r: [x0, y0, x1 - x0, y1 - y0], x: pad, y: y + 28, w, h: r.h });
    spec.images.push({ src: b64(fichier(r.ilot, r.vue, 'apres', 1280)), src_r: [x0, y0, x1 - x0, y1 - y0], x: largeur - pad - w, y: y + 28, w, h: r.h });
    y += r.h + 34;
  }
  ecrit('planche-profond-details.png', await compose(spec));
} finally {
  await br.close();
}
