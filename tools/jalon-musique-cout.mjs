// Jalon 2026-10 — coût de la musique sur le poste (contrat `docs/m13/02_MUSIQUE_INTERACTIVE.md`, § mise en œuvre). Deux
// mesures au navigateur, sans ffmpeg :
//   1. temps réel, laboratoire `?musique=1` : page neuve par version, banque calculée dans le worker (temps du clic au
//      premier son), puis 20 s de lecture, toutes couches entrées pour les duels : temps processeur de la page et du
//      service audio (`SystemInfo.getProcessInfo`, un cœur = 100 %), trous de lecture (`AudioContext.playbackStats`) ;
//   2. rendu hors ligne (`window.__musique.rendre`, `?musique=1&qa=1`) : vitesse par rapport au temps réel.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=…] node tools/jalon-musique-cout.mjs [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/jalon-2026-10/cout/musique.json';
const DUREE_S = Number(process.env.LQV_MUSIQUE_DUREE) || 20;
const head = execSync('git rev-parse --short HEAD').toString().trim();
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4503, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const report = { date: new Date().toISOString(), commit: head, dureeS: DUREE_S, repos: null, tempsReel: {}, horsLigne: {} };

const cdp = await browser.newBrowserCDPSession();
const cpu = async () => {
  const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
  const de = (t) => processInfo.filter((x) => x.type === t).reduce((s, x) => s + x.cpuTime, 0);
  return { page: de('renderer'), audio: de('audio.mojom.AudioService') };
};
const stats = (p) => p.evaluate(() => { const c = window.__ctx?.playbackStats; return c ? { n: c.underrunEvents, d: c.underrunDuration } : null; });
const fenetre = async (p, s) => {
  const a = await cpu();
  const u0 = await stats(p);
  const t0 = Date.now();
  await p.waitForTimeout(s * 1000);
  const b = await cpu();
  const u1 = await stats(p);
  const dt = (Date.now() - t0) / 1000;
  const pc = (x) => Math.round((x / dt) * 1000) / 10;
  return { pagePct: pc(b.page - a.page), audioPct: pc(b.audio - a.audio), trous: u0 && u1 ? u1.n - u0.n : null, trousS: u0 && u1 ? Math.round((u1.d - u0.d) * 1000) / 1000 : null };
};
const ouvrir = async (q) => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(180000);
  watchConsole(p, erreurs);
  await p.addInitScript(() => { const A = window.AudioContext; window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ctx = this; } }; });
  await p.goto(`${server.base}/?musique=1${q}`, { timeout: 90000 });
  await p.waitForSelector('[data-key="mu-labo"]');
  return { ctx, p };
};

try {
  {
    const { ctx, p } = await ouvrir('');
    await p.waitForTimeout(1500);
    report.repos = await fenetre(p, 8);
    await ctx.close();
    console.log('repos', JSON.stringify(report.repos));
  }
  const CIBLES = [['I-1', []], ['II-1', []], ['III-1', ['tension', 'cuivres']], ['V-1', ['tension', 'cuivres']], ['VI-1', ['tension', 'cuivres']], ['VI-2', ['tension', 'cuivres']]];
  for (const [id, couches] of CIBLES) {
    const { ctx, p } = await ouvrir('');
    const t0 = Date.now();
    await p.click(`[data-key="mu-${id}"]`);
    await p.waitForFunction(() => (window.__ctx?.currentTime ?? 0) > 0.2 && !/calcul|banque/i.test(document.querySelector('[data-key="mu-etat"]')?.textContent ?? ''), null, { timeout: 120000 });
    const banqueMs = Date.now() - t0;
    for (const k of couches) await p.click(`[data-key="mu-couche-${k}"]`);
    await p.waitForTimeout(3000); // la levée passée, les couches entrées sur la mesure
    const etat = await p.textContent('[data-key="mu-etat"]');
    const r = await fenetre(p, DUREE_S);
    report.tempsReel[id] = { banqueMs, couches, etat: etat?.slice(0, 80), ...r };
    console.log(id, JSON.stringify(report.tempsReel[id]));
    await ctx.close();
  }
  const { ctx, p } = await ouvrir('&qa=1');
  await p.waitForFunction(() => !!window.__musique, null, { timeout: 60000 });
  const plein = (v) => ({ nom: `S-plein-${v}`, scenario: { duree: 48, actions: [{ t: 0, faire: 'jouer', version: v, intro: false }, { t: 0.06, faire: 'couches', niveaux: { melodie: 1, tension: 0, cuivres: 0 }, sur: 'temps', duree: 0.01 }, { t: 30, faire: 'couches', niveaux: { tension: 1, cuivres: 1 } }] } });
  for (const c of [{ nom: 'I-1', version: 'I-1' }, { nom: 'II-1', version: 'II-1' }, plein('III-1'), plein('V-1'), plein('VI-1'), plein('VI-2')]) {
    const m = await p.evaluate(async (x) => { const r = await window.__musique.rendre({ version: x.version, scenario: x.scenario }, { passes: 1, graine: 1 }); return { duree: r.duree, msBanque: r.msBanque, msRendu: r.msRendu }; }, c);
    report.horsLigne[c.nom] = { dureeS: Math.round(m.duree * 10) / 10, banqueMs: Math.round(m.msBanque), renduMs: Math.round(m.msRendu), vitesse: Math.round((m.duree / (m.msRendu / 1000)) * 10) / 10 };
    console.log(c.nom, JSON.stringify(report.horsLigne[c.nom]));
  }
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
}
report.console = erreurs;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);
console.log(`console : ${erreurs.length ? erreurs.slice(0, 3).join(' | ') : 'aucune erreur'}`);
process.exit(erreurs.some((e) => e.startsWith('error') || e.startsWith('pageerror')) ? 1 : 0);
