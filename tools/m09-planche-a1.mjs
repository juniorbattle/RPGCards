// M09 (reprise) — **planche d'approbation en bloc (A1)** et **inventaire pour la vérification des conditions d'OpenAI
// (A2)** : chaque planche du jeu tirée d'images générées (plans de décor des manifestes `public/decors/`, feuille du
// joueur de `public/sprites/`), en vignette, avec ce qu'elle fait dans le jeu (îlots, nombre de plans), sa taille, son
// statut, et les images générées dont elle est tirée (date, lot). Lit `artifacts/qa/m09/inventaire-images.json`
// (`tools/m09-inventaire-images.mjs`) ; écrit `screenshots/qa/m09/a1/planche-a1.png` et `docs/M09_IMAGES_A1_A2.md`.
// Ne change rien : aucune image, aucun manifeste, aucun statut.
// Usage : node tools/m09-inventaire-images.mjs && CHROMIUM_PATH=<Chrome> node tools/m09-planche-a1.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './browser.mjs';

const inv = JSON.parse(readFileSync('artifacts/qa/m09/inventaire-images.json', 'utf8'));
const ROLE = {
  'quai-ciel.png': 'ciel et ville haute au loin, fond de tous les îlots',
  'quai-troisieme-rang.png': 'la ville haute, au-dessus des toits de chaque quartier',
  'quai-second-rang.png': 'second rang de toits du Quai (ancien Quai)',
  'quai-facades.png': 'façades du Quai (rang 1 : salle de jeu de cartes, le Fanal)',
  'quai-pied-facades.png': 'pied des façades : étal, caisses, tonneaux (Quai ; morceaux réemployés)',
  'quai-rue.png': 'lampadaires et bornes du Quai (lampadaires de tous les quartiers)',
  'quai-premier-plan.png': 'mur du quai, bateaux (Quai) ; mur du canal (Ruelles)',
  'quai-eau.png': 'eau du port (Quai) et du canal (Ruelles)',
  'rangs-frise-a.png': 'rangée de maisons de ruelle : fonds et flancs des rangs 2 à 4',
  'rangs-frise-b.png': 'seconde rangée de maisons : fonds et flancs des rangs 2 à 4',
  'rangs-murs.png': 'murs des passages, des places et des bouts des ruelles',
  'rangs-monuments.png': 'halle, maison des Joueurs, chapelle (places et cœur du Quai)',
  'rangs-mobilier.png': 'puits, fontaine, étal, banc, charrette, niche',
  'villes-parvis-porte.png': 'pavillon de la porte du Tournoi (rang 1 du Parvis)',
  'villes-parvis-arene.png': 'grand mur de l’arène (cœur du Parvis)',
  'villes-ruelles-canal.png': 'maisons du canal et maison de la Fontaine (rang 1 des Ruelles)',
  'villes-ruelles-guilde.png': 'halle de la Guilde des joueurs (cœur des Ruelles)',
  'villes-cour-facades.png': 'la Maison du Tournoi (fond de la Grande Cour)',
  'villes-objets.png': 'monument des Quatre Voies, estrade, balustrade, brasero, kiosque, tableau',
  'player.png': 'feuille du duelliste joueur (marche, 4 familles par recoloration)',
};
// usage de chaque fichier, lu dans les manifestes (îlot et nombre de plans qui le découpent ; feuille de personnage)
const usageOf = new Map();
const addUse = (file, u) => { if (!usageOf.has(file)) usageOf.set(file, []); usageOf.get(file).push(u); };
for (const name of ['manifest-profondeur.json', 'manifest.json']) {
  const m = JSON.parse(readFileSync(`public/decors/${name}`, 'utf8'));
  for (const [ilot, e] of Object.entries(m.ilots)) {
    const n = {};
    for (const p of Object.values(e.plans)) n[p.file] = (n[p.file] ?? 0) + 1;
    for (const [file, k] of Object.entries(n)) addUse(file, `${ilot}${name === 'manifest.json' ? ' (ancien Quai, démo)' : ''} : ${k} plan${k > 1 ? 's' : ''}`);
  }
}
for (const [id, s] of Object.entries(JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8')).sprites)) addUse(s.file, `feuille « ${id} »`);
// planches du jeu : une ligne par fichier, avec ses usages et les images générées dont elle est tirée
const byFile = new Map();
for (const im of inv.images) {
  for (const p of im.planches) {
    const f = p.fichier.split('/').pop();
    const e = byFile.get(f) ?? { fichier: p.fichier, approved: p.approved, sources: [] };
    e.sources.push({ nom: im.nom, lot: im.lot, date: im.date });
    byFile.set(f, e);
  }
}
const lignes = [...byFile.entries()].filter(([f]) => usageOf.has(f)).map(([f, e]) => ({ fichier: e.fichier, role: ROLE[f] ?? '', approved: e.approved, sources: e.sources, usages: usageOf.get(f) }));
lignes.sort((a, b) => a.fichier.localeCompare(b.fichier));

const browser = await launch();
const pg = await (await browser.newContext()).newPage();
await pg.setContent('<!doctype html><html><body></body></html>');
const url = await pg.evaluate(async (rows) => {
  const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const im = await Promise.all(rows.map((r) => load(r.data)));
  const cols = 4; const tw = 440; const th = 250; const cap = 92; const pad = 16; const top = 56;
  const c = new OffscreenCanvas(cols * tw + (cols + 1) * pad, top + Math.ceil(rows.length / cols) * (th + cap + pad) + pad);
  const g = c.getContext('2d');
  g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e8dcc0'; g.font = 'bold 22px system-ui';
  g.fillText(`Planche d’approbation en bloc (A1) : ${rows.length} planches du jeu tirées d’images générées (gpt-image-2), toutes « approved: false »`, pad, 34);
  rows.forEach((r, n) => {
    const x = pad + (n % cols) * (tw + pad); const y = top + Math.floor(n / cols) * (th + cap + pad);
    g.fillStyle = '#2a2e3a'; g.fillRect(x, y, tw, th);
    // damier discret derrière les images détourées
    for (let yy = 0; yy < th; yy += 16) for (let xx = 0; xx < tw; xx += 16) if (((xx + yy) / 16) % 2) { g.fillStyle = '#323746'; g.fillRect(x + xx, y + yy, 16, 16); }
    const i = im[n]; const s = Math.min(tw / i.width, th / i.height);
    g.imageSmoothingEnabled = !r.pixel;
    g.drawImage(i, x + (tw - i.width * s) / 2, y + (th - i.height * s) / 2, i.width * s, i.height * s);
    g.fillStyle = '#e8dcc0'; g.font = 'bold 15px system-ui'; g.fillText(`${n + 1}. ${r.nom}`, x, y + th + 20);
    g.font = '13px system-ui'; g.fillStyle = '#c9c2b0';
    const wrap = (t, yy) => { const words = t.split(' '); let line = ''; let k = 0; for (const w of words) { const nl = line ? `${line} ${w}` : w; if (g.measureText(nl).width > tw && line) { g.fillText(line, x, yy + k * 17); k++; line = w; } else line = nl; } g.fillText(line, x, yy + k * 17); return k + 1; };
    const k = wrap(r.role, y + th + 38);
    g.fillStyle = '#9aa3b5'; wrap(r.usage, y + th + 38 + k * 17);
  });
  const b = await c.convertToBlob({ type: 'image/png' });
  return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
}, lignes.map((r) => ({ nom: r.fichier.split('/').pop(), role: r.role, usage: r.usages.join(' ; '), pixel: r.fichier.includes('sprites'), data: `data:image/png;base64,${readFileSync(r.fichier).toString('base64')}` })));
await browser.close();
mkdirSync('screenshots/qa/m09/a1', { recursive: true });
writeFileSync('screenshots/qa/m09/a1/planche-a1.png', Buffer.from(url.split(',')[1], 'base64'));

// document : A1 (planches) et A2 (images générées, dates, prompts, usage)
const md = [];
md.push('# M09 — images générées : approbation en bloc (A1) et conditions d’OpenAI (A2)', '');
md.push(`Généré par \`tools/m09-planche-a1.mjs\` depuis \`artifacts/qa/m09/inventaire-images.json\` (\`tools/m09-inventaire-images.mjs\`, ${inv.date.slice(0, 10)}). Aucun statut n’a été changé : toutes les planches sont \`approved: false\`. Seul le responsable approuve (AGENTS, « Images de la ville »).`, '');
md.push(`Résumé : **${inv.resume.generees} images générées** pour le jeu avec gpt-image-2 (budget de la porte : 30), **${inv.resume.dans_le_jeu} servent dans le jeu**, ${inv.resume.ecartees} ont été écartées (hors du jeu) ; ${inv.resume.references} références de conception, jamais dans le jeu ; **${lignes.length} planches** du jeu.`, '');
md.push('## A1 — les planches du jeu', '', 'Planche : `screenshots/qa/m09/a1/planche-a1.png`.', '');
md.push('| # | Planche | Ce qu’elle fait dans le jeu | Où | Tirée de (date UTC) |', '|---|---|---|---|---|');
lignes.forEach((r, n) => md.push(`| ${n + 1} | \`${r.fichier}\` | ${r.role} | ${r.usages.join(' ; ')} | ${r.sources.map((s) => `${s.nom} (${s.date.slice(0, 16).replace('T', ' ')})`).join(', ')} |`));
md.push('', '## A2 — les images générées (dates, points d’accès, usage)', '', 'Toutes avec le modèle `gpt-image-2`, par l’API d’OpenAI (`/v1/images/edits`, images d’entrée du projet seulement), clé lue à l’exécution dans `.env.local` du dossier principal (jamais affichée ni commitée). Bruts et provenance complète (prompt, paramètres, empreintes, usage de l’API) dans `art-gen/<lot>/provenance.json` du dossier principal (ignoré par git) ; prompts recopiés dans les fiches `art-src/`.', '');
md.push('| Date (UTC) | Lot | Image | Taille | Usage dans le jeu |', '|---|---|---|---|---|');
for (const i of inv.images) md.push(`| ${i.date.slice(0, 16).replace('T', ' ')} | ${i.lot} | ${i.nom} | ${i.taille} | ${i.dans_le_jeu.length ? [...new Set(i.dans_le_jeu.map((u) => u.ilot ?? `feuille ${u.feuille}`))].join(', ') : 'écartée (hors du jeu)'} |`);
md.push('', '### Prompts', '');
for (const i of inv.images) md.push(`<details><summary>${i.lot} / ${i.nom} (${i.date.slice(0, 16).replace('T', ' ')} UTC)</summary>`, '', '```text', i.prompt, '```', '', `Entrées : ${i.entrees.map((e) => `\`${e.chemin}\``).join(', ')}`, '', '</details>', '');
md.push('## Références de conception (jamais dans le jeu)', '', '| Fichier | Date | Statut |', '|---|---|---|');
for (const r of inv.references) md.push(`| \`${r.fichier}\` | ${String(r.date).slice(0, 16).replace('T', ' ')} | ${r.statut} |`);
writeFileSync('docs/M09_IMAGES_A1_A2.md', `${md.join('\n')}\n`);
console.log(`OK planche A1 : ${lignes.length} planches ; docs/M09_IMAGES_A1_A2.md`);
