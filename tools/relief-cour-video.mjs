// Marches devant les escaliers, avant et après l'essai de profondeur (retour du responsable du 2026-11-14) : devant la
// maison à l'escalier de la Grande Cour, et dans la ruelle des Lanternes, un rang profond du Quai, devant sa volée du fond.
// Laboratoire, 1280 × 720, horloge de la page tenue par Playwright (images à pas fixe, 30 par seconde) ; le joueur marche
// vers la droite, s'arrête, revient ; la caméra le suit et l'escalier passe de biais. Pour chaque marche, deux films (avant :
// `?volume=0`, le relief de la passe 162 ; après : l'essai) côte à côte, enregistrés en webm dans la page (MediaRecorder,
// chaque image envoyée par `requestFrame` ; non suivis par git), et la planche de six images de chaque film (suivie).
// Usage : npm run build && [LQV_VIDEO=cour|quai] node tools/relief-cour-video.mjs [sortie (dossier)]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/retours-2026-11-14';
const FPS = 30;
const N = 150;
const VP = { width: 1280, height: 720 };
// la moitié droite de l'écran, où passe la maison à l'escalier
// deux marches : devant la maison à l'escalier de la Grande Cour (`cour`), et dans la ruelle des Lanternes, un rang profond
// du Quai, devant la volée du fond (`quai`) ; `LQV_VIDEO` choisit (défaut : les deux)
const MARCHES = {
  cour: { ilot: 'cour', depart: { x: 0, z: -10.4 }, clip: { x: 560, y: 110, width: 720, height: 420 }, titre: 'Grande Cour, marche devant la maison à l’escalier', nom: 'escalier' },
  quai: { ilot: 'quai', depart: { x: -12, z: -26.3 }, clip: { x: 120, y: 110, width: 720, height: 420 }, titre: 'Quai, rang profond : marche dans la ruelle des Lanternes', nom: 'ruelle-lanternes' },
};
const CHOIX = (process.env.LQV_VIDEO ?? 'cour,quai').split(',');
mkdirSync(OUT, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4393, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
try {
for (const cle of CHOIX) {
  const M = MARCHES[cle];
  const CLIP = M.clip;
  const films = {};
  for (const [nom, q] of [['avant', '&volume=0'], ['apres', '']]) {
    const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    watchConsole(p, erreurs);
    await p.clock.install();
    await p.goto(`${server.base}/?ville=1&qa=1&profondeur=1&ilot=${M.ilot}&decors=approuvees&sprites=approuvees${q}`);
    for (let i = 0; i < 600; i++) {
      await p.clock.runFor(100);
      if (await p.evaluate(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3)) break;
    }
    await p.evaluate((at) => window.__lqvVille.town.place(at, 'droite'), M.depart);
    await p.clock.runFor(1500);
    const images = [];
    const parcours = [await p.evaluate(() => +window.__lqvVille.town.walker().pos.x.toFixed(2))];
    const etapes = [['ArrowRight', Math.round(N * 0.6)], [null, Math.round(N * 0.1)], ['ArrowLeft', N - Math.round(N * 0.6) - Math.round(N * 0.1)]];
    for (const [touche, n] of etapes) {
      if (touche) await p.keyboard.down(touche);
      for (let i = 0; i < n; i++) { await p.clock.runFor(1000 / FPS); images.push(await p.screenshot({ clip: CLIP, type: 'jpeg', quality: 85 })); }
      if (touche) await p.keyboard.up(touche);
      parcours.push(await p.evaluate(() => +window.__lqvVille.town.walker().pos.x.toFixed(2)));
    }
    console.log(`${nom} : le joueur passe par x = ${parcours.join(' → ')}`);
    if (Math.max(...parcours) - Math.min(...parcours) < 3) erreurs.push('error: le joueur n’a pas marché');
    films[nom] = images.map((b) => `data:image/jpeg;base64,${b.toString('base64')}`);
    await ctx.close();
  }
  const vctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
  const v = await vctx.newPage();
  await v.setContent('<!doctype html><html><body style="margin:0;background:#11131a"></body></html>');
  const webm = await v.evaluate(async ({ films, fps, clip, titre }) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const a = await Promise.all(films.avant.map(load));
    const b = await Promise.all(films.apres.map(load));
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    document.body.append(c);
    const x = c.getContext('2d');
    const k = 630 / clip.width;
    const h = clip.height * k;
    const peindre = (i) => {
      x.fillStyle = '#11131a'; x.fillRect(0, 0, 1280, 720);
      x.fillStyle = '#e8dcc0'; x.font = '600 20px system-ui';
      x.fillText(titre, 10, 34);
      x.font = '600 17px system-ui';
      x.fillStyle = '#b9b2a0'; x.fillText('Avant (relief de la passe 162)', 10, 78);
      x.fillStyle = '#f0c878'; x.fillText('Après (volumes éclairés, ombres au sol, escalier en vrai 3D)', 650, 78);
      x.drawImage(a[i % a.length], 0, 0, clip.width, clip.height, 10, 92, 630, h);
      x.drawImage(b[i % b.length], 0, 0, clip.width, clip.height, 650, 92, 630, h);
    };
    peindre(0);
    // chaque image envoyée explicitement (captureStream(0) et requestFrame) : sans fenêtre, le navigateur ne compose pas
    // le canevas de lui-même et l'enregistreur ne recevait qu'une dizaine d'images
    const flux = c.captureStream(0);
    const piste = flux.getVideoTracks()[0];
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 8e6 });
    const morceaux = [];
    rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
    const fin = new Promise((res) => { rec.onstop = res; });
    rec.start();
    for (let n = 0; n < a.length * 2; n++) { peindre(n); piste.requestFrame(); await new Promise((r) => setTimeout(r, 1000 / fps)); }
    rec.stop();
    await fin;
    const blob = new Blob(morceaux, { type: 'video/webm' });
    return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(blob); });
  }, { films, fps: FPS, clip: CLIP, titre: M.titre });
  await vctx.close();
  const octets = Buffer.from(String(webm).split(',')[1] ?? '', 'base64');
  const nom = join(OUT, `marche-${M.nom}-1280.webm`);
  if (octets.length > 1000) writeFileSync(nom, octets);
  console.log(`${octets.length > 1000 ? 'OK' : 'ÉCHEC'} capture animée : ${nom} (${Math.round(octets.length / 1024)} Kio, ${films.avant.length} images par film)`);
  // la planche des deux films (suivie par git) : six images de la marche, avant au-dessus, après dessous
  const pl = await (await browser.newContext()).newPage();
  await pl.setContent('<!doctype html><html><body></body></html>');
  const choix = [0, 30, 60, 85, 110, 140].filter((i) => i < films.avant.length);
  const url = await pl.evaluate(async ({ films, choix, titre }) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const rangs = [await Promise.all(choix.map((i) => load(films.avant[i]))), await Promise.all(choix.map((i) => load(films.apres[i])))];
    const w = 360; const h = Math.round((rangs[0][0].height * w) / rangs[0][0].width);
    const c = new OffscreenCanvas(choix.length * (w + 6) + 6, 2 * (h + 30) + 40);
    const g = c.getContext('2d');
    g.fillStyle = '#151820'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = '600 18px system-ui';
    g.fillText(`${titre} (1280 × 720, images de la vidéo, 30 par seconde)`, 6, 24);
    g.font = '600 15px system-ui';
    rangs.forEach((r, j) => {
      g.fillStyle = j ? '#f0c878' : '#b9b2a0';
      g.fillText(j ? 'Après : volumes éclairés, ombres au sol, escalier en vrai 3D' : 'Avant : relief de la passe 162', 6, 40 + j * (h + 30) + 18);
      r.forEach((im, k) => g.drawImage(im, 6 + k * (w + 6), 40 + j * (h + 30) + 26, w, h));
    });
    const b = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
  }, { films, choix, titre: M.titre });
  writeFileSync(join(OUT, `planche-marche-${M.nom}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log(`planche : ${join(OUT, `planche-marche-${M.nom}.png`)}`);
}
} finally {
  await browser.close();
  server.stop();
}
const ko = erreurs.filter((c) => c.startsWith('error') || c.startsWith('pageerror'));
console.log(`console : ${ko.length ? ko.slice(0, 3).join(' | ') : 'vide'}`);
process.exit(ko.length ? 1 : 0);
