// Retour du test du responsable (2026-11-04) : « les textes explicatifs dans le HUD combat ne sont pas toujours visibles
// entièrement, la partie du bas semble rognée par le conteneur trop petit ». Des duels joués coup par coup (Duel standard
// contre Kaï, conseils actifs ; puis la Résolution pas à pas), en 1280 × 720 et 1920 × 1080 : à chaque relevé, tout texte du
// HUD dont le contenu dépasse sa boîte sans pouvoir défiler (rogné), et les chevauchements du panneau de commande avec le
// conseil, la main et le HUD du joueur.
// Usage : npm run build && node tools/hud-rognes.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const DIR = process.env.LQV_DIR ?? 'screenshots/qa/hud-rognes';
const OUT = process.env.LQV_OUT ?? 'artifacts/qa/hud-rognes.json';
mkdirSync(DIR, { recursive: true });
mkdirSync('artifacts/qa', { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4317, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const res = {};
try {
  for (const [w, hgt] of [[1280, 720], [1920, 1080]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.setDefaultTimeout(120000);
    watchConsole(p, erreurs);
    // conseils actifs (`conseils=1`), rythme normal, Résolution pas à pas
    await p.goto(`${server.base}/?qa=1&aiDelay=0&conseils=1`);
    await p.click('[data-key="home-new"]');
    await p.click('[data-key="new-sig-Cendre"]');
    await p.click('[data-key="new-create"]');
    await p.click('[data-key="enc-libre-braise"]');
    await p.click('[data-key="prep-start"]');
    await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe);
    await p.evaluate(() => {
      const log = window.__rognes = [];
      const boite = (s) => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return r; };
      const recoupe = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
      const releve = () => {
        const out = [];
        for (const el of document.querySelectorAll('.command, .command *, .tip, .tip *, .hud *, #activations *')) {
          if (!el.getClientRects().length || !(el.textContent ?? '').trim()) continue;
          // les libellés imprimés sur une carte (nom, variante : une ligne à points de suspension) ne sont pas des textes explicatifs
          if (el.closest('.card')) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden') continue;
          const coupe = cs.overflowY === 'hidden' || cs.overflowY === 'clip' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
          if (coupe && el.scrollHeight > el.clientHeight + 1) out.push({ quoi: 'rogne', el: el.className || el.tagName, texte: el.textContent.trim().slice(0, 120), besoin: el.scrollHeight, boite: el.clientHeight });
        }
        const cmd = boite('.command');
        for (const s of ['.tip', '.hand', '.hud.me']) if (recoupe(cmd, boite(s))) out.push({ quoi: 'chevauche', el: `.command / ${s}` });
        if (cmd && cmd.top < 0) out.push({ quoi: 'hors-ecran', el: '.command' });
        const m = document.querySelector('.command .msg');
        if (m && m.scrollHeight > m.clientHeight + 1) out.push({ quoi: 'defile', el: 'msg', texte: m.textContent.trim().slice(0, 120) });
        return { out, cmdH: cmd ? Math.round(cmd.height) : null };
      };
      window.__releve = releve;
      setInterval(() => { const r = releve(); if (r.out.length) log.push(r.out); }, 120);
    });
    const stats = newStats();
    let tours = 0;
    let pris = 0;
    let hMax = 0;
    for (let i = 0; i < 40; i++) {
      const r = await p.evaluate(() => window.__releve());
      hMax = Math.max(hMax, r.cmdH ?? 0);
      if (pris < 4 && i % 2 === 0) { writeFileSync(`${DIR}/${w}-${String(++pris).padStart(2, '0')}.png`, await p.screenshot()); }
      const out = await playTurn(p, { name: 'hud', useLecture: false, mode: 'click' }, stats).catch(() => 'ended');
      tours++;
      if (out === 'ended' || out === 'stuck' || await p.$('[data-key="result-board"]')) break;
    }
    const log = await p.evaluate(() => window.__rognes);
    const vus = new Map();
    for (const l of log) for (const x of l) vus.set(`${x.quoi} ${x.el}`, x);
    res[w] = { tours, hauteurMaxPanneau: hMax, defauts: [...vus.values()] };
    for (const x of vus.values()) console.log(`  ${w} : ${x.quoi} ${x.el} ${x.texte ?? ''} ${x.besoin ? `(${x.besoin} pour ${x.boite} px)` : ''}`);
    check([...vus.values()].filter((x) => x.quoi !== 'defile').length === 0, `${w} × ${hgt} : ${tours} étapes de duel, aucun texte rogné ni chevauchement (panneau jusqu'à ${hMax} px)`);
    check(![...vus.values()].some((x) => x.quoi === 'defile'), `${w} × ${hgt} : le message tient sans défiler`);
    await ctx.close();
  }
  check(erreurs.length === 0, `console sans erreur (${erreurs.length})`);
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  writeFileSync(OUT, JSON.stringify({ res, checks, erreurs }, null, 2));
  await browser.close();
  server.stop();
}
process.exit(checks.some((x) => x.startsWith('ÉCHEC')) ? 1 : 0);
