// Capture rapide d’itération (dev) : node tools/snap.mjs "<query>" <sortie.png> [largeur] [hauteur] [attente ms] [action]
// action : « commit » (pose une Primaire en ASSAUT, vue B), « tactics » (jusqu’aux choix tactiques).
import { launch, startPreview, waitDecision, dragTo } from './browser.mjs';

const [query = 'seed=101&autostart=1&qa=1&aiDelay=0&freeze=1', out = 'snap.png', w = '1280', h = '720', wait = '1200', action = ''] = process.argv.slice(2);
const server = await startPreview(4191);
const browser = await launch();
try {
  const mobile = Number(w) < 700;
  const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${server.base}/?${query}`);
  await page.waitForFunction(() => !!window.__lqv);
  if (action === 'commit' || action === 'tactics') {
    const v = await waitDecision(page);
    const c = v.me.hand.find((x) => !x.defId.startsWith('sig-'));
    await dragTo(page, `[data-key="hand-${c.cardId}"]`, '[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    if (action === 'tactics') {
      await page.click('[data-key="act-commit"]');
      for (let i = 0; i < 6; i++) {
        const v2 = await waitDecision(page);
        if (v2.phase === 'TACTICS') break;
        if (v2.phase === 'LECTURE') await page.click('[data-key="act-lecture-pass"]');
      }
    }
  }
  await page.waitForTimeout(Number(wait));
  await page.screenshot({ path: out });
  console.log(`ok ${out}${errors.length ? ` — console: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
}
