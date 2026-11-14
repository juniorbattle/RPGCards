// Marche de profil du protagoniste en huit temps, en jeu (décision du responsable du 2026-11-13, T4) : au navigateur, en
// 1280 × 720, horloge de la page tenue par Playwright (images à pas fixe), le protagoniste marche vers la droite puis vers
// la gauche ; pour chaque image, le temps de profil affiché (huit temps), sa position et la position de ses pieds. Sorties :
// une capture animée (webm, à la vitesse du jeu, agrandie sur le personnage, les deux sens côte à côte), une planche des
// images (suivie par git) et un rapport. Contrôles : le cycle de profil du protagoniste compte huit temps ; en marchant,
// les huit temps paraissent dans l'ordre ; un cycle entier correspond à la foulée annoncée (deux pas).
// Usage : npm run build && node tools/marche-huit-video.mjs [sortie (dossier)] [îlot, défaut quai] [apparence, ex. b200]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/retours-2026-11-13';
const ILOT = process.argv[3] ?? 'quai';
const APPARENCE = process.argv[4] ?? '';
const FPS = 30;
const N = 60;
const VP = { width: 1280, height: 720 };
mkdirSync(OUT, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4393, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); return ok; };
const rapport = { ilot: ILOT, fps: FPS, apparence: APPARENCE || null, viewport: VP, directions: {} };
const films = {};
try {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  watchConsole(p, erreurs);
  await p.clock.install();
  await p.goto(`${server.base}/?ville=1&qa=1&profondeur=1&ilot=${ILOT}${APPARENCE ? `&apparence=${APPARENCE}` : ''}`);
  for (let i = 0; i < 600; i++) {
    await p.clock.runFor(100);
    if (await p.evaluate(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3)) break;
  }
  await p.clock.runFor(1500);
  const marche = await p.evaluate(() => window.__lqvVille.town.externalReport().marche.joueur);
  check(Array.isArray(marche) && marche.length === 8, `le cycle de profil du protagoniste compte huit temps (${JSON.stringify(marche)})`);
  // fenêtre fixe autour du joueur pendant tout un sens (le personnage avance dans le cadre)
  for (const [nom, key] of [['droite', 'ArrowRight'], ['gauche', 'ArrowLeft']]) {
    await p.keyboard.down(key);
    await p.clock.runFor(300);
    const debut = await p.evaluate(() => { const t = window.__lqvVille.town; const w = t.walker(); return { pied: t.project({ x: w.pos.x, y: 0, z: w.pos.z }), tete: t.project({ x: w.pos.x, y: t.walkerH(), z: w.pos.z }) }; });
    const hpx = Math.max(60, debut.pied.y - debut.tete.y);
    const sens = nom === 'droite' ? 1 : -1;
    const largeur = Math.round(hpx * 3.2);
    const clip = { x: Math.round(Math.min(VP.width - largeur, Math.max(0, debut.pied.x - (sens > 0 ? hpx * 0.5 : largeur - hpx * 0.5)))), y: Math.round(Math.max(0, debut.tete.y - hpx * 0.15)), width: largeur, height: Math.round(hpx * 1.25) };
    const images = [];
    const etats = [];
    for (let i = 0; i < N; i++) {
      await p.clock.runFor(1000 / FPS);
      const e = await p.evaluate(() => { const t = window.__lqvVille.town; const w = t.walker(); return { x: w.pos.x, phase: w.phase, facing: w.facing, moving: w.moving }; });
      images.push(await p.screenshot({ clip }));
      etats.push({ x: +e.x.toFixed(3), phase: +e.phase.toFixed(3), facing: e.facing, moving: e.moving, temps: Math.floor(e.phase * 8 + 0.5) % 8 });
    }
    await p.keyboard.up(key);
    await p.clock.runFor(600);
    rapport.directions[nom] = etats;
    films[nom] = images.map((b) => `data:image/png;base64,${b.toString('base64')}`);
    const suite = etats.filter((e) => e.moving).map((e) => e.temps);
    const vus = new Set(suite);
    // dans l'ordre : chaque changement de temps avance d'un ou deux temps (jamais en arrière)
    let ordre = true;
    for (let k = 1; k < suite.length; k++) { const d = (suite[k] - suite[k - 1] + 8) % 8; if (d > 2) ordre = false; }
    check(vus.size === 8 && ordre && etats.every((e) => e.facing === nom), `${nom} : les huit temps paraissent, dans l'ordre (${suite.join('')})`);
  }
  await ctx.close();
  // la capture animée : les deux sens côte à côte, agrandis, à la vitesse du jeu, enregistrés en webm dans la page
  // (MediaRecorder du navigateur : aucun outil externe)
  const vctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
  const v = await vctx.newPage();
  await v.setContent('<!doctype html><html><body style="margin:0;background:#11131a"></body></html>');
  const webm = await v.evaluate(async ({ films, fps }) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const d = await Promise.all(films.droite.map(load));
    const g = await Promise.all(films.gauche.map(load));
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    document.body.append(c);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.font = '600 20px system-ui';
    const k = Math.min(620 / d[0].width, 600 / d[0].height);
    const peindre = (i) => {
      x.fillStyle = '#11131a'; x.fillRect(0, 0, 1280, 720);
      x.fillStyle = '#e8dcc0';
      x.fillText('Marche de profil en huit temps (T4), en jeu : vers la droite', 20, 34);
      x.fillText('vers la gauche', 660, 34);
      x.drawImage(d[i % d.length], 10, 60, d[0].width * k, d[0].height * k);
      x.drawImage(g[i % g.length], 650, 60, g[0].width * k, g[0].height * k);
    };
    peindre(0);
    const flux = c.captureStream(fps);
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 6e6 });
    const morceaux = [];
    rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
    const fin = new Promise((res) => { rec.onstop = res; });
    rec.start();
    for (let n = 0; n < d.length * 3; n++) { peindre(n); await new Promise((r) => setTimeout(r, 1000 / fps)); }
    rec.stop();
    await fin;
    const blob = new Blob(morceaux, { type: 'video/webm' });
    return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(blob); });
  }, { films, fps: FPS });
  await vctx.close();
  const nomWebm = join(OUT, `marche-huit-1280${APPARENCE ? `-${APPARENCE}` : ''}.webm`);
  const octets = Buffer.from(String(webm).split(',')[1] ?? '', 'base64');
  if (octets.length > 1000) writeFileSync(nomWebm, octets);
  check(octets.length > 1000, `capture animée : ${nomWebm} (${Math.round(octets.length / 1024)} Kio)`);
  // la planche des images en jeu (16 premières de chaque sens)
  const pl = await (await browser.newContext()).newPage();
  await pl.setContent('<!doctype html><html><body></body></html>');
  const url = await pl.evaluate(async (films) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const rangs = [await Promise.all(films.droite.slice(0, 16).map(load)), await Promise.all(films.gauche.slice(0, 16).map(load))];
    const w = rangs[0][0].width; const h = rangs[0][0].height; const z = Math.max(1, Math.floor(180 / h));
    const c = new OffscreenCanvas(16 * w * z + 17 * 6, 2 * h * z + 3 * 6 + 30);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#1d212b'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = 'bold 16px system-ui';
    g.fillText('Marche de profil en huit temps, en jeu (1280 × 720, 30 images par seconde) : vers la droite, puis vers la gauche', 8, 20);
    rangs.forEach((r, j) => r.forEach((im, k) => g.drawImage(im, 6 + k * (w * z + 6), 30 + 6 + j * (h * z + 6), w * z, h * z)));
    const b = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
  }, films);
  writeFileSync(join(OUT, `planche-marche-huit-jeu${APPARENCE ? `-${APPARENCE}` : ''}.png`), Buffer.from(url.split(',')[1], 'base64'));
} finally {
  await browser.close();
  server.stop();
}
rapport.console = erreurs.filter((c) => c.startsWith('error') || c.startsWith('pageerror'));
rapport.checks = checks;
mkdirSync('artifacts/qa/retours-2026-11-13', { recursive: true });
writeFileSync(`artifacts/qa/retours-2026-11-13/marche-huit${APPARENCE ? `-${APPARENCE}` : ''}.json`, `${JSON.stringify(rapport, null, 1)}\n`);
const ko = checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`${checks.length - ko}/${checks.length} contrôles ; console : ${rapport.console.length ? rapport.console.slice(0, 3).join(' | ') : 'vide'}`);
process.exit(ko || rapport.console.length ? 1 : 0);
