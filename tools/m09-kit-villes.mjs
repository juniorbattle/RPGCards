// M09 (reprise) — traitement PAR SCRIPT du **lot des villes** (ADR 028, « Reprise de M09 » ; `tools/m09-lot-villes-4.mjs`) :
// les 6 images générées du lot `2026-10-20-v4-villes` (bruts dans `art-gen/` du dossier principal, ignoré par git),
// générées après l'accord du responsable (« Oui, génère le lot des villes (6 images, tools/m09-lot-villes-4.mjs) et la
// feuille J1 (1 image, la réserve seulement si besoin, tools/m09-lot-joueur-j1.mjs), traite-les par script et
// pose-les. »), deviennent 6 planches dans `public/decors/` :
//   - `villes-parvis-porte.png`, `villes-parvis-arene.png`, `villes-ruelles-canal.png`, `villes-ruelles-guilde.png`,
//     `villes-cour-facades.png` : façades d'identité détourées (fond magenta), recadrées sur le pied des murs ; emblèmes
//     des familles du jeu brodés par script sur les bannières unies (`fixBanners`) ;
//   - `villes-objets.png` : les six objets détourés (monument, estrade, balustrade, brasero, kiosque, tableau).
// Découpes, largeurs au monde, lanternes peintes et hauteur de la terrasse sous la balustrade dans
// `art-src/decors/kit-villes.json`, lu par l'assembleur de la ville en rangs (`tools/m09-quartiers-rangs.mjs`) ; une fiche
// de provenance par planche. Aucune retouche à la main. Usage : node tools/m09-kit-villes.mjs
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch } from './browser.mjs';
import { closeGaps, findLanterns, fixBanners, processPlate, splitPanels } from './m09-traitement-images.mjs';

const LOT = '2026-10-20-v4-villes';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const RAW = join(main, 'art-gen', LOT);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Réglages mesurés sur les bruts (px de l'image brute) : largeur au monde de chaque façade (celle de sa place dans le plan,
 * ou tirée de la hauteur de ses portes peintes : `dens` px/m) ; bannières unies (boîte intérieure, famille brodée) ;
 * objets : densité (une personne ≈ 110 px dans le prompt : ≈ 65 px/m) et noms dans l'ordre de la grille ; balustrade :
 * part sous le sol de la terrasse (`solBalustrade` : rangée du pied des balustres ; `sous` = du pied du mur à cette rangée).
 */
const ban = (box, family) => ({ box, center: [Math.round((box[0] + box[2]) / 2), Math.round(box[1] + (box[3] - box[1]) * 0.55)], family });
const K = {
  facades: {
    // les quatre bannières unies du pavillon, aux couleurs des familles : Cendre, Voile, Ronce, Astre
    'parvis-porte': { largeur: 21.2, bannieres: [ban([372, 330, 442, 575], 'Cendre'), ban([584, 330, 652, 565], 'Voile'), ban([870, 330, 938, 585], 'Ronce'), ban([1088, 330, 1158, 595], 'Astre')] },
    // fanions et petites bannières de l'arène : laissés unis (trop étroits pour un emblème lisible)
    'parvis-arene': { largeur: 30, bannieres: [] },
    // portes peintes ≈ 170 px pour 2,6 m : 65 px/m ; les deux bannières de la maison de la Fontaine (le Voile)
    'ruelles-canal': { dens: 65, fermer: true, bannieres: [ban([806, 360, 842, 650], 'Voile'), ban([974, 360, 1010, 650], 'Voile')] },
    'ruelles-guilde': { largeur: 14, bannieres: [ban([424, 485, 490, 800], 'Voile'), ban([1071, 485, 1131, 800], 'Voile')] },
    'cour-facades': { largeur: 25.6, bannieres: [ban([594, 615, 650, 745], 'Cendre'), ban([692, 615, 746, 745], 'Voile'), ban([787, 615, 840, 745], 'Ronce'), ban([884, 615, 940, 745], 'Astre')] },
  },
  // balustrade : le sol de la terrasse (pied des balustres, haut du mur de soutènement) à la rangée 372 du brut
  objets: { dens: 65, noms: [['monument', 'estrade', 'balustrade'], ['brasero', 'kiosque', 'tableau']], solBalustrade: 372, feu: ['brasero'] },
};

const prov = JSON.parse(readFileSync(join(RAW, 'provenance.json'), 'utf8'));
const gen = Object.fromEntries(prov.images.map((i) => [i.name, i]));
const rawFile = (name) => readFileSync(join(RAW, `${name}.png`));
const browser = await launch();
const pg = await (await browser.newContext()).newPage();
await pg.setContent('<!doctype html><html><body></body></html>');
const ev = (fn, arg) => pg.evaluate(fn, arg);

/** Dans la page : colonnes [x0, x1) où la rangée `y` d'une image détourée est opaque (alpha > 0,9), entre `c0` et `c1`. */
async function opaqueSpan({ url, y, c0, c1 }) {
  const i = new Image(); i.src = url; await i.decode();
  const c = new OffscreenCanvas(i.width, i.height); const g = c.getContext('2d'); g.drawImage(i, 0, 0);
  const d = g.getImageData(0, y, i.width, 1).data;
  let x0 = -1; let x1 = -1;
  for (let x = c0; x < c1; x++) if (d[x * 4 + 3] > 230) { if (x0 < 0) x0 = x; x1 = x + 1; }
  return [x0, x1];
}
const report = { date: new Date().toISOString(), lot: LOT, facades: {} };
const out = {};
const kit = { lot: LOT, facades: {}, objets: {} };

// façades d'identité : bannières brodées sur le brut, détourées, recadrées sur le pied des murs
for (const [name, f] of Object.entries(K.facades)) {
  const fixed = f.bannieres.length ? await ev(fixBanners, { url: dataUrl(rawFile(name)), banners: f.bannieres, brode: true }) : { url: dataUrl(rawFile(name)), done: [] };
  let p = await ev(processPlate, { url: fixed.url, crop: 'pied', maxLanterns: 6, lanternFrom: 0.3 });
  if (f.fermer) { const gq = await ev(closeGaps, { url: p.url, minRun: 2 }); p = { ...p, url: gq.url, size: gq.size }; }
  const file = `villes-${name}.png`;
  out[file] = fromUrl(p.url);
  const [W, H] = p.size;
  const largeur = r3(f.largeur ?? W / f.dens);
  const m = largeur / W;
  // lanternes peintes : (x depuis le milieu, y depuis le pied) en m
  const lanternes = p.lanterns.map((l) => [r3((l.x - W / 2) * m), r3((H - l.y) * m)]);
  kit.facades[name] = { file, size: p.size, uv: [0, 0, 1, 1], largeur, hauteur: r3(H * m), lanternes };
  report.facades[name] = { recadrage: p.crop, debordMagenta: p.magentaSpill, bannieres: fixed.done, lanternes: lanternes.length, densite: r3(W / largeur) };
}

// objets : six objets, grille de 3 × 2, à `dens` px/m
{
  const p = await ev(processPlate, { url: dataUrl(rawFile('villes-objets')), crop: 'aucun', maxLanterns: 0 });
  const s = await ev(splitPanels, { url: p.url, rows: 2, minGap: 20, alphaMin: 0.5 });
  if (s.boxes.length !== 2 || s.boxes.some((r) => r.length !== 3)) throw new Error(`objets : ${s.boxes.map((r) => r.length).join(' + ')} trouvés (3 + 3 attendus)`);
  const flat = s.boxes.flat();
  const lan = await ev(findLanterns, { url: p.url, from: 0, max: 24 });
  out['villes-objets.png'] = fromUrl(p.url);
  const [W, H] = p.size;
  const D = K.objets.dens;
  kit.objets = { file: 'villes-objets.png', size: p.size, dens: D };
  K.objets.noms.flat().forEach((n, i) => {
    const [x0, y0, x1, y1] = flat[i];
    const feu = K.objets.feu.includes(n);
    const lanternes = lan.filter((l) => l.x >= x0 && l.x < x1 && l.y >= y0 && l.y < y1).map((l) => [r3((l.x - (x0 + x1) / 2) / D), r3((y1 - l.y) / D), ...(feu ? ['Cendre'] : [])]);
    kit.objets[n] = { box: flat[i], uv: [r3(x0 / W), r3(y0 / H), r3(x1 / W), r3(y1 / H)], largeur: r3((x1 - x0) / D), hauteur: r3((y1 - y0) / D), lanternes, ...(n === 'balustrade' ? { sous: r3((y1 - K.objets.solBalustrade) / D) } : {}) };
  });
  // balustrade : recadrée en largeur sur son mur de soutènement (rangée opaque sous le sol de la terrasse) : posée en
  // segments bout à bout, sans fente ni marge transparente entre deux segments
  {
    const b = kit.objets.balustrade; const [x0, y0, x1, y1] = b.box;
    const [m0, m1] = await ev(opaqueSpan, { url: p.url, y: Math.round((K.objets.solBalustrade + y1) / 2), c0: x0, c1: x1 });
    Object.assign(b, { box: [m0, y0, m1, y1], uv: [r3(m0 / W), b.uv[1], r3(m1 / W), b.uv[3]], largeur: r3((m1 - m0) / D), lanternes: b.lanternes.map(([lx, ly]) => [r3(lx + ((x0 + x1) / 2 - (m0 + m1) / 2) / D), ly]) });
    report.balustrade = { mur: [m0, m1] };
  }
  report.objets = { boxes: s.boxes, lanternes: lan.length };
}
await browser.close();

// sorties et fiches de provenance
const common = {
  statut: 'lot des villes (ADR 028, reprise de M09, passe 94), NON APPROUVÉ par le responsable : refusé hors QA (approved: false) tant qu’il n’a pas décidé',
  auteur: 'Claude Code (session de reprise de M09, passe 94), à la demande du responsable : « Oui, génère le lot des villes (6 images, tools/m09-lot-villes-4.mjs) et la feuille J1 (1 image, la réserve seulement si besoin, tools/m09-lot-joueur-j1.mjs), traite-les par script et pose-les. »',
  generation: 'tools/m09-generer-images.mjs (clé lue à l’exécution dans .env.local du dossier principal, jamais affichée ni écrite) ; spécification tools/m09-lot-villes-4.mjs',
  aseprite: 'non utilisé : traitement par scripts Node et canvas (tools/m09-traitement-images.mjs, tools/m09-kit-villes.mjs)',
  licences: 'conditions d’OpenAI applicables aux sorties de l’API à la date de production ; aucune analyse juridique faite par l’agent : point à confirmer par le responsable (A2) avant tout usage en jeu',
  contenu: 'aucun texte, lettre, chiffre, signature, filigrane ni logo demandé ; aucune enseigne du jeu de cartes classique ; aucun nom d’artiste ni de franchise dans les prompts',
};
const src = (name) => {
  const i = gen[name];
  return { nom: name, modele: i.model, point_d_acces: i.endpoint, date: i.date, parametres: i.params, prompt: i.prompt, entrees: i.inputs.map((x) => ({ chemin: x.path, sha256: x.sha256 })), brut: { fichier: `art-gen/${LOT}/${i.file} (dossier principal, ignoré par git)`, sha256: i.output.sha256, dimensions: [i.output.width, i.output.height] }, usage_api: i.usage };
};
const CLE = 'fond magenta détouré (alpha tiré de l’écart au magenta, bords démêlés du fond)';
const fiches = Object.fromEntries([
  ...Object.entries(K.facades).map(([name, f]) => [`villes-${name}`, { source: name, etapes: [
    ...(f.bannieres.length ? [`emblèmes des familles du jeu brodés en relief sur ${f.bannieres.length} bannière(s) unie(s) (fixBanners, tracés de src/art/emblems.ts), sur le brut, avant tout traitement`] : []),
    `${CLE}, recadré sur le pied des murs`, ...(f.fermer ? ['fentes vides entre deux maisons refermées (colonnes vides retirées)'] : []),
    `largeur au monde ${kit.facades[name].largeur} m (lanternes peintes repérées : kit-villes.json)`] }]),
  ['villes-objets', { source: 'villes-objets', etapes: [`${CLE}, sans recadrage`, `six objets séparés par les bandes vides (deux rangées de trois ; boîtes, lanternes et feux dans kit-villes.json), à ${K.objets.dens} px/m`] }],
]);
for (const [id, f] of Object.entries(fiches)) {
  const file = `${id}.png`;
  const buf = out[file];
  writeFileSync(`public/decors/${file}`, buf);
  const s = src(f.source);
  mkdirSync(`art-src/decors/${id}`, { recursive: true });
  writeFileSync(`art-src/decors/${id}/fiche.json`, `${JSON.stringify({ id, ...common, sources: [s], traitement: { scripts: ['tools/m09-traitement-images.mjs', 'tools/m09-kit-villes.mjs'], etapes: f.etapes, decoupes: 'art-src/decors/kit-villes.json' }, sortie: { fichier: `public/decors/${file}`, sha256: sha(buf), octets: buf.length, dimensions: dim(buf) }, approved: false, chaine_des_empreintes: [`${s.brut.sha256} (brut ${s.nom})`, `${sha(buf)} (planche)`] }, null, 2)}\n`);
}
for (const v of [...Object.values(kit.facades), kit.objets]) { v.sha256 = sha(out[v.file]); v.fiche = `art-src/decors/${v.file.replace('.png', '')}/fiche.json`; }
writeFileSync('art-src/decors/kit-villes.json', `${JSON.stringify(kit, null, 2)}\n`);
mkdirSync('artifacts/qa/m09', { recursive: true });
writeFileSync('artifacts/qa/m09/kit-villes.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`OK lot des villes : ${Object.keys(out).map((f) => `${f} ${dim(out[f]).join('×')} (${Math.round(out[f].length / 1024)} Ko)`).join(', ')}`);
console.log(JSON.stringify(report));
