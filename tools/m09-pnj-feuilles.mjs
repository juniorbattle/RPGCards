// M09, reprise du 2026-10-25 — traitement PAR SCRIPT des feuilles des PNJ de la ville (décision du responsable, passe 125 :
// « 16, avec une porte » ; spécification de la porte : `tools/m09-lot-pnj-porte.mjs`), même chaîne que la feuille du joueur
// (`processSheet` de `tools/m09-traitement-images.mjs` : fond retiré, grille d'art de 64 × 96 imposée, pieds alignés,
// tons clés exacts, palette réduite, agrandissement ×3), écrites dans `public/sprites/<id>.png` et leur manifeste (contrat
// v3 ; `approved` selon le registre des approbations, `tools/m09-approbations.mjs`), fiche `art-src/sprites/<id>/fiche.json`.
// Contrôle de non-régression : la feuille du joueur, retraitée par la même fonction, garde son empreinte.
// Usage : node tools/m09-pnj-feuilles.mjs <id>[=<brut>] ...   (ex. `pnj-docker` ou `pnj-docker=pnj-docker-p1b`)
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch } from './browser.mjs';
import { processSheet } from './m09-traitement-images.mjs';
import { approuve } from './m09-approbations.mjs';

/** Les feuilles des PNJ : lot et brut par défaut, fond, emplacements en tons clés (recolorés dans le nuanceur). */
export const FEUILLES = {
  'pnj-docker': { lot: '2026-10-25-pnj-porte', brut: 'pnj-docker-p1', bg: 'bleu', slots: ['peau', 'cheveux', 'tenue', 'chemise'], qui: 'gabarit docker (dockers, membres, passants), recoloré par graine' },
  braise: { lot: '2026-10-25-pnj-porte', brut: 'braise-p2', bg: 'cyan', slots: [], pitchMin: 3.2, qui: 'Kaï, la Braise du quai (couleurs propres)' },
  // suite (passe 127, `tools/m09-lot-pnj-suite.mjs`)
  ...Object.fromEntries([
    ['pnj-marchande', 'bleu', true, 'gabarit marchande (marchandes, cadette de la Cendre, passantes), recoloré par graine'],
    ['pnj-commis', 'bleu', true, 'gabarit commis (commis, cadets de la Ronce et du Voile, passants), recoloré par graine'],
    ['pnj-joueuse', 'bleu', true, 'gabarit joueuse (joueuses, cadette de l’Astre, Tenante), recoloré par graine'],
    ['ronce', 'cyan', false, 'Maëlle, gardienne des Ronces (couleurs propres)'],
    ['voile', 'magenta', false, 'Sélène, liseuse du Voile (couleurs propres)'],
    ['astre', 'cyan', false, 'Orin, l’arpenteur des Astres (couleurs propres)'],
    ['chef-cendre', 'cyan', false, 'Bran, le Premier Feu, chef de la Cendre (couleurs propres)'],
    ['chef-ronce', 'cyan', false, 'Mère Aubépine, cheffe de la Ronce (couleurs propres)'],
    ['chef-voile', 'cyan', false, 'Ilse, la Dame aux Voiles, cheffe du Voile (couleurs propres)'],
    ['chef-astre', 'cyan', false, 'Halvard, le Cartographe, chef de l’Astre (couleurs propres)'],
  ].map(([id, bg, cles, qui]) => [id, { lot: '2026-10-25-pnj-suite', brut: `${id}-s1`, bg, slots: cles ? ['peau', 'cheveux', 'tenue', 'chemise'] : [], qui }])),
};
// pas des pixels d'art borné quand la mesure tombe sur un sous-multiple ou un multiple (contrôles en échec ou axes
// très inégaux au premier traitement, passe 127)
Object.assign(FEUILLES.astre, { pitchMin: 3.2, pitchMax: 4.6 });
Object.assign(FEUILLES.voile, { pitchMin: 3.2, pitchMax: 4.6 });
/** Lot de génération : passe, spécification et ordre du responsable. */
const LOTS = {
  '2026-10-25-pnj-porte': { passe: 125, etape: 'porte', spec: 'tools/m09-lot-pnj-porte.mjs', ordre: 'budget « 16, avec une porte » (d’abord 2 feuilles posées in situ sur une planche, puis les 10 autres ; 4 images pour régénérer une feuille ratée)' },
  '2026-10-25-pnj-suite': { passe: 127, etape: 'suite', spec: 'tools/m09-lot-pnj-suite.mjs', ordre: '« Oui : génère les 10 autres feuilles des PNJ (gabarits marchande, commis, joueuse ; Maëlle, Sélène, Orin ; les quatre chefs), traite-les et pose-les. »' },
};

const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const args = process.argv.slice(2);
if (!args.length) throw new Error('usage : node tools/m09-pnj-feuilles.mjs <id>[=<brut>] ...');

const browser = await launch();
const report = { date: new Date().toISOString(), feuilles: {}, regression: null };
let echecs = 0;
try {
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  // non-régression : la feuille du joueur (brut de J1) retraitée par la fonction étendue garde son empreinte
  const j1 = await pg.evaluate(processSheet, { url: dataUrl(readFileSync(join(main, 'art-gen', '2026-10-21-j1-joueur', 'player-pixel-j1.png'))), figures: true, levels: 'kmeans', cell: [64, 96] });
  const shaJ1 = sha(fromUrl(j1.K3)); const shaPlayer = sha(readFileSync('public/sprites/player.png'));
  report.regression = { ok: shaJ1 === shaPlayer, shaJ1, shaPlayer };
  console.log(`${shaJ1 === shaPlayer ? 'OK' : 'ÉCHEC'} feuille du joueur retraitée identique (${shaJ1.slice(0, 12)})`);
  if (shaJ1 !== shaPlayer) echecs++;

  const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
  for (const a of args) {
    const [id, brutArg] = a.split('=');
    const F = FEUILLES[id];
    if (!F) throw new Error(`feuille inconnue : ${id}`);
    const brut = brutArg ?? F.brut;
    const L = LOTS[F.lot];
    const RAW = join(main, 'art-gen', F.lot);
    const prov = JSON.parse(readFileSync(join(RAW, 'provenance.json'), 'utf8'));
    const g = prov.images.find((i) => i.name === brut);
    if (!g) throw new Error(`${brut} absent de ${F.lot}/provenance.json`);
    const checks = [];
    const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${id} : ${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
    let sheet;
    try {
      sheet = await pg.evaluate(processSheet, { url: dataUrl(readFileSync(join(RAW, `${brut}.png`))), figures: true, levels: 'kmeans', cell: [64, 96], bg: F.bg, slots: F.slots, pitchMin: F.pitchMin, pitchMax: F.pitchMax });
    } catch (e) {
      check(false, `traitement : ${String(e.message ?? e).slice(0, 200)}`);
      report.feuilles[id] = { brut, checks }; echecs++; continue;
    }
    const k3 = fromUrl(sheet.K3);
    check(sheet.shifts.every((s) => s) && sheet.clipped === 0, `grille d’art ${sheet.cell.join(' × ')}, pas ${sheet.pitch.x} × ${sheet.pitch.y}, ${sheet.colors} couleurs, ancrage ${sheet.anchor}, figure ${sheet.figureH} px d’art, rien de rogné`);
    const hauteurs = sheet.shifts.map((s) => s?.h ?? 0);
    check(Math.max(...hauteurs) - Math.min(...hauteurs) <= 8, `hauteurs des 15 figures régulières (${Math.min(...hauteurs)} à ${Math.max(...hauteurs)} px d’art)`);
    for (const s of F.slots) check(Object.values(sheet.counts[s] ?? []).filter((n) => n > 0).length >= 2, `ton clé ${s} présent sur au moins deux niveaux : ${JSON.stringify(sheet.counts[s])}`);
    check(k3.length <= 1048576, `feuille ≤ 1 Mo : ${Math.round(k3.length / 1024)} Ko, ${dim(k3).join(' × ')}`);
    mkdirSync(`artifacts/qa/m09/pnj`, { recursive: true });
    report.feuilles[id] = { brut, checks, pitch: sheet.pitch, anchor: sheet.anchor, figureH: sheet.figureH, colors: sheet.colors, counts: sheet.counts, hauteurs };
    if (!checks.every((c) => c.startsWith('OK'))) { echecs++; console.log(`${id} : feuille non posée (contrôles en échec) ; régénérer la réserve si besoin`); continue; }

    const file = `${id}.png`;
    writeFileSync(`public/sprites/${file}`, k3);
    const entry = {
      file, sha256: sha(k3), cell: sheet.cell, cols: 5, rows: 3, pixel: true, scale: 3, anchor: sheet.anchor, figureH: sheet.figureH,
      recolor: F.slots,
      source: `gpt-image-2 (feuille des PNJ de la ville, ${F.qui}, reprise de M09), grille d’art, alignement, palette et tons clés par script (tools/m09-pnj-feuilles.mjs)`,
      fiche: `art-src/sprites/${id}/fiche.json`,
      approved: approuve(`public/sprites/${file}`, sha(k3)),
    };
    man.sprites[id] = entry;
    const ps = { nom: brut, modele: g.model, point_d_acces: g.endpoint, date: g.date, parametres: g.params, prompt: g.prompt, entrees: g.inputs.map((x) => ({ chemin: x.path, sha256: x.sha256 })), brut: { fichier: `art-gen/${F.lot}/${g.file} (dossier principal, ignoré par git)`, sha256: g.output.sha256, dimensions: [g.output.width, g.output.height] }, usage_api: g.usage };
    const joueur = JSON.parse(readFileSync('art-src/sprites/player/fiche.json', 'utf8'));
    mkdirSync(`art-src/sprites/${id}`, { recursive: true });
    writeFileSync(`art-src/sprites/${id}/fiche.json`, `${JSON.stringify({
      id,
      statut: `feuille des PNJ de la ville (${F.qui}), ${L.etape} de la deuxième reprise de M09 (passe ${L.passe}), NON APPROUVÉE par le responsable : refusée hors QA (approved: false) tant qu’il n’a pas décidé`,
      auteur: `Claude Code (session de reprise de M09, passe ${L.passe}), à la demande du responsable : ${L.ordre}`,
      generation: `tools/m09-generer-images.mjs (clé lue à l’exécution dans .env.local du dossier principal, jamais affichée ni écrite) ; spécification ${L.spec}`,
      aseprite: joueur.aseprite, licences: joueur.licences, contenu: joueur.contenu,
      style: 'style, échelle et proportions de la feuille du joueur approuvée (en entrée) ; identité tirée de notre atlas dessiné par code (en entrée)',
      sources: [ps],
      traitement: { scripts: ['tools/m09-traitement-images.mjs (processSheet)', 'tools/m09-pnj-feuilles.mjs'], etapes: [`fond ${F.bg} et liseré teinté retirés ; alpha binaire`, `pas des pixels d’art mesuré sur les arêtes (${sheet.pitch.x} × ${sheet.pitch.y} px)`, `figures repérées par les bandes vides ; grille d’art ${sheet.cell.join(' × ')} px d’art par case imposée, couleur majoritaire du cœur de chaque bloc`, 'pieds alignés sur une même ligne, tête centrée', F.slots.length ? `tons clés (${F.slots.join(', ')}) ramenés exactement sur 64, 128, 191, 255` : 'aucun ton clé (couleurs propres)', 'palette : couleurs naturelles réduites (k-moyennes)', 'agrandissement ×3 au plus proche'] },
      sortie: { fichier: `public/sprites/${file}`, sha256: sha(k3), octets: k3.length, entree_du_manifeste: entry, tons_cles: sheet.counts, couleurs: sheet.colors },
      chaine_des_empreintes: [...ps.entrees.map((e) => `${e.sha256} (entrée : ${e.chemin.replace(/^.*\/(art-gen|public)\//, '$1/')})`), `${ps.brut.sha256} (brut)`, `${sha(k3)} (feuille ×3)`],
    }, null, 2)}\n`);
    console.log(`${id} : feuille posée, public/sprites/${file} (approved: ${entry.approved})`);
  }
  writeFileSync('public/sprites/manifest.json', `${JSON.stringify(man, null, 2)}\n`);
} finally {
  await browser.close();
}
mkdirSync('artifacts/qa/m09/pnj', { recursive: true });
const OUT = 'artifacts/qa/m09/pnj/feuilles.json';
let prev = {};
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* premier passage */ }
writeFileSync(OUT, `${JSON.stringify({ ...report, feuilles: { ...(prev.feuilles ?? {}), ...report.feuilles } }, null, 2)}\n`);
process.exit(echecs ? 1 : 0);
