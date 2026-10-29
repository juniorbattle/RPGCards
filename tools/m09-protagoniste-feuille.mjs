// Protagoniste, silhouette B (demande du responsable du 2026-10-29 ; accord dans la session, passe 164 : « H1 + réserve »,
// personnage personnalisable, « 4 images, couleurs par code ») — traitement PAR SCRIPT de la feuille générée
// (`tools/m09-lot-protagoniste.mjs`) : même chaîne que les feuilles des PNJ (`processSheet` : fond cyan retiré, grille
// d'art de 64 × 96 imposée, pieds alignés, tons clés exacts peau, cheveux, tenue et accent, palette réduite, yeux de face
// rendus pareils, agrandissement ×3), contrôles, puis `public/sprites/player-b.png`, son entrée du manifeste (contrat v3 ;
// `approved` selon le registre, donc false tant que le responsable n'a pas donné l'ordre) et sa fiche.
// Passe 167 : aussi les coupes de plus (`tools/m09-lot-coupes.mjs`) : `player-a2` (A, queue de cheval) et `player-b2` (B,
// cheveux mi-longs).
// Usage : node tools/m09-protagoniste-feuille.mjs [id, défaut player-b][=<brut>] [--profil c1,c2,p1,p2 (passages redessinés par code)]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch } from './browser.mjs';
import { processSheet } from './m09-traitement-images.mjs';
import { approuve } from './m09-approbations.mjs';

/** Feuilles du protagoniste générées : lot, brut, description, plan de marche par défaut (après lecture de la feuille). */
const FEUILLES = {
  // marche de profil : la feuille dessine de vrais passages (temps 2 et 4, pieds 29 et 31 px contre 35 et 38 aux contacts),
  // mais moins fermés que le repos (16) : le cycle mesuré de la passe 162 prendrait le repos ; le plan garde les siens
  'player-b': { lot: '2026-10-29-protagoniste', brut: 'player-homme', passe: 164, qui: 'silhouette B', entree: 'la feuille du joueur approuvée', profil: { contacts: [1, 3], passages: [2, 4], dessines: true } },
  // A2 et B2 : vrais passages dessinés (pieds de 28 et 30, puis 26 et 31 px d'art contre 32 à 39 aux contacts) : plan aux
  // passages de la feuille, comme B
  // A2 : pas borné à 2,6–3 px (sans borne : 3,75 × 3,2, pas pris sur un multiple, figure de 75 px d'art) ; yeux sans blanc
  // entouré de peau, laissés tels que dessinés, comme sur la feuille A
  'player-a2': { lot: '2026-10-29-coupes', brut: 'player-a2', passe: 167, qui: 'silhouette A, coupe en queue de cheval', entree: 'la feuille A approuvée', profil: { contacts: [1, 3], passages: [2, 4], dessines: true }, pitch: [2.6, 3], yeux: false },
  // B2 : cheveux mi-longs plus hauts (figure de 94 px d'art au vrai pas, 3,03 px) : case de 64 × 100 px d'art (contrat v3),
  // rien de rogné, plutôt qu'un pas forcé qui brouillerait les pixels ; yeux repérés sur un seul cadre de face (mèches sur les
  // tempes) : laissés tels que dessinés, semblables d'un cadre à l'autre (planche)
  'player-b2': { lot: '2026-10-29-coupes', brut: 'player-b2', passe: 167, qui: 'silhouette B, coupe mi-longue', entree: 'la feuille B approuvée', profil: { contacts: [1, 3], passages: [2, 4], dessines: true }, cell: [64, 100], yeux: false },
  // passe 169 : types de visage, sur la silhouette A au carré (les autres feuilles les reçoivent par calque,
  // `tools/m09-protagoniste-visages.ts`) ; V1 : pas borné à 3–3,3 px (sans borne : 3,29 × 3,525, inégal) ; foulées sans passage,
  // comme la feuille A : passages redessinés par code, même plan qu'elle
  'player-v1': { lot: '2026-10-29-visages', brut: 'visage-amande', passe: 169, qui: 'silhouette A, coupe carré, visage en amande', entree: 'la feuille A approuvée', profil: { contacts: [1, 2], passages: [3, 4] }, pitch: [3, 3.3], yeux: false },
  'player-v2': { lot: '2026-10-29-visages', brut: 'visage-rond', passe: 169, qui: 'silhouette A, coupe carré, visage rond', entree: 'la feuille A approuvée', profil: null },
  'player-v3': { lot: '2026-10-29-visages', brut: 'visage-anguleux', passe: 169, qui: 'silhouette A, coupe carré, visage anguleux', entree: 'la feuille A approuvée', profil: null },
};
const [ID, brutArg] = (process.argv.slice(2).find((a) => !a.startsWith('--') && !/^\d/.test(a)) ?? 'player-b').split('=');
const F = FEUILLES[ID];
if (!F) throw new Error(`feuille inconnue : ${ID}`);
const LOT = F.lot;
// peau et cheveux : le modèle les a peints au naturel malgré l'invite (tons clés absents) ; reconnus en jeu par code, comme
// sur la feuille du joueur (`teintes.ts`) : seuls la tenue et l'accent sont des tons clés, comme sur la silhouette A
const SLOTS = ['tenue', 'accent'];
// pas borné (2,8 à 4 px) : sans borne, le pas est pris à 2,665 px (figure de 94 px d'art, haut des cheveux rogné) ; à 2,815 px,
// la figure fait 91 px d'art, comme la silhouette A, sans rien rogner (même borne que pour Orin et Sélène, passe 127)
const args = process.argv.slice(2);
const iProfil = args.indexOf('--profil');
const profilArg = iProfil >= 0 ? args.splice(iProfil, 2)[1].split(',').map(Number) : null;
const BRUT = brutArg ?? F.brut;
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const RAW = join(main, 'art-gen', LOT);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };

const prov = JSON.parse(readFileSync(join(RAW, 'provenance.json'), 'utf8'));
const g = prov.images.find((i) => i.name === BRUT);
if (!g) throw new Error(`${BRUT} absent de ${LOT}/provenance.json`);
const browser = await launch();
let sheet; let k3; let mesures;
try {
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  sheet = await pg.evaluate(processSheet, { url: dataUrl(readFileSync(join(RAW, `${BRUT}.png`))), figures: true, levels: 'kmeans', cell: F.cell ?? [64, 96], slots: SLOTS, yeux: F.yeux !== false, pitchMin: F.pitch?.[0] ?? 2.8, pitchMax: F.pitch?.[1] ?? 4 });
  // pixels d'accent isolés (liseré clair des cheveux sur le fond cyan, pris pour le vert du bandeau) : un pixel d'art
  // d'accent qui n'a pas deux voisins d'accent prend la couleur majoritaire de ses voisins (ou le vide)
  const nettoye = await pg.evaluate(async (url) => {
    const im = new Image(); im.src = url; await im.decode();
    const W = im.width; const H = im.height; const S = 3; const AW = W / S; const AH = H / S;
    const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, W, H); const p = d.data;
    const at = (i, j) => ((j * S + 1) * W + i * S + 1) * 4;
    const accent = (i, j) => { const k = at(i, j); return p[k + 3] > 128 && p[k] === 0 && p[k + 2] === 0 && [64, 128, 191, 255].includes(p[k + 1]); };
    const fixes = [];
    for (let j = 0; j < AH; j++) for (let i = 0; i < AW; i++) {
      if (!accent(i, j)) continue;
      const votes = new Map(); let n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if ((!di && !dj) || i + di < 0 || j + dj < 0 || i + di >= AW || j + dj >= AH || Math.floor((i + di) / 64) !== Math.floor(i / 64) || Math.floor((j + dj) / 96) !== Math.floor(j / 96)) continue;
        if (accent(i + di, j + dj)) { n++; continue; }
        const k = at(i + di, j + dj); const key = p[k + 3] > 128 ? `${p[k]},${p[k + 1]},${p[k + 2]},255` : '0,0,0,0';
        votes.set(key, (votes.get(key) ?? 0) + 1);
      }
      if (n >= 2) continue;
      const best = [...votes].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
      fixes.push([i, j, best]);
    }
    for (const [i, j, rgba] of fixes) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(rgba, ((j * S + y) * W + i * S + x) * 4);
    g.putImageData(d, 0, 0);
    const blob = await c.convertToBlob({ type: 'image/png' });
    return { n: fixes.length, url: await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); }) };
  }, sheet.K3);
  console.log(`pixels d’accent isolés reclassés : ${nettoye.n}`);
  sheet.K3 = nettoye.url;
  sheet.accentIsoles = nettoye.n;
  k3 = fromUrl(sheet.K3);
  // marche de profil : largeur des pieds (4 px d'art au-dessus de l'ancrage) de chaque colonne de la rangée de profil
  mesures = await pg.evaluate(async ({ url, anchor, cell }) => {
    const im = new Image(); im.src = url; await im.decode();
    const c = new OffscreenCanvas(im.width, im.height); const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const [cw, ch] = cell; const s = im.width / (5 * cw); const d = x.getImageData(0, 0, im.width, im.height).data;
    return [0, 1, 2, 3, 4].map((col) => {
      let x0 = 99; let x1 = -1;
      for (let j = anchor[1] - 4; j < anchor[1]; j++) for (let i = 0; i < cw; i++) {
        const X = Math.floor((col * cw + i) * s + s / 2); const Y = Math.floor((2 * ch + j) * s + s / 2);
        if (d[(Y * im.width + X) * 4 + 3] > 128) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); }
      }
      return x1 >= x0 ? x1 - x0 : 0;
    });
  }, { url: sheet.K3, anchor: sheet.anchor, cell: sheet.cell });
} finally {
  await browser.close();
}

check(sheet.shifts.every((s) => s) && sheet.clipped === 0, `grille d’art ${sheet.cell.join(' × ')}, pas ${sheet.pitch.x} × ${sheet.pitch.y}, ${sheet.colors} couleurs, ancrage ${sheet.anchor}, figure ${sheet.figureH} px d’art, ${sheet.clipped ? `${sheet.clipped} px d’art rognés` : 'rien de rogné'}${sheet.shifts.some((s) => !s) ? `, figures absentes : ${sheet.shifts.map((s, k) => (s ? null : k)).filter((k) => k !== null).join(', ')}` : ''}`);
for (const s of SLOTS) check(Object.values(sheet.counts[s] ?? {}).filter((n) => n > 0).length >= 2, `ton clé ${s} présent sur au moins deux niveaux : ${JSON.stringify(sheet.counts[s])}`);
const face = (sheet.yeux?.poses ?? []).map((p) => p.k).sort((a, b) => a - b);
if (F.yeux !== false) check(face.join() === '0,1,2,3,4', `yeux de face rendus pareils sur les 5 cadres (${face.join(', ') || 'aucun'})`);
else console.log('yeux : laissés tels que dessinés (contrôlés sur la planche)');
check(k3.length <= 1048576, `feuille ≤ 1 Mo : ${Math.round(k3.length / 1024)} Ko, ${dim(k3).join(' × ')}`);
console.log(`marche de profil : largeur des pieds par colonne (repos, puis 1 à 4) : ${mesures.join(', ')}`);
mkdirSync(`${RAW}/traitement`, { recursive: true });
writeFileSync(join(RAW, 'traitement', `${BRUT}-x3.png`), k3);
if (!checks.every((c) => c.startsWith('OK'))) { console.log('feuille non posée (contrôles en échec) : la réserve, `--only player-homme-b`, seulement sur accord'); process.exit(1); }

writeFileSync(`public/sprites/${ID}.png`, k3);
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const entry = {
  file: `${ID}.png`, sha256: sha(k3), cell: sheet.cell, cols: 5, rows: 3, pixel: true, scale: 3, anchor: sheet.anchor, figureH: sheet.figureH,
  recolor: SLOTS,
  ...(profilArg ? { profil: { contacts: profilArg.slice(0, 2), passages: profilArg.slice(2, 4), ...(profilArg[4] ? { dessines: true } : {}) } } : F.profil ? { profil: F.profil } : {}),
  source: `gpt-image-2 (protagoniste, ${F.qui}, depuis ${F.entree}), grille d’art, alignement, palette et tons clés par script (tools/m09-protagoniste-feuille.mjs)`,
  fiche: `art-src/sprites/${ID}/fiche.json`,
  approved: approuve(`public/sprites/${ID}.png`, sha(k3)),
};
writeFileSync('public/sprites/manifest.json', `${JSON.stringify({ ...man, sprites: { ...man.sprites, [ID]: entry } }, null, 2)}\n`);
const ps = { nom: BRUT, modele: g.model, point_d_acces: g.endpoint, date: g.date, parametres: g.params, prompt: g.prompt, entrees: g.inputs.map((x) => ({ chemin: x.path, sha256: x.sha256 })), brut: { fichier: `art-gen/${LOT}/${g.file} (dossier principal, ignoré par git)`, sha256: g.output.sha256, dimensions: [g.output.width, g.output.height] }, usage_api: g.usage };
const joueur = JSON.parse(readFileSync('art-src/sprites/player/fiche.json', 'utf8'));
mkdirSync(`art-src/sprites/${ID}`, { recursive: true });
writeFileSync(`art-src/sprites/${ID}/fiche.json`, `${JSON.stringify({
  id: ID,
  statut: `protagoniste, ${F.qui} (passe ${F.passe}), NON APPROUVÉE par le responsable : refusée hors QA (approved: false) tant qu’il n’a pas donné l’ordre, dans une passe à part`,
  auteur: F.passe === 164
    ? 'Claude Code (session « protagoniste », passe 164), à la demande du responsable : version homme du protagoniste, même structure et même tenue, cheveux argentés plus courts, peau mate ; accord dans la session : « H1 + réserve », personnage personnalisable, « 4 images, couleurs par code », choix nommé « Silhouette »'
    : F.passe === 167
      ? `Claude Code (session « protagoniste », passe ${F.passe}), à la demande du responsable : « fait donc », en réponse à « d’autres coupes ou visages demanderaient de nouvelles images, dans un lot à part avec son propre budget. Il reste 3 images sur 20. »`
      : `Claude Code (session « protagoniste », passe ${F.passe}), à la demande du responsable : « tu peux ajouter du budget pour effectuer les types de visages » ; décisions dans la session : « Calques de visage » (3 images et 1 réserve au plus), types « Yeux en amande, regard vif », « Visage rond, grands yeux », « Visage anguleux, sourcils marqués »`,
  generation: `tools/m09-generer-images.mjs --only (clé lue à l’exécution dans .env.local du dossier principal, jamais affichée ni écrite) ; spécification ${{ 164: 'tools/m09-lot-protagoniste.mjs', 167: 'tools/m09-lot-coupes.mjs', 169: 'tools/m09-lot-visages.mjs' }[F.passe]}`,
  aseprite: joueur.aseprite, licences: joueur.licences, contenu: joueur.contenu,
  style: F.passe === 164 ? 'style, échelle, proportions et tenue de la feuille du joueur approuvée (seule entrée) ; peau et cheveux en tons clés, recolorés en jeu' : `style, échelle, proportions${F.passe === 169 ? '' : ', visage'} et tenue de ${F.entree} (seule entrée) ; peau et cheveux au naturel, reconnus et repeints en jeu (src/ville/teintes.ts)`,
  sources: [ps],
  traitement: { scripts: ['tools/m09-traitement-images.mjs (processSheet)', 'tools/m09-protagoniste-feuille.mjs'], etapes: ['fond cyan et liseré teinté retirés ; alpha binaire', `pas des pixels d’art mesuré sur les arêtes (${sheet.pitch.x} × ${sheet.pitch.y} px)`, `figures repérées par les bandes vides ; grille d’art ${sheet.cell.join(' × ')} px d’art par case imposée, couleur majoritaire du cœur de chaque bloc`, 'pieds alignés sur une même ligne, tête centrée', `tons clés (${SLOTS.join(', ')}) ramenés exactement sur 64, 128, 191, 255`, 'palette : couleurs naturelles réduites (k-moyennes)', 'yeux (passe 138) : de face, les deux yeux du brut recalés et moyennés, posés aux deux places ; aucun ton clé de vêtement ni d’accent dans les yeux et les sourcils', 'agrandissement ×3 au plus proche', `pixels d’accent isolés (moins de deux voisins d’accent : liseré des cheveux sur le fond cyan) ramenés à la couleur majoritaire de leurs voisins : ${sheet.accentIsoles}`] },
  marche_de_profil: { largeurs_des_pieds: mesures, plan: entry.profil ?? null },
  sortie: { fichier: `public/sprites/${ID}.png`, sha256: sha(k3), octets: k3.length, entree_du_manifeste: entry, tons_cles: sheet.counts, couleurs: sheet.colors },
  chaine_des_empreintes: [...ps.entrees.map((e) => `${e.sha256} (entrée : ${e.chemin.replace(/^.*\/(art-gen|public)\//, '$1/')})`), `${ps.brut.sha256} (brut)`, `${sha(k3)} (feuille ×3)`],
}, null, 2)}\n`);
console.log(`feuille posée : public/sprites/${ID}.png (approved: ${entry.approved})`);
