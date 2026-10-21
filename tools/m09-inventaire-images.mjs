// M09 (reprise) — **inventaire des images générées** pour la vérification des conditions d'OpenAI par le responsable (A2)
// et la planche d'approbation en bloc (A1) : chaque image produite avec gpt-image-2 pour le jeu (date, lot, point
// d'accès, taille, qualité, prompt complet, images d'entrée, empreinte du brut), les planches du jeu qui en sont tirées
// (fichier, empreinte, statut `approved`) et ce qu'elles font dans le jeu (îlots et plans des manifestes, feuille du
// joueur) ; puis les références de conception (`reference/generated/`, jamais dans le jeu). Lit les provenances des lots
// (`art-gen/<lot>/provenance.json`, dossier principal, ignoré par git), les fiches (`art-src/`) et les manifestes
// (`public/decors/`, `public/sprites/`). Ne change rien : aucune image, aucun manifeste, aucun statut.
// Usage : node tools/m09-inventaire-images.mjs [sortie.json]
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const OUT = process.argv[2] ?? 'artifacts/qa/m09/inventaire-images.json';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

// planches du jeu : fiche → bruts dont elles sont tirées
const planches = [];
for (const kind of ['decors', 'sprites']) {
  for (const id of readdirSync(join('art-src', kind))) {
    const f = join('art-src', kind, id, 'fiche.json');
    if (!existsSync(f)) continue;
    const fi = json(f);
    planches.push({ kind, id, fiche: f.replace(/\\/g, '/'), fichier: fi.sortie?.fichier ?? null, sha256: fi.sortie?.sha256 ?? null, bruts: (fi.sources ?? []).map((s) => s.brut?.sha256).filter(Boolean) });
  }
}
// usage dans le jeu : plans des manifestes de décor (par fichier), feuilles de personnages
const usage = new Map();
const add = (file, u) => { if (!usage.has(file)) usage.set(file, []); usage.get(file).push(u); };
const approvedOf = new Map();
for (const name of readdirSync('public/decors').filter((f) => /^manifest(-[\w-]+)?\.json$/.test(f))) {
  const m = json(join('public/decors', name));
  for (const [ilot, e] of Object.entries(m.ilots)) {
    const byFile = {};
    for (const [pid, p] of Object.entries(e.plans)) { (byFile[p.file] ??= []).push(pid); approvedOf.set(p.file, p.approved); }
    for (const [file, ids] of Object.entries(byFile)) add(file, { manifeste: name, ilot, plans: ids.length, exemples: ids.slice(0, 4) });
  }
}
const spr = json('public/sprites/manifest.json');
for (const [id, s] of Object.entries(spr.sprites)) { add(s.file, { manifeste: 'sprites/manifest.json', feuille: id }); approvedOf.set(s.file, s.approved); }

// images générées, lot par lot
const images = [];
for (const lot of readdirSync(AG).sort()) {
  const p = join(AG, lot, 'provenance.json');
  if (!existsSync(p)) continue;
  for (const i of json(p).images) {
    const tirees = planches.filter((pl) => pl.bruts.includes(i.output.sha256));
    const files = tirees.map((t) => t.fichier?.split('/').pop()).filter(Boolean);
    images.push({
      lot, nom: i.name, date: i.date, modele: i.model, point_d_acces: i.endpoint, taille: i.params?.size, qualite: i.params?.quality,
      prompt: i.prompt, entrees: i.inputs.map((x) => ({ chemin: x.path.replace(main.replace(/\\/g, '/'), '<dossier principal>'), sha256: x.sha256 })),
      brut: { sha256: i.output.sha256, dimensions: [i.output.width, i.output.height] }, usage_api: i.usage ?? null,
      planches: tirees.map((t) => ({ fichier: t.fichier, fiche: t.fiche, approved: approvedOf.get(t.fichier?.split('/').pop()) ?? null })),
      dans_le_jeu: files.flatMap((f) => usage.get(f) ?? []),
    });
  }
}
// références de conception (jamais dans le jeu)
const references = [];
for (const d of readdirSync('reference/generated')) {
  const f = join('reference/generated', d, 'fiche.json');
  if (!existsSync(f)) continue;
  const fi = json(f);
  for (const im of fi.images ?? []) references.push({ demande: d, fichier: `reference/generated/${d}/${im.file}`, date: fi.date, modele: im.model, statut: fi.statut, usage: fi.usage, prompt: im.prompt });
}
const enJeu = images.filter((i) => i.dans_le_jeu.length);
const out = {
  date: new Date().toISOString(),
  resume: { generees: images.length, dans_le_jeu: enJeu.length, ecartees: images.length - enJeu.length, references: references.length, planches: planches.length, approuvees: [...approvedOf.values()].filter(Boolean).length },
  images, references,
};
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out.resume));
for (const i of images) console.log(`${i.date.slice(0, 16)} ${i.lot}/${i.nom} ${i.taille} → ${i.dans_le_jeu.length ? [...new Set(i.dans_le_jeu.map((u) => u.ilot ?? u.feuille))].join(', ') : 'écartée (hors du jeu)'}`);
