// Vidéo du parcours complet d’un joueur (M06) — capture du runtime réel par le screencast de Chromium
// (CDP `Page.startScreencast`, images horodatées) puis encodage par le ffmpeg du système (H.264) :
// accueil → création → deck → rencontres → préparation → duel complet (Clash joués en entier, rythme
// rapide) → résultat → retour au tableau → collection. Sous SwiftShader (rendu LOGICIEL) : la vidéo
// montre le parcours en TEMPS RÉEL de cette machine ; sa fluidité n’est PAS représentative d’un GPU.
// (L’enregistreur vidéo intégré de Playwright exige un binaire ffmpeg propre à Playwright, absent ici.)
// Usage : npm run build && node tools/video-m06.mjs   → screenshots/qa/m06/parcours-1280.mp4
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { launch, startPreview } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const OUT = process.env.VIDEO_OUT ?? 'screenshots/qa/m06';
const TMP = `${OUT}/.video-tmp`;
const FFMPEG = process.env.FFMPEG ?? '/usr/bin/ffmpeg';
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const server = await startPreview();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
const pause = (ms) => page.waitForTimeout(ms);
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on('Page.screencastFrame', async (f) => {
  const file = `${TMP}/f${String(frames.length).padStart(6, '0')}.jpg`;
  writeFileSync(file, Buffer.from(f.data, 'base64'));
  frames.push({ file, t: f.metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
let turns = 0;
try {
  await page.goto(`${server.base}/?qa=1&aiDelay=500&reducedMotion=0&pace=fast&profileSeed=${process.env.VIDEO_PROFILE_SEED ?? 20261017}`);
  await page.waitForSelector('[data-screen="home"]');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
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
  await cdp.send('Page.stopScreencast');
} finally {
  await ctx.close();
  await browser.close();
  server.stop();
}
// Durée de chaque image = écart réel jusqu’à la suivante (temps réel de la machine, pas accéléré).
const lines = ['ffconcat version 1.0'];
frames.forEach((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 0.5;
  lines.push(`file '${f.file.split('/').pop()}'`, `duration ${Math.max(0.01, next - f.t).toFixed(3)}`);
});
lines.push(`file '${frames.at(-1).file.split('/').pop()}'`);
writeFileSync(`${TMP}/list.ffconcat`, lines.join('\n'));
const dest = `${OUT}/parcours-1280.mp4`;
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${TMP}/list.ffconcat`, '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-movflags', '+faststart', dest]);
const secs = frames.at(-1).t - frames[0].t;
rmSync(TMP, { recursive: true, force: true });
console.log(`vidéo : ${dest} — ${frames.length} images capturées sur ${Math.round(secs)} s (temps réel), duel de ${turns} tours`);
