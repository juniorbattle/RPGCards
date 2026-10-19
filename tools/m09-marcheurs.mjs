// M09 — planche des personnages de la ville (atlas de marche : repos + 4 temps, face / dos / profil) : joueur des
// quatre familles, PNJ et passants du Quai et du Parvis, Kaï, Orin. Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-marcheurs.mjs [png]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/m09/marcheurs.png';
const IDS = ['player-Cendre', 'player-Voile', 'player-Ronce', 'player-Astre', 'pnj-marchande-9', 'pnj-docker-1', 'pnj-commis-5', 'braise', 'astre', 'pnj-joueuse-5', 'pnj-joueuse-1', 'pnj-docker-9', 'pnj-commis-2'];
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4285, process.env.LQV_DIST || 'dist');
const browser = await launch();
try {
  const p = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  await p.goto(`${server.base}/?ville=1&qa=1&freeze=1`);
  await p.waitForFunction(() => !!window.__lqvVille);
  const png = await p.evaluate(async (ids) => {
    const imgs = await Promise.all(ids.map(async (id) => { const i = new Image(); i.src = window.__lqvVille.atlas(id); await i.decode(); return i; }));
    const W = imgs[0].width; const H = imgs[0].height;
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * Math.ceil(ids.length / 2);
    const g = c.getContext('2d'); g.fillStyle = '#2a2f3c'; g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, k) => g.drawImage(im, (k % 2) * W, Math.floor(k / 2) * H));
    return c.toDataURL('image/png');
  }, IDS);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
  console.log(OUT);
} finally {
  await browser.close();
  server.stop();
}
