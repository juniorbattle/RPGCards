// M09 V4 — preuve de la profondeur praticable (passe 62) puis du **quartier en rangs** (passe 65 ; demande du responsable :
// « plusieurs ruelles superposées qui débordent vers des places marchables… 1er, 2e, 3e, voire 4e rang ») : le Quai en
// quatre rangs du laboratoire (`src/ville/quaiProfond.ts`, grammaire `src/ville/rangs.ts`, `?ville=1&qa=1&profondeur=1`),
// dessiné avec les plans ACTUELS du diorama du Quai, découpés et reposés par script (`uv`), sans aucune image générée.
// Le plan (rangs, bandes, passages, places, murs, mobilier) est LU dans le code du jeu (tsx) : une seule source.
//   assembler : lit `public/decors/manifest.json` (îlot `quai`), écrit `public/decors/manifest-profondeur.json` :
//               rang 1 : façades et pied du Quai découpés en trois blocs écartés de 3 m (deux passages) ; rangs 2 et 3 :
//               fonds des ruelles et de leurs places découpés dans le second rang (deux calages différents) ; rang 4 :
//               le troisième rang (la ville haute) au fond de la cour ; murs des passages, des places et des bouts des
//               ruelles (plan de preuve `preuve-joue.png`, dessiné par code) ; mobilier (morceaux des bandes du pied et
//               de la rue, puits dessiné par code `preuve-puits.png`) ; caméra qui suit en profondeur ; plans effacés
//               quand le personnage passe derrière (fantôme) ou les dépasse de deux rangs (fondu lointain).
//   verifier  : sur le build (`npm run build` avant) : captures 1920 × 1080 à chaque rang et à chaque spot, plan vu de
//               dessus, hauteur du personnage à chaque profondeur ; planche de la conception proposée au responsable.
// Usage : npx tsx tools/m09-profondeur-preuve.mjs assembler
//         npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> npx tsx tools/m09-profondeur-preuve.mjs verifier [dossier] [rapport.json]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { LAMPES_RANGS, MEUBLES_RANGS, PLAN_QUAI } from '../src/ville/quaiProfond.ts';

const MODE = process.argv[2];
const head = execSync('git rev-parse --short HEAD').toString().trim();
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const r3 = (x) => Math.round(x * 1000) / 1000;
const report = { date: new Date().toISOString(), commit: head, mode: MODE, checks: [], console: [] };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };

/**
 * Habillage de la preuve (m) ; le plan lui-même vient de `quaiProfond.ts` (PLAN_QUAI, MEUBLES_RANGS, LAMPES_RANGS).
 */
const P = {
  shift: 3,
  // raccords de la bande du pied des façades (x au monde avant écart), choisis entre les accessoires
  piedCuts: [-12, 11.6],
  // fonds des rangs 2 et 3 : le second rang (3072 × 953 px), calé sur deux centres différents (pas de tours alignées
  // d'un rang à l'autre) ; la place de la Halle reçoit le centre de l'image (les deux tours, la halle)
  fonds: { 2: { centre: 7, largeur: 70, v1: 0.91, lit: 0.35, fog: 0.2, voile: 0 }, 3: { centre: -4, largeur: 72, v1: 0.91, lit: 0.3, fog: 0.25, voile: 0.08 } },
  // flancs des ruelles (les maisons des côtés, de face sur la ligne avant de chaque ruelle) : le second rang, calé ailleurs
  flancs: { 2: { centre: -2, largeur: 66, v1: 0.91, lit: 0.3, fog: 0.2, voile: 0 }, 3: { centre: 12, largeur: 70, v1: 0.91, lit: 0.3, fog: 0.25, voile: 0.05 }, 4: { centre: 0, largeur: 72, v1: 0.91, lit: 0.3, fog: 0.3, voile: 0.1 } },
  // rang 4 : la ville haute (troisième rang) au fond de la cour
  fond4: { largeur: 96, y: 0, v1: 0.88, voile: 0.3, fog: 0.5, lit: 0.2 },
  murs: { lit: 0.35, longueur: 8 },
  lampes: { src: [-4.95, -3.05], lanternY: 3.9 },
  // cadrage : celui du Quai élargi ; il suit 90 % de la profondeur (le personnage reste lisible jusqu'au quatrième rang)
  // et s'incline de 6° au quai à 16° dès la rue Haute
  camera: { pitch: 6, distance: 25, fov: 42, aimY: 4.8, minX: -5, maxX: 5, followZ: 0.9, aimZ: 0.3, pitchFond: 16, zFond: -14 },
  // brumes : trois nappes hautes derrière la cour (entre la ville haute et le ciel), l'eau du port, puis une nappe
  // sombre à chaque bout des ruelles des rangs 2 à 4 (la ruelle continue dans la nuit au lieu de buter sur un mur)
  brumesLoin: [[120, 12, 0, 18, -47, 0.3, 0.006, [6, 1.2], 2.2], [170, 20, 0, 22, -56, 0.36, 0.005, [5, 1.3], 2.2], [270, 34, 0, 26, -80, 0.36, 0.004, [4, 1.4], 2.2], [120, 2, 0, -2.2, 6, 0.22, 0.012, [6, 1]]],
};

/** Dans la page : boîte (px) des pixels visibles d'une image entre les colonnes `c0` et `c1`. */
async function alphaBox({ url, c0, c1 }) {
  const i = new Image(); i.src = url; await i.decode();
  const c = new OffscreenCanvas(i.width, i.height); const g = c.getContext('2d'); g.drawImage(i, 0, 0);
  const d = g.getImageData(0, 0, i.width, i.height).data;
  let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1;
  for (let y = 0; y < i.height; y++) for (let x = Math.max(0, c0); x < Math.min(i.width, c1); x++) if (d[(y * i.width + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1 + 1, y1 + 1];
}

/** Dans la page : mur de pierre d'un passage (plan de preuve dessiné par code, 8 × 9 m à 64 px/m), graine fixe. */
function paintJoue() {
  // passe 64 : rez-de-chaussée de pierre, étages à colombages, avant-toit d'ardoise en haut (le mur ne finit plus en
  // ligne droite contre le ciel), fenêtres éclairées et sombres, gouttière, lanterne ; graine fixe
  const W = 512; const H = 576;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const eave = 46; const ground = 250; // px : avant-toit en haut ; hauteur du rez-de-chaussée de pierre en bas
  g.fillStyle = '#1b1d28'; g.fillRect(0, 0, W, H);
  // rez-de-chaussée : pierre en assises
  const row = 24;
  for (let y = H - ground, r = 0; y < H; y += row, r++) {
    let x = -((r * 37) % 60);
    while (x < W) {
      const w = 38 + rnd() * 52; const t = rnd();
      g.fillStyle = `rgb(${Math.round(46 + t * 18)},${Math.round(45 + t * 14)},${Math.round(58 + t * 16)})`;
      g.fillRect(x + 1.5, y + 1.5, w - 3, row - 3);
      g.fillStyle = 'rgba(255,240,220,0.07)'; g.fillRect(x + 1.5, y + 1.5, w - 3, 2);
      x += w;
    }
  }
  // étages : enduit et colombages
  g.fillStyle = '#3a3640'; g.fillRect(0, eave, W, H - ground - eave);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,240,220'},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * W, eave + rnd() * (H - ground - eave), 2 + rnd() * 6, 1 + rnd() * 3); }
  g.fillStyle = '#24170e';
  const beam = (x, y, w, h) => g.fillRect(x, y, w, h);
  beam(0, H - ground - 12, W, 12); beam(0, eave + 4, W, 10); beam(0, eave + (H - ground - eave) / 2, W, 9);
  for (let x = 0; x <= W; x += 96) beam(x - 5, eave, 10, H - ground - eave);
  g.lineWidth = 7; g.strokeStyle = '#24170e';
  for (let x = 0; x < W; x += 96) { const y0 = eave + 14; const y1 = eave + (H - ground - eave) / 2; g.beginPath(); g.moveTo(x + 5, y1); g.lineTo(x + 91, y0); g.stroke(); g.beginPath(); g.moveTo(x + 5, H - ground - 12); g.lineTo(x + 91, y1 + 9); g.stroke(); }
  // fenêtres : deux éclairées, une sombre
  const win = (x, y, lit) => {
    g.fillStyle = '#120e0a'; g.fillRect(x - 4, y - 4, 44, 64);
    if (lit) { const gr = g.createLinearGradient(0, y, 0, y + 56); gr.addColorStop(0, '#f6c06a'); gr.addColorStop(1, '#a8601f'); g.fillStyle = gr; } else g.fillStyle = '#1d2233';
    g.fillRect(x, y, 36, 56); g.fillStyle = '#3a2614'; g.fillRect(x + 16, y, 4, 56); g.fillRect(x, y + 26, 36, 4);
  };
  win(124, eave + 40, true); win(316, eave + 40, false); win(220, eave + 152, true);
  // avant-toit d'ardoise vu de côté, avec son arête claire
  g.fillStyle = '#151827'; g.fillRect(0, 0, W, eave);
  for (let x = 0; x < W; x += 18) { g.fillStyle = `rgba(120,130,170,${0.08 + rnd() * 0.08})`; g.fillRect(x, 6 + rnd() * 8, 14, eave - 18); }
  g.fillStyle = 'rgba(190,200,230,0.35)'; g.fillRect(0, eave - 5, W, 3);
  // gouttière et lanterne
  g.fillStyle = '#2a1c12'; g.fillRect(452, eave, 8, H - eave);
  g.fillStyle = '#1a120c'; g.fillRect(70, H - ground + 40, 26, 6);
  const lg = g.createRadialGradient(83, H - ground + 72, 2, 83, H - ground + 72, 70); lg.addColorStop(0, 'rgba(255,190,100,0.55)'); lg.addColorStop(1, 'rgba(255,190,100,0)');
  g.fillStyle = lg; g.fillRect(10, H - ground, 150, 150);
  g.fillStyle = '#ffcf7a'; g.fillRect(75, H - ground + 50, 16, 26); g.fillStyle = '#2a1c12'; g.fillRect(73, H - ground + 46, 20, 5);
  // plus sombre vers le fond du passage (u = 1) et au pied
  const fondu = g.createLinearGradient(0, 0, W, 0); fondu.addColorStop(0, 'rgba(0,0,0,0)'); fondu.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = fondu; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, H - 30, W, 30);
  return c.toDataURL('image/png');
}

/** Dans la page : puits de la placette (plan de preuve dessiné par code, 2,2 × 2,43 m à 145 px/m), graine fixe. */
function paintPuits() {
  const W = 320; const H = 352;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let s = 29; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const cx = W / 2; const top = 236; const bot = 334; const rx = 122;
  // ombre au sol
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(cx, bot, rx + 18, 16, 0, 0, Math.PI * 2); g.fill();
  // margelle : cylindre de pierre en assises, plus sombre sur les bords
  g.save(); g.beginPath(); g.moveTo(cx - rx, top); g.lineTo(cx - rx, bot); g.ellipse(cx, bot, rx, 22, 0, Math.PI, 0, true); g.lineTo(cx + rx, top); g.closePath(); g.clip();
  g.fillStyle = '#1a1922'; g.fillRect(cx - rx, top - 30, rx * 2, bot - top + 60);
  for (let y = top - 6, r = 0; y < bot + 22; y += 24, r++) {
    let x = cx - rx - ((r * 23) % 40);
    while (x < cx + rx) {
      const w = 30 + rnd() * 26; const t = rnd();
      g.fillStyle = `rgb(${Math.round(54 + t * 20)},${Math.round(52 + t * 16)},${Math.round(66 + t * 18)})`;
      g.fillRect(x + 1.5, y + 1.5, w - 3, 21);
      x += w;
    }
  }
  const sh = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(0.35, 'rgba(0,0,0,0.05)'); sh.addColorStop(0.75, 'rgba(255,170,80,0.10)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = sh; g.fillRect(cx - rx, top - 30, rx * 2, bot - top + 60);
  g.restore();
  // poteaux, toit d'ardoise, treuil, corde et seau
  g.fillStyle = '#2a1c12'; g.fillRect(cx - 104, 74, 14, top - 70); g.fillRect(cx + 90, 74, 14, top - 70);
  g.fillStyle = '#3a2716'; g.fillRect(cx - 100, 74, 4, top - 70); g.fillRect(cx + 94, 74, 4, top - 70);
  g.fillStyle = '#161827'; g.beginPath(); g.moveTo(cx - 132, 84); g.lineTo(cx, 20); g.lineTo(cx + 132, 84); g.lineTo(cx + 120, 92); g.lineTo(cx, 34); g.lineTo(cx - 120, 92); g.closePath(); g.fill();
  for (let i = 0; i < 26; i++) { const t = i / 25; g.fillStyle = `rgba(120,130,170,${0.1 + rnd() * 0.08})`; g.fillRect(cx - 124 + t * 236, 84 - (1 - Math.abs(t - 0.5) * 2) * 60, 7, 6); }
  g.fillStyle = 'rgba(190,200,230,0.35)'; g.beginPath(); g.moveTo(cx - 132, 84); g.lineTo(cx, 20); g.lineTo(cx + 132, 84); g.lineTo(cx + 132, 87); g.lineTo(cx, 23); g.lineTo(cx - 132, 87); g.closePath(); g.fill();
  g.fillStyle = '#24170e'; g.fillRect(cx - 100, 118, 200, 12);
  g.fillStyle = '#5a4128'; g.fillRect(cx - 40, 114, 80, 20);
  g.strokeStyle = '#8c7a5c'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 4, 134); g.lineTo(cx + 4, 196); g.stroke();
  g.fillStyle = '#3b2a1a'; g.beginPath(); g.moveTo(cx - 12, 196); g.lineTo(cx + 20, 196); g.lineTo(cx + 16, 222); g.lineTo(cx - 8, 222); g.closePath(); g.fill();
  g.fillStyle = '#6b5a40'; g.fillRect(cx - 12, 196, 32, 3); g.fillRect(cx - 10, 210, 28, 2);
  // margelle vue d'en haut : bord clair, eau sombre
  g.fillStyle = '#4a4858'; g.beginPath(); g.ellipse(cx, top, rx, 24, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#06080e'; g.beginPath(); g.ellipse(cx, top + 2, rx - 18, 15, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,190,110,0.18)'; g.beginPath(); g.ellipse(cx + 30, top + 3, 30, 4, 0, 0, Math.PI * 2); g.fill();
  // lanterne accrochée au poteau est, et sa lueur
  const lx = cx + 118; const ly = 150;
  const glow = g.createRadialGradient(lx, ly + 14, 2, lx, ly + 14, 90); glow.addColorStop(0, 'rgba(255,190,100,0.55)'); glow.addColorStop(1, 'rgba(255,190,100,0)');
  g.fillStyle = glow; g.fillRect(lx - 90, ly - 76, 180, 180);
  g.fillStyle = '#2a1c12'; g.fillRect(cx + 104, 132, 18, 4); g.fillRect(lx - 1, 132, 3, 10);
  g.fillStyle = '#ffcf7a'; g.fillRect(lx - 8, ly, 16, 26); g.fillStyle = '#2a1c12'; g.fillRect(lx - 10, ly - 4, 20, 5); g.fillRect(lx - 10, ly + 26, 20, 4);
  return c.toDataURL('image/png');
}

/** Fiche d'un plan de preuve dessiné par code. */
function fichePreuve(id, buf, usage) {
  const dim = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  mkdirSync(`art-src/decors/${id}`, { recursive: true });
  writeFileSync(`art-src/decors/${id}/fiche.json`, `${JSON.stringify({
    id, projet: 'Les Quatre Voies (RPGCards)', decision: 'ADR 028, « Profondeur praticable » (passe 62) et « Quartiers en rangs » (passe 65) : preuve de conception, laboratoire seulement',
    source: `dessiné par code (tools/m09-profondeur-preuve.mjs, ${id === 'preuve-joue' ? 'paintJoue' : 'paintPuits'} : canvas 2D, graine fixe) ; aucune image générée, aucune image externe`,
    sortie: { fichier: `public/decors/${id}.png`, sha256: sha(buf), octets: buf.length, dimensions: dim },
    usage, approved: false,
  }, null, 2)}\n`);
  return { file: `${id}.png`, sha256: sha(buf), size: dim, source: 'dessiné par code (preuve de la profondeur)', fiche: `art-src/decors/${id}/fiche.json`, approved: false };
}

if (MODE === 'assembler') {
  const man = JSON.parse(readFileSync('public/decors/manifest.json', 'utf8'));
  const q = man.ilots.quai;
  const pl = q.plans;
  const browser = await launch();
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  const joue = fromUrl(await pg.evaluate(paintJoue));
  const puits = fromUrl(await pg.evaluate(paintPuits));
  writeFileSync('public/decors/preuve-joue.png', joue);
  writeFileSync('public/decors/preuve-puits.png', puits);
  const J = fichePreuve('preuve-joue', joue, 'murs des passages, des places et des bouts des ruelles du Quai en rangs (manifest-profondeur.json) ; plan de preuve, remplacé par le kit annoncé');
  const PU = fichePreuve('preuve-puits', puits, 'puits de la placette du Puits (manifest-profondeur.json) ; plan de preuve, remplacé par le kit annoncé');
  const plans = {};
  // rang dépassé (passe 65) : au-delà du fond de la bande qui suit le rang n, tout son rang de devant devient fantôme
  const coupeZ = (n) => { const b = PLAN_QUAI.bandes[n - 1]; return b ? r3(b.z0 - 0.3) : undefined; };
  const cz = (n) => (coupeZ(n) === undefined ? {} : { coupeZ: coupeZ(n) });
  plans.ciel = { ...pl.ciel };
  // rang 1 : façades du Quai, trois morceaux de la même image (ouest, centre de l'essai, est) aux raccords de l'assemblage
  const fa = pl.facades; const mpx = fa.width / fa.size[0];
  const x0 = fa.at[0] - fa.width / 2;
  const PARTS_M = [13.4, 21.8, 12.8];
  const density = 68; // px/m de l'assemblage des façades (m09-porte-quai.mjs, L.density)
  const cuts = [0, Math.round(PARTS_M[0] * density), Math.round(PARTS_M[0] * density) + Math.round(PARTS_M[1] * density), fa.size[0]];
  const shifts = [-P.shift, 0, P.shift];
  ['ouest', 'centre', 'est'].forEach((k, i) => {
    const w = (cuts[i + 1] - cuts[i]) * mpx;
    const xl = x0 + cuts[i] * mpx + shifts[i];
    plans[`facades-${k}`] = { ...fa, uv: [r3(cuts[i] / fa.size[0]), 0, r3(cuts[i + 1] / fa.size[0]), 1], width: r3(w), at: [r3(xl + w / 2), 0, fa.at[2]], coupe: true, ...cz(1) };
  });
  const pi = pl['pied-facades']; const pmx = pi.width / pi.size[0]; const px0 = pi.at[0] - pi.width / 2;
  const pc = [0, Math.round((P.piedCuts[0] - px0) / pmx), Math.round((P.piedCuts[1] - px0) / pmx), pi.size[0]];
  ['ouest', 'centre', 'est'].forEach((k, i) => {
    const w = (pc[i + 1] - pc[i]) * pmx;
    const xl = px0 + pc[i] * pmx + shifts[i];
    plans[`pied-${k}`] = { ...pi, uv: [r3(pc[i] / pi.size[0]), 0, r3(pc[i + 1] / pi.size[0]), 1], width: r3(w), at: [r3(xl + w / 2), 0, pi.at[2]], coupe: true, ...cz(1) };
  });
  plans.rue = { ...pl.rue };
  plans['premier-plan'] = { ...pl['premier-plan'] };
  plans.eau = { ...pl.eau };
  // rangs 2 et 3 : fonds des ruelles et de leurs places, morceaux du second rang à leur place au monde (un seul calage
  // continu par rang : la façade est une, coupée aux passages, la place recule)
  const sr = pl['second-rang'];
  for (const f of PLAN_QUAI.facades.filter((u) => u.flanc || u.rang === 2 || u.rang === 3)) {
    const k = f.flanc ? P.flancs[f.rang] : P.fonds[f.rang];
    const pxm = sr.size[0] / k.largeur;
    const px = (x) => sr.size[0] / 2 + (x - k.centre) * pxm;
    const a = Math.max(f.x0, k.centre - sr.size[0] / 2 / pxm); const b = Math.min(f.x1, k.centre + sr.size[0] / 2 / pxm);
    if (b - a < 0.5) continue;
    const id = f.place ? `fond-${f.place}` : `${f.flanc ? 'flanc' : 'fond'}-rang${f.rang}-${Math.round(a)}`;
    plans[id] = { ...sr, uv: [r3(px(a) / sr.size[0]), 0, r3(px(b) / sr.size[0]), k.v1], width: r3(b - a), at: [r3((a + b) / 2), 0, f.z], voile: k.voile, fog: k.fog, lit: k.lit, coupe: true, ...cz(f.rang) };
    if (!k.voile) delete plans[id].voile;
  }
  // rang 4 : la ville haute au fond de la cour de la Chapelle
  const tr = pl['troisieme-rang'];
  const f4 = PLAN_QUAI.facades.find((u) => u.rang === 4 && !u.flanc);
  plans['fond-cour'] = { ...tr, uv: [0, 0, 1, P.fond4.v1], width: P.fond4.largeur, at: [0, P.fond4.y, f4.z], voile: P.fond4.voile, fog: P.fond4.fog, lit: P.fond4.lit };
  // murs de côté : passages, côtés des places, bouts des ruelles (même image découpée à leur longueur : hauteur gardée)
  const nWall = {};
  for (const m of PLAN_QUAI.murs) {
    const L = m.z1 - m.z0;
    const id = `mur-${m.role}-${m.rang}-${(nWall[`${m.role}-${m.rang}`] = (nWall[`${m.role}-${m.rang}`] ?? 0) + 1)}`;
    plans[id] = { ...J, vers: m.vers, uv: [0, 0, r3(Math.min(1, L / P.murs.longueur)), 1], at: [m.x, 0, r3((m.z0 + m.z1) / 2)], width: r3(L), orient: 'cote', blend: 'decoupe', lit: P.murs.lit, coupe: true, ...cz(m.rang) };
  }
  // mobilier des rangs 2 à 4 : morceaux des bandes du pied et de la rue, posés à leur taille au monde ; puits par code
  const strips = { pied: pl['pied-facades'], rue: pl.rue };
  const stripUrl = { pied: dataUrl(readFileSync('public/decors/quai-pied-facades.png')), rue: dataUrl(readFileSync('public/decors/quai-rue.png')) };
  const piece = async (strip, [xa, xb]) => {
    const e = strips[strip]; const m = e.width / e.size[0]; const left = e.at[0] - e.width / 2;
    const [bx0, by0, bx1, by1] = await pg.evaluate(alphaBox, { url: stripUrl[strip], c0: Math.round((xa - left) / m), c1: Math.round((xb - left) / m) });
    return { e, uv: [r3(bx0 / e.size[0]), r3(by0 / e.size[1]), r3(bx1 / e.size[0]), r3(by1 / e.size[1])], width: r3((bx1 - bx0) * m), lift: r3((e.size[1] - by1) * m), cx: left + ((bx0 + bx1) / 2) * m };
  };
  const meubles = {};
  for (const mb of MEUBLES_RANGS) {
    if (mb.source === 'puits') { plans[mb.id] = { ...PU, at: [mb.x, 0, mb.z], width: 2.2, orient: 'face', blend: 'decoupe', lit: 0.3 }; continue; }
    const pcx = await piece(mb.source, mb.src);
    // pied du meuble au sol, à son z (dans la bande, il était peint plus haut : plus loin)
    plans[mb.id] = { ...pcx.e, uv: pcx.uv, width: pcx.width, at: [mb.x, 0, mb.z] };
    meubles[mb.id] = pcx;
  }
  const lamp = await piece('rue', P.lampes.src);
  LAMPES_RANGS.forEach((p, i) => { plans[`lampadaire-${i + 1}`] = { ...lamp.e, uv: lamp.uv, width: lamp.width, at: [p.x, 0, p.z] }; });
  await browser.close();
  // lumières (16 au plus) : le Quai (lampadaires, étal, deux lanternes des façades), puis les rangs du fond (lampadaires,
  // lanterne de l'étal de la Halle, lanterne du puits, une lanterne de façade de la ruelle des Lanternes)
  const quai = q.lumieres.filter((l) => l.at[2] > 0).concat(q.lumieres.filter((l) => l.at[2] < 0 && l.at[2] > -2)).slice(0, 5)
    .concat(q.lumieres.filter((l) => l.at[2] <= -2.3 && Math.abs(l.at[0]) < 10 && l.at[1] < 4).slice(0, 2));
  const etal = MEUBLES_RANGS.find((m) => m.id === 'halle-etal');
  const puitsM = MEUBLES_RANGS.find((m) => m.id === 'puits');
  const fond = [
    ...LAMPES_RANGS.map((p) => ({ at: [p.x, P.lampes.lanternY, r3(p.z + 0.1)], color: 'ambre', intensity: 3.0, radius: 9, halo: 1.6, flicker: 'lantern' })),
    // lanterne de l'étal : même écart au milieu de l'étal que sur le Quai (x 0,84 pour un étal centré en cx)
    { at: [r3(etal.x + 0.84 - meubles['halle-etal'].cx), 2.0, r3(etal.z + 0.1)], color: 'ambre', intensity: 2.6, radius: 7, halo: 1, flicker: 'lantern' },
    { at: [r3(puitsM.x + 0.81), 1.5, r3(puitsM.z + 0.1)], color: 'ambre', intensity: 2.4, radius: 6, halo: 0.9, flicker: 'lantern' },
    { at: [-3.0, 3.2, PLAN_QUAI.rangs[2].z0 + 0.15], color: 'ambre', intensity: 2.0, radius: 6, halo: 0.8, flicker: 'lantern' },
  ];
  // lanternes peintes sur un rang qui devient fantôme : leur halo s'atténue avec lui
  const lumieres = [...quai.map((l) => (l.at[2] < 0 ? { ...l, ...cz(1) } : l)), ...fond.slice(0, -1), { ...fond[fond.length - 1], ...cz(3) }].slice(0, 16);
  // brumes : celles du lointain, puis une nappe sombre à chaque bout des ruelles
  const bouts = PLAN_QUAI.rangs.filter((r) => r.n > 1).flatMap((r) => [-1, 1].map((sgn) => [10, 9, r3(sgn > 0 ? r.x1 + 1.5 : r.x0 - 1.5), 3.8, r3((r.z0 + r.z1) / 2), 0.6, 0.004, [2, 1], 1.0]));
  const brumes = [...P.brumesLoin, ...bouts];
  // ordre de dessin d'arrière en avant (contrat : un plan plus lointain n'est jamais dessiné après un plus proche)
  const zKey = (p) => p.at[2] + (p.orient === 'cote' ? p.width / 2 : 0);
  Object.entries(plans).sort((u, v) => zKey(u[1]) - zKey(v[1])).forEach(([k], i) => { plans[k].order = i; });
  const out = { version: 1, ilots: { quai: { plans, lumieres, camera: P.camera, brumes } } };
  writeFileSync('public/decors/manifest-profondeur.json', `${JSON.stringify(out, null, 2)}\n`);
  const n = Object.keys(plans).length;
  check(n <= 64 && lumieres.length <= 16 && brumes.length <= 10, `manifeste de la preuve : ${n} plans (fonds, murs, mobilier découpés dans ${new Set(Object.values(plans).map((p) => p.file)).size} images), ${lumieres.length} lumières, ${brumes.length} brumes`);
  report.plans = Object.fromEntries(Object.entries(plans).map(([k, v]) => [k, { file: v.file, uv: v.uv, at: v.at, width: v.width, orient: v.orient, vers: v.vers, coupe: !!v.coupe }]));
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
    ['quai', -0.6, 0.6, 'face', 'Rang 1 : le Quai'],
    ['rue-haute', -3, -14, 'face', 'Rang 2 : la rue Haute (bloc devant en fantôme)'],
    ['place-halle', 5.2, -18.4, 'face', 'Rang 2 : la place de la Halle (spot)'],
    ['passage', -6.5, -21, 'dos', 'Dans le passage vers le rang 3'],
    ['ruelle-lanternes', -1, -27, 'face', 'Rang 3 : la ruelle des Lanternes'],
    ['placette-puits', -12.4, -29.8, 'face', 'Rang 3 : la placette du Puits (spot)'],
    ['cour-chapelle', 1.5, -38.5, 'face', 'Rang 4 : la cour de la Chapelle (cœur)'],
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
    const nPlans = Object.keys(JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8')).ilots.quai.plans).length;
    check(/rangs/.test(info.name) && info.dec.loaded.includes('quai') && info.dec.issues.length === 0, `Quai en rangs dessiné par son diorama de preuve (${nPlans} plans découpés dans ${Object.keys(info.dec.timings).length} images, ${Math.round((info.dec.gpuBytes.quai ?? 0) / 1048576 * 10) / 10} Mo de mémoire GPU), aucun refus`);
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
    const pp = await (await browser.newContext({ viewport: { width: 2100, height: 1500 }, deviceScaleFactor: 1 })).newPage();
    const planche = await pp.evaluate(async (u) => {
      const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
      const im = await Promise.all(u.imgs.map(load));
      const pad = 16; const tw = 640; const th = 360; const top = 40;
      const c = document.createElement('canvas'); c.width = 3 * tw + 4 * pad; c.height = top + 3 * (th + 36) + 16;
      const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#e8dcc0'; g.font = 'bold 17px system-ui';
      g.fillText('Quartier en rangs : le Quai en quatre rangs (passe 65, conception proposée ; plans actuels découpés par script, laboratoire seulement, aucune image générée)', pad, 26);
      g.font = '14px system-ui';
      const X = (col) => pad + col * (tw + pad); const Y = (row) => top + row * (th + 36);
      const tile = (k, x, y) => { const i = im[k]; const s2 = Math.min(tw / i.width, th / i.height); g.drawImage(i, x + (tw - i.width * s2) / 2, y + (th - i.height * s2) / 2, i.width * s2, i.height * s2); };
      const lab = (t, x, y) => g.fillText(t, x, y);
      // plan vu de dessus : x de −32 à 32, z de −46 à 7 (eau en bas)
      const S = 6.6; const ox = X(0) + tw / 2; const oz = Y(0) + 8 + 46 * S;
      const P2 = (x, z) => [ox + x * S, oz + z * S];
      const box = (r, col) => { const [a1, a2] = P2(r.x0, r.z0); const [c1, c2] = P2(r.x1, r.z1); g.fillStyle = col; g.fillRect(a1, a2, c1 - a1, c2 - a2); };
      g.fillStyle = '#16233a'; g.fillRect(X(0), P2(0, 3.4)[1], tw, Y(0) + th - P2(0, 3.4)[1]);
      box(u.ilot.bounds, '#3a3a46');
      for (const r of u.plan.rangs) if (r.place) box(r.place, '#4c4636');
      for (const r of u.ilot.rects) box(r, (r.z1 - r.z0) > 2.5 || (r.x1 - r.x0) > 2.5 ? '#5a4a3c' : '#8a7448');
      g.lineWidth = 3; g.strokeStyle = '#e8b14a';
      for (const f of u.plan.facades) { const [a1, a2] = P2(f.x0, f.z); const [c1] = P2(f.x1, f.z); g.beginPath(); g.moveTo(a1, a2); g.lineTo(c1, a2); g.stroke(); }
      g.lineWidth = 2; g.strokeStyle = '#9fb3d8';
      for (const m of u.plan.murs) { const [a1, a2] = P2(m.x, m.z0); const [, c2] = P2(m.x, m.z1); g.beginPath(); g.moveTo(a1, a2); g.lineTo(a1, c2); g.stroke(); }
      u.spots.forEach(([k, x, z], i) => { const [a1, a2] = P2(x, z); g.fillStyle = '#f2d27a'; g.beginPath(); g.arc(a1, a2, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#10121a'; g.font = 'bold 10px system-ui'; g.fillText(String(i + 1), a1 - 3, a2 + 4); });
      g.fillStyle = '#e8dcc0'; g.font = '11px system-ui';
      for (const r of u.plan.rangs) { const [a1, a2] = P2(r.x0 + 0.6, (r.z0 + r.z1) / 2); lab(`rang ${r.n}`, a1 - (r.n === 1 ? 0 : 0), a2 + 4); }
      g.font = '14px system-ui';
      lab('Plan vu de dessus : rues (gris), places (ocre), bandes bâties (brun), façades (or), murs (bleu)', X(0), Y(0) + th + 22);
      const order = [[1, X(1), Y(0)], [2, X(2), Y(0)], [3, X(0), Y(1)], [4, X(1), Y(1)], [5, X(2), Y(1)], [6, X(0), Y(2)], [7, X(1), Y(2)]];
      for (const [i, x, y] of order) { tile(i - 1, x, y); const sp = u.spots[i - 1]; lab(`${i}. ${sp[4]} : ${u.fig[sp[0]]} px`, x, y + th + 22); }
      const qx = X(2); let qy = Y(2) - 2; const qw = tw;
      const wrap = (t, bold = false) => { g.font = `${bold ? 'bold ' : ''}13px system-ui`; const words = t.split(' '); let line = ''; for (const w of words) { const n = line ? `${line} ${w}` : w; if (g.measureText(n).width > qw) { qy += 17; g.fillText(line, qx, qy); line = w; } else line = n; } qy += 17; g.fillText(line, qx, qy); qy += 5; };
      wrap('Grammaire (rangs.ts) : rang 1 = la rue du premier plan ; entre deux rangs, une bande bâtie percée de passages jamais alignés d’une bande à l’autre ; rangs 2 à 4 = des ruelles de plus en plus courtes, fermées par un mur à leurs bouts, qui débordent chacune sur une place (le spot du rang) ; le dernier rang est le cœur du quartier.', true);
      wrap('Côtés : les façades des bandes continuent au-delà des bouts des ruelles (62 m de large), murs et brume aux bouts. Caméra frontale : elle suit 90 % de la profondeur et s’élève de 6° à 16°. Le bloc juste devant le personnage devient un fantôme (12 %), les rangs dépassés de deux s’effacent.');
      wrap('Provisoire, remplacé par le kit annoncé (5 images, générées après accord) : fonds des ruelles (le second rang recalé), murs et puits (dessinés par code), monuments des places.');
      return c.toDataURL('image/png');
    }, { imgs: SPOTS.map(([k]) => dataUrl(shots[k])), spots: SPOTS, fig: Object.fromEntries(Object.entries(report.figures).map(([k, v]) => [k, v.figurePx])), ilot: info.ilot, plan: PLAN_QUAI });
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
