// Essai de profondeur (retour du responsable du 2026-11-14) : ce qu'il ne doit pas changer, au pixel près, contre un build
// d'avant l'essai (`LQV_DIST_AVANT`) : les cinq autres quartiers de la ville en rangs (par défaut), la Grande Cour avec
// `?volume=0` (le relief de la passe 162) et avec `?relief=0` (sans relief). Horloge tenue (images à pas fixe), mêmes
// positions, temps figé (`freeze=1`). Un témoin : la Grande Cour de l'essai doit, elle, différer.
// Usage : npm run build && LQV_DIST_AVANT=<dist d'avant> node tools/relief-cour-identique.mjs [rapport.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/retours-2026-11-14/identique.json';
const AVANT = process.env.LQV_DIST_AVANT;
if (!AVANT) throw new Error('LQV_DIST_AVANT : le build d’avant l’essai');
const port = Number(process.env.LQV_PREVIEW_PORT) || 4393;
const CAS = [
  ...['quai', 'parvis', 'ruelles', 'port', 'haute'].map((ilot) => ({ id: ilot, avant: `&ilot=${ilot}`, apres: `&ilot=${ilot}`, egal: true })),
  { id: 'cour-volume0', avant: '&ilot=cour', apres: '&ilot=cour&volume=0', egal: true },
  { id: 'cour-relief0', avant: '&ilot=cour&relief=0', apres: '&ilot=cour&relief=0', egal: true },
  { id: 'cour-essai (témoin)', avant: '&ilot=cour', apres: '&ilot=cour', egal: false },
  // contre-épreuve : le même build deux fois (la capture est-elle reproductible ?)
  { id: 'quai, même build (contre-épreuve)', avant: '&ilot=quai', apres: '&ilot=quai', egal: true, memeBuild: true },
];
const capture = async (browser, base, q) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.clock.install({ time: 0 });
  await p.goto(`${base}/?ville=1&qa=1&freeze=1&profondeur=1&decors=approuvees&sprites=approuvees${q}`);
  for (let i = 0; i < 600; i++) {
    await p.clock.runFor(100);
    if (await p.evaluate(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3)) break;
  }
  await p.clock.runFor(2000);
  const b = await p.screenshot();
  await ctx.close();
  return b;
};
const rapport = { avant: AVANT, cas: [] };
const browser = await launch();
const srvA = await startPreview(port, AVANT);
const imgsA = [];
try { for (const c of CAS) imgsA.push(await capture(browser, srvA.base, c.avant)); } finally { srvA.stop(); }
const srvB = await startPreview(port + 1, process.env.LQV_DIST || 'dist');
const imgsB = [];
try { for (const c of CAS) imgsB.push(await capture(browser, srvB.base, c.apres)); } finally { srvB.stop(); }
// contre-épreuve : le build d'avant, capturé une deuxième fois
const srvC = await startPreview(port + 2, AVANT);
try { for (let i = 0; i < CAS.length; i++) if (CAS[i].memeBuild) imgsB[i] = await capture(browser, srvC.base, CAS[i].apres); } finally { srvC.stop(); }
const cmp = await (await browser.newContext()).newPage();
let ko = 0;
for (let i = 0; i < CAS.length; i++) {
  const n = await cmp.evaluate(async ([a, b]) => {
    const load = async (s) => { const im = new Image(); im.src = s; await im.decode(); return im; };
    const A = await load(a); const B = await load(b);
    const c = new OffscreenCanvas(A.width, A.height); const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const pa = g.getImageData(0, 0, A.width, A.height).data;
    g.clearRect(0, 0, A.width, A.height); g.drawImage(B, 0, 0); const pb = g.getImageData(0, 0, A.width, A.height).data;
    let d = 0; for (let k = 0; k < pa.length; k += 4) if (pa[k] !== pb[k] || pa[k + 1] !== pb[k + 1] || pa[k + 2] !== pb[k + 2]) d++;
    return d;
  }, [imgsA[i], imgsB[i]].map((x) => `data:image/png;base64,${x.toString('base64')}`));
  const ok = CAS[i].egal ? n === 0 : n > 0;
  if (!ok) ko++;
  // `LQV_IDENT_DIFF` : un dossier où poser les deux captures d'un cas en échec
  if (!ok && process.env.LQV_IDENT_DIFF) { mkdirSync(process.env.LQV_IDENT_DIFF, { recursive: true }); writeFileSync(`${process.env.LQV_IDENT_DIFF}/${i}-avant.png`, imgsA[i]); writeFileSync(`${process.env.LQV_IDENT_DIFF}/${i}-apres.png`, imgsB[i]); }
  rapport.cas.push({ id: CAS[i].id, attendu: CAS[i].egal ? 'identique' : 'différent', pixelsDifferents: n, ok });
  console.log(`${ok ? 'OK' : 'ÉCHEC'} ${CAS[i].id} : ${n} pixels différents (${CAS[i].egal ? 'identique attendu' : 'écart attendu'})`);
}
await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(rapport, null, 1)}\n`);
process.exit(ko ? 1 : 0);
