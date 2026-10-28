// M13 — mesure des pistes (outil d'équilibre) : une version rendue instrument par instrument (les autres coupés), sonie
// intégrée et durée de rendu de chaque piste, pour équilibrer le mélange sans pouvoir écouter. Les WAV restent dans
// `artifacts/qa/tmp/m13/pistes/` (non suivis). Usage : npm run build && node tools/m13-pistes.mjs [version, défaut I-1]
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync } from 'node:fs';
import { launch, startPreview } from './browser.mjs';

const VERSION = process.argv[2] ?? 'I-1';
const DIR = 'artifacts/qa/tmp/m13/pistes';
mkdirSync(DIR, { recursive: true });
const GROUPES = {
  tout: null, vibra: ['vibra'], piano: ['piano'], rhodes: ['rhodes'], basse: ['basse'], guitares: ['guitare', 'nylon'], ride: ['ride', 'crash', 'cloche'], charley: ['charley', 'charley-ferme'], gc: ['gc'], caisse: ['cc', 'cc-balai', 'rim'], balais: ['balai'], nappe: ['nappe'],
  // vents et cordes (temps réel) ; les couches du duel sont toutes ouvertes pour la mesure
  sax: ['sax'], saxes: ['saxes'], trompettes: ['trompette', 'trompette-ouverte'], flute: ['flute'], cuivres: ['cuivres'], cordes: ['cordes'], archet: ['archet'],
};
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4500, process.env.LQV_DIST || 'dist');
const browser = await launch();
try {
  const p = await (await browser.newContext()).newPage();
  p.setDefaultTimeout(600000);
  await p.exposeFunction('__ecrire', (nom, b64) => appendFileSync(nom, Buffer.from(b64, 'base64')));
  await p.goto(`${server.base}/?musique=1&qa=1`);
  await p.waitForFunction(() => !!window.__musique);
  for (const [nom, solo] of Object.entries(GROUPES)) {
    const wav = `${DIR}/${VERSION}-${nom}.wav`;
    rmSync(wav, { force: true });
    const meta = await p.evaluate(async ({ v, solo, wav }) => {
      const r = await window.__musique.rendre({ version: v }, { passes: 1, graine: 1, intro: false, couches: { melodie: 1, tension: 1, cuivres: 1 }, ...(solo ? { solo } : {}) });
      const b = r.wav;
      for (let i = 0; i < b.length; i += 3 << 20) {
        let s = '';
        const m = b.subarray(i, i + (3 << 20));
        for (let j = 0; j < m.length; j += 0x8000) s += String.fromCharCode(...m.subarray(j, j + 0x8000));
        await window.__ecrire(wav, btoa(s));
      }
      return { duree: r.duree, ms: r.msRendu };
    }, { v: VERSION, solo, wav });
    const log = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -i '${wav}' -af ebur128=peak=true -f null - 2>&1 | tail -20`]).toString();
    const I = /I:\s+(-?[\d.]+) LUFS/.exec(log)?.[1];
    const pk = /Peak:\s+(-?[\d.]+) dBFS/.exec(log)?.[1];
    console.log(`${nom.padEnd(9)} ${String(I).padStart(6)} LUFS · crête ${pk} dBTP · rendu ${Math.round(meta.ms)} ms (×${(meta.duree / (meta.ms / 1000)).toFixed(1)})`);
  }
} finally {
  await browser.close();
  server.stop();
}
