// M09 V4 — preuve de la profondeur praticable (passe 62 ; demande du responsable sur la fiche de la porte, notes E2 et
// E4) : le Quai profond du laboratoire (`src/ville/quaiProfond.ts`, `?ville=1&qa=1&profondeur=1`), dessiné avec les
// plans ACTUELS du diorama du Quai, découpés et reposés par script (`uv`), sans aucune image générée.
//   assembler : lit `public/decors/manifest.json` (îlot `quai`), écrit `public/decors/manifest-profondeur.json` :
//               façades et pied des façades découpés en trois blocs écartés de 3 m (deux passages), murs des passages
//               (plan de preuve `preuve-joue.png`, dessiné par code), second rang devenu la façade de la rue haute
//               (une copie, à l'échelle des personnages), troisième rang et ciel au loin ; caméra qui suit en
//               profondeur et s'élève au fond ; plans des façades effacés quand le personnage passe derrière (coupe).
//   verifier  : sur le build (`npm run build` avant) : captures 1920 × 1080 du Quai profond (quai, bouche et milieu du
//               passage, rue haute, derrière un bloc), plan vu de dessus, hauteur du personnage à chaque profondeur ;
//               planche de la conception proposée au responsable.
// Usage : node tools/m09-profondeur-preuve.mjs assembler
//         npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/m09-profondeur-preuve.mjs verifier [dossier] [rapport.json]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const MODE = process.argv[2];
const head = execSync('git rev-parse --short HEAD').toString().trim();
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const r3 = (x) => Math.round(x * 1000) / 1000;
const report = { date: new Date().toISOString(), commit: head, mode: MODE, checks: [], console: [] };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };

/**
 * Conception (m ; mêmes valeurs que `quaiProfond.ts`) : façades au pied z −3, blocs de 8 m, passages de 3 m aux raccords
 * des trois images de façades (ouest −3 m, est +3 m), rue haute de z −17 à −11 bordée par le second rang.
 */
const P = {
  shift: 3,
  // raccords de la bande du pied des façades (x au monde avant écart), choisis entre les accessoires
  piedCuts: [-12, 11.6],
  // murs des passages : x et côté peint (vers l'intérieur du passage)
  joue: { z: -7, length: 8, xs: [[-13.6, 'est'], [-10.6, 'ouest'], [11.2, 'est'], [14.2, 'ouest']], lit: 0.35 },
  // passe 63 : pied de la façade recadré (ses 9 % du bas se perdaient dans le noir), éclairé par les lanternes de la rue
  rueHaute: { z: -17.5, copyFrac: 0.5, v1: 0.91, width: 31, fog: 0.2, lit: 0.35 },
  // passe 63 : emprise des blocs (sol sombre sous les blocs, lue quand un bloc s'efface) ; murs aux bouts de la rue haute
  emprise: { x0: -27, x1: 27, z0: -11, z1: -3, y: 0.04, ppm: 32 },
  boutsRue: { z: -14, length: 6, xs: [[-15, 'est'], [15, 'ouest']] },
  // lanternes au milieu des passages (les murs, `lit`, les reçoivent)
  passageLights: [[-12.1, 3.0, -7.2], [12.7, 3.0, -7.2]],
  troisieme: { z: -40, y: 9, voile: 0.45 },
  // cadrage : celui du Quai élargi, qui suit 60 % de la profondeur et s'incline de 6° au quai à 16° dans la rue haute
  camera: { pitch: 6, distance: 25, fov: 42, aimY: 4.8, minX: -5, maxX: 5, followZ: 0.6, aimZ: 0.3, pitchFond: 16, zFond: -14 },
  brumes: [[120, 12, 0, 17, -21, 0.34, 0.006, [6, 1.2], 2.2], [170, 20, 0, 21, -30, 0.4, 0.005, [5, 1.3], 2.2], [270, 34, 0, 24, -62, 0.36, 0.004, [4, 1.4], 2.2], [120, 2, 0, -2.2, 6, 0.22, 0.012, [6, 1]]],
  laneLights: [[-7, 3.0, -16.6], [6.5, 3.0, -16.6]],
};

/**
 * Dans la page : emprise des blocs (sol sombre et doux sous les blocs, trouée aux passages), `w` × `h` px, passages en
 * px (x de début et de fin) ; bords fondus sur 0,5 m.
 */
function paintEmprise({ w, h, gaps, fade }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  let s = 23; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const d = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inGap = gaps.some(([a, b]) => x >= a && x < b);
      if (inGap) continue;
      const e = Math.min(y, h - 1 - y, ...gaps.map(([a, b]) => (x < a ? a - x : x - b)), x, w - 1 - x);
      const a = Math.min(1, e / fade) * 0.88;
      const n = 8 + rnd() * 6;
      const i = (y * w + x) * 4;
      d.data[i] = n; d.data[i + 1] = n + 2; d.data[i + 2] = n + 10; d.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}

/** Dans la page : mur de pierre d'un passage (plan de preuve dessiné par code, 8 × 9 m à 64 px/m), graine fixe. */
function paintJoue() {
  const W = 512; const H = 576;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  g.fillStyle = '#1b1d28'; g.fillRect(0, 0, W, H);
  const row = 26;
  for (let y = 0, r = 0; y < H; y += row, r++) {
    let x = -((r * 37) % 60);
    while (x < W) {
      const w = 38 + rnd() * 52;
      const t = rnd();
      const base = [44 + t * 18, 44 + t * 14, 58 + t * 16];
      g.fillStyle = `rgb(${base.map((v) => Math.round(v)).join(',')})`;
      g.fillRect(x + 1.5, y + 1.5, w - 3, row - 3);
      g.fillStyle = 'rgba(255,240,220,0.07)'; g.fillRect(x + 1.5, y + 1.5, w - 3, 2);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 1.5, y + row - 4, w - 3, 2.5);
      for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.1})`; g.fillRect(x + 2 + rnd() * (w - 6), y + 2 + rnd() * (row - 6), 2 + rnd() * 3, 1 + rnd() * 2); }
      x += w;
    }
  }
  // fenêtre éclairée et soubassement
  g.fillStyle = '#120e0a'; g.fillRect(150, 230, 46, 70);
  const win = g.createLinearGradient(0, 236, 0, 296); win.addColorStop(0, '#f2b45a'); win.addColorStop(1, '#a8601f');
  g.fillStyle = win; g.fillRect(155, 236, 36, 58);
  g.fillStyle = '#3a2614'; g.fillRect(171, 236, 4, 58); g.fillRect(155, 262, 36, 4);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, H - 40, W, 40);
  // plus sombre vers le fond du passage (u = 1) et vers le haut
  const fondu = g.createLinearGradient(0, 0, W, 0); fondu.addColorStop(0, 'rgba(0,0,0,0)'); fondu.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = fondu; g.fillRect(0, 0, W, H);
  const haut = g.createLinearGradient(0, 0, 0, H); haut.addColorStop(0, 'rgba(0,0,0,0.35)'); haut.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.fillStyle = haut; g.fillRect(0, 0, W, H);
  return c.toDataURL('image/png');
}

if (MODE === 'assembler') {
  const man = JSON.parse(readFileSync('public/decors/manifest.json', 'utf8'));
  const q = man.ilots.quai;
  const pl = q.plans;
  const browser = await launch();
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  const joue = fromUrl(await pg.evaluate(paintJoue));
  const E = P.emprise; const ew = Math.round((E.x1 - E.x0) * E.ppm); const eh = Math.round((E.z1 - E.z0) * E.ppm);
  const gaps = [[-13.6, -10.6], [11.2, 14.2]].map(([a, b]) => [Math.round((a - E.x0) * E.ppm), Math.round((b - E.x0) * E.ppm)]);
  const emprise = fromUrl(await pg.evaluate(paintEmprise, { w: ew, h: eh, gaps, fade: E.ppm * 0.5 }));
  await browser.close();
  const dim = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
  writeFileSync('public/decors/preuve-joue.png', joue);
  writeFileSync('public/decors/preuve-emprise.png', emprise);
  mkdirSync('art-src/decors/preuve-emprise', { recursive: true });
  writeFileSync('art-src/decors/preuve-emprise/fiche.json', `${JSON.stringify({
    id: 'preuve-emprise', projet: 'Les Quatre Voies (RPGCards)', decision: 'ADR 028, « Profondeur praticable » (passes 62 et 63) : preuve de conception, laboratoire seulement',
    source: 'dessiné par code (tools/m09-profondeur-preuve.mjs, paintEmprise : canvas 2D, graine fixe) ; aucune image générée, aucune image externe',
    sortie: { fichier: 'public/decors/preuve-emprise.png', sha256: sha(emprise), octets: emprise.length, dimensions: [emprise.readUInt32BE(16), emprise.readUInt32BE(20)] },
    usage: 'emprise des blocs du Quai profond (sol sombre sous les blocs, lue quand un bloc s’efface) ; plan de preuve',
    approved: false,
  }, null, 2)}\n`);
  mkdirSync('art-src/decors/preuve-joue', { recursive: true });
  writeFileSync('art-src/decors/preuve-joue/fiche.json', `${JSON.stringify({
    id: 'preuve-joue', projet: 'Les Quatre Voies (RPGCards)', decision: 'ADR 028, « Profondeur praticable » (passe 62) : preuve de conception, laboratoire seulement',
    source: 'dessiné par code (tools/m09-profondeur-preuve.mjs, paintJoue : canvas 2D, graine fixe) ; aucune image générée, aucune image externe',
    sortie: { fichier: 'public/decors/preuve-joue.png', sha256: sha(joue), octets: joue.length, dimensions: dim(joue) },
    usage: 'murs des passages du Quai profond (manifest-profondeur.json) ; plan de preuve, remplacé si la conception est retenue',
    approved: false,
  }, null, 2)}\n`);
  // façades : trois morceaux de la même image (ouest, centre de l'essai, est), aux raccords de l'assemblage (px)
  const fa = pl.facades; const mpx = fa.width / fa.size[0];
  const x0 = fa.at[0] - fa.width / 2;
  const PARTS_M = [13.4, 21.8, 12.8];
  const density = 68; // px/m de l'assemblage des façades (m09-porte-quai.mjs, L.density)
  const cuts = [0, Math.round(PARTS_M[0] * density), Math.round(PARTS_M[0] * density) + Math.round(PARTS_M[1] * density), fa.size[0]];
  const shifts = [-P.shift, 0, P.shift];
  const plans = {};
  plans.ciel = { ...pl.ciel };
  plans['troisieme-rang'] = { ...pl['troisieme-rang'], at: [pl['troisieme-rang'].at[0], P.troisieme.y, P.troisieme.z], voile: P.troisieme.voile };
  plans['rue-haute'] = { ...pl['second-rang'], uv: [0, 0, P.rueHaute.copyFrac, P.rueHaute.v1], width: P.rueHaute.width, at: [0, 0, P.rueHaute.z], voile: 0, fog: P.rueHaute.fog, lit: P.rueHaute.lit, order: 2 };
  delete plans['rue-haute'].voile;
  ['ouest', 'centre', 'est'].forEach((k, i) => {
    const w = (cuts[i + 1] - cuts[i]) * mpx;
    const xl = x0 + cuts[i] * mpx + shifts[i];
    plans[`facades-${k}`] = { ...fa, uv: [r3(cuts[i] / fa.size[0]), 0, r3(cuts[i + 1] / fa.size[0]), 1], width: r3(w), at: [r3(xl + w / 2), 0, fa.at[2]], order: 3 + i, coupe: true };
  });
  // pied des façades : même découpe aux raccords choisis entre les accessoires
  const pi = pl['pied-facades']; const pmx = pi.width / pi.size[0]; const px0 = pi.at[0] - pi.width / 2;
  const pc = [0, Math.round((P.piedCuts[0] - px0) / pmx), Math.round((P.piedCuts[1] - px0) / pmx), pi.size[0]];
  ['ouest', 'centre', 'est'].forEach((k, i) => {
    const w = (pc[i + 1] - pc[i]) * pmx;
    const xl = px0 + pc[i] * pmx + shifts[i];
    plans[`pied-${k}`] = { ...pi, uv: [r3(pc[i] / pi.size[0]), 0, r3(pc[i + 1] / pi.size[0]), 1], width: r3(w), at: [r3(xl + w / 2), 0, pi.at[2]], order: 6 + i, coupe: true };
  });
  plans.rue = { ...pl.rue, order: 9 };
  plans['premier-plan'] = { ...pl['premier-plan'], order: 10 };
  plans.eau = { ...pl.eau, order: 11 };
  P.joue.xs.forEach(([x, vers], i) => {
    plans[`joue-${i + 1}`] = { vers, file: 'preuve-joue.png', sha256: sha(joue), size: dim(joue), source: 'dessiné par code (preuve de la profondeur, passe 62)', fiche: 'art-src/decors/preuve-joue/fiche.json', approved: false, at: [x, 0, P.joue.z], width: P.joue.length, orient: 'cote', order: 12 + i, blend: 'decoupe', lit: P.joue.lit };
  });
  plans.emprise = { file: 'preuve-emprise.png', sha256: sha(emprise), size: [ew, eh], source: 'dessiné par code (preuve de la profondeur, passe 63)', fiche: 'art-src/decors/preuve-emprise/fiche.json', approved: false, at: [(E.x0 + E.x1) / 2, E.y, (E.z0 + E.z1) / 2], width: E.x1 - E.x0, orient: 'sol', order: 16, blend: 'decoupe', fog: 0.5 };
  P.boutsRue.xs.forEach(([x, vers], i) => {
    plans[`bout-rue-${i + 1}`] = { vers, file: 'preuve-joue.png', sha256: sha(joue), size: dim(joue), uv: [0, 0, 0.75, 1], source: 'dessiné par code (preuve de la profondeur, passe 63)', fiche: 'art-src/decors/preuve-joue/fiche.json', approved: false, at: [x, 0, P.boutsRue.z], width: P.boutsRue.length, orient: 'cote', order: 17 + i, blend: 'decoupe', lit: P.joue.lit };
  });
  plans.ciel.order = 0; plans['troisieme-rang'].order = 1;
  // lumières : celles du Quai, écartées avec leur bloc ; deux dans la rue haute
  const moved = q.lumieres.map((l) => {
    const onFront = l.at[2] < 0;
    const dx = !onFront ? 0 : l.at[0] < -10.6 ? -P.shift : l.at[0] > 11.2 ? P.shift : 0;
    return { ...l, at: [r3(l.at[0] + dx), l.at[1], l.at[2]] };
  });
  const lane = [
    ...P.laneLights.map((at) => ({ at, color: 'ambre', intensity: 2.4, radius: 7, halo: 0.8, flicker: 'lantern' })),
    ...P.passageLights.map((at) => ({ at, color: 'ambre', intensity: 2.0, radius: 6, halo: 0.6, flicker: 'lantern' })),
  ];
  const lumieres = [...moved.slice(0, 16 - lane.length), ...lane];
  const out = { version: 1, ilots: { quai: { plans, lumieres, camera: P.camera, brumes: P.brumes } } };
  writeFileSync('public/decors/manifest-profondeur.json', `${JSON.stringify(out, null, 2)}\n`);
  check(Object.keys(plans).length <= 24, `manifeste de la preuve : ${Object.keys(plans).length} plans (façades, pied, murs découpés ; textures partagées), ${lumieres.length} lumières`);
  report.plans = Object.fromEntries(Object.entries(plans).map(([k, v]) => [k, { file: v.file, uv: v.uv, at: v.at, width: v.width, orient: v.orient, coupe: !!v.coupe }]));
  mkdirSync('artifacts/qa/m09', { recursive: true });
  writeFileSync('artifacts/qa/m09/v4-profondeur-assemblage.json', `${JSON.stringify(report, null, 2)}\n`);
}

if (MODE === 'verifier') {
  const DIR = process.argv[3] ?? 'screenshots/qa/m09/v4-profondeur';
  const OUT = process.argv[4] ?? 'artifacts/qa/m09/v4-profondeur.json';
  mkdirSync(DIR, { recursive: true });
  const browser = await launch();
  const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4461, process.env.LQV_DIST || 'dist');
  const SPOTS = [
    ['quai', -0.6, 0.6, 'face', 'Sur le quai (premier plan)'],
    ['passage-bouche', -12.1, -2.4, 'dos', 'À l’entrée du passage ouest'],
    ['passage', -12.1, -7.2, 'dos', 'Dans le passage'],
    ['rue-haute', -0.5, -13.6, 'face', 'Dans la rue haute, derrière le bloc du centre (vue en coupe)'],
    ['rue-haute-est', 9.5, -14.2, 'gauche', 'Rue haute, côté est'],
  ];
  const shots = {};
  try {
    const pg = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
    pg.setDefaultTimeout(120000);
    watchConsole(pg, report.console);
    await pg.goto(`${srv.base}/?ville=1&qa=1&freeze=1&profondeur=1`);
    await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 120000 });
    report.renderer = rendererLabel(await webglRenderer(pg));
    const info = await pg.evaluate(() => { const t = window.__lqvVille.town; return { name: t.ilot.name, dec: t.decorReport(), st: t.stats(), ilot: t.ilot }; });
    report.decor = info.dec; report.stats = info.st;
    check(/profondeur/.test(info.name) && info.dec.loaded.includes('quai') && info.dec.issues.length === 0, `Quai profond dessiné par son diorama de preuve (${Object.keys(JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8')).ilots.quai.plans).length} plans découpés dans ${Object.keys(info.dec.timings).length} images, ${Math.round((info.dec.gpuBytes.quai ?? 0) / 1048576 * 10) / 10} Mo de mémoire GPU), aucun refus`);
    report.figures = {};
    for (const [k, x, z, f] of SPOTS) {
      const r = await pg.evaluate(({ x, z, f }) => { const t = window.__lqvVille.town; t.place({ x, z }, f); t.renderNow(); const p = t.walker().pos; const h = t.project({ x: p.x, y: 0, z: p.z }).y - t.project({ x: p.x, y: t.walkerH(), z: p.z }).y; return { pos: p, h }; }, { x, z, f });
      await pg.evaluate(() => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; });
      await pg.waitForTimeout(250);
      shots[k] = await pg.screenshot();
      writeFileSync(join(DIR, `${k}-1920.png`), shots[k]);
      report.figures[k] = { at: [r3(r.pos.x), r3(r.pos.z)], figurePx: Math.round(r.h) };
      check(Math.abs(r.pos.x - x) < 0.05 && Math.abs(r.pos.z - z) < 0.05, `${k} : personnage posé en (${r3(r.pos.x)}, ${r3(r.pos.z)}), praticable ; ${Math.round(r.h)} px de haut`);
    }
    await pg.context().close();
    // plan vu de dessus et planche
    const man = JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8')).ilots.quai;
    const ref = readFileSync('reference/generated/2026-10-19-quai-nuit-cameras/02.png');
    const pp = await (await browser.newContext({ viewport: { width: 2100, height: 1500 }, deviceScaleFactor: 1 })).newPage();
    const planche = await pp.evaluate(async (u) => {
      const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
      const im = await Promise.all(u.imgs.map(load));
      const pad = 16; const tw = 640; const th = 360; const top = 40;
      const c = document.createElement('canvas'); c.width = 3 * tw + 4 * pad; c.height = top + 3 * (th + 36) + 24;
      const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#e8dcc0'; g.font = 'bold 17px system-ui';
      g.fillText('Profondeur praticable : conception retenue, zones arrière améliorées par script (laboratoire seulement ; aucune image générée)', pad, 26);
      g.font = '14px system-ui';
      const X = (col) => pad + col * (tw + pad); const Y = (row) => top + row * (th + 36);
      const tile = (k, x, y) => { const i = im[k]; const s2 = Math.min(tw / i.width, th / i.height); g.drawImage(i, x + (tw - i.width * s2) / 2, y + (th - i.height * s2) / 2, i.width * s2, i.height * s2); };
      const lab = (t, x, y) => g.fillText(t, x, y);
      // plan vu de dessus : x de −28 à 28, z de −20 à 8 (eau en bas), 11,4 px/m
      const S = 11.4; const ox = X(0) + tw / 2; const oz = Y(0) + 40 + 20 * S;
      const P2 = (x, z) => [ox + x * S, oz + z * S];
      g.fillStyle = '#16233a'; g.fillRect(X(0), P2(0, 3.4)[1], tw, Y(0) + th - P2(0, 3.4)[1]);
      const b = u.ilot.bounds;
      g.fillStyle = '#3a3a46'; { const [a1, a2] = P2(b.x0, b.z0); const [c1, c2] = P2(b.x1, b.z1); g.fillRect(a1, a2, c1 - a1, c2 - a2); }
      for (const r of u.ilot.rects) { const [a1, a2] = P2(r.x0, r.z0); const [c1, c2] = P2(r.x1, r.z1); g.fillStyle = (r.z1 - r.z0) > 4 ? '#5a4a3c' : '#6b5a40'; g.fillRect(a1, a2, c1 - a1, c2 - a2); }
      // plans du diorama : de face (traits), de côté (traits le long de z)
      for (const [id, p] of Object.entries(u.plans)) {
        if (p.orient === 'sol' || p.at[2] < -20) continue;
        g.strokeStyle = id.startsWith('joue') ? '#9fb3d8' : id.startsWith('facades') ? '#e8b14a' : id === 'rue-haute' ? '#d58a4a' : '#8f8f9f';
        g.lineWidth = id.startsWith('facades') || id === 'rue-haute' ? 3 : 2;
        g.beginPath();
        if (p.orient === 'cote') { const [a1, a2] = P2(p.at[0], p.at[2] - p.width / 2); const [c1, c2] = P2(p.at[0], p.at[2] + p.width / 2); g.moveTo(a1, a2); g.lineTo(c1, c2); }
        else { const [a1, a2] = P2(p.at[0] - p.width / 2, p.at[2]); const [c1, c2] = P2(p.at[0] + p.width / 2, p.at[2]); g.moveTo(a1, a2); g.lineTo(c1, c2); }
        g.stroke();
      }
      u.spots.forEach(([k, x, z], i) => { const [a1, a2] = P2(x, z); g.fillStyle = '#f2d27a'; g.beginPath(); g.arc(a1, a2, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#10121a'; g.font = 'bold 10px system-ui'; g.fillText(String(i + 1), a1 - 3, a2 + 4); });
      g.fillStyle = '#e8dcc0'; g.font = '12px system-ui';
      lab('quai', ...P2(-27, 1)); lab('rue haute', ...P2(-14.5, -14)); lab('eau', ...P2(-27, 6)); lab('blocs de façades', ...P2(-5, -7));
      g.font = '14px system-ui';
      lab('Plan vu de dessus : praticable (gris), blocs (brun), façades (or), murs (bleu)', X(0), Y(0) + th + 22);
      tile(1, X(1), Y(0)); lab(`1. ${u.spots[0][4]} : ${u.fig.quai} px`, X(1), Y(0) + th + 22);
      tile(2, X(2), Y(0)); lab(`2. ${u.spots[1][4]} : ${u.fig['passage-bouche']} px`, X(2), Y(0) + th + 22);
      tile(3, X(0), Y(1)); lab(`3. ${u.spots[2][4]} : ${u.fig.passage} px`, X(0), Y(1) + th + 22);
      tile(4, X(1), Y(1)); lab(`4. ${u.spots[3][4]} : ${u.fig['rue-haute']} px`, X(1), Y(1) + th + 22);
      tile(5, X(2), Y(1)); lab(`5. ${u.spots[4][4]} : ${u.fig['rue-haute-est']} px`, X(2), Y(1) + th + 22);
      tile(0, X(0), Y(2)); lab('Référence initiale approuvée (02.png)', X(0), Y(2) + th + 22);
      const qx = X(1); let qy = Y(2) + 4; const qw = 2 * tw + pad;
      const wrap = (t, bold = false) => { g.font = `${bold ? 'bold ' : ''}14px system-ui`; const words = t.split(' '); let line = ''; for (const w of words) { const n = line ? `${line} ${w}` : w; if (g.measureText(n).width > qw) { qy += 19; g.fillText(line, qx, qy); line = w; } else line = n; } qy += 19; g.fillText(line, qx, qy); qy += 7; };
      wrap('Conception retenue par le responsable (passe 63) : le quai reste la rue du premier plan ; les façades deviennent des blocs de 8 m de profondeur, séparés par des passages de 3 m, qui mènent à une rue haute bordée par le second rang (on y marche) ; la ville haute et le ciel restent au loin.', true);
      wrap('Caméra frontale (ADR 024) : elle suit 60 % de la profondeur et s’élève de 6° au quai à 16° dans la rue haute ; le personnage rapetisse en s’éloignant. Un bloc derrière lequel on passe s’efface (vue en coupe).');
      wrap('Passe 63, zones arrière améliorées par script (aucune image générée) : emprise sombre des blocs, rue haute fermée à ses bouts, pied de sa façade recadré et éclairé, lanternes dans les passages, bloc effacé à 8 %.');
      wrap('Encore approximatif, à peindre (2 images annoncées, générées après accord) : la façade de la rue haute, peinte pour être vue de loin (fenêtres trop petites à côté du personnage), et les murs des passages, dessinés par code.');
      return c.toDataURL('image/png');
    }, { imgs: [dataUrl(ref), ...SPOTS.map(([k]) => dataUrl(shots[k]))], spots: SPOTS, fig: Object.fromEntries(Object.entries(report.figures).map(([k, v]) => [k, v.figurePx])), ilot: info.ilot, plans: man.plans });
    writeFileSync(join(DIR, 'planche-profondeur.png'), fromUrl(planche));
    await pp.context().close();
  } finally {
    const bad = report.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
    check(bad.length === 0, `aucune erreur ni avertissement de console (${bad.length}${bad.length ? ` : ${bad.slice(0, 3).join(' | ')}` : ''})`);
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
    srv.stop();
    await browser.close();
  }
}
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
