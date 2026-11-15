// Planches du repère d'objectif (passe 240, demande du responsable du 2026-11-15) : à partir des captures de
// `tools/repere-objectif.mjs` (dossier `brut/`, rapports `artifacts/qa/retours-2026-11-15/repere-<largeur>.json`), une
// planche avant / après par taille (« avant » : l'écran d'avant la passe, repère masqué ; « après » : le repère), et une
// planche des gros plans du repère (1280). Seules les planches sont suivies.
// Usage : node tools/repere-objectif.mjs && LQV_VP=1920x1080 node tools/repere-objectif.mjs && node tools/repere-objectif-planche.mjs [dossier]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { CHROMIUM } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/retours-2026-11-15';
const BRUT = join(DIR, 'brut');
const VUES = [
  ['prologue-kai', 'Prologue, sur le Quai : Kaï dans le cadre, le losange au-dessus de lui'],
  ['prologue-hors-champ', 'Kaï hors du cadre : le repère se range au bord, une flèche vers lui'],
  ['parvis-passage', 'Au Parvis : l’étape se joue sur le Quai, le repère montre le passage'],
  ['choix-emissaires', 'Le choix de la voie : chaque émissaire du quartier'],
  ['chapitre-1-figure', 'Chapitre I : la première figure de la famille'],
  ['bannieres-porte', 'Après la cheffe ou le chef : la porte de la Salle des Bannières'],
  ['championnat-passage', 'Championnat, depuis le Quai : le passage vers la Grande Cour'],
  ['championnat-heraut', 'Dans la Grande Cour : le héraut du Tournoi'],
];
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const fichier = (vue, quand, W) => join(BRUT, `${vue}-${quand}-${W}.png`);
const rapport = (W) => { const f = `artifacts/qa/retours-2026-11-15/repere-${W}.json`; return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };
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
    const cw = 640; const ch = Math.round(H * (cw / W)); const pad = 10; const tete = 70; const rang = ch + 34;
    const vues = VUES.filter(([v]) => existsSync(fichier(v, 'avant', W)) && existsSync(fichier(v, 'apres', W)));
    if (!vues.length) continue;
    const spec = { w: 2 * cw + 3 * pad, h: tete + vues.length * rang + pad, textes: [], images: [] };
    spec.textes.push({ s: `Repère d’objectif de la Promenade libre (${W} × ${H})`, x: pad, y: 28, f: '600 18px system-ui' });
    spec.textes.push({ s: 'Avant (sans repère)', x: pad, y: 58, f: '600 16px system-ui', c: '#b9b2a0' });
    spec.textes.push({ s: 'Après : le repère d’objectif', x: 2 * pad + cw, y: 58, f: '600 16px system-ui', c: '#f0c878' });
    vues.forEach(([v, titre], j) => {
      const y = tete + j * rang;
      spec.textes.push({ s: titre, x: pad, y: y + 20, f: '500 15px system-ui' });
      spec.images.push({ src: b64(fichier(v, 'avant', W)), x: pad, y: y + 28, w: cw, h: ch });
      spec.images.push({ src: b64(fichier(v, 'apres', W)), x: 2 * pad + cw, y: y + 28, w: cw, h: ch });
    });
    ecrit(`planche-repere-${W}.png`, await compose(spec));
  }
  // gros plans (1280) : autour de chaque repère, à 1,6 fois, deux par rangée
  const r = rapport(1280);
  if (r) {
    const pad = 10; const tete = 44; const z = 1.6; const cw0 = 400; const ch0 = 230; const cw = cw0 * z; const ch = ch0 * z;
    const vues = VUES.filter(([v]) => existsSync(fichier(v, 'apres', 1280)) && r.vues?.[v]?.reperes?.length);
    const rangees = Math.ceil(vues.length / 2);
    const spec = { w: 2 * cw + 3 * pad, h: tete + rangees * (ch + 34) + pad, textes: [], images: [] };
    spec.textes.push({ s: 'Repère d’objectif : gros plans (1280 × 720, agrandis 1,6 fois)', x: pad, y: 28, f: '600 18px system-ui' });
    vues.forEach(([v, titre], j) => {
      const rp = r.vues[v].reperes[0];
      const x0 = Math.max(0, Math.min(1280 - cw0, rp.x - cw0 / 2));
      const y0 = Math.max(0, Math.min(720 - ch0, rp.y - ch0 * 0.45));
      const x = pad + (j % 2) * (cw + pad); const y = tete + Math.floor(j / 2) * (ch + 34);
      spec.textes.push({ s: titre, x, y: y + 20, f: '500 14px system-ui' });
      spec.images.push({ src: b64(fichier(v, 'apres', 1280)), src_r: [x0, y0, cw0, ch0], x, y: y + 28, w: cw, h: ch });
    });
    ecrit('planche-repere-details.png', await compose(spec));
  }
} finally {
  await br.close();
}
