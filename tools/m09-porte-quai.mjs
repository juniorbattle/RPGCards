// M09 V4 — porte du Quai (ADR 028) : assemblage PAR SCRIPTS du diorama du Quai et de la feuille du duelliste joueur à
// partir des images générées (gpt-image-2 ; bruts dans `art-gen/` du dossier principal, ignoré par git), puis
// vérification in situ.
//   assembler : traite chaque brut (`m09-traitement-images.mjs`), assemble sept plans posés sur le plan pur du Quai
//               (ciel et ville haute ; second rang ; façades de la rue entière : ouest + centre de l'essai + est ;
//               pied des façades : étal, caisses, tonneaux ; rue : lampadaires, bornes, filets ; premier plan : ouest +
//               est ; eau couchée), pose une lumière du moteur sur chaque lanterne peinte repérée, écrit les plans dans
//               `public/decors/` et la feuille du joueur dans `public/sprites/` avec leurs manifestes (`approved:
//               false` : refusés hors QA tant que le responsable n'a pas décidé) et les fiches de provenance
//               `art-src/decors/<id>/fiche.json`, `art-src/sprites/player/fiche.json`.
//   verifier  : sur le build (`npm run build` avant), captures in situ : Quai actuel (`decors=code&sprites=code`),
//               politique du jeu (`decors=approuvees&sprites=approuvees` : doit rester le Quai actuel), porte (`?qa=1`) ;
//               plusieurs positions, 1920 × 1080 et 1280 × 720, cadrage de l'URL (`LQV_RIG`) ; planche
//               référence | actuel | porte ; rapports du décor et des feuilles.
//   planche   : planche de décision (build requis) : référence | Quai actuel (direction D) | porte (cadrage actuel) ;
//               porte en cadrage élargi | même cadrage avec les lumières du diorama aux couleurs des familles, comme la
//               direction D (variante A3, copie temporaire du build) | détail des bannières (direction D, porte) ;
//               les décisions à prendre écrites dessous.
// Usage : node tools/m09-porte-quai.mjs assembler [rapport.json]
//         npm run build && node tools/m09-porte-quai.mjs verifier [captures] [rapport.json]
//         npm run build && node tools/m09-porte-quai.mjs planche [planche.png] [rapport.json]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { clearAbove, composeRow, composeStrip, extractProps, findLanterns, fixBanners, processPlate, processSheet } from './m09-traitement-images.mjs';

const MODE = process.argv[2];
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const RAW = join(main, 'art-gen', '2026-10-20-v4-quai');
const RAW_ESSAI = join(main, 'art-gen', '2026-10-19-v4-essai');
const head = execSync('git rev-parse --short HEAD').toString().trim();
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const r2 = (x) => Math.round(x * 100) / 100;
const browser = await launch();
const report = { date: new Date().toISOString(), commit: head, mode: MODE, checks: [], console: [] };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const page = async (w, h) => {
  const p = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  p.setDefaultTimeout(120000);
  watchConsole(p, report.console);
  return p;
};

/**
 * Pose au monde (m) des plans du Quai, d'après le plan pur (`quai.ts`) : façades de x −24 à 24 au pied des façades
 * (z −3), dont la façade centrale de l'essai de x −10,6 à 11,2 ; accessoires aux emplacements du plan (étal, caisses,
 * tonneaux, filets, lampadaires, bornes) ; premier plan devant le bord du quai (z 3,8), le haut du mur à fleur de rue.
 */
const L = {
  density: 68,
  ciel: { z: -60, width: 130, bottom: -38 },
  second: { z: -14, width: 56 },
  facades: { z: -3, parts: [['ouest', 13.4], ['centre', 21.8], ['est', 12.8]] },
  pied: { z: -2.3, height: 5, etal: { x: 2.1, w: 3.4 }, items: [['caisses', -18.0], ['tonneaux', -10.5], ['caisses', 12.7]] },
  rue: { z: 2.95, height: 5, lampH: 4.3, lamps: [-13, -4, 5, 14], bollards: [-12, -2.6, 6.4, 15.5], filets: 18.2 },
  // l'image est reprend à sa gauche le bout de l'image ouest (lanterne, caisses, bannière) : ce début est retiré
  premier: { z: 3.8, halfW: 24.6, cropEst: 0.18, overlap: 0.6, wallTopY: 0.05 },
  // mur du quai plus haut que le décor par code (comme la référence) : l'eau plus bas, le mur peint visible
  eau: { y: -2.6, z: 20, width: 64 },
};
const PROPS = ['lampadaire', 'borne', 'caisses', 'tonneaux', 'filets'];
/**
 * Bannières à emblème inventé par le modèle, sur les bruts (boîte intérieure du tissu en px de l'image brute, mesurée
 * sur l'image ; centre de l'emblème ; famille) : les emblèmes du jeu y sont posés par script (`fixBanners`). La
 * bannière posée sur le mur du quai, dont seul le bas reste visible, est rendue unie.
 */
const BANNIERES = {
  'quai-facades-essai': [
    { box: [100, 400, 176, 576], center: [138, 482], family: 'Cendre' },
    { box: [220, 400, 293, 576], center: [256, 482], family: 'Voile' },
    { box: [344, 400, 416, 600], center: [380, 482], family: 'Ronce' },
    { box: [466, 400, 539, 576], center: [502, 482], family: 'Astre' },
  ],
  'quai-second-rang': [
    { box: [18, 642, 65, 735], center: [41, 686], family: 'Voile' },
    { box: [126, 642, 175, 735], center: [150, 690], family: 'Astre' },
    { box: [762, 548, 799, 655], center: [780, 596], family: 'Ronce' },
    { box: [1320, 562, 1364, 700], center: [1342, 615], family: 'Cendre' },
  ],
  'quai-premier-plan-ouest': [
    { box: [218, 150, 316, 400], center: [268, 266], family: 'Astre' },
    { box: [1362, 575, 1444, 722], family: null },
  ],
};

if (MODE === 'assembler') {
  const OUT = process.argv[3] ?? 'artifacts/qa/m09/v4-porte-assemblage.json';
  const prov = JSON.parse(readFileSync(join(RAW, 'provenance.json'), 'utf8'));
  const provEssai = JSON.parse(readFileSync(join(RAW_ESSAI, 'provenance.json'), 'utf8'));
  const gen = Object.fromEntries([...provEssai.images, ...prov.images].map((i) => [i.name, i]));
  const rawFile = (name) => readFileSync(join(name === 'quai-facades-essai' || name === 'player-pixel-essai' ? RAW_ESSAI : RAW, `${name}.png`));
  const p = await page(800, 600);
  await p.setContent('<!doctype html><html><body></body></html>');
  const ev = (fn, arg) => p.evaluate(fn, arg);
  // emblèmes du jeu posés sur les bannières des bruts, avant tout traitement (passe 59)
  const fixed = {};
  report.bannieres = {};
  for (const [name, banners] of Object.entries(BANNIERES)) {
    const r = await ev(fixBanners, { url: dataUrl(rawFile(name)), banners });
    fixed[name] = fromUrl(r.url);
    report.bannieres[name] = r.done;
    mkdirSync('artifacts/qa/tmp', { recursive: true });
    writeFileSync(join('artifacts/qa/tmp', `v4-bannieres-${name}.png`), fixed[name]);
  }
  const raw = (name) => fixed[name] ?? rawFile(name);
  const D = L.density;
  // ---- traitement de chaque brut ------------------------------------------------------------------------------------
  const ciel = await ev(processPlate, { url: dataUrl(raw('quai-ciel-ville-haute')), key: 'aucun', crop: 'aucun', maxLanterns: 0 });
  const second = await ev(processPlate, { url: dataUrl(raw('quai-second-rang')), crop: 'pied', maxLanterns: 0 });
  const fac = {
    ouest: await ev(processPlate, { url: dataUrl(raw('quai-facades-ouest')), crop: 'pied' }),
    centre: await ev(processPlate, dataUrl(raw('quai-facades-essai'))),
    est: await ev(processPlate, { url: dataUrl(raw('quai-facades-est')), crop: 'pied' }),
  };
  const etal = await ev(processPlate, { url: dataUrl(raw('quai-etal')), crop: 'contenu', lanternFrom: 0, maxLanterns: 2 });
  const props = await ev(extractProps, dataUrl(raw('quai-accessoires')));
  const ppO = await ev(processPlate, { url: dataUrl(raw('quai-premier-plan-ouest')), crop: 'aucun', maxLanterns: 0 });
  const ppE = await ev(processPlate, { url: dataUrl(raw('quai-premier-plan-est')), crop: 'aucun', maxLanterns: 0 });
  const eau = await ev(processPlate, { url: dataUrl(raw('quai-eau')), key: 'aucun', crop: 'aucun', maxLanterns: 0 });
  const sheet = await ev(processSheet, { url: dataUrl(raw('player-pixel')), figures: true, levels: 'kmeans' });
  const strip = (x) => { const { url, ...rest } = x; return rest; };
  report.traitement = { ciel: strip(ciel), second: strip(second), facades: Object.fromEntries(Object.entries(fac).map(([k, v]) => [k, strip(v)])), etal: strip(etal), premierOuest: strip(ppO), premierEst: strip(ppE), eau: strip(eau) };
  report.accessoires = { size: props.size, objets: props.objects.map((o, k) => ({ nom: PROPS[k] ?? `objet ${k + 1}`, box: o.box, pixels: o.pixels })), ignores: props.ignored };
  check(props.objects.length === PROPS.length, `accessoires : ${props.objects.length} objets découpés (${PROPS.length} attendus : ${PROPS.join(', ')}), ${props.ignored} taches écartées`);
  const lamp = props.objects[0];
  check(lamp && lamp.box[3] / lamp.box[2] > 2, `accessoires : le premier objet est le lampadaire, haut et étroit (${lamp?.box.join(' × ')})`);
  // échelle de la planche d'accessoires : le lampadaire mesure L.rue.lampH m
  const sPx = lamp.box[3] / L.rue.lampH;
  const hOf = (k) => props.objects[k].box[3] / sPx;
  // ---- assemblage ---------------------------------------------------------------------------------------------------
  const facades = await ev(composeRow, { parts: L.facades.parts.map(([k, w]) => ({ url: fac[k].url, worldW: w })), density: D });
  const pied = await ev(composeStrip, {
    widthM: 48, heightM: L.pied.height, density: D,
    items: [
      { name: 'étal', url: etal.url, x: L.pied.etal.x, h: (etal.size[1] / etal.size[0]) * L.pied.etal.w },
      ...L.pied.items.map(([n, x]) => ({ name: n, url: props.objects[PROPS.indexOf(n)].url, x, h: hOf(PROPS.indexOf(n)) })),
    ],
  });
  const rue = await ev(composeStrip, {
    widthM: 48, heightM: L.rue.height, density: D,
    items: [
      ...L.rue.lamps.map((x) => ({ name: 'lampadaire', url: props.objects[0].url, x, h: L.rue.lampH })),
      ...L.rue.bollards.map((x) => ({ name: 'borne', url: props.objects[1].url, x, h: hOf(1) })),
      { name: 'filets', url: props.objects[4].url, x: L.rue.filets, h: hOf(4) },
    ],
  });
  const premierBrut = await ev(composeRow, { parts: [{ url: ppO.url, worldW: L.premier.halfW }, { url: ppE.url, worldW: L.premier.halfW * (1 - L.premier.cropEst), cropL: L.premier.cropEst }], density: 1536 / L.premier.halfW, overlap: L.premier.overlap });
  // au-dessus du mur, seuls les mâts et gréements (reliés au haut de l'image) restent : les objets posés sur le mur
  // seraient devant la rue
  const premierNet = await ev(clearAbove, { url: premierBrut.url, row: premierBrut.fullTop, topFrac: 0.15 });
  const premier = { ...premierBrut, url: premierNet.url };
  report.premierNettoye = { cleared: premierNet.cleared, components: premierNet.components, kept: premierNet.kept };
  const lanternRue = await ev(findLanterns, { url: rue.url, from: 0, max: 4 });
  // ---- pose au monde ------------------------------------------------------------------------------------------------
  const H = (img, widthM) => widthM * (img.size[1] / img.size[0]);
  const premierW = L.premier.halfW * (2 - L.premier.cropEst) - L.premier.overlap;
  const premierH = H(premier, premierW);
  const wallFrac = premier.fullTop >= 0 ? (premier.size[1] - premier.fullTop) / premier.size[1] : 0.2;
  const toWorld = (img, widthM, x0, l, z, dy = 0) => ({ at: [r2(x0 + (l.x / img.size[0]) * widthM), r2(dy + ((img.size[1] - l.y) / img.size[1]) * H(img, widthM)), z] });
  const facLights = L.facades.parts.flatMap(([k], i) => {
    const o = facades.offsets[i];
    return fac[k].lanterns.map((l) => ({ x: o.x + (l.x / fac[k].size[0]) * o.w, y: o.y + (l.y / fac[k].size[1]) * o.h, area: l.area }));
  }).sort((a, b) => b.area - a.area).slice(0, 9).map((l) => toWorld(facades, 48, -24, l, L.facades.z + 0.6));
  // lanternes de l'étal : repérées sur son image, reportées à sa place dans la bande du pied des façades
  const stall = pied.placed.find((x) => x.name === 'étal');
  const stallLights = etal.lanterns.map((l) => toWorld(pied, 48, -24, { x: stall.x + (l.x / etal.size[0]) * stall.w, y: stall.y + (l.y / etal.size[1]) * stall.h }, L.pied.z + 0.5));
  const lights = [
    ...lanternRue.map((l) => ({ ...toWorld(rue, 48, -24, l, L.rue.z + 0.1), color: 'Astre', intensity: 3.2, radius: 10, halo: 2.0, flicker: 'lantern' })),
    ...stallLights.map((l) => ({ ...l, color: 'ambre', intensity: 2.6, radius: 7, halo: 1.0, flicker: 'lantern' })),
    ...facLights.map((l) => ({ ...l, color: 'ambre', intensity: 2.0, radius: 6, halo: 0.9, flicker: 'lantern' })),
  ].slice(0, 16);
  const files = {
    'quai-ciel.png': fromUrl(ciel.url), 'quai-second-rang.png': fromUrl(second.url), 'quai-facades.png': fromUrl(facades.url), 'quai-pied-facades.png': fromUrl(pied.url),
    'quai-rue.png': fromUrl(rue.url), 'quai-premier-plan.png': fromUrl(premier.url), 'quai-eau.png': fromUrl(eau.url),
  };
  const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
  const SRC = 'gpt-image-2 (porte du Quai, ADR 028), traité et assemblé par script (tools/m09-porte-quai.mjs)';
  const plate = (file, id, o) => ({ file, sha256: sha(files[file]), size: dim(files[file]), source: SRC, fiche: `art-src/decors/${id}/fiche.json`, approved: false, ...o });
  const quai = {
    plans: {
      ciel: plate('quai-ciel.png', 'quai-ciel', { at: [0, L.ciel.bottom, L.ciel.z], width: L.ciel.width, orient: 'face', order: 0, blend: 'fondu', fog: 0 }),
      'second-rang': plate('quai-second-rang.png', 'quai-second-rang', { at: [0, 0, L.second.z], width: L.second.width, orient: 'face', order: 1, blend: 'decoupe', fog: 0.6 }),
      facades: plate('quai-facades.png', 'quai-facades', { at: [0, 0, L.facades.z], width: 48, orient: 'face', order: 2, blend: 'decoupe', lit: 0.25 }),
      'pied-facades': plate('quai-pied-facades.png', 'quai-pied-facades', { at: [0, 0, L.pied.z], width: 48, orient: 'face', order: 3, blend: 'decoupe', lit: 0.3 }),
      rue: plate('quai-rue.png', 'quai-rue', { at: [0, 0, L.rue.z], width: 48, orient: 'face', order: 4, blend: 'decoupe', lit: 0.2 }),
      'premier-plan': plate('quai-premier-plan.png', 'quai-premier-plan', { at: [0, r2(L.premier.wallTopY - wallFrac * premierH), L.premier.z], width: r2(premierW), orient: 'face', order: 5, blend: 'decoupe' }),
      eau: plate('quai-eau.png', 'quai-eau', { at: [0, L.eau.y, L.eau.z], width: L.eau.width, orient: 'sol', order: 6, blend: 'decoupe' }),
    },
    lumieres: lights,
  };
  mkdirSync('public/decors', { recursive: true });
  for (const [f, b] of Object.entries(files)) writeFileSync(join('public/decors', f), b);
  writeFileSync('public/decors/manifest.json', `${JSON.stringify({ version: 1, ilots: { quai } }, null, 2)}\n`);
  // feuille du joueur (contrat v3)
  const k3 = fromUrl(sheet.K3);
  writeFileSync('public/sprites/player.png', k3);
  const playerEntry = {
    file: 'player.png', sha256: sha(k3), cell: sheet.cell, cols: 5, rows: 3, pixel: true, scale: 3, anchor: sheet.anchor, figureH: sheet.figureH,
    recolor: ['tenue', 'accent'], source: 'gpt-image-2 (porte du Quai, ADR 028), grille d’art, alignement, palette et tons clés par script (tools/m09-porte-quai.mjs)',
    fiche: 'art-src/sprites/player/fiche.json', approved: false,
  };
  writeFileSync('public/sprites/manifest.json', `${JSON.stringify({ version: 3, sprites: { player: playerEntry } }, null, 2)}\n`);
  const { K1: _k1, K3: _k3, ...sheetInfo } = sheet;
  report.feuille = { ...sheetInfo, x3: { sha256: sha(k3), bytes: k3.length } };
  report.plans = Object.fromEntries(Object.entries(quai.plans).map(([k, v]) => [k, { ...v, bytes: files[v.file].length }]));
  report.lumieres = lights;
  report.assemblage = { facades: { size: facades.size, offsets: facades.offsets }, pied: { size: pied.size, placed: pied.placed }, rue: { size: rue.size, placed: rue.placed }, premier: { size: premier.size, offsets: premier.offsets, fullTop: premier.fullTop, wallFrac: r2(wallFrac), heightM: r2(premierH) } };
  // ---- fiches de provenance -----------------------------------------------------------------------------------------
  const common = {
    statut: 'porte du Quai (ADR 028), NON APPROUVÉ par le responsable : refusé hors QA (approved: false) tant qu’il n’a pas décidé',
    auteur: 'Claude Code (session V4, passe 57), à la demande du responsable : « Je valide la direction de l’essai. Prépare le lot suivant (plans du Quai et feuille complète du joueur) et annonce-moi ses images et leurs prompts avant de générer. »',
    generation: 'tools/m09-generer-images.mjs (clé lue à l’exécution dans .env.local du dossier principal, jamais affichée ni écrite) ; spécification tools/m09-lot-quai.mjs',
    aseprite: 'non utilisé : traitement et assemblage par scripts Node et canvas (tools/m09-traitement-images.mjs, tools/m09-porte-quai.mjs)',
    licences: 'conditions d’OpenAI applicables aux sorties de l’API à la date de production ; aucune analyse juridique faite par l’agent : point à confirmer par le responsable avant tout usage en jeu',
    contenu: 'aucun texte, lettre, chiffre, signature, filigrane ni logo demandé ; aucune enseigne du jeu de cartes classique ; aucun nom d’artiste ni de franchise dans les prompts',
  };
  const src = (name) => {
    const i = gen[name];
    return { nom: name, modele: i.model, point_d_acces: i.endpoint, date: i.date, parametres: i.params, prompt: i.prompt, entrees: i.inputs.map((x) => ({ chemin: x.path, sha256: x.sha256 })), brut: { fichier: `art-gen/${name === 'quai-facades-essai' || name === 'player-pixel-essai' ? '2026-10-19-v4-essai' : '2026-10-20-v4-quai'}/${i.file} (dossier principal, ignoré par git)`, sha256: i.output.sha256, dimensions: [i.output.width, i.output.height] }, usage_api: i.usage };
  };
  const fiches = {
    'quai-ciel': { sources: ['quai-ciel-ville-haute'], etapes: ['image opaque, sans détourage ni recadrage'] },
    'quai-second-rang': { sources: ['quai-second-rang'], etapes: ['fond magenta détouré (alpha tiré de l’écart au magenta, bords démêlés du fond)', 'recadré sur le pied des murs'] },
    'quai-facades': { sources: ['quai-facades-ouest', 'quai-facades-essai', 'quai-facades-est'], etapes: ['fond magenta détouré et recadré sur le pied des murs, pour chaque image', `assemblées côte à côte, pieds alignés, à ${D} px/m : ouest (x −24 à −10,6 m), centre de l’essai (−10,6 à 11,2 m), est (11,2 à 24 m)`, 'lanternes peintes repérées, une lumière du moteur sur chacune'] },
    'quai-pied-facades': { sources: ['quai-etal', 'quai-accessoires'], etapes: ['étal détouré et recadré sur son contenu ; accessoires détourés et découpés (composantes connexes)', `posés au monde aux emplacements du plan pur, à ${D} px/m : étal (x 2,1 m, 3,4 m de large), caisses (−18 et 12,7 m), tonneaux (−10,5 m) ; échelle de la planche d’accessoires tirée du lampadaire (${L.rue.lampH} m)`] },
    'quai-rue': { sources: ['quai-accessoires'], etapes: ['accessoires détourés et découpés', `posés au monde : lampadaires (x −13, −4, 5, 14 m, ${L.rue.lampH} m de haut), bornes (−12, −2,6, 6,4, 15,5 m), filets (18,2 m)`, 'lanternes des lampadaires repérées, une lumière du moteur sur chacune'] },
    'quai-premier-plan': { sources: ['quai-premier-plan-ouest', 'quai-premier-plan-est'], etapes: ['fond magenta détouré, sans recadrage', 'au-dessus du haut du mur, seules les composantes qui montent jusqu’au haut de l’image (mâts, gréements) sont gardées : les objets posés sur le mur (caisses, bannière, lanterne) seraient devant la rue', `début de l’image est retiré (${L.premier.cropEst * 100} % : reprise du bout de l’image ouest), assemblées côte à côte avec ${L.premier.overlap} m de recouvrement fondu (rampe d’alpha) ; haut du mur du quai (rangée couverte à plus de 80 %) posé à fleur de rue`] },
    'quai-eau': { sources: ['quai-eau'], etapes: [`image opaque, sans détourage ; posée couchée (y ${L.eau.y} m)`] },
  };
  // emblèmes du jeu posés par script sur les bannières des bruts (passe 59) : étape en tête des fiches concernées
  const EMB = 'emblèmes inventés par le modèle remplacés par ceux du jeu sur les bannières (fixBanners, tracés de src/art/emblems.ts ; tissu refait de son propre grain), sur le brut, avant tout traitement';
  for (const [id, srcs] of [['quai-facades', ['quai-facades-essai']], ['quai-second-rang', ['quai-second-rang']], ['quai-premier-plan', ['quai-premier-plan-ouest']]]) fiches[id].etapes.unshift(`${EMB} : ${srcs.join(', ')}`);
  for (const [id, f] of Object.entries(fiches)) {
    const file = `${id}.png`;
    const sources = f.sources.map(src);
    const fiche = { id, ...common, sources, traitement: { scripts: ['tools/m09-traitement-images.mjs', 'tools/m09-porte-quai.mjs'], etapes: f.etapes }, sortie: { fichier: `public/decors/${file}`, sha256: sha(files[file]), octets: files[file].length, dimensions: dim(files[file]), pose: quai.plans[Object.keys(quai.plans).find((k) => quai.plans[k].file === file)] }, chaine_des_empreintes: [...sources.map((s) => `${s.brut.sha256} (brut ${s.nom})`), `${sha(files[file])} (plan)`] };
    mkdirSync(`art-src/decors/${id}`, { recursive: true });
    writeFileSync(`art-src/decors/${id}/fiche.json`, `${JSON.stringify(fiche, null, 2)}\n`);
  }
  const ps = src('player-pixel');
  mkdirSync('art-src/sprites/player', { recursive: true });
  writeFileSync('art-src/sprites/player/fiche.json', `${JSON.stringify({
    id: 'player', ...common, sources: [ps],
    traitement: { scripts: ['tools/m09-traitement-images.mjs (processSheet)', 'tools/m09-porte-quai.mjs'], etapes: ['fond cyan et liseré teinté de cyan retirés ; alpha binaire', `pas des pixels d’art mesuré sur les arêtes (${sheet.pitch.x} × ${sheet.pitch.y} px)`, `grille d’art reconstruite : ${sheet.cell.join(' × ')} px d’art par case (couleur majoritaire du cœur de chaque bloc)`, 'pieds alignés sur une même ligne, tête centrée', 'tons clés : tenue (magenta) et accent (vert) ramenés exactement sur 64, 128, 191, 255', 'palette : couleurs naturelles réduites à 32 (k-moyennes)', 'agrandissement ×3 au plus proche'] },
    sortie: { fichier: 'public/sprites/player.png', sha256: sha(k3), octets: k3.length, entree_du_manifeste: playerEntry, tons_cles: sheet.counts, couleurs: sheet.colors },
    chaine_des_empreintes: [`${ps.entrees[0].sha256} (feuille brute de l’essai, en entrée)`, `${ps.brut.sha256} (brut)`, `${sha(k3)} (feuille ×3)`],
  }, null, 2)}\n`);
  // ---- contrôles ----------------------------------------------------------------------------------------------------
  const big = Object.entries(files).filter(([, b]) => b.length > 8 * 1048576);
  check(big.length === 0, `plans ≤ 8 Mo : ${Object.entries(files).map(([f, b]) => `${f} ${Math.round(b.length / 1048576 * 10) / 10} Mo ${dim(b).join('×')}`).join(' ; ')}`);
  check(lights.length >= 4, `lumières du moteur posées sur les lanternes peintes : ${lights.length} (rue ${lanternRue.length}, étal ${stallLights.length}, façades ${facLights.length} plus grandes)`);
  check(sheet.shifts.every((s) => s) && sheet.clipped === 0, `feuille du joueur : grille d’art ${sheet.cell.join(' × ')}, pas ${sheet.pitch.x} × ${sheet.pitch.y}, ${sheet.colors} couleurs, tons clés tenue ${JSON.stringify(sheet.counts.tenue)}, accent ${JSON.stringify(sheet.counts.accent)}, ancrage ${sheet.anchor}, figure ${sheet.figureH}`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
}

if (MODE === 'verifier') {
  const DIR = process.argv[3] ?? 'screenshots/qa/m09/v4-porte';
  const OUT = process.argv[4] ?? 'artifacts/qa/m09/v4-porte.json';
  const RIG = process.env.LQV_RIG ? `&rig=${process.env.LQV_RIG}` : '';
  mkdirSync(DIR, { recursive: true });
  const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4431, process.env.LQV_DIST || 'dist');
  const SPOTS = { centre: [-0.6, 0.2, 'face'], salle: [-6.2, 1.2, 'gauche'], fanal: [5.6, 0.6, 'droite'], ouest: [-16, 0.8, 'droite'], est: [16, 0.8, 'gauche'] };
  const hideUi = () => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; };
  const shots = {};
  report.runs = {};
  try {
    for (const [w, h] of [[1920, 1080], [1280, 720]]) {
      for (const [mode, q] of [['actuel', '&decors=code&sprites=code'], ['jeu', '&decors=approuvees&sprites=approuvees'], ['porte', '']]) {
        const pg = await page(w, h);
        await pg.goto(`${srv.base}/?ville=1&qa=1&freeze=1${q}${RIG}`);
        await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 120000 });
        if (!report.renderer) report.renderer = rendererLabel(await webglRenderer(pg));
        report.runs[`${mode}-${w}`] = await pg.evaluate(() => { const t = window.__lqvVille.town; return { dec: t.decorReport(), spr: t.externalReport(), st: t.stats() }; });
        for (const [k, [x, z, f]] of Object.entries(SPOTS)) {
          const box = await pg.evaluate(({ x, z, f }) => { const t = window.__lqvVille.town; t.place({ x, z }, f); t.renderNow(); const pos = t.walker().pos; return { feet: t.project({ x: pos.x, y: 0, z: pos.z }), top: t.project({ x: pos.x, y: t.walkerH(), z: pos.z }) }; }, { x, z, f });
          await pg.evaluate(hideUi);
          await pg.waitForTimeout(250);
          const buf = await pg.screenshot();
          shots[`${mode}-${k}-${w}`] = buf;
          if (mode !== 'jeu') writeFileSync(join(DIR, `${mode}-${k}-${w}.png`), buf);
          if (k === 'centre' && w === 1920) {
            const hh = box.feet.y - box.top.y;
            writeFileSync(join(DIR, `joueur-${mode}-1920.png`), await pg.screenshot({ clip: { x: Math.round(box.feet.x - hh * 0.55), y: Math.round(box.top.y - hh * 0.175), width: Math.round(hh * 1.1), height: Math.round(hh * 1.35) } }));
            report.runs[`${mode}-${w}`].figurePx = r2(hh);
          }
        }
        await pg.context().close();
      }
    }
    const P = report.runs['porte-1920'];
    check(P.dec.world === 'diorama' && P.dec.pendingFrames === 0 && P.dec.late.length === 0, `porte (QA) : le Quai dessiné par son diorama (${Object.keys(P.dec.timings).length} plans, ${r2(P.dec.gpuBytes.quai / 1048576)} Mo de mémoire GPU), aucune image avant la décision`);
    check(P.spr.loaded.includes('player-Cendre') && P.spr.issues.length === 0, `porte (QA) : le joueur dessiné par sa feuille en pixel art (non approuvée, admise en QA seulement), aucun refus`);
    const J = report.runs['jeu-1920'];
    check(J.dec.world === 'code' && J.dec.issues.some((x) => /non approuvé/.test(x)) && !J.spr.loaded.includes('player-Cendre'), 'politique du jeu : plans et feuille non approuvés refusés, Quai et joueur par code');
    // la politique du jeu rend exactement le Quai actuel
    const hp = await page(400, 300);
    const same = [];
    for (const [w] of [[1920], [1280]]) for (const k of Object.keys(SPOTS)) {
      const d = await hp.evaluate(async ({ a, b }) => {
        const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
        const [p1, q1] = [await load(a), await load(b)]; let n = 0; for (let i = 0; i < p1.length; i++) if (p1[i] !== q1[i]) n++; return n;
      }, { a: dataUrl(shots[`actuel-${k}-${w}`]), b: dataUrl(shots[`jeu-${k}-${w}`]) });
      same.push(d === 0);
    }
    check(same.every(Boolean), `politique du jeu identique au pixel près au Quai actuel (${same.filter(Boolean).length}/${same.length} captures)`);
    report.ecran = { figurePx: P.figurePx, figureArt: P.spr.loaded.includes('player-Cendre') ? JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8')).sprites.player.figureH : null };
    if (report.ecran.figureArt) report.ecran.pxEcranParPxArt = r2(P.figurePx / report.ecran.figureArt);
    // planche : référence | actuel | porte (centre), puis porte à l'ouest, devant le Fanal et à l'est ; joueur
    const ref = readFileSync('reference/generated/2026-10-19-quai-nuit-cameras/02.png');
    const pp = await page(1700, 1100);
    const planche = await pp.evaluate(async (u) => {
      const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
      const im = await Promise.all(u.imgs.map(load));
      const pad = 14; const tw = 640; const th = 360; const c = document.createElement('canvas');
      c.width = 3 * tw + 4 * pad; c.height = 30 + 2 * (th + 34) + 30;
      const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#e8dcc0'; g.font = '15px system-ui';
      g.fillText('Porte du Quai (ADR 028) : diorama de plans générés et feuille du joueur en pixel art, en QA (approved: false) — 1920 × 1080 réduit', pad, 21);
      u.labels.forEach((lab, k) => { const x = pad + (k % 3) * (tw + pad); const y = 30 + Math.floor(k / 3) * (th + 34); const i = im[k]; const s = Math.min(tw / i.width, th / i.height); g.drawImage(i, x, y, i.width * s, i.height * s); g.fillText(lab, x, y + th + 20); });
      return c.toDataURL('image/png');
    }, {
      imgs: [dataUrl(ref), dataUrl(shots['actuel-centre-1920']), dataUrl(shots['porte-centre-1920']), dataUrl(shots['porte-ouest-1920']), dataUrl(shots['porte-fanal-1920']), dataUrl(shots['porte-est-1920'])],
      labels: ['Référence initiale approuvée (02.png)', 'Quai actuel (par code, provisoire) — centre', 'Porte — centre', 'Porte — ouest (passage vers les Ruelles)', 'Porte — devant le Fanal', 'Porte — est (vers le Parvis)'],
    });
    writeFileSync(join(DIR, 'planche-porte-quai.png'), fromUrl(planche));
  } finally {
    const bad = report.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
    check(bad.length === 0, `aucune erreur ni avertissement de console (${bad.length}${bad.length ? ` : ${bad.slice(0, 3).join(' | ')}` : ''})`);
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    srv.stop();
  }
}
if (MODE === 'planche') {
  const OUT = process.argv[3] ?? 'screenshots/qa/m09/v4-decision-2/planche-decision-quai.png';
  const REP = process.argv[4] ?? 'artifacts/qa/m09/v4-decision.json';
  const DIST = process.env.LQV_DIST || 'dist';
  const LARGE = '6,25,42,4.8';
  mkdirSync(dirname(OUT), { recursive: true });
  // variante A3 : lumières du diorama aux couleurs des familles, comme la direction D (ADR 026) : Voile au passage vers
  // les Ruelles et chez l'armateur, Cendre au chantier et au Fanal, Astre à la salle de jeu et aux lampadaires, Ronce à
  // l'étal et à la maison étroite ; copie temporaire du build, rien dans public/
  const tmp = mkdtempSync(join(tmpdir(), 'lqv-a3-'));
  cpSync(DIST, tmp, { recursive: true });
  const man = JSON.parse(readFileSync(join(tmp, 'decors', 'manifest.json'), 'utf8'));
  const famOf = (x) => (x < -19.5 ? 'Voile' : x < -11 ? 'Cendre' : x < -2.6 ? 'Astre' : x < 3.0 ? 'Ronce' : x < 11.4 ? 'Cendre' : x < 19.5 ? 'Voile' : 'ambre');
  man.ilots.quai.lumieres = man.ilots.quai.lumieres.map((l) => (l.color === 'Astre' ? l : { ...l, color: famOf(l.at[0]) }));
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify(man, null, 2));
  report.variante = { lumieres: man.ilots.quai.lumieres.map((l) => `${l.color} x ${l.at[0]}`) };
  const srvA = await startPreview(4441, DIST);
  const srvB = await startPreview(4442, tmp);
  const hideUi = () => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; };
  /** Capture 1920 × 1080 au centre du Quai ; détail : 960 × 270 px autour des bannières de la salle de jeu. */
  const shot = async (base, q) => {
    const pg = await page(1920, 1080);
    await pg.goto(`${base}/?ville=1&qa=1&freeze=1${q}`);
    await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 120000 });
    if (!report.renderer) report.renderer = rendererLabel(await webglRenderer(pg));
    const pt = await pg.evaluate(() => { const t = window.__lqvVille.town; t.place({ x: -0.6, z: 0.2 }, 'face'); t.renderNow(); return t.project({ x: -6.6, y: 6.6, z: -3 }); });
    await pg.evaluate(hideUi);
    await pg.waitForTimeout(250);
    const full = await pg.screenshot();
    const cx = Math.max(480, Math.min(1920 - 480, Math.round(pt.x))); const cy = Math.max(135, Math.min(1080 - 135, Math.round(pt.y)));
    const crop = await pg.screenshot({ clip: { x: cx - 480, y: cy - 135, width: 960, height: 270 } });
    const dec = await pg.evaluate(() => window.__lqvVille.town.decorReport());
    await pg.context().close();
    return { full, crop, world: dec.world };
  };
  try {
    const actuel = await shot(srvA.base, '&decors=code&sprites=code');
    const porte = await shot(srvA.base, '');
    const large = await shot(srvA.base, `&rig=${LARGE}`);
    const familles = await shot(srvB.base, `&rig=${LARGE}`);
    check(actuel.world === 'code' && porte.world === 'diorama' && large.world === 'diorama' && familles.world === 'diorama', 'planche : Quai actuel par code ; porte, cadrage élargi et variante A3 en diorama');
    const ref = readFileSync('reference/generated/2026-10-19-quai-nuit-cameras/02.png');
    // bannières de la salle de jeu : brut généré (emblèmes inventés) | emblèmes du jeu posés par script (passe 59)
    const bAvant = readFileSync(join(RAW_ESSAI, 'quai-facades-essai.png'));
    const bApres = readFileSync('artifacts/qa/tmp/v4-bannieres-quai-facades-essai.png');
    const pp = await page(2100, 1100);
    const planche = await pp.evaluate(async (u) => {
      const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
      const im = await Promise.all(u.imgs.map(load));
      const pad = 16; const tw = 640; const th = 360; const top = 40;
      const c = document.createElement('canvas'); c.width = 3 * tw + 4 * pad; c.height = top + 2 * (th + 36) + 220;
      const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#e8dcc0'; g.font = 'bold 17px system-ui';
      g.fillText('Porte du Quai (ADR 028) — planche de décision', pad, 26);
      g.font = '14px system-ui';
      const tile = (k, x, y) => { const i = im[k]; const s2 = Math.min(tw / i.width, th / i.height); g.drawImage(i, x, y, i.width * s2, i.height * s2); };
      const lab = (t, x, y) => g.fillText(t, x, y);
      const X = (col) => pad + col * (tw + pad); const Y = (row) => top + row * (th + 36);
      tile(0, X(0), Y(0)); lab('Référence initiale approuvée (02.png)', X(0), Y(0) + th + 22);
      tile(1, X(1), Y(0)); lab('Quai actuel : direction D, par code (provisoire)', X(1), Y(0) + th + 22);
      tile(2, X(2), Y(0)); lab('Porte corrigée (emblèmes du jeu) : cadrage actuel (joueur ≈ ×2,9)', X(2), Y(0) + th + 22);
      tile(3, X(0), Y(1)); lab('Porte corrigée : cadrage élargi (rig=6,25,42,4.8 ; joueur ≈ ×1,9)', X(0), Y(1) + th + 22);
      tile(4, X(1), Y(1)); lab('Variante A3 : même cadrage, lumières aux couleurs des familles (direction D)', X(1), Y(1) + th + 22);
      // bannières avant | après : même région du brut (salle de jeu), 520 × 340 px
      const bw = tw / 2 - 4; const bh = Math.round(bw * 340 / 520); const by = Y(1) + (th - bh) / 2;
      g.drawImage(im[7], 60, 360, 520, 340, X(2), by, bw, bh); g.drawImage(im[8], 60, 360, 520, 340, X(2) + tw / 2 + 4, by, bw, bh);
      lab('Bannières : générées (gauche), emblèmes du jeu posés par script (droite)', X(2), Y(1) + th + 22);
      g.font = 'bold 15px system-ui';
      const q0 = Y(2) + 10;
      lab('Décisions ouvertes :', pad, q0);
      g.font = '14px system-ui';
      const L = [
        '1. Emblèmes : les quatre emblèmes du jeu (src/art/emblems.ts) posés par script sur les bannières générées (tissu refait de leur propre grain) : convient-il, ou régénérer ces bannières sans motif (2 ou 3 images) ?',
        '2. Cadrage : actuel ou élargi ?     3. Note A3 : lumières aux couleurs des familles (variante) ? (contours à l’encre, hachures, papier : non repris)',
        '4. Profondeur des quartiers (à choisir avant production) : brume entre les plans (moteur, 0 image) ; plans plus espacés, parallaxe plus marquée (moteur, 0 image) ;',
        '    troisième rang et ville haute étagée (1 ou 2 images) ; ruelles et passages qui s’enfoncent dans des trouées des façades (2 images) ; la Grande Cour : marche en profondeur.',
        '5. Tête et visage du joueur : reprendre la feuille à la manière de Cité du Tournoi (grille d’art 64 × 96, tête plus grande, yeux et mèches lisibles, rampes à cinq tons, ombres froides et lumières chaudes),',
        '    dans notre logique (identité V2, tons clés recolorables, contrat v3) ; donner hero-x2-v3.png de Cité du Tournoi en image d’entrée à gpt-image-2 : à autoriser explicitement (AGENTS limite les entrées au projet).',
        '6. Approbation : rien n’est approuvé (approved: false) ; 12 images utilisées sur 30, 18 restantes.',
      ];
      L.forEach((t, k) => lab(t, pad, q0 + 24 + k * 22));
      return c.toDataURL('image/png');
    }, { imgs: [dataUrl(ref), dataUrl(actuel.full), dataUrl(porte.full), dataUrl(large.full), dataUrl(familles.full), dataUrl(actuel.crop), dataUrl(porte.crop), dataUrl(bAvant), dataUrl(bApres)] });
    writeFileSync(OUT, fromUrl(planche));
    writeFileSync(join(dirname(OUT), 'variante-a3-familles-large-1920.png'), familles.full);
    writeFileSync(join(dirname(OUT), 'porte-large-1920.png'), large.full);
  } finally {
    const bad = report.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
    check(bad.length === 0, `aucune erreur ni avertissement de console (${bad.length})`);
    mkdirSync(dirname(REP), { recursive: true });
    writeFileSync(REP, JSON.stringify(report, null, 2));
    srvA.stop(); srvB.stop();
    rmSync(tmp, { recursive: true, force: true });
  }
}
await browser.close();
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
