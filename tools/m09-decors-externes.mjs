// M09 V4 — preuve de bout en bout des plans de décor de la ville (ADR 028, B2 : contrat, approbation, préparation avant
// l'entrée, diorama), SANS aucune image externe ni générée : nos propres plans dessinés par code (canvas 2D, dans la
// page), exportés en PNG dans une COPIE TEMPORAIRE du build, avec un manifeste (empreintes SHA-256) et des entrées
// volontairement fautives. Le Quai en six plans (ciel, ville haute, façades posées sur le plan pur, rue et lampadaires,
// premier plan, eau couchée), lumières du moteur sur les lanternes peintes ; le Parvis en trois plans dont un non
// approuvé ; les Ruelles en plans fautifs.
// Parcours (Chrome ; GPU réel avec LQV_GPU=1 CHROMIUM_PATH=…) :
//   A  QA (`?qa=1`) : le Quai en diorama, plans non approuvés signalés, aucune image rendue en attente ; captures ;
//   A0 même cadre, `decors=code` (décor par code), pour la comparaison ;
//   B  politique du jeu (`decors=approuvees`) : le Quai (plans approuvés) en diorama ; le Parvis (un plan non approuvé)
//      refusé en entier, décor par code ;
//   C  `decors=code` : aucun plan lu ;
//   D  les Ruelles : refus motivés (empreinte, dimensions), décor par code ; D2 ordre contraire à la profondeur ;
//   E  entrée sans préparation (`goTo` direct) : décor par code construit, image retenue, diorama substitué avant la
//      première image ;
//   F  démo : passage au Parvis, plans préparés pendant le fondu (mesures du changement d'îlot) ;
//   G  première entrée (laboratoire) : manifeste vide du build, diorama du Quai, `decors=code` (rondes alternées).
// Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-decors-externes.mjs [dossier] [rapport.json] [rondes=5]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/v4-decors';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/v4-decors.json';
const ROUNDS = Number(process.argv[4] ?? 5);
const DIST = process.env.LQV_DIST || 'dist';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src tools public').toString().trim() ? '+arbre de travail' : '';
const tmp = mkdtempSync(join(tmpdir(), 'lqv-decors-'));
cpSync(DIST, tmp, { recursive: true });
mkdirSync(DIR, { recursive: true });
const browser = await launch();
const report = { date: new Date().toISOString(), commit: `${head}${dirty}`, dist: DIST, renderer: null, checks: [], console: [], runs: {} };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const sha = (b) => createHash('sha256').update(b).digest('hex');
let srv = null;
const serve = async (port, dir = tmp) => { srv?.stop(); srv = await startPreview(port, dir); return srv; };
const page = async (w, h) => {
  const p = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, report.console);
  return p;
};
const hideUi = () => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; };
/** Laboratoire prêt (crochet publié une fois les feuilles et le décor décidés). */
const lab = async (p, query) => {
  const t0 = Date.now();
  await p.goto(`${srv.base}/?ville=1&qa=1${query}`);
  await p.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
  const hookMs = Date.now() - t0;
  return p.evaluate((hookMs) => { const t = window.__lqvVille.town; return { hookMs, dec: t.decorReport(), st: t.stats() }; }, hookMs);
};
const shot = async (p, x, z, f, name) => {
  await p.evaluate(({ x, z, f }) => { const t = window.__lqvVille.town; t.place({ x, z }, f); t.renderNow(); }, { x, z, f });
  await p.evaluate(hideUi);
  await p.waitForTimeout(250);
  const buf = await p.screenshot();
  writeFileSync(join(DIR, `${name}.png`), buf);
  return buf;
};

/**
 * Plans de preuve dessinés par code dans la page (canvas 2D, graine fixe) : formes simples, couleurs de la nuit du jeu
 * et des quatre familles, aucun texte. Les façades sont posées sur le plan pur du Quai (`quai.ts` : FACADES, portes).
 */
function paintPlates(facades) {
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const FAM = { Cendre: '#d0541f', Voile: '#7a8fe0', Ronce: '#4f9a52', Astre: '#e0b23a' };
  const out = {};
  // ciel et colline de la ville haute (opaque)
  {
    const [c, g] = cnv(2048, 1024);
    const sky = g.createLinearGradient(0, 0, 0, 1024);
    sky.addColorStop(0, '#05070f'); sky.addColorStop(0.55, '#121834'); sky.addColorStop(0.8, '#262c4c'); sky.addColorStop(1, '#30344e');
    g.fillStyle = sky; g.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(220,226,255,${0.25 + rnd() * 0.6})`; g.fillRect(rnd() * 2048, rnd() * 640, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
    const halo = g.createRadialGradient(1380, 330, 10, 1380, 330, 220);
    halo.addColorStop(0, 'rgba(200,214,255,0.55)'); halo.addColorStop(1, 'rgba(200,214,255,0)');
    g.fillStyle = halo; g.fillRect(1100, 80, 560, 520);
    g.fillStyle = '#e8ecf8'; g.beginPath(); g.arc(1380, 330, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#141a30';
    g.beginPath(); g.moveTo(0, 1024); g.lineTo(0, 830);
    for (let x = 0; x <= 2048; x += 64) g.lineTo(x, 820 - Math.sin(x / 340) * 60 - Math.sin(x / 97) * 12);
    g.lineTo(2048, 1024); g.closePath(); g.fill();
    for (let i = 0; i < 70; i++) {
      const x = 380 + rnd() * 1300; const w = 16 + rnd() * 28; const h = 20 + rnd() * 50; const y = 800 - Math.sin(x / 340) * 60 - h;
      g.fillStyle = '#1b2240'; g.fillRect(x, y, w, h + 40);
      if (rnd() < 0.35) { g.fillStyle = '#ffc27a'; g.fillRect(x + w * 0.4, y + h * 0.3, 3, 4); }
    }
    g.fillStyle = '#1b2240'; g.fillRect(1010, 600, 40, 160); g.beginPath(); g.moveTo(1004, 600); g.lineTo(1030, 520); g.lineTo(1056, 600); g.fill();
    out.ciel = c.toDataURL('image/png');
  }
  // ville haute : un rang de toits au-dessus des façades (haut transparent)
  {
    const [c, g] = cnv(2048, 512);
    for (let x = -20; x < 2068;) {
      const w = 60 + rnd() * 90; const h = 140 + rnd() * 180; const y = 512 - h;
      g.fillStyle = rnd() < 0.5 ? '#1e2540' : '#232a46'; g.fillRect(x, y, w, h);
      g.fillStyle = '#161b30'; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + w / 2, y - 26 - rnd() * 30); g.lineTo(x + w + 6, y); g.fill();
      if (rnd() < 0.5) { g.fillStyle = '#161b30'; g.fillRect(x + w * 0.7, y - 46, 10, 40); }
      for (let wy = y + 20; wy < 500; wy += 34) for (let wx = x + 10; wx < x + w - 12; wx += 22) if (rnd() < 0.16) { g.fillStyle = rnd() < 0.8 ? '#ffb86a' : FAM.Voile; g.fillRect(wx, wy, 7, 11); }
      x += w + 2 + rnd() * 10;
    }
    out['ville-haute'] = c.toDataURL('image/png');
  }
  // façades du Quai, posées sur le plan pur (x ∈ [-24, 24] m, 64 px par mètre, pied à y = 0)
  {
    const [c, g] = cnv(3072, 1024);
    const X = (x) => (x + 24) * 64;
    const Y = (y) => 1024 - y * 64;
    const tints = ['#59607a', '#646a82', '#555c74', '#6a6f86', '#5c6280'];
    g.fillStyle = '#0c0f1c'; g.fillRect(X(-24), Y(9), X(24) - X(-24), Y(0) - Y(9));
    facades.forEach((f, i) => {
      const x0 = X(f.x0); const x1 = X(f.x1); const top = Y(f.h);
      g.fillStyle = tints[i % tints.length]; g.fillRect(x0, top, x1 - x0, Y(0) - top);
      g.fillStyle = '#20263a'; g.beginPath(); g.moveTo(x0 - 14, top); g.lineTo((x0 + x1) / 2, top - 150); g.lineTo(x1 + 14, top); g.fill();
      g.fillStyle = '#2e2a30'; g.fillRect(x0, Y(3.1), x1 - x0, 12);
      for (let fl = 0; fl < 3; fl++) {
        const wy = Y(3.6 + fl * 2.5 + 1.4);
        if (wy < top + 30) break;
        for (let wx = x0 + 40; wx < x1 - 70; wx += 120) {
          const lit = rnd() < 0.55;
          g.fillStyle = lit ? '#ffb86a' : '#28304c'; g.fillRect(wx, wy, 44, 72);
          g.strokeStyle = '#1a1622'; g.lineWidth = 6; g.strokeRect(wx, wy, 44, 72);
        }
      }
      if (f.door !== null) {
        const dx = X(f.door); const lit = f.kind !== 'maison';
        g.fillStyle = lit ? '#ffa857' : '#1c1a22'; g.beginPath(); g.moveTo(dx - 60, Y(0)); g.lineTo(dx - 60, Y(2.2)); g.arc(dx, Y(2.2), 60, Math.PI, 0); g.lineTo(dx + 60, Y(0)); g.fill();
        g.strokeStyle = '#8a8fa0'; g.lineWidth = 10; g.stroke();
      }
      if (f.kind === 'salle') Object.values(FAM).forEach((col, k) => {
        const bx = x0 + 70 + k * ((x1 - x0 - 140) / 3);
        g.fillStyle = col; g.fillRect(bx - 22, Y(7.6), 44, 150);
        g.beginPath(); g.moveTo(bx - 22, Y(7.6) + 150); g.lineTo(bx, Y(7.6) + 176); g.lineTo(bx + 22, Y(7.6) + 150); g.fill();
        g.fillStyle = '#f2e8d0'; g.beginPath(); g.arc(bx, Y(7.6) + 60, 11, 0, Math.PI * 2); g.fill();
      });
    });
    out.facades = c.toDataURL('image/png');
  }
  // rue : lampadaires et bornes du plan pur (x ∈ [-24, 24] m, 42,67 px par mètre)
  {
    const [c, g] = cnv(2048, 512);
    const X = (x) => (x + 24) * (2048 / 48);
    const Y = (y) => 512 - y * (512 / 12);
    for (const x of [-13, -4, 5, 14]) {
      g.fillStyle = '#16141c'; g.fillRect(X(x) - 4, Y(3.7), 8, Y(0) - Y(3.7));
      g.fillRect(X(x) - 10, Y(0.4), 20, Y(0) - Y(0.4));
      g.fillStyle = '#ffd38a'; g.fillRect(X(x) - 9, Y(4.25), 18, 22);
      g.strokeStyle = '#16141c'; g.lineWidth = 4; g.strokeRect(X(x) - 9, Y(4.25), 18, 22);
    }
    for (const x of [-12, -2.6, 6.4, 15.5]) { g.fillStyle = '#1e1c24'; g.fillRect(X(x) - 8, Y(0.55), 16, Y(0) - Y(0.55)); }
    out.rue = c.toDataURL('image/png');
  }
  // premier plan : mur du quai, coques et mâts (y ∈ [-2, 10] m)
  {
    const [c, g] = cnv(2048, 512);
    const X = (x) => (x + 24) * (2048 / 48);
    const Y = (y) => 512 - (y + 2) * (512 / 12);
    g.fillStyle = '#3a4058'; g.fillRect(0, Y(0), 2048, Y(-2) - Y(0));
    g.strokeStyle = '#262a3c'; g.lineWidth = 3;
    for (let r = 0; r < 3; r++) for (let x = (r % 2) * 40; x < 2048; x += 80) g.strokeRect(x, Y(0) + r * 28, 80, 28);
    for (const [bx, w] of [[-9, 7], [11, 6]]) {
      g.fillStyle = '#2a1e18'; g.beginPath(); g.moveTo(X(bx - w / 2), Y(0.3)); g.lineTo(X(bx + w / 2), Y(0.3)); g.lineTo(X(bx + w / 2 - 0.8), Y(-1.4)); g.lineTo(X(bx - w / 2 + 0.6), Y(-1.4)); g.fill();
      g.fillStyle = '#1a1412'; g.fillRect(X(bx) - 5, Y(9), 10, Y(0.3) - Y(9));
      g.strokeStyle = 'rgba(30,26,30,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(bx), Y(9)); g.lineTo(X(bx - w / 2), Y(0.3)); g.moveTo(X(bx), Y(9)); g.lineTo(X(bx + w / 2), Y(0.3)); g.stroke();
      g.fillStyle = '#ffb86a'; g.fillRect(X(bx + w / 2 - 0.6) - 6, Y(1.2), 12, 14);
    }
    out['premier-plan'] = c.toDataURL('image/png');
  }
  // eau, couchée (haut de l'image = loin) : nuit profonde, traînées des lanternes
  {
    const [c, g] = cnv(2048, 512);
    const w = g.createLinearGradient(0, 0, 0, 512);
    w.addColorStop(0, '#0d1226'); w.addColorStop(1, '#070a16');
    g.fillStyle = w; g.fillRect(0, 0, 2048, 512);
    for (const x of [-13, -4, 5, 14, -9, 11]) {
      const px = (x + 32) * (2048 / 64);
      for (let y = 0; y < 512; y += 6) { g.fillStyle = `rgba(255,190,110,${0.35 * (1 - y / 600)})`; g.fillRect(px - 6 + Math.sin(y / 9) * 5, y, 12 - y / 80, 3); }
    }
    for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(120,140,200,0.18)'; g.fillRect(rnd() * 2048, rnd() * 512, 10 + rnd() * 30, 1.5); }
    out.eau = c.toDataURL('image/png');
  }
  // le Parvis, trois plans : ciel, amphithéâtre, balustrade
  {
    const [c, g] = cnv(1024, 512);
    const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#070912'); sky.addColorStop(1, '#2a2e4a');
    g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#e8ecf8'; g.beginPath(); g.arc(300, 140, 18, 0, Math.PI * 2); g.fill();
    out['parvis-ciel'] = c.toDataURL('image/png');
  }
  {
    const [c, g] = cnv(2048, 512);
    g.fillStyle = '#4a4f66'; g.fillRect(0, 140, 2048, 372);
    for (let x = 30; x < 2048; x += 110) { g.fillStyle = '#141826'; g.beginPath(); g.moveTo(x, 512); g.lineTo(x, 330); g.arc(x + 40, 330, 40, Math.PI, 0); g.lineTo(x + 80, 512); g.fill(); }
    Object.values(FAM).forEach((col, k) => { g.fillStyle = col; g.fillRect(560 + k * 260, 160, 60, 140); });
    out['parvis-amphi'] = c.toDataURL('image/png');
  }
  {
    const [c, g] = cnv(2048, 256);
    g.fillStyle = '#3c4258'; g.fillRect(0, 170, 2048, 86);
    for (let x = 10; x < 2048; x += 46) { g.fillStyle = '#2c3044'; g.fillRect(x, 100, 18, 70); }
    g.fillStyle = '#4c526a'; g.fillRect(0, 88, 2048, 16);
    out['parvis-avant'] = c.toDataURL('image/png');
  }
  return out;
}

/** Plan quai.ts (FACADES) recopié pour poser les façades de preuve sur les portes du plan pur. */
const FACADES = [
  { x0: -19.5, x1: -11.2, h: 7.6, kind: 'maison', door: -15.2 },
  { x0: -10.6, x1: -2.9, h: 9.4, kind: 'salle', door: -6.75 },
  { x0: -2.4, x1: 2.6, h: 8.2, kind: 'maison', door: 0.1 },
  { x0: 3.2, x1: 11.2, h: 7.9, kind: 'fanal', door: 7.2 },
  { x0: 11.7, x1: 19.5, h: 10.2, kind: 'maison', door: 15.6 },
];

const SPOTS = { etal: [-0.6, 0.2, 'face'], arrivee: [-15.4, 0.6, 'droite'] };
try {
  // ---- 0) plans dessinés par code (laboratoire) -------------------------------------------------------------------
  await serve(4401);
  const p0 = await page(800, 600);
  await lab(p0, '&freeze=1&decors=code');
  report.renderer = rendererLabel(await webglRenderer(p0));
  const urls = await p0.evaluate(paintPlates, FACADES);
  await p0.context().close();
  const buf = Object.fromEntries(Object.entries(urls).map(([k, v]) => [k, Buffer.from(v.split(',')[1], 'base64')]));
  mkdirSync(join(tmp, 'decors'), { recursive: true });
  for (const [k, b] of Object.entries(buf)) writeFileSync(join(tmp, 'decors', `${k}.png`), b);
  report.plates = Object.fromEntries(Object.entries(buf).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b), size: [b.readUInt32BE(16), b.readUInt32BE(20)] }]));
  const plate = (name, o) => ({
    file: `${name}.png`, sha256: sha(buf[name]), size: [buf[name].readUInt32BE(16), buf[name].readUInt32BE(20)],
    source: 'QA : plan dessiné par code dans la page (aucune image externe ni générée)', fiche: 'art-src/decors/qa/fiche.json', approved: false, ...o,
  });
  // lumières du moteur posées sur les lanternes peintes (lampadaires du plan pur, portes de la salle et du Fanal)
  const lamps = [-13, -4, 5, 14].map((x) => ({ at: [x, 4.0, 2.95], color: 'Astre', intensity: 3.2, radius: 10, halo: 2.0, flicker: 'lantern' }));
  const quai = {
    plans: {
      ciel: plate('ciel', { at: [0, -6, -70], width: 240, orient: 'face', order: 0, blend: 'fondu', fog: 0, approved: true }),
      'ville-haute': plate('ville-haute', { at: [0, 0, -24], width: 100, orient: 'face', order: 1, blend: 'decoupe', approved: true }),
      facades: plate('facades', { at: [0, 0, -3], width: 48, orient: 'face', order: 2, blend: 'decoupe', lit: 0.35, approved: true }),
      rue: plate('rue', { at: [0, 0, 2.95], width: 48, orient: 'face', order: 3, blend: 'decoupe', approved: true }),
      'premier-plan': plate('premier-plan', { at: [0, -2, 4.6], width: 48, orient: 'face', order: 4, blend: 'decoupe', approved: true }),
      eau: plate('eau', { at: [0, -1.15, 12], width: 64, orient: 'sol', order: 5, blend: 'decoupe', approved: true }),
    },
    lumieres: [...lamps, { at: [-6.75, 2.2, -2.3], color: 'Astre', intensity: 2.6, radius: 7, halo: 1.2, flicker: 'candle' }, { at: [7.2, 2.2, -2.3], color: 'Cendre', intensity: 2.6, radius: 7, halo: 1.2, flicker: 'candle' }],
  };
  const parvis = {
    plans: {
      ciel: plate('parvis-ciel', { at: [0, -6, -70], width: 240, orient: 'face', order: 0, blend: 'fondu', fog: 0, approved: true }),
      amphi: plate('parvis-amphi', { at: [0, 0, -4], width: 40, orient: 'face', order: 1, blend: 'decoupe', approved: false }),
      avant: plate('parvis-avant', { at: [0, -1, 4.2], width: 40, orient: 'face', order: 2, blend: 'decoupe', approved: true }),
    },
    lumieres: [{ at: [-4, 3, 0], color: 'Cendre', intensity: 3, radius: 9, halo: 1.5 }, { at: [4, 3, 0], color: 'Cendre', intensity: 3, radius: 9, halo: 1.5 }],
  };
  // les Ruelles, fautives : empreinte d'un autre fichier, dimensions déclarées fausses
  const ruelles = {
    plans: {
      ciel: plate('parvis-ciel', { sha256: '0'.repeat(64), at: [0, -6, -70], width: 240, orient: 'face', order: 0, blend: 'fondu', approved: true }),
      maisons: plate('parvis-amphi', { size: [1024, 512], at: [0, 0, -4], width: 40, orient: 'face', order: 1, blend: 'decoupe', approved: true }),
    },
  };
  const manifest = { version: 1, ilots: { quai, parvis, ruelles } };
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify(manifest, null, 2));
  report.manifest = manifest;
  await serve(4402);

  // ---- A) QA : le Quai en diorama ------------------------------------------------------------------------------
  const shotsA = {};
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    const pa = await page(w, h);
    const A = await lab(pa, '&freeze=1');
    if (w === 1920) {
      report.runs.A = A;
      check(A.dec.policy === 'qa' && A.dec.world === 'diorama' && A.dec.loaded.includes('quai'), `A : le Quai est dessiné par son diorama (${A.dec.world})`);
      check(A.dec.unapproved.length === 0, `A : plans du Quai tous approuvés, aucun signalé (${A.dec.unapproved.join(', ') || 'aucun'})`);
      check(A.dec.pendingFrames === 0 && A.dec.late.length === 0, `A : aucune image rendue avant la décision du décor (${A.dec.pendingFrames}), aucun diorama en retard`);
      check(Object.keys(A.dec.timings).length === 6, `A : six plans préparés : ${JSON.stringify(A.dec.timings)}`);
      check(A.dec.gpuBytes.quai > 0 && A.dec.gpuBytes.quai < 160 * 1048576, `A : mémoire GPU des plans du Quai ${Math.round(A.dec.gpuBytes.quai / 1048576 * 10) / 10} Mo`);
    }
    for (const [k, [x, z, f]] of Object.entries(SPOTS)) shotsA[`${k}-${w}`] = await shot(pa, x, z, f, `A-diorama-${k}-${w}`);
    await pa.context().close();
    // A0 : même cadre, décor par code
    const pc = await page(w, h);
    const A0 = await lab(pc, '&freeze=1&decors=code');
    if (w === 1920) {
      report.runs.A0 = A0;
      check(A0.dec.policy === 'code' && A0.dec.world === 'code' && Object.keys(A0.dec.timings).length === 0, '`decors=code` : décor par code, aucun plan lu');
    }
    for (const [k, [x, z, f]] of Object.entries(SPOTS)) await shot(pc, x, z, f, `A0-code-${k}-${w}`);
    await pc.context().close();
  }

  // ---- B) politique du jeu --------------------------------------------------------------------------------------
  const pb = await page(1280, 720);
  const B = await lab(pb, '&freeze=1&decors=approuvees');
  report.runs.B = B;
  check(B.dec.policy === 'approuvees' && B.dec.world === 'diorama', 'B : hors QA, le diorama du Quai (plans approuvés) est admis');
  const Bp = await pb.evaluate(async () => { const t = window.__lqvVille.town; t.goTo('parvis', 'arrivee'); await t.ready(); return t.decorReport(); });
  report.runs.B.parvis = Bp;
  check(Bp.world === 'code' && Bp.issues.some((x) => /parvis\/amphi : plan non approuvé/.test(x)), `B : le Parvis (un plan non approuvé) est refusé en entier, décor par code (${Bp.issues.filter((x) => x.startsWith('parvis')).join(' ; ')})`);
  await pb.context().close();

  // ---- C) decors=code -------------------------------------------------------------------------------------------
  const pq = await page(1280, 720);
  const C = await lab(pq, '&freeze=1&decors=code&ilot=parvis');
  report.runs.C = C;
  check(C.dec.world === 'code' && C.dec.loaded.length === 0 && C.dec.issues.length === 0, '`decors=code` au Parvis : décor par code, aucun plan lu, aucun refus');
  await pq.context().close();

  // ---- D) les Ruelles : refus motivés ---------------------------------------------------------------------------
  const pd = await page(1280, 720);
  const D = await lab(pd, '&freeze=1&ilot=ruelles');
  report.runs.D = D;
  const whyD = D.dec.issues.join(' ; ');
  check(D.dec.world === 'code' && /ruelles\/ciel : empreinte/.test(whyD) && /ruelles\/maisons : 2048×512 au lieu de 1024×512/.test(whyD), `D : Ruelles refusées, décor par code gardé (${whyD})`);
  check(D.dec.pendingFrames === 0, `D : aucune image rendue avant la décision (${D.dec.pendingFrames})`);
  await pd.context().close();
  // D2 : ordre contraire à la profondeur (refus avant tout décodage)
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify({ version: 1, ilots: { ruelles: { plans: { avant: plate('parvis-avant', { at: [0, -1, 4], width: 40, orient: 'face', order: 0, blend: 'decoupe' }), ciel: plate('parvis-ciel', { at: [0, -6, -70], width: 240, orient: 'face', order: 1, blend: 'fondu' }) } } } }, null, 2));
  await serve(4403);
  const pd2 = await page(1280, 720);
  const D2 = await lab(pd2, '&freeze=1&ilot=ruelles');
  report.runs.D2 = D2;
  check(D2.dec.world === 'code' && D2.dec.issues.some((x) => /plus lointain.*dessiné après/.test(x)) && Object.keys(D2.dec.timings).length === 0, `D2 : ordre contraire à la profondeur, refusé sans décodage (${D2.dec.issues.join(' ; ')})`);
  await pd2.context().close();
  writeFileSync(join(tmp, 'decors', 'manifest.json'), JSON.stringify(manifest, null, 2));
  await serve(4404);

  // ---- E) entrée sans préparation : décor par code, image retenue, diorama substitué avant la première image -------
  const pe = await page(1280, 720);
  await lab(pe, '&freeze=1');
  const E = await pe.evaluate(async () => {
    const t = window.__lqvVille.town;
    const f0 = t.stats().frames;
    const t0 = performance.now();
    t.goTo('parvis', 'arrivee');
    const atMount = t.decorReport().world;
    await t.ready();
    const readyMs = Math.round(performance.now() - t0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { atMount, readyMs, framesDuringWait: t.stats().frames - f0, rep: t.decorReport(), st: t.stats() };
  });
  report.runs.E = E;
  check(E.atMount === 'code' && E.rep.world === 'diorama' && E.rep.pendingFrames === 0 && E.rep.late.length === 0, `E : sans préparation, décor par code construit puis diorama substitué avant la première image (${E.readyMs} ms ; ${E.rep.pendingFrames} image en attente)`);
  await pe.evaluate(hideUi);
  writeFileSync(join(DIR, 'E-parvis-diorama-1280.png'), await pe.screenshot());
  await pe.context().close();

  // ---- F) démo : passage au Parvis, plans préparés pendant le fondu ----------------------------------------------
  const pf = await page(1280, 720);
  await pf.goto(`${srv.base}/?demo=1&qa=1&aiDelay=0`);
  await pf.waitForSelector('[data-key="home-new"]', { state: 'visible' });
  await pf.click('[data-key="home-new"]');
  await pf.fill('[data-key="new-name"]', 'Décors');
  await pf.click('[data-key="new-create"]');
  await pf.waitForFunction(() => !!window.__lqvDemo?.townHandle && window.__lqvDemo.townHandle.stats().frames > 1);
  const F0 = await pf.evaluate(() => { const t = window.__lqvDemo.townHandle; return { dec: t.decorReport(), parvisPret: t.isPrepared('parvis') }; });
  const F1 = await pf.evaluate(async () => {
    const d = window.__lqvDemo;
    const t = d.townHandle;
    const t0 = performance.now();
    const prep = t.prepare('parvis').then(() => Math.round(performance.now() - t0));
    d.travel('parvis', 'arrivee');
    while (t.ilotId() !== 'parvis') await new Promise((r) => setTimeout(r, 5));
    const swapMs = Math.round(performance.now() - t0);
    const worldAtSwap = t.decorReport().world;
    const f0 = t.stats().frames;
    while (t.stats().frames < f0 + 2) await new Promise((r) => requestAnimationFrame(r));
    return { swapMs, worldAtSwap, prepMs: await prep, dec: t.decorReport(), st: t.stats() };
  });
  report.runs.F = { avant: F0, apres: F1 };
  check(F0.dec.world === 'diorama' && !F0.parvisPret, `F : démo sur le Quai en diorama (pré-lu au chargement), plans du Parvis pas encore prêts (${F0.dec.world})`);
  check(F1.worldAtSwap === 'diorama' && F1.dec.pendingFrames === 0 && F1.dec.late.length === 0, `F : le Parvis arrive directement en diorama, préparé pendant le fondu, aucune image en attente (${F1.dec.pendingFrames})`);
  check(F1.swapMs >= 300 && F1.swapMs < 1500, `F : changement d'îlot derrière le fondu (${F1.swapMs} ms après le départ, préparation ${F1.prepMs} ms, construction ${F1.st.mountMs} ms, première image ${F1.st.mountFrameMs} ms)`);
  report.runs.F.liberation = await pf.evaluate(async () => {
    // retour au Quai : les plans du Parvis sont libérés, ceux du Quai préparés de nouveau pendant le fondu
    const d = window.__lqvDemo; const t = d.townHandle;
    d.travel('quai', 'sortie-arene');
    while (t.ilotId() !== 'quai') await new Promise((r) => setTimeout(r, 5));
    const f0 = t.stats().frames;
    while (t.stats().frames < f0 + 2) await new Promise((r) => requestAnimationFrame(r));
    return { dec: t.decorReport(), textures: t.stats().textures };
  });
  check(report.runs.F.liberation.dec.world === 'diorama' && report.runs.F.liberation.dec.pendingFrames === 0, 'F : retour au Quai en diorama, sans image en attente');
  await pf.waitForTimeout(500);
  writeFileSync(join(DIR, 'F-demo-retour-quai-1280.png'), await pf.screenshot());
  await pf.context().close();

  // ---- G) première entrée : manifeste vide (build), diorama du Quai, décor par code ------------------------------
  const srvEmpty = await startPreview(4405, DIST);
  const G = { vide: [], diorama: [], code: [] };
  try {
    for (let r = 0; r < ROUNDS; r++) {
      for (const [k, base, q] of [['vide', srvEmpty.base, ''], ['diorama', srv.base, ''], ['code', srv.base, '&decors=code']]) {
        const pg = await page(1920, 1080);
        const t0 = Date.now();
        await pg.goto(`${base}/?ville=1&qa=1${q}`);
        await pg.waitForFunction(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 2, null, { timeout: 90000 });
        const wall = Date.now() - t0;
        const s = await pg.evaluate(() => { const t = window.__lqvVille.town; return { ...t.stats(), dec: t.decorReport() }; });
        G[k].push({ wallMs: wall, buildMs: s.buildMs, firstFrameMs: s.firstFrameMs, textures: s.textures, calls: s.calls, world: s.dec.world, pending: s.dec.pendingFrames });
        await pg.context().close();
      }
    }
  } finally { srvEmpty.stop(); }
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
  report.runs.G = Object.fromEntries(Object.entries(G).map(([k, xs]) => [k, { rounds: xs, wallMs: med(xs.map((x) => x.wallMs)), buildMs: med(xs.map((x) => x.buildMs)), firstFrameMs: med(xs.map((x) => x.firstFrameMs)), calls: med(xs.map((x) => x.calls)) }]));
  check(G.vide.every((x) => x.world === 'code') && G.code.every((x) => x.world === 'code') && G.diorama.every((x) => x.world === 'diorama'), 'G : décor attendu à chaque ronde (vide : code ; diorama ; code)');
  check(Object.values(G).every((xs) => xs.every((x) => x.pending === 0)), 'G : aucune image rendue avant la décision du décor (toutes les rondes)');
  console.log('Première entrée (médianes) :', JSON.stringify(Object.fromEntries(Object.entries(report.runs.G).map(([k, v]) => [k, { wallMs: v.wallMs, buildMs: v.buildMs, firstFrameMs: v.firstFrameMs, calls: v.calls }]))));

  // ---- planche : décor par code | diorama de preuve, deux positions (1920 × 1080 réduites) ------------------------
  const pp = await page(1300, 800);
  const tiles = ['A0-code-etal-1920', 'A-diorama-etal-1920', 'A0-code-arrivee-1920', 'A-diorama-arrivee-1920'];
  const labels = ['Décor par code (direction D, provisoire) — centre du Quai', 'Diorama de preuve : six plans dessinés par code — centre du Quai', 'Décor par code — arrivée', 'Diorama de preuve — arrivée'];
  const tileUrls = tiles.map((t) => `data:image/png;base64,${readFileSync(join(DIR, `${t}.png`)).toString('base64')}`);
  const planche = await pp.evaluate(async ({ tileUrls, labels }) => {
    const imgs = await Promise.all(tileUrls.map(async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; }));
    const W = 960; const H = 540; const pad = 16;
    const c = document.createElement('canvas');
    c.width = W * 2 + pad * 3; c.height = (H + 40) * 2 + pad * 2 + 30;
    const g = c.getContext('2d');
    g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = '16px system-ui';
    g.fillText('Plans de décor (ADR 028) : preuve du chargeur avec des plans dessinés par code — aucune image externe ni générée', pad, 24);
    imgs.forEach((im, k) => {
      const x = pad + (k % 2) * (W + pad); const y = 40 + Math.floor(k / 2) * (H + 40);
      g.drawImage(im, x, y, W, H);
      g.fillText(labels[k], x, y + H + 24);
    });
    return c.toDataURL('image/png');
  }, { tileUrls, labels });
  writeFileSync(join(DIR, 'planche-decors-preuve.png'), Buffer.from(planche.split(',')[1], 'base64'));
  await pp.context().close();
} finally {
  const bad = report.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
  check(bad.length === 0, `aucune erreur ni avertissement de console (${bad.length}${bad.length ? ` : ${bad.slice(0, 3).join(' | ')}` : ''})`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  srv?.stop();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
