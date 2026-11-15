// Ce qui écrase les bâtiments des rangs profonds (retour du responsable du 2026-11-14 : « ce sont surtout les bâtiments
// dans les zones profondes ») : laboratoire, ville en rangs, rangs profonds de la Grande Cour et du Quai ; pour chaque
// vue, le rendu d'avant l'essai (`?volume=0`), puis sans chaque piste (nappes de brume `brume=0`, voile atmosphérique
// des plans `voile=0`, brume du moteur dans les plans `brouillard=0`, relief `relief=0`), sans les trois brumes, et
// l'essai. Mesures sur le tiers gauche, le centre et le tiers droit de la moitié haute de l'écran (les façades du fond) :
// luminance moyenne, contraste (écart type), étendue p5 à p95, détail (gradient moyen). Sorties : rapport
// `artifacts/qa/retours-2026-11-14/ecrasement.json`, planche `screenshots/qa/retours-2026-11-14/planche-ecrasement.png`.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/relief-cour-ecrase.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, startPreview } from './browser.mjs';

const VARIANTES = [
  ['avant', '&volume=0'],
  ['sans brume (nappes)', '&volume=0&brume=0'],
  ['sans voile', '&volume=0&voile=0'],
  ['sans brouillard', '&volume=0&brouillard=0'],
  ['sans les trois', '&volume=0&brume=0&voile=0&brouillard=0'],
  ['sans relief', '&relief=0'],
  ['essai', ''],
];
const VUES = [
  { ilot: 'quai', id: 'rue-haute-ouest', at: { x: -9, z: -14 }, face: 'gauche' },
  { ilot: 'quai', id: 'place-halle', at: { x: 7, z: -19.5 }, face: 'dos' },
  { ilot: 'quai', id: 'ruelle-lanternes', at: { x: 0, z: -27 }, face: 'dos' },
  { ilot: 'quai', id: 'placette-puits', at: { x: -11, z: -30.5 }, face: 'dos' },
  { ilot: 'quai', id: 'cour-chapelle', at: { x: 0, z: -38.5 }, face: 'dos' },
  { ilot: 'cour', id: 'passage-est', at: { x: 14.1, z: -15.5 }, face: 'dos' },
  { ilot: 'cour', id: 'belvedere-est', at: { x: 11, z: -22.4 }, face: 'droite' },
];
const ZONES = { gauche: [0, 130, 427, 480], centre: [427, 130, 853, 480], droite: [853, 130, 1280, 480] };
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4393, process.env.LQV_DIST || 'dist');
const browser = await launch();
const captures = {};
try {
  for (const [nom, q] of VARIANTES) {
    for (const ilot of [...new Set(VUES.map((v) => v.ilot))]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      await p.clock.install({ time: 0 });
      await p.goto(`${server.base}/?ville=1&qa=1&freeze=1&profondeur=1&ilot=${ilot}&decors=approuvees&sprites=approuvees${q}`);
      for (let i = 0; i < 600; i++) {
        await p.clock.runFor(100);
        if (await p.evaluate(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3)) break;
      }
      await p.clock.runFor(1500);
      for (const v of VUES.filter((x) => x.ilot === ilot)) {
        await p.evaluate(({ at, face }) => window.__lqvVille.town.place(at, face), v);
        await p.clock.runFor(1500);
        (captures[`${v.ilot}/${v.id}`] ??= {})[nom] = `data:image/png;base64,${(await p.screenshot()).toString('base64')}`;
      }
      await ctx.close();
    }
  }
  const page = await (await browser.newContext()).newPage();
  const mesures = await page.evaluate(async ({ captures, zones }) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const out = {};
    for (const [vue, vs] of Object.entries(captures)) {
      out[vue] = {};
      for (const [nom, src] of Object.entries(vs)) {
        const im = await load(src);
        const c = new OffscreenCanvas(im.width, im.height); const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(im, 0, 0);
        out[vue][nom] = {};
        for (const [z, [x0, y0, x1, y1]] of Object.entries(zones)) {
          const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data; const w = x1 - x0; const h = y1 - y0;
          const L = new Float32Array(w * h);
          for (let i = 0; i < w * h; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
          let s = 0; for (const v of L) s += v; const m = s / L.length;
          let v2 = 0; for (const v of L) v2 += (v - m) ** 2; const sd = Math.sqrt(v2 / L.length);
          const tri = Float32Array.from(L).sort();
          let gr = 0; for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; gr += Math.abs(L[i + 1] - L[i]) + Math.abs(L[i + w] - L[i]); }
          out[vue][nom][z] = { moyenne: +m.toFixed(1), contraste: +sd.toFixed(1), etendue: +(tri[Math.floor(tri.length * 0.95)] - tri[Math.floor(tri.length * 0.05)]).toFixed(1), noir: +tri[Math.floor(tri.length * 0.05)].toFixed(1), detail: +(gr / ((w - 1) * (h - 1))).toFixed(2) };
        }
      }
    }
    return out;
  }, { captures, zones: ZONES });
  // synthèse : écart de chaque piste au rendu d'avant, en moyenne sur les vues et les trois zones
  const synthese = {};
  for (const [nom] of VARIANTES) {
    const acc = { contraste: 0, etendue: 0, noir: 0, detail: 0, n: 0 };
    for (const vs of Object.values(mesures)) for (const z of Object.keys(ZONES)) {
      const a = vs.avant[z]; const b = vs[nom][z];
      acc.contraste += b.contraste / a.contraste; acc.etendue += b.etendue / a.etendue; acc.noir += b.noir - a.noir; acc.detail += b.detail / a.detail; acc.n++;
    }
    synthese[nom] = { contraste: `${Math.round((acc.contraste / acc.n - 1) * 100)} %`, etendue: `${Math.round((acc.etendue / acc.n - 1) * 100)} %`, noir: +(acc.noir / acc.n).toFixed(1), detail: `${Math.round((acc.detail / acc.n - 1) * 100)} %` };
  }
  console.table(synthese);
  mkdirSync('artifacts/qa/retours-2026-11-14', { recursive: true });
  writeFileSync('artifacts/qa/retours-2026-11-14/ecrasement.json', `${JSON.stringify({ zones: ZONES, vues: VUES, synthese, mesures }, null, 1)}\n`);
  // planche : deux vues, chaque variante en gros plan
  const url = await page.evaluate(async ({ captures, noms }) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const vues = ['quai/ruelle-lanternes', 'quai/place-halle'];
    const w = 400; const h = 225; const pad = 8;
    const c = new OffscreenCanvas(noms.length * (w + pad) + pad, 40 + vues.length * (h + 30));
    const g = c.getContext('2d');
    g.fillStyle = '#151820'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = '600 18px system-ui';
    g.fillText('Rangs profonds du Quai : ce qui les écrase (rendu d’avant l’essai, puis sans chaque piste, puis l’essai)', pad, 24);
    for (let j = 0; j < vues.length; j++) {
      for (let k = 0; k < noms.length; k++) {
        const im = await load(captures[vues[j]][noms[k]]);
        const y = 40 + j * (h + 30);
        g.fillStyle = '#b9b2a0'; g.font = '500 14px system-ui'; g.fillText(`${vues[j].split('/')[1]} — ${noms[k]}`, pad + k * (w + pad), y + 16);
        g.drawImage(im, 0, 110, 1280, 720 - 110, pad + k * (w + pad), y + 24, w, h);
      }
    }
    const b = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
  }, { captures, noms: VARIANTES.map(([n]) => n) });
  mkdirSync('screenshots/qa/retours-2026-11-14', { recursive: true });
  writeFileSync('screenshots/qa/retours-2026-11-14/planche-ecrasement.png', Buffer.from(url.split(',')[1], 'base64'));
} finally {
  await browser.close();
  server.stop();
}
