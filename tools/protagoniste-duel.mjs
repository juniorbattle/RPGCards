// Portrait du joueur au duel contre son personnage de la ville (retour du responsable, 2026-11-03 : « les portraits du joueur
// doivent être cohérents avec la personnalisation du personnage ») : pour quelques apparences, une nouvelle aventure en Récit
// guidé jusqu'au premier duel ; capture du personnage de la ville (scène de Kaï) et du duel (portrait du HUD).
// Usage : npm run build && node tools/protagoniste-duel.mjs [sortie, défaut screenshots/qa/protagoniste/duel]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/protagoniste/duel';
mkdirSync(OUT, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4394, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
// clics de l'éditeur, dans l'ordre
const CAS = [
  { nom: 'origine', clics: [] },
  { nom: 'b-boucles', clics: ['av-ap-sil-b', 'av-ap-coupe-3', 'av-ap-peau-4', 'av-ap-cheveux-1', 'av-ap-yeux-2'] },
  { nom: 'a-queue', clics: ['av-ap-coupe-1', 'av-ap-visage-2', 'av-ap-peau-2', 'av-ap-cheveux-4', 'av-ap-yeux-1'] },
  { nom: 'b-rases', clics: ['av-ap-sil-b', 'av-ap-coupe-2', 'av-ap-visage-3', 'av-ap-cheveux-8'] },
];
try {
  for (const c of CAS) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.setDefaultTimeout(90000);
    watchConsole(p, erreurs);
    await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=5&recit=guide`, { timeout: 90000 });
    await p.click('[data-key="av-new"]');
    await p.waitForSelector('[data-key="av-ap-sil-b"]');
    for (const k of c.clics) { await p.waitForSelector(`[data-key="${k}"]`); await p.click(`[data-key="${k}"]`); await p.waitForTimeout(150); }
    await p.waitForTimeout(500);
    const nv = await p.$('.av-nv-apercu');
    writeFileSync(join(OUT, `${c.nom}-1-editeur.png`), await nv.screenshot());
    await p.click('[data-key="av-suite"]');
    await p.click('[data-key="av-start"]');
    // la scène de Kaï, puis le duel
    let villeVue = false;
    for (let i = 0; i < 600; i++) {
      const etat = await p.evaluate(() => {
        const a = window.__lqvAventure;
        if (a?.ecran === 'duel') return window.__lqv?.controller?.view?.awaitingMe ? 'duel' : 'attente';
        if (document.querySelector('.ville-fade.in')) return 'attente';
        if (a?.cine) return 'cine';
        if (document.querySelector('.ville-dialog button')) return 'dialogue';
        return 'attente';
      });
      if (etat === 'duel') break;
      if (etat === 'cine') await p.keyboard.press('Escape');
      if (etat === 'dialogue') {
        if (!villeVue) { await p.waitForTimeout(900); writeFileSync(join(OUT, `${c.nom}-2-ville.png`), await p.screenshot()); villeVue = true; }
        await p.click('.ville-dialog button');
      }
      await p.waitForTimeout(150);
    }
    await p.waitForTimeout(1500);
    writeFileSync(join(OUT, `${c.nom}-3-duel.png`), await p.screenshot());
    const portrait = await p.locator('.portrait img >> visible=true').first().elementHandle({ timeout: 5000 }).catch(() => null);
    check(!!portrait, `${c.nom} : portrait du HUD présent`);
    if (portrait) writeFileSync(join(OUT, `${c.nom}-4-portrait.png`), await portrait.screenshot());
    const id = await p.evaluate(() => window.__lqvAventure?.save?.profil?.apparence ?? null);
    check(true, `${c.nom} : apparence ${JSON.stringify(id)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.stop();
}
const err = erreurs.filter((x) => x.startsWith('error') || x.startsWith('pageerror'));
check(err.length === 0, `console : ${err.length ? err.slice(0, 3).join(' | ') : 'vide'}`);
const ko = checks.filter((x) => !x.startsWith('OK')).length;
console.log(`${checks.length - ko}/${checks.length} contrôles`);
process.exit(ko ? 1 : 0);
