// Essai de profondeur du décor sur la Grande Cour (retour du responsable du 2026-11-14 : bâtiments et accessoires
// « collés/écrasés »). Captures du laboratoire, le joueur à plusieurs endroits, aux variantes demandées (`?relief=0` :
// sans relief ; `?volume=0` : le relief de la passe 162 seul, le rendu d'avant l'essai ; par défaut : l'essai), en 1280
// et 1920 (vues de contrôle : `normales`, `ombres` ; `sanshalo` : sans le halo du protagoniste). Sorties : PNG par vue
// sous le dossier donné (non suivis) et `artifacts/qa/retours-2026-11-14/captures.json` (positions, variantes, erreurs).
// Usage : npm run build && node tools/relief-cour.mjs [sortie] [variantes, ex. avant,apres] [tailles, ex. 1280,1920]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/retours-2026-11-14/brut';
const VARIANTES = (process.argv[3] ?? 'avant,apres').split(',');
const TAILLES = (process.argv[4] ?? '1280,1920').split(',').map(Number);
const PARAMS = { sans: '&relief=0', avant: '&volume=0', apres: '', sanshalo: '&halo=0', normales: '&volume=normales', ombres: '&volume=ombres' };
export const VUES = [
  { id: 'gauche', at: { x: -11.5, z: -3.0 }, face: 'gauche' },
  { id: 'centre', at: { x: 0, z: 0.6 }, face: 'dos' },
  { id: 'droite', at: { x: 11.5, z: -3.0 }, face: 'droite' },
  { id: 'escalier', at: { x: 14.6, z: -10.6 }, face: 'droite' },
  { id: 'estrade', at: { x: -7.5, z: -5.6 }, face: 'dos' },
  { id: 'facade', at: { x: 3.2, z: -10.9 }, face: 'gauche' },
];
mkdirSync(OUT, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4393, process.env.LQV_DIST || 'dist');
const browser = await launch();
const rapport = { vues: VUES, variantes: VARIANTES, tailles: TAILLES, erreurs: [] };
try {
  for (const W of TAILLES) {
    const VP = { width: W, height: Math.round((W * 9) / 16) };
    for (const v of VARIANTES) {
      const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      const err = [];
      watchConsole(p, err);
      await p.clock.install();
      await p.goto(`${server.base}/?ville=1&qa=1&profondeur=1&ilot=cour&decors=approuvees&sprites=approuvees${PARAMS[v] ?? v}`);
      for (let i = 0; i < 600; i++) {
        await p.clock.runFor(100);
        if (await p.evaluate(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3)) break;
      }
      await p.clock.runFor(1500);
      for (const vue of VUES) {
        await p.evaluate(({ at, face }) => window.__lqvVille.town.place(at, face), vue);
        await p.clock.runFor(1200);
        await p.screenshot({ path: join(OUT, `${vue.id}-${v}-${W}.png`) });
      }
      rapport.erreurs.push(...err.map((e) => `${v} ${W} : ${e}`));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.stop();
}
mkdirSync('artifacts/qa/retours-2026-11-14', { recursive: true });
writeFileSync('artifacts/qa/retours-2026-11-14/captures.json', `${JSON.stringify(rapport, null, 1)}\n`);
console.log(`${rapport.erreurs.length} erreur(s) de console`, rapport.erreurs.slice(0, 5));
