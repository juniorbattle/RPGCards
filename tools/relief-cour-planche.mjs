// Planches de l'essai de profondeur sur la Grande Cour (retour du responsable du 2026-11-14) : à partir des captures de
// `tools/relief-cour.mjs` (dossier `brut/`), pour chaque taille une planche avant / après (le joueur à gauche, au centre,
// à droite, devant l'escalier, devant l'estrade, au pied de la Maison du Tournoi), et une planche des détails en gros plan
// (1280). « Avant » : le rendu de la passe 162 (`?volume=0`) ; « après » : l'essai. Seules les planches sont suivies.
// Usage : node tools/relief-cour.mjs && node tools/relief-cour-planche.mjs [dossier]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { CHROMIUM } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/retours-2026-11-14';
const BRUT = join(DIR, 'brut');
const VUES = [
  { id: 'gauche', titre: 'Le joueur à gauche' },
  { id: 'centre', titre: 'Le joueur au centre' },
  { id: 'droite', titre: 'Le joueur à droite' },
  { id: 'escalier', titre: 'Devant l’escalier (maison de droite)' },
  { id: 'estrade', titre: 'Devant l’estrade et ses marches' },
  { id: 'facade', titre: 'Au pied de la Maison du Tournoi (halo)' },
];
// gros plans (coordonnées en 1280 × 720) : la vue, la région, le titre
const DETAILS = [
  { vue: 'droite', r: [1050, 190, 1280, 430], titre: 'L’escalier en vrai 3D : la volée avance vers la rue, flanc dans l’ombre, ombre au sol' },
  { vue: 'escalier', r: [930, 230, 1280, 470], titre: 'La remise : intérieur creusé, ombre sous l’auvent, lumière peinte gardée' },
  { vue: 'facade', r: [380, 120, 900, 380], titre: 'Le balcon aux bannières : ombre sous la saillie, arêtes accrochées par le halo' },
  { vue: 'centre', r: [60, 120, 520, 400], titre: 'L’aile ouest : étage à colombages qui avance, ombre sur les échoppes, auvents' },
  { vue: 'estrade', r: [470, 330, 760, 480], titre: 'L’estrade : marches en vrai 3D posées au sol' },
];
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
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
  for (const W of [1280, 1920]) {
    const H = Math.round((W * 9) / 16);
    const k = 640 / W; const cw = 640; const ch = Math.round(H * k); const pad = 10; const tete = 70; const rang = ch + 34;
    const vues = VUES.filter((v) => existsSync(join(BRUT, `${v.id}-avant-${W}.png`)) && existsSync(join(BRUT, `${v.id}-apres-${W}.png`)));
    const spec = { w: 2 * cw + 3 * pad, h: tete + vues.length * rang + pad, textes: [], images: [] };
    spec.textes.push({ s: `Grande Cour, essai de profondeur du décor (${W} × ${H}) — avant (relief de la passe 162) et après (les trois leviers)`, x: pad, y: 28, f: '600 18px system-ui' });
    spec.textes.push({ s: 'Avant', x: pad, y: 58, f: '600 16px system-ui', c: '#b9b2a0' });
    spec.textes.push({ s: 'Après : volumes éclairés, ombres au sol, escaliers en vrai 3D', x: 2 * pad + cw, y: 58, f: '600 16px system-ui', c: '#f0c878' });
    vues.forEach((v, j) => {
      const y = tete + j * rang;
      spec.textes.push({ s: v.titre, x: pad, y: y + 20, f: '500 15px system-ui' });
      spec.images.push({ src: b64(join(BRUT, `${v.id}-avant-${W}.png`)), x: pad, y: y + 28, w: cw, h: ch });
      spec.images.push({ src: b64(join(BRUT, `${v.id}-apres-${W}.png`)), x: 2 * pad + cw, y: y + 28, w: cw, h: ch });
    });
    ecrit(`planche-cour-${W}.png`, await compose(spec));
  }
  // gros plans, 1280 : avant | après, agrandis
  const pad = 10; const largeur = 1400; const tete = 44;
  const rangs = DETAILS.filter((d) => existsSync(join(BRUT, `${d.vue}-avant-1280.png`))).map((d) => {
    const [x0, y0, x1, y1] = d.r; const z = (largeur / 2 - 1.5 * pad) / (x1 - x0);
    return { ...d, z, h: Math.round((y1 - y0) * z) };
  });
  const spec = { w: largeur, h: tete + rangs.reduce((s, r) => s + r.h + 34, 0) + pad, textes: [], images: [] };
  spec.textes.push({ s: 'Grande Cour, essai de profondeur : gros plans (1280 × 720), avant à gauche, après à droite', x: pad, y: 28, f: '600 18px system-ui' });
  let y = tete;
  for (const r of rangs) {
    const [x0, y0, x1, y1] = r.r; const w = Math.round((x1 - x0) * r.z);
    spec.textes.push({ s: r.titre, x: pad, y: y + 20, f: '500 15px system-ui' });
    spec.images.push({ src: b64(join(BRUT, `${r.vue}-avant-1280.png`)), src_r: [x0, y0, x1 - x0, y1 - y0], x: pad, y: y + 28, w, h: r.h });
    spec.images.push({ src: b64(join(BRUT, `${r.vue}-apres-1280.png`)), src_r: [x0, y0, x1 - x0, y1 - y0], x: largeur - pad - w, y: y + 28, w, h: r.h });
    y += r.h + 34;
  }
  ecrit('planche-cour-details.png', await compose(spec));
} finally {
  await br.close();
}
