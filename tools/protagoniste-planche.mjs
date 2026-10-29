// Planche des feuilles du protagoniste (passes 164 et 167) : silhouettes A et B et leurs coupes, côte à côte, en tons
// clés, avec leur statut d'approbation, puis le cycle de profil de chacune (plan du manifeste), posé sur sa ligne des pieds.
// Usage : node tools/protagoniste-planche.mjs [sortie] [feuilles, défaut player,player-b,player-a2,player-b2]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/protagoniste/silhouettes/planche-silhouettes.png';
const IDS = (process.argv[3] ?? 'player,player-b,player-a2,player-b2').split(',');
const COUPE = { player: 'A, carré', 'player-b': 'B, courte', 'player-a2': 'A, queue de cheval', 'player-b2': 'B, mi-longue' };
const VIS = ['', ', yeux en amande', ', visage rond', ', visage anguleux'];
const NOMS = Object.fromEntries(Object.entries(COUPE).flatMap(([k, v]) => VIS.map((s, i) => [i ? `${k}-v${i}` : k, v + s])));
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const feuille = (id) => ({ id, nom: NOMS[id] ?? id, url: `data:image/png;base64,${readFileSync(`public/sprites/${man.sprites[id].file}`).toString('base64')}`, e: man.sprites[id] });
const browser = await launch();
try {
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  const url = await pg.evaluate(async (fs) => {
    const ims = await Promise.all(fs.map(async (f) => { const i = new Image(); i.src = f.url; await i.decode(); return i; }));
    const pad = 24; const top = 48; const W0 = 960; const H0 = 900; const Z = 3;
    const cw = 64 * Z; const ch = 100 * Z;
    const lignesFeuilles = Math.ceil(fs.length / 2);
    const c = new OffscreenCanvas(2 * W0 + 3 * pad, top + lignesFeuilles * (H0 + 40) + Math.ceil(fs.length / 2) * (ch + 40) + pad);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#1d212b'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = 'bold 18px system-ui';
    g.fillText('Protagoniste : feuilles des silhouettes et des coupes (tons clés de recoloration ; peau, cheveux et yeux repeints en jeu par code)', pad, 30);
    g.font = '15px system-ui';
    fs.forEach((f, k) => {
      const x = pad + (k % 2) * (W0 + pad); const y = top + Math.floor(k / 2) * (H0 + 40);
      g.fillStyle = '#c8c0aa';
      g.fillText(`${f.nom} : ${f.e.file}, case ${f.e.cell.join(' × ')}, figure ${f.e.figureH} px d’art, ${f.e.approved ? 'approuvée' : 'NON approuvée'}`, x, y + 4);
      g.drawImage(ims[k], x, y + 14);
    });
    const y0 = top + lignesFeuilles * (H0 + 40);
    fs.forEach((f, k) => {
      const p = f.e.profil; const cyc = [p.contacts[0], p.passages[0], p.contacts[1], p.passages[1]];
      const x0 = pad + (k % 2) * (W0 + pad); const y = y0 + Math.floor(k / 2) * (ch + 40) + 20;
      g.fillStyle = '#c8c0aa';
      g.fillText(`${f.nom} : cycle de profil ${cyc.join(', ')}${p.dessines ? ' (passages dessinés par la feuille)' : ' (passages redessinés par code au chargement, non montrés ici)'}`, x0, y - 8);
      const [cwA, chA] = f.e.cell; const s = ims[k].width / (5 * cwA);
      cyc.forEach((col, j) => {
        const x = x0 + j * (cw + 12);
        g.fillStyle = '#2a2f3c'; g.fillRect(x, y, cw, ch);
        g.drawImage(ims[k], col * cwA * s, 2 * chA * s, cwA * s, chA * s, x, y + ch - chA * Z, cwA * Z, chA * Z);
        g.fillStyle = '#7a5a3a'; g.fillRect(x, y + ch - chA * Z + f.e.anchor[1] * Z, cw, 2);
      });
    });
    const blob = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  }, IDS.map(feuille));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64'));
} finally {
  await browser.close();
}
console.log(`planche : ${OUT}`);
