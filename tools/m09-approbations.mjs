// M09 — approbations du responsable (AGENTS, « Images de la ville » : `approved: true` seulement après sa décision
// explicite, citée au JOURNAL). Le registre `art-src/approbations.json` liste chaque image approuvée avec son EMPREINTE et
// la décision citée. Une entrée de manifeste est `approved: true` si et seulement si son image figure au registre avec la
// même empreinte : une image retraitée (empreinte nouvelle) perd son approbation et ne s'affiche plus qu'en QA. Les scripts
// qui écrivent les manifestes lisent ce registre (`approuve`) ; ce script l'applique aux manifestes et aux fiches de
// provenance, ou vérifie qu'ils le suivent.
// Usage : node tools/m09-approbations.mjs            (applique le registre)
//         node tools/m09-approbations.mjs --verifier (n'écrit rien ; code 1 si un manifeste ou une fiche s'en écarte)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const REGISTRE = 'art-src/approbations.json';
export const MANIFESTES = [
  { chemin: 'public/decors/manifest.json', dossier: 'public/decors/' },
  { chemin: 'public/decors/manifest-profondeur.json', dossier: 'public/decors/' },
  { chemin: 'public/sprites/manifest.json', dossier: 'public/sprites/' },
];

const lire = () => (existsSync(REGISTRE) ? JSON.parse(readFileSync(REGISTRE, 'utf8')) : { images: [] });

/** L'image `chemin` (depuis la racine du dépôt), d'empreinte `sha256`, est-elle approuvée par le responsable ? */
export function approuve(chemin, sha256) {
  return lire().images.some((i) => i.fichier === chemin && i.sha256 === sha256);
}

/** Les entrées d'image d'un manifeste (plans de décor des îlots, feuilles de sprites). */
function entrees(man) {
  if (man.sprites) return Object.entries(man.sprites).map(([id, e]) => [`sprites/${id}`, e]);
  return Object.entries(man.ilots ?? {}).flatMap(([ilot, d]) => Object.entries(d.plans ?? {}).map(([id, e]) => [`${ilot}/${id}`, e]));
}

function statut(img) {
  return `APPROUVÉ par le responsable le ${img.date} (${img.decision}) : admis hors QA tant que l’empreinte reste ${img.sha256.slice(0, 12)}…`;
}

/** Applique le registre aux manifestes et aux fiches, ou relève seulement les écarts (`verifier`). */
export function appliquer({ verifier = false } = {}) {
  const reg = lire();
  const ecarts = [];
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  for (const img of reg.images) {
    if (!existsSync(img.fichier)) ecarts.push(`${img.fichier} : fichier absent`);
    else if (sha(readFileSync(img.fichier)) !== img.sha256) ecarts.push(`${img.fichier} : empreinte différente de l’image approuvée (approbation caduque)`);
  }
  let changes = 0;
  let approuvees = 0;
  const fiches = new Map();
  for (const m of MANIFESTES) {
    const texte = readFileSync(m.chemin, 'utf8');
    const man = JSON.parse(texte);
    for (const [id, e] of entrees(man)) {
      const fichier = m.dossier + e.file;
      if (sha(readFileSync(fichier)) !== e.sha256) ecarts.push(`${m.chemin} ${id} : empreinte du manifeste différente du fichier ${e.file}`);
      const img = reg.images.find((i) => i.fichier === fichier && i.sha256 === e.sha256);
      const voulu = !!img;
      if (voulu) approuvees++;
      if (e.approved !== voulu) {
        if (verifier) ecarts.push(`${m.chemin} ${id} : approved ${e.approved}, le registre dit ${voulu}`);
        e.approved = voulu;
        changes++;
      }
      if (img && e.fiche) fiches.set(e.fiche, img);
    }
    if (!verifier) {
      const nouveau = `${JSON.stringify(man, null, 2)}\n`;
      if (nouveau !== texte.replace(/\r\n/g, '\n')) writeFileSync(m.chemin, nouveau);
    }
  }
  for (const [chemin, img] of fiches) {
    const f = JSON.parse(readFileSync(chemin, 'utf8'));
    const voulu = statut(img);
    if (f.statut === voulu && f.approbation?.sha256 === img.sha256) continue;
    if (verifier) { ecarts.push(`${chemin} : statut de la fiche non à jour`); continue; }
    f.statut = voulu;
    f.approbation = { date: img.date, decision: img.decision, fichier: img.fichier, sha256: img.sha256 };
    writeFileSync(chemin, `${JSON.stringify(f, null, 2)}\n`);
  }
  return { images: reg.images.length, approuvees, changes, fiches: fiches.size, ecarts };
}

function main() {
  const verifier = process.argv.includes('--verifier');
  const r = appliquer({ verifier });
  console.log(`registre : ${r.images} images approuvées ; manifestes : ${r.approuvees} entrées approuvées, ${r.changes} ${verifier ? 'écart(s)' : 'changée(s)'} ; fiches : ${r.fiches}`);
  for (const e of r.ecarts) console.log(`ÉCART ${e}`);
  if (r.ecarts.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
