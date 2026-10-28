// M13 — les instruments écoutés seuls (contrat `docs/m13/01_MUSIQUE.md`, §6) : justesse de chaque instrument (vents et
// cordes en temps réel compris : la note rendue hors ligne, la fondamentale par autocorrélation), puis une démonstration
// par instrument (le premier A du thème I dans son registre), en aperçu OGG (`artifacts/audio/m13/instruments/`) avec
// sonie et crête. Usage : npm run build && node tools/m13-instruments.mjs [filtre : trompette, sax…]
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const FILTRE = process.argv[2] ?? '';
const WAV = 'artifacts/qa/tmp/m13';
const OGG = 'artifacts/audio/m13/instruments';
const OUT = 'artifacts/qa/m13';
for (const d of [WAV, OGG, OUT]) mkdirSync(d, { recursive: true });
const NOTES = {
  trompette: [55, 62, 67, 74, 79, 84], sax: [46, 51, 58, 63, 70, 75], flute: [62, 69, 74, 81, 86, 93], cuivres: [50, 57, 64, 71, 76],
  cordes: [48, 55, 62, 69, 76, 83], guitare: [43, 52, 59, 67, 76], nylon: [45, 52, 59, 66, 76],
  'trompette-ouverte': [55, 62, 67, 74, 79, 84], saxes: [46, 53, 60, 67, 74], archet: [28, 33, 40, 45, 50],
};
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4499, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const justesses = {};
const demos = [];
try {
  const p = await (await browser.newContext()).newPage();
  p.setDefaultTimeout(600000);
  watchConsole(p, erreurs);
  await p.exposeFunction('__ecrire', (nom, b64) => appendFileSync(nom, Buffer.from(b64, 'base64')));
  await p.goto(`${server.base}/?musique=1&qa=1`);
  await p.waitForFunction(() => !!window.__musique);
  for (const [instr, notes] of Object.entries(NOTES)) {
    if (FILTRE && instr !== FILTRE) continue;
    justesses[instr] = await p.evaluate(({ instr, notes }) => window.__musique.justesse(instr, notes), { instr, notes });
    const pire = Math.max(...justesses[instr].map((x) => Math.abs(x.cents)));
    console.log(`${instr.padEnd(10)} justesse : ${justesses[instr].map((x) => `${x.m}:${x.cents}`).join(' ')} (pire ${pire} cents)`);
  }
  const liste = await p.evaluate(() => window.__musique.demos);
  for (const instr of liste) {
    if (FILTRE && instr !== FILTRE) continue;
    const wav = `${WAV}/demo-${instr}.wav`;
    rmSync(wav, { force: true });
    const meta = await p.evaluate(async ({ instr, wav }) => {
      const r = await window.__musique.rendre({ demo: instr });
      const b = r.wav;
      let s = '';
      for (let j = 0; j < b.length; j += 0x8000) s += String.fromCharCode(...b.subarray(j, j + 0x8000));
      await window.__ecrire(wav, btoa(s));
      return { duree: r.duree, msRendu: r.msRendu };
    }, { instr, wav });
    const log = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -i '${wav}' -af ebur128=peak=true -f null - 2>&1 | tail -20`]).toString();
    const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(log)?.[1] ?? NaN);
    const crete = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(log)?.[1] ?? NaN);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', '3', `${OGG}/${instr}.ogg`]);
    demos.push({ instr, duree: meta.duree, lufs: I, crete, vitesse: meta.duree / (meta.msRendu / 1000) });
    console.log(`${instr.padEnd(10)} démo ${meta.duree.toFixed(1)} s · ${I} LUFS · crête ${crete} dBTP · rendu ×${(meta.duree / (meta.msRendu / 1000)).toFixed(1)}`);
  }
} finally {
  await browser.close();
  server.stop();
}
if (!FILTRE) writeFileSync(`${OUT}/instruments.json`, JSON.stringify({ commit: execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim(), justesses, demos, console: erreurs }, null, 2));
console.log(erreurs.length ? `console : ${erreurs.join(' | ')}` : 'console vide');
