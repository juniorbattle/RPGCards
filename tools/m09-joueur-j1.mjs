// M09 J1 — traitement PAR SCRIPT de la feuille du joueur refaite (fiche de la porte, passe 61 : J1 « Refaire, cases plus
// grandes » ; J2 : style décrit en mots ; spécification `tools/m09-lot-joueur-j1.mjs`), générée après l'accord du
// responsable : « Oui, génère le lot des villes (6 images, tools/m09-lot-villes-4.mjs) et la feuille J1 (1 image, la
// réserve seulement si besoin, tools/m09-lot-joueur-j1.mjs), traite-les par script et pose-les. »
// Même chaîne que la feuille de la passe 60 (`processSheet` de `tools/m09-traitement-images.mjs` : fond cyan retiré, grille
// d'art de 64 × 96 imposée, pieds alignés, tons clés exacts, palette réduite, agrandissement ×3), écrite dans
// `public/sprites/player.png` et son manifeste (contrat v3, `approved: false`), fiche `art-src/sprites/player/fiche.json` ;
// planche avant / après (`screenshots/qa/m09/j1/planche-j1.png`).
// Usage : node tools/m09-joueur-j1.mjs [nom du brut, défaut player-pixel-j1]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch } from './browser.mjs';
import { processSheet } from './m09-traitement-images.mjs';

const LOT = '2026-10-21-j1-joueur';
const NAME = process.argv[2] ?? 'player-pixel-j1';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const RAW = join(main, 'art-gen', LOT);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };

const prov = JSON.parse(readFileSync(join(RAW, 'provenance.json'), 'utf8'));
const g = prov.images.find((i) => i.name === NAME);
if (!g) throw new Error(`${NAME} absent de ${LOT}/provenance.json`);
const before = readFileSync('public/sprites/player.png');
const browser = await launch();
const pg = await (await browser.newContext()).newPage();
await pg.setContent('<!doctype html><html><body></body></html>');
const sheet = await pg.evaluate(processSheet, { url: dataUrl(readFileSync(join(RAW, `${NAME}.png`))), figures: true, levels: 'kmeans', cell: [64, 96] });
const k3 = fromUrl(sheet.K3);
// planche : avant (passe 60) | après (J1), au même agrandissement
const planche = await pg.evaluate(async ({ a, b }) => {
  const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const pad = 20; const top = 44;
  const c = new OffscreenCanvas(ia.width + ib.width + 3 * pad, Math.max(ia.height, ib.height) + top + pad);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#2a2e3a'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#e8dcc0'; x.font = 'bold 18px system-ui';
  x.fillText('Feuille du joueur : avant (passe 60) | après (J1 : écharpe sous le menton, proportions trapues) ; tons clés de recoloration ; non approuvée', pad, 28);
  x.drawImage(ia, pad, top); x.drawImage(ib, 2 * pad + ia.width, top);
  const blob = await c.convertToBlob({ type: 'image/png' });
  return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
}, { a: dataUrl(before), b: dataUrl(k3) });
await browser.close();

check(sheet.shifts.every((s) => s) && sheet.clipped === 0, `grille d’art ${sheet.cell.join(' × ')}, pas ${sheet.pitch.x} × ${sheet.pitch.y}, ${sheet.colors} couleurs, ancrage ${sheet.anchor}, figure ${sheet.figureH} px d’art, rien de rogné`);
check(['tenue', 'accent'].every((k) => Object.values(sheet.counts[k] ?? {}).some((n) => n > 0)), `tons clés : tenue ${JSON.stringify(sheet.counts.tenue)}, accent ${JSON.stringify(sheet.counts.accent)}`);
check(k3.length <= 1048576, `feuille ≤ 1 Mo : ${Math.round(k3.length / 1024)} Ko, ${dim(k3).join(' × ')}`);
mkdirSync('screenshots/qa/m09/j1', { recursive: true });
writeFileSync('screenshots/qa/m09/j1/planche-j1.png', fromUrl(planche));
if (!checks.every((c) => c.startsWith('OK'))) { console.log('feuille non posée (contrôles en échec) : générer la réserve, `--only player-pixel-j1b`'); process.exit(1); }

writeFileSync('public/sprites/player.png', k3);
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const playerEntry = {
  ...man.sprites.player, sha256: sha(k3), cell: sheet.cell, anchor: sheet.anchor, figureH: sheet.figureH,
  source: 'gpt-image-2 (feuille du joueur refaite, J1, reprise de M09), grille d’art, alignement, palette et tons clés par script (tools/m09-joueur-j1.mjs)',
  approved: false,
};
writeFileSync('public/sprites/manifest.json', `${JSON.stringify({ ...man, sprites: { ...man.sprites, player: playerEntry } }, null, 2)}\n`);
const ps = { nom: NAME, modele: g.model, point_d_acces: g.endpoint, date: g.date, parametres: g.params, prompt: g.prompt, entrees: g.inputs.map((x) => ({ chemin: x.path, sha256: x.sha256 })), brut: { fichier: `art-gen/${LOT}/${g.file} (dossier principal, ignoré par git)`, sha256: g.output.sha256, dimensions: [g.output.width, g.output.height] }, usage_api: g.usage };
const old = JSON.parse(readFileSync('art-src/sprites/player/fiche.json', 'utf8'));
writeFileSync('art-src/sprites/player/fiche.json', `${JSON.stringify({
  id: 'player',
  statut: 'feuille du joueur refaite (J1, reprise de M09, passe 95), NON APPROUVÉE par le responsable : refusée hors QA (approved: false) tant qu’il n’a pas décidé',
  auteur: 'Claude Code (session de reprise de M09, passe 95), à la demande du responsable : « Oui, génère le lot des villes (6 images, tools/m09-lot-villes-4.mjs) et la feuille J1 (1 image, la réserve seulement si besoin, tools/m09-lot-joueur-j1.mjs), traite-les par script et pose-les. »',
  generation: 'tools/m09-generer-images.mjs (clé lue à l’exécution dans .env.local du dossier principal, jamais affichée ni écrite) ; spécification tools/m09-lot-joueur-j1.mjs',
  aseprite: old.aseprite, licences: old.licences, contenu: old.contenu,
  style: 'style des PNJ de Cité du Tournoi DÉCRIT en mots (décision J2 du responsable ; briefs lus sans modification) ; aucune de leurs images en entrée',
  sources: [ps],
  traitement: { scripts: ['tools/m09-traitement-images.mjs (processSheet)', 'tools/m09-joueur-j1.mjs'], etapes: ['fond cyan et liseré teinté de cyan retirés ; alpha binaire', `pas des pixels d’art mesuré sur les arêtes (${sheet.pitch.x} × ${sheet.pitch.y} px)`, `figures repérées par les bandes vides ; grille d’art ${sheet.cell.join(' × ')} px d’art par case imposée, couleur majoritaire du cœur de chaque bloc`, 'pieds alignés sur une même ligne, tête centrée', 'tons clés : tenue (magenta) et accent (vert) ramenés exactement sur 64, 128, 191, 255', 'palette : couleurs naturelles réduites (k-moyennes)', 'agrandissement ×3 au plus proche'] },
  sortie: { fichier: 'public/sprites/player.png', sha256: sha(k3), octets: k3.length, entree_du_manifeste: playerEntry, tons_cles: sheet.counts, couleurs: sheet.colors },
  precedente: { brut: old.sources?.[0]?.brut ?? null, feuille: old.sortie?.sha256 ?? null, note: 'feuille de la passe 60, remplacée ; elle est la seule image d’entrée de J1' },
  chaine_des_empreintes: [`${ps.entrees[0].sha256} (feuille brute de la passe 60, en entrée)`, `${ps.brut.sha256} (brut)`, `${sha(k3)} (feuille ×3)`],
}, null, 2)}\n`);
mkdirSync('artifacts/qa/m09', { recursive: true });
writeFileSync('artifacts/qa/m09/joueur-j1.json', `${JSON.stringify({ date: new Date().toISOString(), brut: NAME, checks, pitch: sheet.pitch, anchor: sheet.anchor, figureH: sheet.figureH, colors: sheet.colors, counts: sheet.counts }, null, 2)}\n`);
console.log('feuille posée : public/sprites/player.png (approved: false)');
