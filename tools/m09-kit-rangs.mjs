// M09 V4 — traitement PAR SCRIPT du kit des quartiers en rangs (passe 66, ADR 028 « Quartiers en rangs »,
// `docs/M09_QUARTIERS_EN_RANGS.md`) : les 5 images générées du lot `2026-10-20-v4-rangs` (`tools/m09-lot-quai-3.mjs`,
// bruts dans `art-gen/` du dossier principal, ignoré par git) deviennent 5 planches du kit dans `public/decors/` :
//   - `rangs-frise-a.png`, `rangs-frise-b.png` : les deux rangées de maisons de ruelle détourées (fente entre deux maisons
//     refermée), ramenées à la même hauteur de porte et assemblées en deux frises de 65 m pieds alignés, dans deux ordres
//     différents (une copie en miroir) : fonds et flancs des rangs 2 à 4 ;
//   - `rangs-murs.png` : les trois murs de côté détourés, ramenés à une même case (8 m × 12,5 m au monde) ;
//   - `rangs-monuments.png` : les trois monuments détourés (bannières de la halle : emblème Ronce du jeu brodé par
//     script à la place de l'emblème inventé par le modèle) ;
//   - `rangs-mobilier.png` : les six objets détourés, à 100 px/m.
// Découpes (boîtes des panneaux et des objets, lanternes peintes) et échelles dans `art-src/decors/kit-rangs.json`, lu
// par l'assembleur du Quai en rangs (`tools/m09-profondeur-preuve.mjs`) ; une fiche de provenance par planche.
// Aucune retouche à la main. Usage : node tools/m09-kit-rangs.mjs
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch } from './browser.mjs';
import { atlasPanels, closeGaps, composeRow, findLanterns, fixBanners, processPlate, shadeSlots, splitPanels } from './m09-traitement-images.mjs';

const LOT = '2026-10-20-v4-rangs';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const RAW = join(main, 'art-gen', LOT);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Échelles (px de l'image brute par m au monde), tirées de la hauteur des portes peintes (≈ 2,6 m au monde, celle des
 * portes du Quai) : rangée A (portes ≈ 190 px) 72 px/m, rangée B (≈ 155 px) 62 px/m ; frises assemblées à 62 px/m
 * (65 m ≤ 4 096 px) ; murs : case de 8 × 12,5 m à 64 px/m ; mobilier : 100 px/m.
 */
const K = {
  densA: 72, densB: 62, densFrise: 62,
  murs: { longueur: 8, hauteur: 12.5, dens: 64, utile: 9 },
  // limites des maisons des deux rangées (px de l'image brute, mesurées sur l'image ; bords compris) : les façades
  // posées commencent et finissent à un mur mitoyen, jamais au milieu d'une maison (passe 67)
  maisons: { a: [20, 355, 583, 880, 1185, 1500], b: [38, 445, 690, 1150, 1486] },
  mobilier: { dens: 100, noms: [['puits', 'fontaine', 'etal'], ['banc', 'charrette', 'niche']] },
  monuments: ['halle', 'joueurs', 'chapelle'],
  murNoms: ['colombages', 'platre', 'pignon'],
  // bannières vertes de la halle : emblème inventé (une branche) remplacé par celui de la famille Ronce, brodé
  bannieres: [{ box: [49, 522, 96, 650], center: [72, 597], family: 'Ronce' }, { box: [595, 522, 641, 650], center: [618, 597], family: 'Ronce' }],
};

const prov = JSON.parse(readFileSync(join(RAW, 'provenance.json'), 'utf8'));
const gen = Object.fromEntries(prov.images.map((i) => [i.name, i]));
const rawFile = (name) => readFileSync(join(RAW, `${name}.png`));
const browser = await launch();
const pg = await (await browser.newContext()).newPage();
await pg.setContent('<!doctype html><html><body></body></html>');
const ev = (fn, arg) => pg.evaluate(fn, arg);
const report = { date: new Date().toISOString(), lot: LOT };

// rangées de maisons : détourées, recadrées sur le pied des murs, fente refermée
const ruelle = {};
for (const [k, name, dens] of [['a', 'rangs-ruelle-a', K.densA], ['b', 'rangs-ruelle-b', K.densB]]) {
  const p = await ev(processPlate, { url: dataUrl(rawFile(name)), crop: 'pied', maxLanterns: 0 });
  const g = await ev(closeGaps, { url: p.url, minRun: 2 });
  ruelle[k] = { url: g.url, size: g.size, worldW: r3(g.size[0] / dens), worldH: r3(g.size[1] / dens), removed: g.removed, crop: p.crop, spill: p.magentaSpill };
}
report.ruelles = Object.fromEntries(Object.entries(ruelle).map(([k, v]) => [k, { size: v.size, worldW: v.worldW, worldH: v.worldH, colonnesVidesRetirees: v.removed, recadrage: v.crop, debordMagenta: v.spill }]));
const frises = {
  a: [{ k: 'a' }, { k: 'b' }, { k: 'a', flip: true }],
  // B : le bout droit de la dernière rangée retiré (15 %) : 4 096 px au plus
  b: [{ k: 'b', flip: true }, { k: 'a', flip: true }, { k: 'b', cropR: 0.15 }],
};
const out = {};
const kit = { lot: LOT, frises: {}, murs: {}, monuments: {}, mobilier: {} };
for (const [id, parts] of Object.entries(frises)) {
  const r = await ev(composeRow, { parts: parts.map((p) => ({ url: ruelle[p.k].url, worldW: r3(ruelle[p.k].worldW * (1 - (p.cropR ?? 0))), flip: !!p.flip, cropR: p.cropR ?? 0 })), density: K.densFrise });
  const file = `rangs-frise-${id}.png`;
  out[file] = fromUrl(r.url);
  // limites des maisons au long de la frise (m) : celles de chaque rangée, retournées en miroir, sans le bout retiré
  const maisons = [];
  parts.forEach((p, i) => {
    const rg = ruelle[p.k]; const keep = 1 - (p.cropR ?? 0);
    for (const bx of K.maisons[p.k]) {
      const f = Math.min(1, Math.max(0, (bx - rg.crop.left) / rg.size[0]));
      if (f > keep + 1e-6) continue;
      const fl = p.flip ? keep - f : f;
      const m = r3(r.offsets[i].x / K.densFrise + (fl / keep) * (r.offsets[i].w / K.densFrise));
      if (!maisons.some((q) => Math.abs(q - m) < 0.1)) maisons.push(m);
    }
  });
  maisons.sort((u, v) => u - v);
  kit.frises[id] = { file, size: r.size, dens: K.densFrise, maisons, largeur: r3(r.size[0] / K.densFrise), hauteur: r3(r.size[1] / K.densFrise), parties: parts.map((p, i) => ({ rangee: p.k, miroir: !!p.flip, x0: r3(r.offsets[i].x / K.densFrise), largeur: r3(r.offsets[i].w / K.densFrise) })) };
}

// murs de côté : trois panneaux ramenés à la même case
{
  const p = await ev(processPlate, { url: dataUrl(rawFile('rangs-murs')), crop: 'contenu', maxLanterns: 0 });
  const s = await ev(splitPanels, { url: p.url, rows: 1, minGap: 6, count: 3 });
  const boxes = s.boxes[0];
  if (boxes.length !== 3) throw new Error(`murs : ${boxes.length} panneaux trouvés (3 attendus)`);
  const a = await ev(atlasPanels, { url: p.url, boxes, slotW: K.murs.longueur * K.murs.dens, slotH: K.murs.hauteur * K.murs.dens });
  // passe 67 : murs des passages et des places (colombages, plâtre) gardés sur leurs 9 m du bas, dans l'ombre du
  // passage (ils dépassaient des toits) ; pignon des bouts gardé entier, à peine assombri
  const cut = r3(1 - K.murs.utile / K.murs.hauteur);
  const sw = K.murs.longueur * K.murs.dens;
  const shaded = await ev(shadeSlots, { url: a.url, slots: [{ x0: 0, x1: sw, cut, fade: 26, dark: [0.8, 0.5] }, { x0: sw, x1: 2 * sw, cut, fade: 26, dark: [0.8, 0.5] }, { x0: 2 * sw, x1: 3 * sw, cut: 0, fade: 0, dark: [0.92, 0.72] }] });
  out['rangs-murs.png'] = fromUrl(shaded);
  kit.murs = { file: 'rangs-murs.png', size: a.size, longueur: K.murs.longueur, hauteur: K.murs.hauteur, panneaux: Object.fromEntries(K.murNoms.map((n, i) => [n, { uv: [r3(i / 3), n === 'pignon' ? 0 : cut, r3((i + 1) / 3), 1], hauteur: n === 'pignon' ? K.murs.hauteur : K.murs.utile, source: boxes[i] }])) };
  report.murs = { boxes, etirement: boxes.map(([x0, y0, x1, y1]) => r3(((K.murs.longueur * K.murs.dens) / (x1 - x0)) / ((K.murs.hauteur * K.murs.dens) / (y1 - y0)))) };
}

// monuments : emblèmes de la halle brodés, détourés, trois panneaux (uv dans l'image)
{
  const fixed = await ev(fixBanners, { url: dataUrl(rawFile('rangs-monuments')), banners: K.bannieres, brode: true });
  const p = await ev(processPlate, { url: fixed.url, crop: 'contenu', maxLanterns: 0 });
  const s = await ev(splitPanels, { url: p.url, rows: 1, minGap: 6, count: 3 });
  const boxes = s.boxes[0];
  if (boxes.length !== 3) throw new Error(`monuments : ${boxes.length} panneaux trouvés (3 attendus)`);
  out['rangs-monuments.png'] = fromUrl(p.url);
  const [W, H] = p.size;
  kit.monuments = { file: 'rangs-monuments.png', size: p.size, panneaux: Object.fromEntries(K.monuments.map((n, i) => { const [x0, y0, x1, y1] = boxes[i]; return [n, { box: boxes[i], uv: [r3(x0 / W), r3(y0 / H), r3(x1 / W), r3(y1 / H)], rapport: r3((y1 - y0) / (x1 - x0)) }]; })) };
  report.monuments = { bannieres: fixed.done, boxes };
}

// mobilier : six objets à 100 px/m, lanternes peintes repérées dans chacun
{
  const p = await ev(processPlate, { url: dataUrl(rawFile('rangs-mobilier')), crop: 'aucun', maxLanterns: 0 });
  const s = await ev(splitPanels, { url: p.url, rows: 2, minGap: 20, alphaMin: 0.5 });
  const flat = s.boxes.flat();
  if (s.boxes.length !== 2 || s.boxes.some((r) => r.length !== 3)) throw new Error(`mobilier : ${s.boxes.map((r) => r.length).join(' + ')} objets trouvés (3 + 3 attendus)`);
  const lan = await ev(findLanterns, { url: p.url, from: 0, max: 16 });
  out['rangs-mobilier.png'] = fromUrl(p.url);
  const [W, H] = p.size;
  const D = K.mobilier.dens;
  kit.mobilier = { file: 'rangs-mobilier.png', size: p.size, dens: D, objets: {} };
  K.mobilier.noms.flat().forEach((n, i) => {
    const [x0, y0, x1, y1] = flat[i];
    const lanternes = lan.filter((l) => l.x >= x0 && l.x < x1 && l.y >= y0 && l.y < y1).map((l) => [r3((l.x - (x0 + x1) / 2) / D), r3((y1 - l.y) / D)]);
    kit.mobilier.objets[n] = { box: flat[i], uv: [r3(x0 / W), r3(y0 / H), r3(x1 / W), r3(y1 / H)], largeur: r3((x1 - x0) / D), hauteur: r3((y1 - y0) / D), lanternes };
  });
  report.mobilier = { boxes: s.boxes, lanternes: lan.length };
}
await browser.close();

// sorties et fiches de provenance
const common = {
  statut: 'kit des quartiers en rangs (ADR 028, passe 66), NON APPROUVÉ par le responsable : refusé hors QA (approved: false) tant qu’il n’a pas décidé',
  auteur: 'Claude Code (session V4, passe 66), à la demande du responsable : « Oui, génère les 5 images du kit des rangs (tools/m09-lot-quai-3.mjs), traite-les par script et pose-les dans le Quai en quatre rangs. »',
  generation: 'tools/m09-generer-images.mjs (clé lue à l’exécution dans .env.local du dossier principal, jamais affichée ni écrite) ; spécification tools/m09-lot-quai-3.mjs',
  aseprite: 'non utilisé : traitement par scripts Node et canvas (tools/m09-traitement-images.mjs, tools/m09-kit-rangs.mjs)',
  licences: 'conditions d’OpenAI applicables aux sorties de l’API à la date de production ; aucune analyse juridique faite par l’agent : point à confirmer par le responsable avant tout usage en jeu',
  contenu: 'aucun texte, lettre, chiffre, signature, filigrane ni logo demandé ; aucune enseigne du jeu de cartes classique ; aucun nom d’artiste ni de franchise dans les prompts',
};
const src = (name) => {
  const i = gen[name];
  return { nom: name, modele: i.model, point_d_acces: i.endpoint, date: i.date, parametres: i.params, prompt: i.prompt, entrees: i.inputs.map((x) => ({ chemin: x.path, sha256: x.sha256 })), brut: { fichier: `art-gen/${LOT}/${i.file} (dossier principal, ignoré par git)`, sha256: i.output.sha256, dimensions: [i.output.width, i.output.height] }, usage_api: i.usage };
};
const CLE = 'fond magenta détouré (alpha tiré de l’écart au magenta, bords démêlés du fond)';
const fiches = {
  'rangs-frise-a': { sources: ['rangs-ruelle-a', 'rangs-ruelle-b'], etapes: [`${CLE}, recadré sur le pied des murs, pour chaque rangée`, 'rangée A : fente vide entre deux maisons refermée (colonnes vides retirées)', `ramenées à la même hauteur de porte (A : ${K.densA} px/m, B : ${K.densB} px/m) et assemblées pieds alignés à ${K.densFrise} px/m : A, B, A en miroir`] },
  'rangs-frise-b': { sources: ['rangs-ruelle-a', 'rangs-ruelle-b'], etapes: [`${CLE}, recadré sur le pied des murs, pour chaque rangée`, 'rangée A : fente vide entre deux maisons refermée (colonnes vides retirées)', `ramenées à la même hauteur de porte (A : ${K.densA} px/m, B : ${K.densB} px/m) et assemblées pieds alignés à ${K.densFrise} px/m : B en miroir, A en miroir, B sans son bout droit (15 %)`] },
  'rangs-murs': { sources: ['rangs-murs'], etapes: [`${CLE}, recadré sur le contenu`, 'trois panneaux séparés par les bandes vides', `chacun ramené à la même case (${K.murs.longueur} × ${K.murs.hauteur} m au monde, ${K.murs.dens} px/m), côte à côte`, `murs des passages et des places (colombages, plâtre) gardés sur leurs ${K.murs.utile} m du bas (fondu sous la coupe) et assombris de 20 % au pied à 50 % en haut (l’ombre du passage) ; pignon gardé entier, assombri de 8 à 28 %`] },
  'rangs-monuments': { sources: ['rangs-monuments'], etapes: ['emblème inventé par le modèle (une branche) remplacé sur les deux bannières vertes de la halle par celui de la famille Ronce, brodé en relief (fixBanners, tracés de src/art/emblems.ts), sur le brut, avant tout traitement', `${CLE}, recadré sur le contenu`, 'trois panneaux séparés par les bandes vides (boîtes dans kit-rangs.json)'] },
  'rangs-mobilier': { sources: ['rangs-mobilier'], etapes: [`${CLE}, sans recadrage`, 'six objets séparés par les bandes vides (deux rangées de trois ; boîtes et lanternes peintes dans kit-rangs.json)'] },
};
for (const [id, f] of Object.entries(fiches)) {
  const file = `${id}.png`;
  const buf = out[file];
  writeFileSync(`public/decors/${file}`, buf);
  const sources = f.sources.map(src);
  mkdirSync(`art-src/decors/${id}`, { recursive: true });
  writeFileSync(`art-src/decors/${id}/fiche.json`, `${JSON.stringify({ id, ...common, sources, traitement: { scripts: ['tools/m09-traitement-images.mjs', 'tools/m09-kit-rangs.mjs'], etapes: f.etapes, decoupes: 'art-src/decors/kit-rangs.json' }, sortie: { fichier: `public/decors/${file}`, sha256: sha(buf), octets: buf.length, dimensions: dim(buf) }, approved: false, chaine_des_empreintes: [...sources.map((s) => `${s.brut.sha256} (brut ${s.nom})`), `${sha(buf)} (planche)`] }, null, 2)}\n`);
}
for (const part of ['frises', 'murs', 'monuments', 'mobilier']) {
  const e = kit[part];
  for (const v of part === 'frises' ? Object.values(e) : [e]) { v.sha256 = sha(out[v.file]); v.fiche = `art-src/decors/${v.file.replace('.png', '')}/fiche.json`; }
}
writeFileSync('art-src/decors/kit-rangs.json', `${JSON.stringify(kit, null, 2)}\n`);
mkdirSync('artifacts/qa/m09', { recursive: true });
writeFileSync('artifacts/qa/m09/v4-kit-rangs.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`OK kit : ${Object.keys(out).map((f) => `${f} ${dim(out[f]).join('×')}`).join(', ')}`);
console.log(JSON.stringify({ ruelles: report.ruelles, murs: report.murs, monuments: report.monuments.boxes, mobilier: report.mobilier }));
