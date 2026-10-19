// M09 — preuve de bout en bout du chargeur de feuilles de sprites externes (préparation Aseprite, inactive par défaut),
// SANS aucune image dans le dépôt : on exporte nos propres atlas dessinés par code, teintés (pour voir lequel s'affiche),
// dans une COPIE TEMPORAIRE du build, avec un manifeste (empreintes SHA-256), plus une entrée volontairement fausse.
// Attendu : la feuille valide est chargée (joueur teinté à l'écran), la fausse refusée avec sa raison, le reste par code ;
// sans `sprites=externes`, rien ne change.
// Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-sprites-externes.mjs [capture.png] [rapport.json]
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { launch, startPreview } from './browser.mjs';

const SHOT = process.argv[2] ?? 'screenshots/qa/m09/sprites-externes.png';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/sprites-externes.json';
const DIST = process.env.LQV_DIST || 'dist';
const tmp = mkdtempSync(join(tmpdir(), 'lqv-sprites-'));
cpSync(DIST, tmp, { recursive: true });
const browser = await launch();
const report = { date: new Date().toISOString(), dist: DIST, checks: [] };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let srv = await startPreview(4391, tmp);
try {
  // 1) export des atlas (dans une page du laboratoire), teinte du joueur pour le reconnaître
  const p0 = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  await p0.goto(`${srv.base}/?ville=1&qa=1&freeze=1`);
  await p0.waitForFunction(() => !!window.__lqvVille);
  const png = await p0.evaluate(async () => {
    const i = new Image(); i.src = window.__lqvVille.atlas('player-Cendre'); await i.decode();
    // Grille logique du contrat des feuilles (96 × 160 par case) : l'atlas par code est dessiné plus fin (M09 V3, 1,5×).
    const c = document.createElement('canvas'); c.width = 96 * 5; c.height = 160 * 3;
    const g = c.getContext('2d'); g.filter = 'hue-rotate(160deg) saturate(1.6)'; g.drawImage(i, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  });
  await p0.context().close();
  srv.stop();
  const buf = Buffer.from(png.split(',')[1], 'base64');
  mkdirSync(join(tmp, 'sprites'), { recursive: true });
  writeFileSync(join(tmp, 'sprites', 'player-Cendre.png'), buf);
  writeFileSync(join(tmp, 'sprites', 'braise.png'), buf);
  const sha = createHash('sha256').update(buf).digest('hex');
  const entry = (file, sum) => ({ file, sha256: sum, cell: [96, 160], cols: 5, rows: 3, source: 'QA : atlas procédural teinté (aucune image externe)', approved: false });
  writeFileSync(join(tmp, 'sprites', 'manifest.json'), JSON.stringify({ version: 1, sprites: { 'player-Cendre': entry('player-Cendre.png', sha), braise: entry('braise.png', '0'.repeat(64)) } }, null, 2));
  srv = await startPreview(4392, tmp);
  // 2) laboratoire avec feuilles externes
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  p.setDefaultTimeout(90000);
  await p.goto(`${srv.base}/?ville=1&qa=1&freeze=1&sprites=externes`);
  await p.waitForFunction(() => !!window.__lqvVille);
  await p.waitForFunction(() => window.__lqvVille.town.externalReport().loaded.length + window.__lqvVille.town.externalReport().issues.length >= 2, null, { timeout: 60000 });
  const rep = await p.evaluate(() => window.__lqvVille.town.externalReport());
  report.external = rep;
  check(rep.loaded.includes('player-Cendre'), 'feuille du joueur chargée (empreinte conforme)');
  check(!rep.loaded.includes('braise') && rep.issues.some((x) => x.startsWith('braise') && /empreinte/.test(x)), `feuille de Kaï refusée pour son empreinte (${rep.issues.find((x) => x.startsWith('braise')) ?? 'aucun refus'})`);
  await p.evaluate(() => { const t = window.__lqvVille.town; t.place({ x: 11.6, z: 1.0 }, 'droite'); t.renderNow(); });
  await p.waitForTimeout(500);
  mkdirSync(dirname(SHOT), { recursive: true });
  writeFileSync(SHOT, await p.screenshot());
  // 3) sans le paramètre : aucune feuille externe lue
  const q = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  q.setDefaultTimeout(90000);
  await q.goto(`${srv.base}/?ville=1&qa=1&freeze=1`);
  await q.waitForFunction(() => !!window.__lqvVille);
  await q.waitForTimeout(1500);
  const none = await q.evaluate(() => window.__lqvVille.town.externalReport());
  check(none.loaded.length === 0 && none.issues.length === 0, 'sans « sprites=externes » : aucune feuille lue (marcheurs par code)');
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  srv.stop();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
