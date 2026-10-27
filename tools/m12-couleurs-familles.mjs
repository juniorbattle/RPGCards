// ADR 046 — couleurs des familles : preuve avant / après au navigateur (build d'avant : `LQV_BEFORE`, build courant :
// `dist/`). Duel contre Halvard (chef de l'Astre, portrait V2) dans la salle, puis à l'arène (étendards des quatre
// familles), vue A figée ; planche `screenshots/qa/m12/couleurs/duels-avant-apres.jpg` ; console sans erreur.
// Usage : LQV_BEFORE=<dist avant> node tools/m12-couleurs-familles.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const OUT = 'screenshots/qa/m12/couleurs';
mkdirSync(OUT, { recursive: true });
mkdirSync('artifacts/qa/m12', { recursive: true });
const servers = { avant: await startPreview(4201, BEFORE), apres: await startPreview(4202) };
const browser = await launch();
const consoleIssues = [];
const CAS = [
  { nom: 'salle-halvard', query: 'rival=chef-astre&venue=salle' },
  { nom: 'arene-halvard', query: 'rival=chef-astre&venue=arene' },
];
const shots = [];
for (const cas of CAS) {
  for (const cote of ['avant', 'apres']) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
    watchConsole(page, consoleIssues);
    page.setDefaultNavigationTimeout(90000);
    await page.goto(`${servers[cote].base}/?qa=1&autostart=1&seed=202&freeze=1&view=A&${cas.query}`);
    await page.waitForFunction(() => !!window.__lqv?.controller, null, { timeout: 120000 });
    await page.waitForTimeout(2500);
    const path = `${OUT}/${cas.nom}-${cote}.jpg`;
    await page.screenshot({ path, type: 'jpeg', quality: 85 });
    shots.push({ cas: cas.nom, cote, path });
    await page.context().close();
  }
}
// planche : avant à gauche, après à droite
const page = await (await browser.newContext({ viewport: { width: 1320, height: 800 } })).newPage();
const rows = CAS.map((c) => `<div class="r"><figure><img src="data:image/jpeg;base64,${readFileSync(`${OUT}/${c.nom}-avant.jpg`).toString('base64')}"><figcaption>${c.nom} — avant</figcaption></figure><figure><img src="data:image/jpeg;base64,${readFileSync(`${OUT}/${c.nom}-apres.jpg`).toString('base64')}"><figcaption>${c.nom} — après (ADR 046)</figcaption></figure></div>`).join('');
await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0b0810;color:#e8dcc4;font:13px system-ui;padding:12px}h1{font:600 17px Georgia;margin:0 0 8px}.r{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}figure{margin:0}img{width:100%;display:block;border-radius:6px}figcaption{padding:3px 2px}</style><h1>ADR 046 — l'Astre en ocre et or (Halvard, étendards), le Voile en bleu</h1>${rows}`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/duels-avant-apres.jpg`, type: 'jpeg', quality: 82, fullPage: true });
await browser.close();
servers.avant.stop();
servers.apres.stop();
writeFileSync('artifacts/qa/m12/couleurs.json', JSON.stringify({ date: new Date().toISOString(), shots, console: consoleIssues }, null, 2));
console.log(`${shots.length} captures ; console : ${consoleIssues.length} ligne(s) ; planche ${OUT}/duels-avant-apres.jpg`);
process.exit(consoleIssues.some((l) => l.startsWith('error') || l.startsWith('pageerror')) ? 1 : 0);
