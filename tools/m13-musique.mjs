// M13 — rendus hors ligne de la musique (contrat `docs/m13/01_MUSIQUE.md`, §6) : chaque version (levée et passages) et
// chaque jingle rendus dans Chromium sans être joués (OfflineAudioContext, laboratoire `?musique=1&qa=1`), puis, avec
// ffmpeg : aperçu OGG écoutable partout (`artifacts/audio/m13/`), sonie intégrée EBU R128 et crête vraie, spectrogramme
// et forme d'onde (`screenshots/qa/m13/`), vitesse de rendu. Les WAV restent dans `artifacts/qa/tmp/m13/` (non suivis).
// Usage : npm run build && node tools/m13-musique.mjs [passes, défaut 2] [graine, défaut 1] [filtre : I-1, victoire…]
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const PASSES = Number(process.argv[2] ?? 2);
const GRAINE = Number(process.argv[3] ?? 1);
const FILTRE = process.argv[4] ?? '';
const WAV = 'artifacts/qa/tmp/m13';
const OGG = 'artifacts/audio/m13';
const IMG = 'screenshots/qa/m13';
const OUT = 'artifacts/qa/m13';
for (const d of [WAV, OGG, IMG, OUT]) mkdirSync(d, { recursive: true });
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();

// Scénarios de la musique interactive (contrat 2) : actions aux instants dits, rendues comme un morceau.
const SCENARIOS = [
  // les thèmes propres des duels (Maisons, Kaï, Championnat) avec toutes leurs couches (mélodie, tension, cuivres)
  ...['III-1', 'IV-1', 'IV-2', 'IV-3', 'IV-4', 'V-1', 'VI-1', 'VI-2'].map((v) => ({
    nom: `S-plein-${v}`, requiert: v,
    scenario: { duree: 48, actions: [{ t: 0, faire: 'jouer', version: v, intro: false, }, { t: 0.06, faire: 'couches', niveaux: { melodie: 1, tension: 0, cuivres: 0 }, sur: 'temps', duree: 0.01 }, { t: 30, faire: 'couches', niveaux: { tension: 1, cuivres: 1 } }] },
  })),
  // les couches du duel, chacune seule (sonie relative, outil de mélange)
  ...['fond', 'melodie', 'tension', 'cuivres'].map((k) => ({
    nom: `S-couche-${k}`, requiert: 'III-1',
    scenario: { duree: 27, actions: [{ t: 0, faire: 'jouer', version: 'III-1', intro: false }, { t: 0.06, faire: 'couches', niveaux: { fond: 0, melodie: 0, tension: 0, cuivres: 0, [k]: 1 }, sur: 'temps', duree: 0.01 }] },
  })),
  {
    nom: 'S-ponctuations', requiert: 'I-1',
    scenario: {
      duree: 44,
      actions: [
        { t: 0, faire: 'jouer', version: 'I-1', intro: false },
        { t: 8, faire: 'ponctuer', id: 'gagne' }, { t: 14, faire: 'ponctuer', id: 'perdu' }, { t: 20, faire: 'ponctuer', id: 'gagne' },
        { t: 26, faire: 'ponctuer', id: 'signature' }, { t: 32, faire: 'ponctuer', id: 'prolongation' },
        { t: 38, faire: 'terminer', jingle: 'victoire' },
      ],
    },
  },
  {
    // un duel entier : la mélodie au premier Clash, des ponctuations, l'intensité qui monte, le duel tendu (PV sous 30 %),
    // les cuivres à une Signature annoncée, la fin sur le temps fort et le jingle de victoire
    nom: 'S-duel', requiert: 'III-1',
    scenario: {
      duree: 84,
      actions: [
        { t: 0, faire: 'jouer', version: 'III-1', intro: false },
        { t: 7, faire: 'couches', niveaux: { melodie: 1 } }, { t: 7, faire: 'ponctuer', id: 'gagne' },
        { t: 15, faire: 'ponctuer', id: 'perdu' }, { t: 24, faire: 'ponctuer', id: 'gagne' },
        { t: 30, faire: 'contexte', options: { intensite: 0.7 } },
        // le duel qui se tend : un break (arrêt net sur la phrase, une mesure de silence), puis le duel tendu
        { t: 44, faire: 'enchainer', version: 'III-2', couches: { melodie: 1 } },
        { t: 56, faire: 'couches', niveaux: { cuivres: 1 } }, { t: 56, faire: 'ponctuer', id: 'signature' },
        { t: 66, faire: 'ponctuer', id: 'gagne' },
        { t: 76, faire: 'terminer', jingle: 'victoire' },
      ],
    },
  },
  {
    // la ville : le Quai, un dialogue (focus), l'entrée en duel (la ville s'assourdit), puis la Place du Fanal où le
    // combo du Fanal joue (source localisée qu'on approche puis qu'on quitte)
    nom: 'S-ville', requiert: 'II-1',
    scenario: {
      duree: 70,
      actions: [
        { t: 0, faire: 'jouer', version: 'II-1', options: { chapitre: 2 }, intro: false },
        { t: 10, faire: 'focus', on: true }, { t: 18, faire: 'focus', on: false },
        { t: 24, faire: 'source', nom: 'fanal', version: 'I-2' },
        { t: 26, faire: 'proximite', nom: 'fanal', x: 0.2 }, { t: 32, faire: 'proximite', nom: 'fanal', x: 0.55 },
        { t: 38, faire: 'proximite', nom: 'fanal', x: 1 }, { t: 48, faire: 'proximite', nom: 'fanal', x: 0.3 },
        { t: 54, faire: 'source', nom: 'fanal', version: null },
        // l'entrée en duel : la ville assourdie s'efface, un silence, puis le duel
        { t: 58, faire: 'assourdir', on: true }, { t: 58, faire: 'enchainer', version: 'III-1' }, { t: 61.8, faire: 'assourdir', on: false },
      ],
    },
  },
  {
    // les enchaînements (retour du responsable du 2026-10-29) : chaque nouveau morceau après un effacement et un silence,
    // par sa levée ; la fin d'un duel : le jingle, un silence, puis la ville
    nom: 'S-transitions', requiert: 'I-1',
    scenario: {
      duree: 84,
      actions: [
        { t: 0, faire: 'enchainer', version: 'I-2' },
        { t: 9, faire: 'focus', on: true }, { t: 15, faire: 'focus', on: false },
        { t: 18, faire: 'enchainer', version: 'I-1' },
        { t: 34, faire: 'enchainer', version: 'II-1', options: { chapitre: 2 } },
        { t: 50, faire: 'enchainer', version: 'III-1', couches: { melodie: 1 } },
        { t: 62, faire: 'terminer', jingle: 'victoire' },
        { t: 67, faire: 'enchainer', version: 'II-2', options: { chapitre: 2 } },
      ],
    },
  },
];

const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4499, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const resultats = [];
try {
  const p = await (await browser.newContext()).newPage();
  p.setDefaultTimeout(600000);
  watchConsole(p, erreurs);
  await p.exposeFunction('__ecrire', (nom, b64) => appendFileSync(nom, Buffer.from(b64, 'base64')));
  await p.goto(`${server.base}/?musique=1&qa=1`);
  await p.waitForFunction(() => !!window.__musique);
  const { versions, jingles } = await p.evaluate(() => ({ versions: window.__musique.versions, jingles: window.__musique.jingles }));
  // les versions, les jingles, et les variations à la volée du titre (un passage de tête chacune, sans levée)
  const variations = ['envers', 'renversee', 'mineur', 'lente'].map((m) => ({ version: 'I-1', nom: `I-1-${m}`, options: { melodie: m }, passes: 1, intro: false }));
  // la ville qui grandit : chaque version de la ville au prologue (duo), au chapitre IV (vents) et en champion (le trio
  // est la version par défaut) ; un passage de tête chacune
  for (const v of ['II-1', 'II-2', 'II-3']) for (const [ch, nom] of [[0, 'duo'], [4, 'vents'], [6, 'champion']]) if (versions.includes(v)) variations.push({ version: v, nom: `${v}-${nom}`, options: { chapitre: ch }, passes: 1, intro: false });
  const cibles = [...versions.map((v) => ({ version: v })), ...jingles.map((j) => ({ jingle: j })), ...variations, ...SCENARIOS.filter((c) => versions.includes(c.requiert))]
    .filter((c) => !FILTRE || (c.nom ?? c.version ?? c.jingle) === FILTRE || (FILTRE === 'scenarios' && c.scenario));
  for (const c of cibles) {
    const nom = c.nom ?? c.version ?? c.jingle;
    const wav = `${WAV}/${nom}.wav`;
    rmSync(wav, { force: true });
    const meta = await p.evaluate(async ({ c, passes, graine, wav }) => {
      // un duel rendu seul : sa mélodie d'emblée (au jeu, elle attend le premier Clash ; ses autres couches : `S-plein-…`)
      const duel = c.version && /^(III|IV|V|VI)-/.test(c.version) && !c.scenario;
      const r = await window.__musique.rendre({ version: c.version, jingle: c.jingle, scenario: c.scenario }, { passes, graine, ...(c.options ? { options: c.options } : {}), ...(c.intro === false ? { intro: false } : {}), ...(duel ? { couches: { melodie: 1 } } : {}) });
      const b = r.wav;
      const pas = 3 * 1024 * 1024;
      for (let i = 0; i < b.length; i += pas) {
        let s = '';
        const morceau = b.subarray(i, i + pas);
        for (let j = 0; j < morceau.length; j += 0x8000) s += String.fromCharCode(...morceau.subarray(j, j + 0x8000));
        await window.__ecrire(wav, btoa(s));
      }
      return { duree: r.duree, msBanque: r.msBanque, msRendu: r.msRendu };
    }, { c, passes: c.passes ?? (c.version ? PASSES : 1), graine: GRAINE, wav });
    // mesures (EBU R128, crête vraie)
    const log = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -i '${wav}' -af ebur128=peak=true -f null - 2>&1 | tail -20`]).toString();
    const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(log)?.[1] ?? NaN);
    const LRA = Number(/LRA:\s+([\d.]+) LU/.exec(log)?.[1] ?? NaN);
    const crete = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(log)?.[1] ?? NaN);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', '3', `${OGG}/${nom}.ogg`]);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-lavfi', 'showspectrumpic=s=1400x420:legend=1:color=intensity:scale=log:fscale=log', '-q:v', '5', `${IMG}/${nom}-spectre.jpg`]);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-lavfi', 'showwavespic=s=1400x200:split_channels=1:colors=#d9b26a|#7fa7d9', '-q:v', '5', `${IMG}/${nom}-onde.jpg`]);
    const r = { nom, ...meta, lufs: I, lra: LRA, creteVraie: crete, vitesse: meta.duree / (meta.msRendu / 1000) };
    resultats.push(r);
    console.log(`${nom.padEnd(10)} ${meta.duree.toFixed(1)} s · ${I} LUFS · LRA ${LRA} · crête ${crete} dBTP · rendu ×${r.vitesse.toFixed(1)} · banque ${Math.round(meta.msBanque)} ms`);
  }
} finally {
  await browser.close();
  server.stop();
}
writeFileSync(`${OUT}/mesures${FILTRE ? `-${FILTRE}` : ''}.json`, JSON.stringify({ commit, date: new Date().toISOString(), passes: PASSES, graine: GRAINE, resultats, console: erreurs }, null, 2));
const md = [
  `# Musique M13 : rendus hors ligne — ${commit}`,
  '',
  `${PASSES} passage(s) par version (levée comprise), graine ${GRAINE}. Visée : −18 ± 3 LUFS au volume plein, crête vraie ≤ −1 dBTP. Aperçus : \`${OGG}/\` ; spectrogrammes : \`${IMG}/\`.`,
  '',
  '| Morceau | Durée | Sonie intégrée | LRA | Crête vraie | Vitesse de rendu |',
  '|---|---|---|---|---|---|',
  ...resultats.map((r) => `| ${r.nom} | ${r.duree.toFixed(1)} s | ${r.lufs} LUFS | ${r.lra} LU | ${r.creteVraie} dBTP | ×${r.vitesse.toFixed(1)} |`),
  '',
  erreurs.length ? `Console : ${erreurs.length} message(s).` : 'Console : vide.',
  '',
];
if (!FILTRE) writeFileSync(`${OUT}/mesures.md`, md.join('\n'));
console.log(erreurs.length ? `console : ${erreurs.join(' | ')}` : 'console vide');
