// Vidéo du parcours complet d’un joueur (M06) — enregistrement Playwright du runtime réel :
// accueil → création → deck → rencontres → préparation → duel complet (Clash joués en entier, rythme
// rapide) → résultat → retour au tableau → collection. Sous SwiftShader (rendu LOGICIEL) : la vidéo
// montre le parcours, sa fluidité n’est PAS représentative d’un GPU.
// Usage : npm run build && node tools/video-m06.mjs   → screenshots/qa/m06/parcours-1280.webm
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { launch, startPreview } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const OUT = process.env.VIDEO_OUT ?? 'screenshots/qa/m06';
const TMP = `${OUT}/.video-tmp`;
mkdirSync(TMP, { recursive: true });
const server = await startPreview();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: TMP, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
const pause = (ms) => page.waitForTimeout(ms);
let turns = 0;
try {
  await page.goto(`${server.base}/?qa=1&aiDelay=500&reducedMotion=0&pace=fast&profileSeed=${process.env.VIDEO_PROFILE_SEED ?? 20261017}`);
  await page.waitForSelector('[data-screen="home"]');
  await pause(1800);
  await page.click('[data-key="home-new"]');
  await pause(900);
  await page.fill('[data-key="new-name"]', 'Démonstration');
  await page.click('[data-key="new-sig-Cendre"]');
  await pause(600);
  await page.click('[data-key="new-create"]');
  await page.waitForSelector('[data-screen="board"]');
  await pause(1500);
  await page.click('[data-key="board-deck"]');
  await pause(900);
  await page.click('[data-key="inspect-Cendre-1"]');
  await pause(900);
  await page.click('[data-key="ver-Voile-1-basic"]');
  await pause(500);
  await page.click('[data-key="ver-Voile-1-variant"]');
  await pause(500);
  await page.click('[data-key="deck-back"]');
  await page.click('[data-key="enc-quai-1"]');
  await page.waitForSelector('[data-screen="prep"]');
  await pause(1800);
  await page.click('[data-key="prep-start"]');
  await page.waitForFunction(() => !!window.__lqv);
  const st = newStats();
  let out = 'running';
  for (let t = 0; t < 90 && out !== 'ended' && out !== 'stuck'; t++) out = await playTurn(page, { name: 'video', useLecture: true, mode: 'drag', watchSequence: true }, st);
  turns = st.turns;
  await page.waitForSelector('[data-screen="result"]', { timeout: 60000 });
  await pause(3000);
  await page.click('[data-key="result-board"]');
  await pause(1800);
  await page.click('[data-key="board-collection"]');
  await pause(1800);
  await page.click('[data-key="coll-back"]');
  await pause(800);
} finally {
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  renameSync(src, `${OUT}/parcours-1280.webm`);
  rmSync(TMP, { recursive: true, force: true });
  await browser.close();
  server.stop();
}
console.log(`vidéo : ${OUT}/parcours-1280.webm (duel de ${turns} tours)`);
