// Essai de profondeur du décor (retour du responsable du 2026-11-14 : bâtiments « collés/écrasés », surtout « les
// bâtiments dans les zones profondes ») : captures du laboratoire, le joueur à plusieurs endroits du premier rang et des
// rangs profonds des six quartiers (la Grande Cour et le Quai d'abord), aux variantes demandées (`?relief=0` : sans relief ; `?volume=0` : le
// relief de la passe 162 seul, le rendu d'avant l'essai ; par défaut : l'essai), en 1280 et 1920 (vues de contrôle :
// `normales`, `ombres` ; `sanshalo` : sans le halo du protagoniste). Sorties : PNG `<îlot>-<vue>-<variante>-<largeur>.png`
// sous le dossier donné (non suivis) et `artifacts/qa/retours-2026-11-14/captures.json` (positions, variantes, erreurs).
// Usage : npm run build && node tools/relief-cour.mjs [sortie] [variantes, ex. avant,apres] [tailles, ex. 1280,1920] [îlots, ex. cour,quai]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/retours-2026-11-14/brut';
const VARIANTES = (process.argv[3] ?? 'avant,apres').split(',');
const TAILLES = (process.argv[4] ?? '1280,1920').split(',').map(Number);
const ILOTS = (process.argv[5] ?? 'cour,quai,parvis,ruelles,port,haute').split(',');
const PARAMS = { sans: '&relief=0', avant: '&volume=0', apres: '', sanshalo: '&halo=0', normales: '&volume=normales', ombres: '&volume=ombres' };
/** Les vues, par îlot : premier rang, puis rangs profonds (`profond: true`). */
export const VUES = {
  cour: [
    { id: 'gauche', at: { x: -11.5, z: -3.0 }, face: 'gauche' },
    { id: 'centre', at: { x: 0, z: 0.6 }, face: 'dos' },
    { id: 'droite', at: { x: 11.5, z: -3.0 }, face: 'droite' },
    { id: 'escalier', at: { x: 14.6, z: -10.6 }, face: 'droite' },
    { id: 'estrade', at: { x: -7.5, z: -5.6 }, face: 'dos' },
    { id: 'facade', at: { x: 3.2, z: -10.9 }, face: 'gauche' },
    { id: 'passage-est', at: { x: 14.1, z: -15.5 }, face: 'dos', profond: true },
    { id: 'belvedere-est', at: { x: 11, z: -22.4 }, face: 'droite', profond: true },
    { id: 'belvedere-centre', at: { x: 0, z: -22.6 }, face: 'dos', profond: true },
    { id: 'belvedere-ouest', at: { x: -11, z: -22.4 }, face: 'gauche', profond: true },
  ],
  quai: [
    { id: 'rang1', at: { x: 0, z: 1.5 }, face: 'dos' },
    { id: 'rue-haute-ouest', at: { x: -9, z: -14 }, face: 'gauche', profond: true },
    { id: 'rue-haute-est', at: { x: 9, z: -14 }, face: 'droite', profond: true },
    { id: 'place-halle', at: { x: 7, z: -19.5 }, face: 'dos', profond: true },
    { id: 'ruelle-lanternes', at: { x: 0, z: -27 }, face: 'dos', profond: true },
    { id: 'placette-puits', at: { x: -2.6, z: -26.3 }, face: 'gauche', profond: true },
    { id: 'cour-chapelle', at: { x: 0, z: -38.5 }, face: 'dos', profond: true },
  ],
  // généralisation (« Oui, généralise ») : les quatre autres quartiers, placés à leurs points d'apparition
  parvis: [
    { id: 'rang1', spawn: 'arrivee', face: 'dos' },
    { id: 'rue-gradins', spawn: 'rue-gradins', face: 'dos', profond: true },
    { id: 'place-paris', spawn: 'place-paris', face: 'dos', profond: true },
    { id: 'rue-lices', spawn: 'rue-lices', face: 'dos', profond: true },
    { id: 'placette-tableau', spawn: 'placette-tableau', face: 'dos', profond: true },
    { id: 'cour-champions', spawn: 'cour-champions', face: 'dos', profond: true },
  ],
  ruelles: [
    { id: 'rang1', spawn: 'arrivee', face: 'dos' },
    { id: 'ruelle-tanneurs', spawn: 'ruelle-tanneurs', face: 'dos', profond: true },
    { id: 'placette-olivier', spawn: 'placette-olivier', face: 'dos', profond: true },
    { id: 'ruelle-voile', spawn: 'ruelle-voile', face: 'dos', profond: true },
    { id: 'cour-guilde', spawn: 'cour-guilde', face: 'dos', profond: true },
  ],
  port: [
    { id: 'rang1', spawn: 'arrivee', face: 'dos' },
    { id: 'rue-cordiers', spawn: 'rue-cordiers', face: 'dos', profond: true },
    { id: 'placette-filets', spawn: 'placette-filets', face: 'dos', profond: true },
    { id: 'cour-ronce', spawn: 'cour-ronce', face: 'dos', profond: true },
  ],
  haute: [
    { id: 'rang1', spawn: 'arrivee', face: 'dos' },
    { id: 'rue-astronomes', spawn: 'rue-astronomes', face: 'dos', profond: true },
    { id: 'jardin-spheres', spawn: 'jardin-spheres', face: 'dos', profond: true },
    { id: 'parvis-observatoire', spawn: 'parvis-observatoire', face: 'dos', profond: true },
  ],
};
mkdirSync(OUT, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4393, process.env.LQV_DIST || 'dist');
const browser = await launch();
const rapport = { vues: VUES, variantes: VARIANTES, tailles: TAILLES, ilots: ILOTS, erreurs: [] };
try {
  for (const ilot of ILOTS) {
    for (const W of TAILLES) {
      const VP = { width: W, height: Math.round((W * 9) / 16) };
      for (const v of VARIANTES) {
        const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
        const p = await ctx.newPage();
        const err = [];
        watchConsole(p, err);
        await p.clock.install();
        await p.goto(`${server.base}/?ville=1&qa=1&profondeur=1&ilot=${ilot}&decors=approuvees&sprites=approuvees${PARAMS[v] ?? v}`);
        for (let i = 0; i < 600; i++) {
          await p.clock.runFor(100);
          if (await p.evaluate(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3)) break;
        }
        await p.clock.runFor(1500);
        for (const vue of VUES[ilot]) {
          await p.evaluate(({ at, spawn, face }) => { const t = window.__lqvVille.town; const s = spawn ? t.ilot.spawns[spawn] : at; t.place({ x: s.x, z: s.z }, face); }, vue);
          await p.clock.runFor(1500);
          await p.screenshot({ path: join(OUT, `${ilot}-${vue.id}-${v}-${W}.png`) });
        }
        rapport.erreurs.push(...err.map((e) => `${ilot} ${v} ${W} : ${e}`));
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  server.stop();
}
mkdirSync('artifacts/qa/retours-2026-11-14', { recursive: true });
writeFileSync('artifacts/qa/retours-2026-11-14/captures.json', `${JSON.stringify(rapport, null, 1)}\n`);
console.log(`${rapport.erreurs.length} erreur(s) de console`, rapport.erreurs.slice(0, 5));
