// Planche des deux silhouettes du protagoniste (passe 164) : feuilles A (approuvée) et B (générée, non approuvée) côte à
// côte, en tons clés, puis le cycle de profil de chacune (plan du manifeste) agrandi, posé sur sa ligne des pieds.
// Usage : node tools/protagoniste-planche.mjs [sortie, défaut screenshots/qa/protagoniste/silhouettes/planche-silhouettes.png]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/protagoniste/silhouettes/planche-silhouettes.png';
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const feuille = (id) => ({ id, url: `data:image/png;base64,${readFileSync(`public/sprites/${man.sprites[id].file}`).toString('base64')}`, e: man.sprites[id] });
const browser = await launch();
try {
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  const url = await pg.evaluate(async (fs) => {
    const ims = await Promise.all(fs.map(async (f) => { const i = new Image(); i.src = f.url; await i.decode(); return i; }));
    const pad = 24; const top = 48; const W0 = ims[0].width; const H0 = ims[0].height;
    const Z = 4; const cw = 64 * Z; const ch = 96 * Z;
    const c = new OffscreenCanvas(2 * W0 + 3 * pad, top + H0 + 60 + 2 * (ch + 40) + pad);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#1d212b'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = 'bold 18px system-ui';
    g.fillText('Protagoniste : silhouette A (approuvée) | silhouette B (générée, traitée par script, NON approuvée) — tons clés de recoloration', pad, 30);
    g.font = '15px system-ui';
    fs.forEach((f, k) => { g.fillStyle = '#c8c0aa'; g.fillText(`${f.id === 'player' ? 'A' : 'B'} : ${f.e.file}, figure ${f.e.figureH} px d’art${f.e.approved ? '' : ', non approuvée'}`, pad + k * (W0 + pad), top + 4); g.drawImage(ims[k], pad + k * (W0 + pad), top + 14); });
    fs.forEach((f, k) => {
      const p = f.e.profil; const cyc = [p.contacts[0], p.passages[0], p.contacts[1], p.passages[1]];
      const y = top + H0 + 60 + k * (ch + 40);
      g.fillStyle = '#c8c0aa';
      g.fillText(`${f.id === 'player' ? 'A' : 'B'} : cycle de profil ${cyc.join(', ')} (contact, passage, contact, passage${p.dessines ? ' ; passages dessinés par la feuille' : ' ; passages redessinés par code au chargement, non montrés ici'})`, pad, y - 8);
      const s = ims[k].width / 320;
      cyc.forEach((col, j) => {
        const x = pad + j * (cw + 12);
        g.fillStyle = '#2a2f3c'; g.fillRect(x, y, cw, ch);
        g.drawImage(ims[k], col * 64 * s, 2 * 96 * s, 64 * s, 96 * s, x, y, cw, ch);
        g.fillStyle = '#7a5a3a'; g.fillRect(x, y + f.e.anchor[1] * Z, cw, 2);
      });
    });
    const blob = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  }, [feuille('player'), feuille('player-b')]);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64'));
} finally {
  await browser.close();
}
console.log(`planche : ${OUT}`);
