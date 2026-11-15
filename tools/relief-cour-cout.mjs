// Coût de l'essai de profondeur sur la Grande Cour (retour du responsable du 2026-11-14) : laboratoire, ville en rangs,
// images approuvées, le joueur parcourt la place à pied 4 s (2 s vers la droite, 2 s vers la gauche) ; intervalles entre
// images relevés dans la page ; variantes alternées (`?relief=0`, `?volume=0` le rendu d'avant, l'essai), trois passages
// chacune ; mise en place de l'îlot (construction : cartes des profondeurs et de l'essai comprises).
// Mesurer sans plafond d'images (`LQV_CHROME_ARGS="--disable-gpu-vsync --disable-frame-rate-limit"`), la Radeon libre
// (c'est elle qui affiche) ; la RTX avec `--force_high_performance_gpu` en plus.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_VP=1920x1080] node tools/relief-cour-cout.mjs [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
// `LQV_ILOT` : l'îlot mesuré (défaut : la Grande Cour) ; le Quai part de la ruelle des Lanternes (rangs profonds)
const ILOT = process.env.LQV_ILOT ?? 'cour';
const DEPART = ILOT === 'quai' ? { x: -12, z: -26.3 } : { x: -6, z: -4 };
const OUT = process.argv[2] ?? `artifacts/qa/retours-2026-11-14/cout-${ILOT}-${VP[0]}.json`;
const VARIANTES = { sans: '&relief=0', avant: '&volume=0', apres: '' };
const PASSAGES = 3;
const head = execSync('git rev-parse --short HEAD').toString().trim();
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4393, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const report = { commit: head, ilot: ILOT, depart: DEPART, viewport: VP, args: EXTRA_ARGS, passages: {}, synthese: {} };
const mediane = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
try {
  for (let k = 0; k < PASSAGES; k++) {
    for (const [nom, q] of Object.entries(VARIANTES)) {
      const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      watchConsole(p, issues);
      await p.goto(`${server.base}/?ville=1&qa=1&profondeur=1&ilot=${ILOT}&decors=approuvees&sprites=approuvees${q}`);
      report.renderer ??= await webglRenderer(p).catch(() => null);
      await p.waitForFunction(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3, null, { timeout: 120000 });
      await p.evaluate((at) => window.__lqvVille.town.place(at, 'droite'), DEPART);
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const iv = []; window.__cIv = iv; let last = performance.now(); const tick = (t) => { if (window.__cIv !== iv) return; iv.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      await p.keyboard.down('KeyD'); await p.waitForTimeout(2000); await p.keyboard.up('KeyD');
      await p.keyboard.down('KeyA'); await p.waitForTimeout(2000); await p.keyboard.up('KeyA');
      const r = await p.evaluate(() => {
        const iv = window.__cIv.slice(3); window.__cIv = null;
        const s = [...iv].sort((a, b) => a - b);
        const q = (f) => Math.round(s[Math.min(s.length - 1, Math.floor(s.length * f))] * 100) / 100;
        const st = window.__lqvVille.town.stats();
        return { images: iv.length, moyenneMs: Math.round((iv.reduce((a, b) => a + b, 0) / iv.length) * 100) / 100, medianeMs: q(0.5), p95Ms: q(0.95), maxMs: Math.round(s[s.length - 1] * 10) / 10, appels: st.calls, programmes: st.programs, textures: st.textures, buildMs: st.buildMs, firstFrameMs: st.firstFrameMs };
      });
      (report.passages[nom] ??= []).push(r);
      console.log(nom, k + 1, JSON.stringify(r));
      await ctx.close();
    }
  }
  for (const nom of Object.keys(VARIANTES)) {
    const ps = report.passages[nom];
    report.synthese[nom] = { moyenneMs: mediane(ps.map((x) => x.moyenneMs)), p95Ms: mediane(ps.map((x) => x.p95Ms)), buildMs: mediane(ps.map((x) => x.buildMs)), appels: ps[0].appels, programmes: ps[0].programmes };
  }
  report.synthese.ecartEssaiMs = Math.round((report.synthese.apres.moyenneMs - report.synthese.avant.moyenneMs) * 100) / 100;
  report.synthese.ecartReliefMs = Math.round((report.synthese.avant.moyenneMs - report.synthese.sans.moyenneMs) * 100) / 100;
} finally {
  await browser.close();
  server.stop();
}
report.console = issues;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);
console.log('synthèse', JSON.stringify(report.synthese));
console.log(`console : ${issues.length ? issues.slice(0, 5).join(' | ') : 'aucune erreur'} ; rendu : ${report.renderer ?? '?'}`);
process.exit(issues.length ? 1 : 0);
