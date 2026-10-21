// M09 V4 — preuve de la profondeur praticable (passe 62) puis du **quartier en rangs** (passe 65 ; demande du responsable :
// « plusieurs ruelles superposées qui débordent vers des places marchables… 1er, 2e, 3e, voire 4e rang ») : le Quai en
// quatre rangs du laboratoire (`src/ville/quaiProfond.ts`, grammaire `src/ville/rangs.ts`, `?ville=1&qa=1&profondeur=1`).
// Passe 66 : habillé du **kit des quartiers en rangs** (5 images générées après l'accord du responsable, traitées par
// `tools/m09-kit-rangs.mjs`, découpes dans `art-src/decors/kit-rangs.json`), avec les plans du Quai découpés par script.
// Le plan (rangs, bandes, passages, places, murs, mobilier) est LU dans le code du jeu (tsx) : une seule source.
//   assembler : lit `public/decors/manifest.json` (îlot `quai`) et le kit, écrit `public/decors/manifest-profondeur.json` :
//               rang 1 : façades et pied du Quai découpés en trois blocs écartés de 3 m (deux passages) ; rangs 2 à 4 :
//               fonds et flancs des ruelles découpés dans les deux frises du kit, monuments au fond des places (la
//               halle, la maison des Joueurs), la chapelle devant la ville haute au fond de la cour ; murs du kit aux
//               passages, aux côtés des places et aux bouts des ruelles ; mobilier du kit (étal, puits, fontaine, banc,
//               charrette, niche) et morceaux du pied du Quai ; caméra qui suit en profondeur ; plans effacés quand le
//               personnage passe derrière (fantôme) ou les dépasse de deux rangs (fondu lointain).
//   verifier  : sur le build (`npm run build` avant) : captures 1920 × 1080 à chaque rang et à chaque spot, plan vu de
//               dessus, hauteur du personnage à chaque profondeur ; planche pour le responsable.
// Usage : node tools/m09-kit-rangs.mjs && npx tsx tools/m09-profondeur-preuve.mjs assembler
//         npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> npx tsx tools/m09-profondeur-preuve.mjs verifier [dossier] [rapport.json]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { LAMPES_RANGS, MEUBLES_RANGS, PLAN_QUAI } from '../src/ville/quaiProfond.ts';
import { approuve } from './m09-approbations.mjs';

const MODE = process.argv[2];
const head = execSync('git rev-parse --short HEAD').toString().trim();
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const r3 = (x) => Math.round(x * 1000) / 1000;
const report = { date: new Date().toISOString(), commit: head, mode: MODE, checks: [], console: [] };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };

/**
 * Habillage (m) ; le plan lui-même vient de `quaiProfond.ts` (PLAN_QUAI, MEUBLES_RANGS, LAMPES_RANGS), les planches et
 * leurs découpes du kit (`art-src/decors/kit-rangs.json`).
 */
const P = {
  shift: 3,
  // raccords de la bande du pied des façades (x au monde avant écart), choisis entre les accessoires
  piedCuts: [-12, 11.6],
  // fonds et flancs des rangs 2 à 4 : les deux frises du kit (rangées de maisons de ruelle, ≈ 64 m), en alternance d'un
  // rang à l'autre et entre fond et flancs (jamais la même maison derrière la même)
  fonds: { 2: { frise: 'a', centre: 0, lit: 0.35, fog: 0.2, voile: 0 }, 3: { frise: 'b', centre: 0, lit: 0.3, fog: 0.25, voile: 0.06 } },
  flancs: { 2: { frise: 'b', centre: 0, lit: 0.3, fog: 0.2, voile: 0 }, 3: { frise: 'a', centre: 0, lit: 0.3, fog: 0.25, voile: 0.05 }, 4: { frise: 'b', centre: 0, lit: 0.3, fog: 0.3, voile: 0.1 } },
  // fonds des places (le spot de chaque rang) : monuments du kit ; la chapelle devant la ville haute, au fond de la cour
  monuments: { 'place-halle': 'halle', 'placette-puits': 'joueurs' },
  chapelle: { largeur: 8, x: 0, devant: 0, lit: 0.3, fog: 0.3 },
  // passe 67 : le fond de la cour est une rangée de maisons continue (frise A) où la chapelle prend place au milieu ;
  // la ville haute (troisième rang) recule au loin, au-dessus des toits, comme vue du Quai
  fond4: { frise: 'a', lit: 0.3, fog: 0.3, voile: 0.08 },
  villeHaute: { z: -75, largeur: 140, y: 2, v1: 0.88, voile: 0.5, fog: 0.8 },
  // façades posées d'un mur mitoyen à un autre (jamais une maison coupée) : morceau de frise étiré de 0,8 à 1,25 fois
  etirement: [0.8, 1.25],
  murs: { lit: 0.35 },
  // échelle propre d'un objet du kit (peint à 100 px/m) : la niche votive, peinte à 4 m de haut, ramenée à 2,8 m
  objets: { niche: 0.7 },
  lampes: { src: [-4.95, -3.05], lanternY: 3.9 },
  // cadrage : celui du Quai élargi ; il suit 90 % de la profondeur (le personnage reste lisible jusqu'au quatrième rang)
  // et s'incline de 6° au quai à 16° dès la rue Haute
  camera: { pitch: 6, distance: 25, fov: 42, aimY: 4.8, minX: -5, maxX: 5, followZ: 0.9, aimZ: 0.3, pitchFond: 16, zFond: -14 },
  // brumes : trois nappes hautes derrière la cour (entre la ville haute et le ciel), l'eau du port, puis une nappe
  // sombre à chaque bout des ruelles des rangs 2 à 4 (la ruelle continue dans la nuit au lieu de buter sur un mur)
  brumesLoin: [[120, 12, 0, 18, -47, 0.3, 0.006, [6, 1.2], 2.2], [170, 20, 0, 22, -56, 0.36, 0.005, [5, 1.3], 2.2], [270, 34, 0, 26, -70, 0.36, 0.004, [4, 1.4], 2.2], [120, 2, 0, -2.2, 6, 0.22, 0.012, [6, 1]]],
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

if (MODE === 'assembler') {
  const man = JSON.parse(readFileSync('public/decors/manifest.json', 'utf8'));
  const q = man.ilots.quai;
  const pl = q.plans;
  // kit des quartiers en rangs (passe 66) : planches traitées par `tools/m09-kit-rangs.mjs`, découpes et échelles
  const kit = JSON.parse(readFileSync('art-src/decors/kit-rangs.json', 'utf8'));
  const SRC_KIT = 'gpt-image-2 (kit des quartiers en rangs, ADR 028, passe 66), traité par script (tools/m09-kit-rangs.mjs)';
  const kitPlate = (e) => {
    const buf = readFileSync(`public/decors/${e.file}`);
    if (sha(buf) !== e.sha256) throw new Error(`${e.file} : empreinte différente de celle du kit (relancer tools/m09-kit-rangs.mjs)`);
    return { file: e.file, sha256: e.sha256, size: e.size, source: SRC_KIT, fiche: e.fiche, approved: approuve(`public/decors/${e.file}`, e.sha256), orient: 'face', blend: 'decoupe' };
  };
  const browser = await launch();
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
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
  // rangs 2 à 4 : fonds des ruelles, flancs et fond de la cour, morceaux des frises du kit posés d'un mur mitoyen à un
  // autre (passe 67 : aucune maison coupée au bord d'un passage ou d'une place) ; chaque morceau est choisi parmi les
  // limites des maisons de sa frise, au plus près de la largeur à couvrir (étirement de 0,8 à 1,25), en évitant de
  // reprendre les mêmes maisons
  const usage = { a: [], b: [] };
  const choisir = (frise, W) => {
    const B = kit.frises[frise].maisons; let best = null;
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const span = B[j] - B[i]; const sc = W / span;
      if (sc < P.etirement[0] || sc > P.etirement[1]) continue;
      const ov = usage[frise].reduce((m, [u0, u1]) => m + Math.max(0, Math.min(u1, B[j]) - Math.max(u0, B[i])), 0) / span;
      const cost = Math.abs(Math.log(sc)) + 0.6 * ov;
      if (!best || cost < best.cost - 1e-9) best = { s: B[i], e: B[j], sc, cost };
    }
    if (!best) throw new Error(`frise ${frise} : aucun morceau de maisons entières pour ${W} m`);
    usage[frise].push([best.s, best.e]);
    return best;
  };
  report.morceaux = {};
  const centre4 = [-P.chapelle.largeur / 2, P.chapelle.largeur / 2];
  const morceaux = PLAN_QUAI.facades.filter((u) => !u.place && (u.flanc || u.rang >= 2)).flatMap((f) => (f.rang === 4 && !f.flanc ? [{ ...f, x1: centre4[0] }, { ...f, x0: centre4[1] }] : [f]));
  for (const f of morceaux) {
    const k = f.flanc ? P.flancs[f.rang] : f.rang === 4 ? { ...P.fond4, centre: 0 } : P.fonds[f.rang];
    const fr = kit.frises[k.frise];
    const W = f.x1 - f.x0;
    const m = choisir(k.frise, W);
    const id = `${f.flanc ? 'flanc' : 'fond'}-rang${f.rang}-${Math.round(f.x0)}`;
    plans[id] = { ...kitPlate(fr), uv: [r3(m.s / fr.largeur), 0, r3(Math.min(1, m.e / fr.largeur)), 1], width: r3(W), at: [r3((f.x0 + f.x1) / 2), 0, f.z], fog: k.fog, lit: k.lit, ...(k.voile ? { voile: k.voile } : {}), ...(f.rang < 4 || f.flanc ? { coupe: true, ...cz(f.rang) } : {}) };
    report.morceaux[id] = { frise: k.frise, de: m.s, a: m.e, etirement: r3(m.sc) };
  }
  // fonds des places : les monuments du kit (le spot de chaque rang)
  for (const f of PLAN_QUAI.facades.filter((u) => u.place)) {
    const m = kit.monuments.panneaux[P.monuments[f.place]];
    plans[`fond-${f.place}`] = { ...kitPlate(kit.monuments), uv: m.uv, width: r3(f.x1 - f.x0), at: [r3((f.x0 + f.x1) / 2), 0, f.z], lit: 0.3, fog: 0.25, coupe: true, ...cz(f.rang) };
  }
  // rang 4 : la chapelle au milieu de la rangée du fond de la cour (le cœur du quartier) ; la ville haute au loin
  const tr = pl['troisieme-rang'];
  const f4 = PLAN_QUAI.facades.find((u) => u.rang === 4 && !u.flanc);
  plans['ville-haute'] = { ...tr, uv: [0, 0, 1, P.villeHaute.v1], width: P.villeHaute.largeur, at: [0, P.villeHaute.y, P.villeHaute.z], voile: P.villeHaute.voile, fog: P.villeHaute.fog };
  plans['cour-chapelle'] = { ...kitPlate(kit.monuments), uv: kit.monuments.panneaux.chapelle.uv, width: P.chapelle.largeur, at: [P.chapelle.x, 0, r3(f4.z + P.chapelle.devant)], lit: P.chapelle.lit, fog: P.chapelle.fog };
  // murs de côté : les panneaux du kit coupés à leur longueur : passages (colombages côté ouest,
  // plâtre côté est), côtés des places (plâtre), bouts des ruelles (pignon à porte cochère, coupé au milieu)
  const mu = kit.murs;
  const nWall = {};
  for (const m of PLAN_QUAI.murs) {
    const L = m.z1 - m.z0;
    const nom = m.role === 'bout' ? 'pignon' : m.role === 'place' ? 'platre' : m.vers === 'est' ? 'colombages' : 'platre';
    // passe 67 : hauteur utile du panneau (colombages et plâtre : leurs 9 m du bas, dans l'ombre du passage)
    const [u0, v0, u1] = mu.panneaux[nom].uv;
    const frac = Math.min(1, L / mu.longueur) * (u1 - u0);
    const uv = nom === 'pignon' ? [r3((u0 + u1) / 2 - frac / 2), v0, r3((u0 + u1) / 2 + frac / 2), 1] : [r3(u0), v0, r3(Math.min(u1, u0 + frac)), 1];
    const id = `mur-${m.role}-${m.rang}-${(nWall[`${m.role}-${m.rang}`] = (nWall[`${m.role}-${m.rang}`] ?? 0) + 1)}`;
    plans[id] = { ...kitPlate(mu), orient: 'cote', vers: m.vers, uv, at: [m.x, 0, r3((m.z0 + m.z1) / 2)], width: r3(L), lit: P.murs.lit, coupe: true, ...cz(m.rang) };
  }
  // mobilier des rangs 2 à 4 : objets du kit (à leur taille au monde, 100 px/m, la niche ramenée à son échelle), et
  // morceaux de la bande du pied du Quai
  const strips = { pied: pl['pied-facades'], rue: pl.rue };
  const stripUrl = { pied: dataUrl(readFileSync('public/decors/quai-pied-facades.png')), rue: dataUrl(readFileSync('public/decors/quai-rue.png')) };
  const piece = async (strip, [xa, xb]) => {
    const e = strips[strip]; const m = e.width / e.size[0]; const left = e.at[0] - e.width / 2;
    const [bx0, by0, bx1, by1] = await pg.evaluate(alphaBox, { url: stripUrl[strip], c0: Math.round((xa - left) / m), c1: Math.round((xb - left) / m) });
    return { e, uv: [r3(bx0 / e.size[0]), r3(by0 / e.size[1]), r3(bx1 / e.size[0]), r3(by1 / e.size[1])], width: r3((bx1 - bx0) * m), lift: r3((e.size[1] - by1) * m), cx: left + ((bx0 + bx1) / 2) * m };
  };
  const echelle = (mb) => P.objets[mb.objet] ?? 1;
  for (const mb of MEUBLES_RANGS) {
    if (mb.source === 'kit') {
      const o = kit.mobilier.objets[mb.objet];
      plans[mb.id] = { ...kitPlate(kit.mobilier), uv: o.uv, width: r3(o.largeur * echelle(mb)), at: [mb.x, 0, mb.z], lit: 0.3 };
      continue;
    }
    const pcx = await piece(mb.source, mb.src);
    // pied du meuble au sol, à son z (dans la bande, il était peint plus haut : plus loin)
    plans[mb.id] = { ...pcx.e, uv: pcx.uv, width: pcx.width, at: [mb.x, 0, mb.z] };
  }
  const lamp = await piece('rue', P.lampes.src);
  LAMPES_RANGS.forEach((p, i) => { plans[`lampadaire-${i + 1}`] = { ...lamp.e, uv: lamp.uv, width: lamp.width, at: [p.x, 0, p.z] }; });
  await browser.close();
  // lumières (16 au plus) : le Quai (lampadaires, étal, deux lanternes des façades), puis les rangs du fond (lampadaires,
  // lanternes peintes des objets du kit : étal de la Halle, puits, niche de la ruelle des Lanternes)
  const quai = q.lumieres.filter((l) => l.at[2] > 0).concat(q.lumieres.filter((l) => l.at[2] < 0 && l.at[2] > -2)).slice(0, 5)
    .concat(q.lumieres.filter((l) => l.at[2] <= -2.3 && Math.abs(l.at[0]) < 10 && l.at[1] < 4).slice(0, 2));
  const lanterne = (id, intensity, radius, halo) => {
    const mb = MEUBLES_RANGS.find((m) => m.id === id); const s = echelle(mb);
    const [dx, y] = kit.mobilier.objets[mb.objet].lanternes[0];
    return { at: [r3(mb.x + dx * s), r3(y * s), r3(mb.z + 0.1)], color: 'ambre', intensity, radius, halo, flicker: 'lantern' };
  };
  const fond = [
    ...LAMPES_RANGS.map((p) => ({ at: [p.x, P.lampes.lanternY, r3(p.z + 0.1)], color: 'ambre', intensity: 3.0, radius: 9, halo: 1.6, flicker: 'lantern' })),
    lanterne('halle-etal', 2.6, 7, 1), lanterne('puits', 2.4, 6, 0.9), { ...lanterne('lanternes-niche', 1.8, 5, 0.7), flicker: 'candle' },
  ];
  // lanternes peintes sur un rang qui devient fantôme : leur halo s'atténue avec lui
  const lumieres = [...quai.map((l) => (l.at[2] < 0 ? { ...l, ...cz(1) } : l)), ...fond].slice(0, 16);
  // brumes : celles du lointain, puis une nappe sombre à chaque bout des ruelles
  const bouts = PLAN_QUAI.rangs.filter((r) => r.n > 1).flatMap((r) => [-1, 1].map((sgn) => [10, 9, r3(sgn > 0 ? r.x1 + 1.5 : r.x0 - 1.5), 3.8, r3((r.z0 + r.z1) / 2), 0.6, 0.004, [2, 1], 1.0]));
  const brumes = [...P.brumesLoin, ...bouts];
  // ordre de dessin d'arrière en avant (contrat : un plan plus lointain n'est jamais dessiné après un plus proche)
  const zKey = (p) => p.at[2] + (p.orient === 'cote' ? p.width / 2 : 0);
  Object.entries(plans).sort((u, v) => zKey(u[1]) - zKey(v[1])).forEach(([k], i) => { plans[k].order = i; });
  // reprise de M09 : le manifeste porte aussi le Parvis, les Ruelles et la Grande Cour en rangs (`tools/m09-quartiers-rangs.mjs`), gardés
  const prev = JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8')).ilots ?? {};
  const out = { version: 1, ilots: { ...prev, quai: { plans, lumieres, camera: P.camera, brumes } } };
  writeFileSync('public/decors/manifest-profondeur.json', `${JSON.stringify(out, null, 2)}\n`);
  const n = Object.keys(plans).length;
  check(n <= 64 && lumieres.length <= 16 && brumes.length <= 10, `manifeste du Quai en rangs : ${n} plans découpés dans ${new Set(Object.values(plans).map((p) => p.file)).size} images (kit des rangs : ${Object.values(plans).filter((p) => p.source === SRC_KIT).length} plans), ${lumieres.length} lumières, ${brumes.length} brumes`);
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
      g.fillText('Quartier en rangs : le Quai en quatre rangs (passe 68 : chemins lumineux posés sur les pavés, ombres au sol ; kit non approuvé ; laboratoire seulement)', pad, 26);
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
      wrap('Côtés : les façades des bandes continuent au-delà des bouts des ruelles (62 m de large), murs et brume aux bouts. Caméra frontale : elle suit 90 % de la profondeur et s’élève de 6° à 16°. Le bloc juste devant le personnage devient un fantôme assourdi (12 %) ; les rangs déjà traversés s’effacent : les chemins lumineux guident le retour.');
      wrap('Chemins lumineux (passe 68) : une lueur ambrée très douce, posée sur le dessus des pavés (les joints restent sombres), relie les rangs au travers des passages jusqu’au cœur ; tracé ondulé, coudes arrondis, sans flèche ni sens ; elle se révèle autour du personnage. Ombres au sol : contact sous chaque objet, pied des façades, passages dans l’ombre.');
      wrap('Kit des rangs (5 images, 21 sur 30) : deux rangées de maisons de ruelle assemblées en deux frises (fonds et flancs), trois murs (passages, places, bouts), trois monuments (halle, maison des Joueurs, chapelle), six objets (étal, puits, fontaine, banc, charrette, niche). Rien n’est approuvé.');
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
