// M15, lot 1 — fin de l'essai d'écoute : la version actuelle rendue en référence (laboratoire `?musique=1&qa=1`), mise au même
// niveau, puis tous les extraits encodés par Chromium en WebM Opus (ffmpeg n'est pas sur ce poste), en temps réel.
// Usage : npx tsx tools/m15-essai.ts && npm run build && node tools/m15-essai.mjs [dossier WAV] [dossier de sortie]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const WAV = process.argv[2] ?? 'artifacts/qa/tmp/m15';
const OUT = process.argv[3] ?? 'artifacts/audio/m15';
const DUREE = 30;
const EXTRAITS = [
  { id: 'ville', version: 'II-1', options: { chapitre: 4 } },
  { id: 'duel', version: 'III-1', options: {}, couches: { melodie: 1, tension: 0, cuivres: 0 } },
  { id: 'championnat', version: 'VI-1', options: {}, couches: { melodie: 1, tension: 0, cuivres: 1 } },
];
mkdirSync(OUT, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4380, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 800, height: 500 } })).newPage();
  page.setDefaultTimeout(240000);
  watchConsole(page, issues);
  await page.goto(`${server.base}/?musique=1&qa=1`, { timeout: 90000 });
  await page.waitForFunction(() => !!window.__musique);

  // la référence : les 30 premières secondes, même niveau et même fondu que les trois options
  for (const x of EXTRAITS) {
    const b64 = await page.evaluate(async (x) => {
      const r = await window.__musique.rendre({ version: x.version }, { passes: 3, graine: 1, intro: false, options: x.options, ...(x.couches ? { couches: x.couches } : {}) });
      let s = '';
      for (let i = 0; i < r.wav.length; i += 0x8000) s += String.fromCharCode(...r.wav.subarray(i, i + 0x8000));
      return btoa(s);
    }, x);
    writeFileSync(`${WAV}/${x.id}-actuel.wav`, Buffer.from(b64, 'base64'));
    console.log(`référence ${x.id} rendue`);
  }

  const clips = EXTRAITS.flatMap((x) => ['actuel', 'A', 'B', 'C'].map((o) => `${x.id}-${o}`));
  await page.mouse.click(10, 10);
  const mesures = [];
  // par lots de quatre : l'encodage suit l'horloge, trop de flux à la fois ferait décrocher le rendu
  for (let i = 0; i < clips.length; i += 4) {
    const lot = clips.slice(i, i + 4);
    const r = await page.evaluate(async ({ lot, donnees, DUREE }) => {
      const ctx = new AudioContext({ sampleRate: 48000 });
      await ctx.resume();
      const bin = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0)).buffer;
      const tampons = await Promise.all(donnees.map((d) => ctx.decodeAudioData(bin(d))));
      const sorties = tampons.map((t, j) => {
        const n = Math.min(t.length, Math.round(DUREE * t.sampleRate));
        const out = ctx.createBuffer(2, n, t.sampleRate);
        const l = t.getChannelData(0).subarray(0, n);
        const r = t.getChannelData(1).subarray(0, n);
        let e = 0;
        let c = 0;
        for (let i = 0; i < n; i++) { e += l[i] ** 2 + r[i] ** 2; c = Math.max(c, Math.abs(l[i]), Math.abs(r[i])); }
        const g = lot[j].endsWith('actuel') ? Math.min(0.1 / (Math.sqrt(e / (2 * n)) || 1), 0.89 / (c || 1)) : 1;
        const f = Math.round(1.5 * t.sampleRate);
        const ol = out.getChannelData(0);
        const or = out.getChannelData(1);
        let e2 = 0;
        let c2 = 0;
        for (let i = 0; i < n; i++) { const k = lot[j].endsWith('actuel') ? Math.min(1, (n - i) / f) : 1; ol[i] = l[i] * g * k; or[i] = r[i] * g * k; if (i < n - f) { e2 += ol[i] ** 2 + or[i] ** 2; } c2 = Math.max(c2, Math.abs(ol[i]), Math.abs(or[i])); }
        return { out, dbfs: 10 * Math.log10(e2 / (2 * (n - f)) || 1e-12), crete: 20 * Math.log10(c2 || 1e-9) };
      });
      const encoder = (s) => new Promise((res) => {
        const dst = ctx.createMediaStreamDestination();
        const src = ctx.createBufferSource();
        src.buffer = s.out;
        src.connect(dst);
        const rec = new MediaRecorder(dst.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
        const parts = [];
        rec.ondataavailable = (e) => parts.push(e.data);
        rec.onstop = async () => {
          const u = new Uint8Array(await new Blob(parts).arrayBuffer());
          let t = '';
          for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode(...u.subarray(i, i + 0x8000));
          res({ b64: btoa(t), dbfs: s.dbfs, crete: s.crete });
        };
        rec.start();
        src.onended = () => setTimeout(() => rec.stop(), 150);
        src.start();
      });
      const faits = await Promise.all(sorties.map(encoder));
      await ctx.close();
      return faits;
    }, { lot, donnees: lot.map((c) => readFileSync(`${WAV}/${c}.wav`).toString('base64')), DUREE });
    lot.forEach((c, j) => {
      writeFileSync(`${OUT}/${c}.webm`, Buffer.from(r[j].b64, 'base64'));
      mesures.push({ clip: c, dbfs: Number(r[j].dbfs.toFixed(1)), crete: Number(r[j].crete.toFixed(1)), octets: Buffer.from(r[j].b64, 'base64').length });
      console.log(JSON.stringify(mesures.at(-1)));
    });
  }
  // contre-épreuve sur les fichiers encodés : durée, niveau, brillance (fréquence centrale du spectre), part au-dessus de 8 kHz
  for (const m of mesures) {
    const v = await page.evaluate(async (b64) => {
      const ctx = new OfflineAudioContext(2, 48000, 48000);
      const t = await ctx.decodeAudioData(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer);
      const x = t.getChannelData(0);
      const N = 2048;
      const fft = (re, im) => {
        for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
        for (let l = 2; l <= N; l <<= 1) { const a = (-2 * Math.PI) / l; for (let i = 0; i < N; i += l) for (let k = 0; k < l / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), u = i + k, w = i + k + l / 2, tr = re[w] * c - im[w] * s, ti = re[w] * s + im[w] * c; re[w] = re[u] - tr; im[w] = im[u] - ti; re[u] += tr; im[u] += ti; } }
      };
      let somme = 0, pond = 0, haut = 0, e = 0;
      for (let d = 0; d + N < x.length; d += Math.floor(x.length / 120)) {
        const re = Float64Array.from({ length: N }, (_, i) => x[d + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)));
        const im = new Float64Array(N);
        fft(re, im);
        for (let k = 1; k < N / 2; k++) { const p = re[k] ** 2 + im[k] ** 2, f = (k * t.sampleRate) / N; somme += p; pond += p * f; if (f > 8000) haut += p; }
      }
      for (const v of x) e += v * v;
      return { secondes: t.duration, dbfs: 10 * Math.log10(e / x.length || 1e-12), centre: pond / somme, haut: (100 * haut) / somme };
    }, readFileSync(`${OUT}/${m.clip}.webm`).toString('base64'));
    Object.assign(m, { secondes: Number(v.secondes.toFixed(1)), dbfsFichier: Number(v.dbfs.toFixed(1)), centreHz: Math.round(v.centre), au8kHz: Number(v.haut.toFixed(2)) });
    console.log(JSON.stringify(m));
  }
  writeFileSync(`${OUT}/mesures.json`, JSON.stringify(mesures, null, 1));
} finally {
  await browser.close();
  await server.stop();
}
console.log(`console : ${issues.length} problème(s)`);
for (const i of issues.slice(0, 5)) console.log(' ', String(i.text ?? i).slice(0, 180));
process.exit(issues.length ? 1 : 0);
