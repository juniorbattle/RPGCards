// M09, deuxième reprise (2026-10-25) — traitement PAR SCRIPT du **lot des quartiers ajoutés** (ADR 028, « Deuxième
// reprise » ; spécification `tools/m09-lot-quartiers.mjs`), même chaîne que le lot des villes (`tools/m09-kit-villes.mjs`) :
// les 4 images du lot `2026-10-25-quartiers` (bruts dans `art-gen/` du dossier principal, ignoré par git), générées sur
// l'ordre du responsable (« Fanal et Ville haute », 4 images au plus ; « attaque la Place du Fanal et la Ville haute »),
// deviennent 4 planches dans `public/decors/` : `quartiers-port-fanal.png`, `quartiers-port-ronce.png`,
// `quartiers-haute-hotels.png`, `quartiers-haute-observatoire.png` : façades d'identité détourées (fond magenta),
// recadrées sur le pied des murs ; emblèmes des familles du jeu brodés par script sur les bannières unies (`fixBanners`).
// Largeurs au monde et lanternes peintes dans `art-src/decors/kit-quartiers.json`, lu par l'assembleur de la ville en
// rangs (`tools/m09-quartiers-rangs.mjs`) ; une fiche de provenance par planche. Aucune retouche à la main.
// Usage : node tools/m09-kit-quartiers.mjs
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch } from './browser.mjs';
import { fixBanners, processPlate } from './m09-traitement-images.mjs';
import { approuve } from './m09-approbations.mjs';

const LOT = '2026-10-25-quartiers';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const RAW = join(main, 'art-gen', LOT);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Réglages mesurés sur les bruts (px de l'image brute) : largeur au monde de chaque façade (celle de sa place dans le
 * plan : entre les passages du rang 1, ou la largeur du monument d'identité au cœur) ; bannières unies (boîte intérieure,
 * famille brodée : la Ronce au Fanal, l'Astre dans la Ville haute).
 */
const ban = (box, family) => ({ box, center: [Math.round((box[0] + box[2]) / 2), Math.round(box[1] + (box[3] - box[1]) * 0.55)], family });
export const K = {
  facades: {
    'port-fanal': { largeur: 19.6, bannieres: [ban([102, 642, 160, 840], 'Ronce'), ban([1378, 642, 1438, 840], 'Ronce')] },
    'port-ronce': { largeur: 14, bannieres: [ban([552, 612, 604, 900], 'Ronce'), ban([932, 612, 986, 900], 'Ronce')] },
    'haute-hotels': { largeur: 19.6, bannieres: [ban([604, 400, 652, 660], 'Astre'), ban([902, 400, 950, 660], 'Astre')] },
    // bannières déjà peintes d'étoiles par le modèle : laissées telles quelles (point signalé au responsable)
    'haute-observatoire': { largeur: 16, bannieres: [] },
  },
};

const prov = JSON.parse(readFileSync(join(RAW, 'provenance.json'), 'utf8'));
const gen = Object.fromEntries(prov.images.map((i) => [i.name, i]));
const browser = await launch();
const pg = await (await browser.newContext()).newPage();
await pg.setContent('<!doctype html><html><body></body></html>');
const ev = (fn, arg) => pg.evaluate(fn, arg);
const report = { date: new Date().toISOString(), lot: LOT, facades: {} };
const out = {};
const kit = { lot: LOT, facades: {} };
try {
  for (const [name, f] of Object.entries(K.facades)) {
    const raw = readFileSync(join(RAW, `${name}.png`));
    const fixed = f.bannieres.length ? await ev(fixBanners, { url: dataUrl(raw), banners: f.bannieres, brode: true }) : { url: dataUrl(raw), done: [] };
    const p = await ev(processPlate, { url: fixed.url, crop: 'pied', maxLanterns: 6, lanternFrom: 0.3 });
    const file = `quartiers-${name}.png`;
    out[file] = fromUrl(p.url);
    const [W, H] = p.size;
    const m = f.largeur / W;
    const lanternes = p.lanterns.map((l) => [r3((l.x - W / 2) * m), r3((H - l.y) * m)]);
    kit.facades[name] = { file, size: p.size, uv: [0, 0, 1, 1], largeur: f.largeur, hauteur: r3(H * m), lanternes };
    report.facades[name] = { recadrage: p.crop, debordMagenta: p.magentaSpill, bannieres: fixed.done, lanternes: lanternes.length, densite: r3(W / f.largeur), hauteur: r3(H * m) };
  }
} finally {
  await browser.close();
}

const common = {
  auteur: 'Claude Code (session de la deuxième reprise de M09, passe 129), à la demande du responsable : « Fanal et Ville haute » (4 images au plus) ; « attaque la Place du Fanal et la Ville haute »',
  generation: 'tools/m09-generer-images.mjs (clé lue à l’exécution dans .env.local du dossier principal, jamais affichée ni écrite) ; spécification tools/m09-lot-quartiers.mjs',
  aseprite: 'non utilisé : traitement par scripts Node et canvas (tools/m09-traitement-images.mjs, tools/m09-kit-quartiers.mjs)',
  licences: 'conditions d’OpenAI applicables aux sorties de l’API à la date de production (usage en jeu permis : décision A2 du responsable, passe 97)',
  contenu: 'aucun texte, lettre, chiffre, signature, filigrane ni logo demandé ; aucune enseigne du jeu de cartes classique ; aucun nom d’artiste ni de franchise dans les prompts',
};
for (const [name, f] of Object.entries(K.facades)) {
  const id = `quartiers-${name}`;
  const file = `${id}.png`;
  const buf = out[file];
  writeFileSync(`public/decors/${file}`, buf);
  const i = gen[name];
  const s = { nom: name, modele: i.model, point_d_acces: i.endpoint, date: i.date, parametres: i.params, prompt: i.prompt, entrees: i.inputs.map((x) => ({ chemin: x.path, sha256: x.sha256 })), brut: { fichier: `art-gen/${LOT}/${i.file} (dossier principal, ignoré par git)`, sha256: i.output.sha256, dimensions: [i.output.width, i.output.height] }, usage_api: i.usage };
  const etapes = [
    ...(f.bannieres.length ? [`emblèmes des familles du jeu brodés en relief sur ${f.bannieres.length} bannière(s) unie(s) (fixBanners, tracés de src/art/emblems.ts), sur le brut, avant tout traitement`] : []),
    'fond magenta détouré (alpha tiré de l’écart au magenta, bords démêlés du fond), recadré sur le pied des murs',
    `largeur au monde ${f.largeur} m (lanternes peintes repérées : kit-quartiers.json)`,
  ];
  const approved = approuve(`public/decors/${file}`, sha(buf));
  mkdirSync(`art-src/decors/${id}`, { recursive: true });
  writeFileSync(`art-src/decors/${id}/fiche.json`, `${JSON.stringify({ id, statut: 'lot des quartiers ajoutés (ADR 028, deuxième reprise de M09, passe 129), NON APPROUVÉ par le responsable : refusé hors QA (approved: false) tant qu’il n’a pas décidé', ...common, sources: [s], traitement: { scripts: ['tools/m09-traitement-images.mjs', 'tools/m09-kit-quartiers.mjs'], etapes, decoupes: 'art-src/decors/kit-quartiers.json' }, sortie: { fichier: `public/decors/${file}`, sha256: sha(buf), octets: buf.length, dimensions: dim(buf) }, approved, chaine_des_empreintes: [`${s.brut.sha256} (brut ${s.nom})`, `${sha(buf)} (planche)`] }, null, 2)}\n`);
  kit.facades[name].sha256 = sha(buf);
  kit.facades[name].fiche = `art-src/decors/${id}/fiche.json`;
}
writeFileSync('art-src/decors/kit-quartiers.json', `${JSON.stringify(kit, null, 2)}\n`);
mkdirSync('artifacts/qa/m09', { recursive: true });
writeFileSync('artifacts/qa/m09/kit-quartiers.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`OK lot des quartiers : ${Object.keys(out).map((f) => `${f} ${dim(out[f]).join('×')} (${Math.round(out[f].length / 1024)} Ko)`).join(', ')}`);
console.log(JSON.stringify(report));
