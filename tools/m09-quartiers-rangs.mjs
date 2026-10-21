// M09 (reprise, 2026-10-20) — **la ville en rangs** : le Parvis et les Ruelles en quatre rangs, la Grande Cour (V5), sur le
// modèle du Quai en quatre rangs (`tools/m09-profondeur-preuve.mjs`, passes 65 à 68). Les plans (rangs, bandes, passages,
// places, murs, mobilier, lampadaires) sont LUS dans le code du jeu (tsx) : `src/ville/parvisRangs.ts`, `ruellesRangs.ts`,
// `grandeCour.ts` ; une seule source.
//   assembler : écrit les dioramas `parvis`, `ruelles` et `cour` dans `public/decors/manifest-profondeur.json` (le Quai y
//               reste tel quel) : rangs 2 à 4 habillés du kit des rangs (frises posées d'un mur mitoyen à un autre, en
//               évitant les maisons déjà posées au Quai ; murs ; mobilier) ; ce qui fait l'identité de chaque îlot vient du
//               lot des villes (`art-src/decors/kit-villes.json`, traité par `tools/m09-kit-villes.mjs`) : pavillon de la
//               porte du Tournoi et mur de l'arène (Parvis), maisons du canal et halle de la Guilde (Ruelles), Maison du
//               Tournoi, monument, estrade, balustrade, braseros, kiosque et tableau (Grande Cour, Parvis). Tant que ce lot
//               n'existe pas, des pièces du kit tiennent leur place, nommées « provisoire » dans le rapport.
//   verifier  : sur le build (`npm run build` avant) : captures 1920 × 1080 à chaque rang et à chaque spot des trois îlots
//               (`?ville=1&qa=1&freeze=1&profondeur=1&ilot=<îlot>`), hauteur du personnage, planche par îlot.
// Usage : npx tsx tools/m09-quartiers-rangs.mjs assembler
//         npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> npx tsx tools/m09-quartiers-rangs.mjs verifier [dossier] [rapport.json]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { P_LAMPS } from '../src/ville/parvis.ts';
import { R_LAMPS } from '../src/ville/ruelles.ts';
import { LAMPES_PARVIS, MEUBLES_PARVIS, PLAN_PARVIS } from '../src/ville/parvisRangs.ts';
import { LAMPES_RUELLES, MEUBLES_RUELLES, PLAN_RUELLES } from '../src/ville/ruellesRangs.ts';
import { ESCALIER, LAMPES_COUR, MEUBLES_COUR, PLAN_COUR } from '../src/ville/grandeCour.ts';

const MODE = process.argv[2];
const head = execSync('git rev-parse --short HEAD').toString().trim();
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const r3 = (x) => Math.round(x * 1000) / 1000;
const report = { date: new Date().toISOString(), commit: head, mode: MODE, checks: [], console: [], provisoire: [] };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const MANIFESTE = 'public/decors/manifest-profondeur.json';

/**
 * Habillage de chaque îlot (m). `rang1` : la façade d'identité au fond du rang 1 (entre `x`, ou de `depuis` sur sa
 * largeur au monde : les maisons du canal partent du bord est du passage, sans maison coupée) ; `coeur` : la façade
 * d'identité au milieu du fond du dernier rang ;
 * `avant` : le premier plan (balustrade de terrasse, ou le canal : le mur et l'eau du Quai) ; `fonds`, `flancs` : frises
 * du kit par rang, en alternance ; `camera` : cadrage du diorama (celui du Quai en rangs, recentré ; la Grande Cour plus
 * haute, ADR 028 C3).
 */
const COMMUN = {
  fonds: { 2: { frise: 'b', lit: 0.35, fog: 0.2, voile: 0 }, 3: { frise: 'a', lit: 0.3, fog: 0.25, voile: 0.06 }, 4: { frise: 'b', lit: 0.3, fog: 0.3, voile: 0.08 } },
  flancs: { 2: { frise: 'a', lit: 0.3, fog: 0.2, voile: 0 }, 3: { frise: 'b', lit: 0.3, fog: 0.25, voile: 0.05 }, 4: { frise: 'a', lit: 0.3, fog: 0.3, voile: 0.1 } },
  rang1: { frise: 'a', lit: 0.35, fog: 0.15, voile: 0 },
  etirement: [0.8, 1.25],
  murs: { lit: 0.35 },
  objets: { niche: 0.7 },
  lampes: { src: [-4.95, -3.05], lanternY: 3.9 },
  villeHaute: { z: -80, largeur: 150, y: 2, v1: 0.88, voile: 0.5, fog: 0.8 },
  brumesLoin: [[120, 12, 0, 18, -52, 0.3, 0.006, [6, 1.2], 2.2], [170, 20, 0, 22, -60, 0.36, 0.005, [5, 1.3], 2.2], [270, 34, 0, 26, -74, 0.36, 0.004, [4, 1.4], 2.2]],
};
const QUARTIERS = {
  parvis: {
    plan: PLAN_PARVIS, meubles: MEUBLES_PARVIS, lampes: [...P_LAMPS, ...LAMPES_PARVIS],
    rang1: { identite: 'parvis-porte', x: [-10.6, 10.6] },
    coeur: { identite: 'parvis-arene', largeur: 30, remplacant: { monument: 'chapelle', largeur: 8 } },
    avant: 'balustrade',
    camera: { pitch: 6, distance: 25, fov: 42, aimY: 4.8, minX: -3, maxX: 3, followZ: 0.9, aimZ: -0.9, pitchFond: 16, zFond: -16 },
  },
  ruelles: {
    plan: PLAN_RUELLES, meubles: MEUBLES_RUELLES, lampes: [...R_LAMPS, ...LAMPES_RUELLES],
    rang1: { identite: 'ruelles-canal', depuis: -6.8, x: [-6.8, 14] },
    coeur: { identite: 'ruelles-guilde', largeur: 14, remplacant: { monument: 'joueurs', largeur: 7 } },
    avant: 'canal',
    camera: { pitch: 6, distance: 25, fov: 42, aimY: 4.8, minX: -3, maxX: 3, followZ: 0.9, aimZ: 0.2, pitchFond: 16, zFond: -12 },
  },
  cour: {
    plan: PLAN_COUR, meubles: MEUBLES_COUR, lampes: LAMPES_COUR,
    rang1: { identite: 'cour-facades', x: [-12.8, 12.8] },
    coeur: { belvedere: true },
    avant: 'balustrade', escalier: ESCALIER,
    camera: { pitch: 15, distance: 26, fov: 42, aimY: 3.6, minX: -6, maxX: 6, followZ: 0.9, aimZ: -3, pitchFond: 18, zFond: -16 },
  },
};
/** Objets du lot des villes et leur remplaçant du kit des rangs tant que le lot n'existe pas (échelle). */
const REMPLACANTS = { brasero: ['niche', 0.6], kiosque: ['etal', 0.7], tableau: ['niche', 0.8], monument: ['fontaine', 1.1], estrade: ['etal', 1.45] };

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
  const prof = JSON.parse(readFileSync(MANIFESTE, 'utf8'));
  const quai = prof.ilots.quai;
  const kit = JSON.parse(readFileSync('art-src/decors/kit-rangs.json', 'utf8'));
  const villes = existsSync('art-src/decors/kit-villes.json') ? JSON.parse(readFileSync('art-src/decors/kit-villes.json', 'utf8')) : null;
  const SRC_KIT = 'gpt-image-2 (kit des quartiers en rangs, ADR 028, passe 66), traité par script (tools/m09-kit-rangs.mjs)';
  const SRC_VILLES = 'gpt-image-2 (lot des villes : Parvis, Ruelles, Grande Cour ; ADR 028, reprise de M09), traité par script (tools/m09-kit-villes.mjs)';
  const plate = (e, source) => {
    const buf = readFileSync(`public/decors/${e.file}`);
    if (sha(buf) !== e.sha256) throw new Error(`${e.file} : empreinte différente de celle du kit (relancer son traitement)`);
    return { file: e.file, sha256: e.sha256, size: e.size, source, fiche: e.fiche, approved: false, orient: 'face', blend: 'decoupe' };
  };
  const kitPlate = (e) => plate(e, SRC_KIT);
  // maisons déjà posées au Quai en rangs (passe 67) : les autres îlots en prennent d'autres d'abord
  const dejaQuai = JSON.parse(readFileSync('artifacts/qa/m09/v4-profondeur-assemblage.json', 'utf8')).morceaux ?? {};
  const browser = await launch();
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  const stripUrl = { rue: dataUrl(readFileSync('public/decors/quai-rue.png')), pied: dataUrl(readFileSync('public/decors/quai-pied-facades.png')) };
  // bandes de la rue et du pied des façades du Quai (manifeste par défaut), dont on découpe lampadaires, caisses, tonneaux
  const pl = JSON.parse(readFileSync('public/decors/manifest.json', 'utf8')).ilots.quai.plans;
  const piece = async (strip, [xa, xb]) => {
    const e = strip === 'rue' ? pl.rue : pl['pied-facades'];
    const m = e.width / e.size[0]; const left = e.at[0] - e.width / 2;
    const [bx0, by0, bx1, by1] = await pg.evaluate(alphaBox, { url: stripUrl[strip], c0: Math.round((xa - left) / m), c1: Math.round((xb - left) / m) });
    return { e, uv: [r3(bx0 / e.size[0]), r3(by0 / e.size[1]), r3(bx1 / e.size[0]), r3(by1 / e.size[1])], width: r3((bx1 - bx0) * m) };
  };
  const lamp = await piece('rue', COMMUN.lampes.src);
  report.morceaux = {};
  const out = {};
  for (const [id, Q] of Object.entries(QUARTIERS)) {
    const plan = Q.plan;
    const plans = {};
    const provisoire = (what) => report.provisoire.push(`${id} : ${what}`);
    const usage = { a: [], b: [] };
    for (const m of Object.values(dejaQuai)) usage[m.frise]?.push([m.de, m.a]);
    const choisir = (frise, W) => {
      const B = kit.frises[frise].maisons; let best = null;
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const span = B[j] - B[i]; const sc = W / span;
        if (sc < COMMUN.etirement[0] || sc > COMMUN.etirement[1]) continue;
        const ov = usage[frise].reduce((s, [u0, u1]) => s + Math.max(0, Math.min(u1, B[j]) - Math.max(u0, B[i])), 0) / span;
        const cost = Math.abs(Math.log(sc)) + 0.6 * ov;
        if (!best || cost < best.cost - 1e-9) best = { s: B[i], e: B[j], sc, cost };
      }
      if (!best) throw new Error(`${id} : frise ${frise} : aucun morceau de maisons entières pour ${W} m`);
      usage[frise].push([best.s, best.e]);
      return best;
    };
    // rang dépassé (passe 65) : au-delà du fond de la bande qui suit le rang n, tout son rang de devant devient fantôme
    const cz = (n) => { const b = plan.bandes[n - 1]; return b ? { coupeZ: r3(b.z0 - 0.3) } : {}; };
    const enFrise = (f, k, key) => {
      const fr = kit.frises[k.frise];
      const W = f.x1 - f.x0;
      const m = choisir(k.frise, W);
      plans[key] = { ...kitPlate(fr), uv: [r3(m.s / fr.largeur), 0, r3(Math.min(1, m.e / fr.largeur)), 1], width: r3(W), at: [r3((f.x0 + f.x1) / 2), 0, f.z], fog: k.fog, lit: k.lit, ...(k.voile ? { voile: k.voile } : {}) };
      report.morceaux[`${id}/${key}`] = { frise: k.frise, de: m.s, a: m.e, etirement: r3(m.sc) };
      return plans[key];
    };
    const monument = (nom) => ({ ...kitPlate(kit.monuments), uv: kit.monuments.panneaux[nom].uv });
    // façade d'identité du lot des villes, ou son remplaçant du kit (provisoire)
    const identite = (nom) => villes?.facades?.[nom] ?? null;
    plans.ciel = { ...quai.plans.ciel };
    const facadeLights = [];
    const last = plan.rangs[plan.rangs.length - 1];
    // fonds et flancs de chaque rang, découpés aux passages et aux places
    const coeurX = Q.coeur.belvedere ? null : (() => {
      const f = identite(Q.coeur.identite); const L = f ? f.largeur : Q.coeur.remplacant.largeur;
      return [-L / 2, L / 2];
    })();
    for (const f of plan.facades) {
      const rang1 = f.rang === 1 && !f.flanc;
      const fondCoeur = f.rang === last.n && !f.flanc && !f.place;
      const key = `${f.flanc ? 'flanc' : f.place ? `fond-${f.place}` : 'fond'}-rang${f.rang}-${Math.round(f.x0)}`;
      const coupe = (f.rang < last.n || f.flanc) ? { coupe: true, ...cz(f.rang) } : {};
      if (rang1) {
        // fond du rang 1 : la façade d'identité entre ses x (ou coupée à ses murs mitoyens) ; frises au-delà
        const R = Q.rang1;
        const parts = [];
        const eR = identite(R.identite);
        const rx = R.depuis !== undefined && eR ? [R.depuis, R.depuis + eR.largeur] : R.x;
        const inner = [Math.max(f.x0, rx[0]), Math.min(f.x1, rx[1])];
        const hasInner = inner[1] - inner[0] > 0.5;
        if (f.x0 < inner[0] - 0.01 || !hasInner) parts.push({ x0: f.x0, x1: hasInner ? inner[0] : f.x1, frise: true });
        if (hasInner) parts.push({ x0: inner[0], x1: inner[1], frise: false });
        if (hasInner && f.x1 > inner[1] + 0.01) parts.push({ x0: inner[1], x1: f.x1, frise: true });
        parts.forEach((p, i) => {
          const k2 = `${key}-${i + 1}`;
          if (p.frise || !identite(R.identite)) {
            if (!p.frise) provisoire(`${k2} : façade du rang 1 en frise du kit, en attendant « ${R.identite} »`);
            enFrise({ ...p, z: f.z }, COMMUN.rang1, k2);
          } else {
            // la façade d'identité entière sur [x0, x1] (son morceau, si le décor la coupe sur un bord)
            const span = rx[1] - rx[0];
            const u0 = (p.x0 - rx[0]) / span; const u1 = (p.x1 - rx[0]) / span;
            plans[k2] = { ...plate(eR, SRC_VILLES), uv: [r3(eR.uv[0] + u0 * (eR.uv[2] - eR.uv[0])), eR.uv[1], r3(eR.uv[0] + u1 * (eR.uv[2] - eR.uv[0])), eR.uv[3]], width: r3(p.x1 - p.x0), at: [r3((p.x0 + p.x1) / 2), 0, f.z], lit: 0.35, fog: 0.15 };
            // lanternes peintes de la façade (rang 1 : leur halo suit le fantôme du rang)
            for (const [lx, ly] of eR.lanternes ?? []) { const x = (rx[0] + rx[1]) / 2 + lx; if (x > p.x0 && x < p.x1) facadeLights.push({ at: [r3(x), r3(ly), r3(f.z + 0.1)], color: 'ambre', intensity: 2.6, radius: 7, halo: 1.0, flicker: 'lantern', ...cz(1) }); }
          }
          Object.assign(plans[k2], coupe);
        });
        continue;
      }
      if (fondCoeur && coeurX && f.x0 < coeurX[1] && f.x1 > coeurX[0]) {
        // fond du cœur : rangée de maisons de part et d'autre du monument d'identité, au milieu
        for (const [a, c, s] of [[f.x0, coeurX[0], 'o'], [coeurX[1], f.x1, 'e']]) if (c - a > 0.5) enFrise({ x0: a, x1: c, z: f.z }, COMMUN.fonds[f.rang] ?? COMMUN.fonds[4], `${key}-${s}`);
        const e = identite(Q.coeur.identite);
        if (e) {
          plans[`coeur-${Q.coeur.identite}`] = { ...plate(e, SRC_VILLES), uv: e.uv, width: e.largeur, at: [0, 0, r3(f.z + 0.05)], lit: 0.3, fog: 0.3 };
          for (const [lx, ly] of (e.lanternes ?? []).slice(0, 2)) facadeLights.push({ at: [r3(lx), r3(ly), r3(f.z + 0.15)], color: 'ambre', intensity: 2.6, radius: 8, halo: 1.0, flicker: 'lantern' });
        }
        else {
          provisoire(`cœur : « ${Q.coeur.remplacant.monument} » du kit en attendant « ${Q.coeur.identite} »`);
          plans[`coeur-${Q.coeur.remplacant.monument}`] = { ...monument(Q.coeur.remplacant.monument), width: Q.coeur.remplacant.largeur, at: [0, 0, r3(f.z + 0.05)], lit: 0.3, fog: 0.3 };
        }
        continue;
      }
      if (fondCoeur && Q.coeur.belvedere) {
        // le Belvédère : une balustrade au bord de la terrasse, la ville haute au-delà
        const b = villes?.objets?.balustrade;
        if (!b) { provisoire('Belvédère : sans balustrade, en attendant « villes-objets »'); continue; }
        const n = Math.max(1, Math.round((f.x1 - f.x0) / (b.largeur * 1.15)));
        for (let i = 0; i < n; i++) {
          const x0 = f.x0 + (i * (f.x1 - f.x0)) / n; const x1 = f.x0 + ((i + 1) * (f.x1 - f.x0)) / n;
          plans[`belvedere-balustrade-${i + 1}`] = { ...plate(villes.objets, SRC_VILLES), uv: b.uv, width: r3(x1 - x0), at: [r3((x0 + x1) / 2), r3(-b.sous * ((x1 - x0) / b.largeur)), f.z], lit: 0.3, fog: 0.3 };
        }
        continue;
      }
      const k = f.flanc ? COMMUN.flancs[f.rang] : COMMUN.fonds[f.rang] ?? COMMUN.fonds[4];
      enFrise(f, k, key);
      Object.assign(plans[key], coupe);
    }
    // la ville haute au loin, au-dessus des toits
    const tr = quai.plans['ville-haute'];
    plans['ville-haute'] = { ...tr, width: COMMUN.villeHaute.largeur, at: [0, COMMUN.villeHaute.y, COMMUN.villeHaute.z] };
    // murs de côté : passages, côtés des places, bouts des ruelles (comme au Quai en rangs)
    const mu = kit.murs; const nWall = {};
    for (const m of plan.murs) {
      const L = m.z1 - m.z0;
      const nom = m.role === 'bout' ? 'pignon' : m.role === 'place' ? 'platre' : m.vers === 'est' ? 'colombages' : 'platre';
      const [u0, v0, u1] = mu.panneaux[nom].uv;
      const frac = Math.min(1, L / mu.longueur) * (u1 - u0);
      const uv = nom === 'pignon' ? [r3((u0 + u1) / 2 - frac / 2), v0, r3((u0 + u1) / 2 + frac / 2), 1] : [r3(u0), v0, r3(Math.min(u1, u0 + frac)), 1];
      const key = `mur-${m.role}-${m.rang}-${(nWall[`${m.role}-${m.rang}`] = (nWall[`${m.role}-${m.rang}`] ?? 0) + 1)}`;
      plans[key] = { ...kitPlate(mu), orient: 'cote', vers: m.vers, uv, at: [m.x, 0, r3((m.z0 + m.z1) / 2)], width: r3(L), lit: COMMUN.murs.lit, ...(m.rang < last.n ? { coupe: true, ...cz(m.rang) } : {}) };
    }
    // mobilier : objets du lot des villes ou du kit des rangs (remplaçants provisoires), morceaux du pied du Quai
    const lanternes = [];
    for (const mb of Q.meubles) {
      if (mb.source === 'kit') {
        let o = kit.mobilier.objets[mb.objet]; let src = kit.mobilier; let s = mb.echelle ?? COMMUN.objets[mb.objet] ?? 1; let SRC = SRC_KIT;
        if (!o) {
          o = villes?.objets?.[mb.objet]; src = villes?.objets; SRC = SRC_VILLES;
          if (!o) {
            const [nom, sc] = REMPLACANTS[mb.objet]; o = kit.mobilier.objets[nom]; src = kit.mobilier; s = sc; SRC = SRC_KIT;
            provisoire(`${mb.id} : « ${nom} » du kit en attendant « ${mb.objet} »`);
          }
        }
        plans[mb.id] = { ...plate(src, SRC), uv: o.uv, width: r3(o.largeur * s), at: [mb.x, 0, mb.z], lit: 0.3 };
        for (const [dx, y, couleur] of o.lanternes ?? []) lanternes.push({ at: [r3(mb.x + dx * s), r3(y * s), r3(mb.z + 0.1)], color: couleur ?? 'ambre', intensity: couleur ? 3.2 : 2.4, radius: 7, halo: 0.9, flicker: couleur ? 'candle' : 'lantern' });
        continue;
      }
      const pcx = await piece(mb.source === 'pied' ? 'pied' : 'rue', mb.src);
      plans[mb.id] = { ...pcx.e, uv: pcx.uv, width: pcx.width, at: [mb.x, 0, mb.z] };
    }
    Q.lampes.forEach((p, i) => { plans[`lampadaire-${i + 1}`] = { ...lamp.e, uv: lamp.uv, width: lamp.width, at: [p.x, 0, p.z] }; });
    // premier plan : le canal (mur et eau du Quai), ou une balustrade de terrasse (ouverte sur l'escalier de la Grande Cour)
    const r1 = plan.rangs[0];
    const brumes = [...COMMUN.brumesLoin];
    if (Q.avant === 'canal') {
      const pp = quai.plans['premier-plan'];
      plans['premier-plan'] = { ...pp, at: [pp.at[0], pp.at[1], r3(r1.z1 + 0.4)] };
      plans.eau = { ...quai.plans.eau, at: [0, quai.plans.eau.at[1], r3(r1.z1 + 16.6)] };
      brumes.push([120, 2, 0, -2.2, r3(r1.z1 + 2.6), 0.22, 0.012, [6, 1]]);
    } else {
      const b = villes?.objets?.balustrade;
      if (!b) {
        provisoire('premier plan : le mur du Quai, en attendant la balustrade de « villes-objets »');
        const pp = quai.plans['premier-plan'];
        plans['premier-plan'] = { ...pp, at: [pp.at[0], pp.at[1], r3(r1.z1 + 0.4)] };
      } else {
        const trous = Q.escalier ? [Q.escalier] : [];
        let n = 0;
        // de 8 m au-delà des bornes de l’îlot (la caméra ne voit pas plus loin au premier plan) ; ouverte sur l'escalier
        const L = Math.max(-r1.x0, r1.x1) + 8;
        for (const [a, c] of [[-L, trous[0]?.[0] ?? L], ...(trous.length ? [[trous[0][1], L]] : [])]) {
          // segments étirés jusqu'à 1,2 fois (64 plans au plus par îlot)
          const k = Math.max(1, Math.round((c - a) / (b.largeur * 1.15)));
          for (let i = 0; i < k; i++) {
            const x0 = a + (i * (c - a)) / k; const x1 = a + ((i + 1) * (c - a)) / k;
            // le sol de la terrasse (pied des balustres) à fleur du sol de l'îlot : la part sous le sol suit l'étirement
            plans[`balustrade-${++n}`] = { ...plate(villes.objets, SRC_VILLES), uv: b.uv, width: r3(x1 - x0), at: [r3((x0 + x1) / 2), r3(-b.sous * ((x1 - x0) / b.largeur)), r3(r1.z1 + 0.35)], lit: 0.3 };
          }
        }
      }
      // sous la terrasse, la ville basse dans la nuit : une nappe sombre et dense juste devant le mur (la caméra haute de
      // la Grande Cour voit sous lui : sans elle, le bas du ciel du fond y faisait une bande claire)
      brumes.push([140, 12, 0, -8, r3(r1.z1 + 0.6), 0.92, 0.003, [4, 1], 0.5]);
    }
    // lumières (16 au plus) : lampadaires, lanternes et feux des objets (debout dans la rue : aucun ne devient fantôme)
    const lumieres = [
      ...Q.lampes.map((p) => ({ at: [p.x, COMMUN.lampes.lanternY, r3(p.z + 0.1)], color: 'ambre', intensity: 3.0, radius: 9, halo: 1.6, flicker: 'lantern' })),
      ...facadeLights.slice(0, 3),
      ...lanternes,
    ].slice(0, 16);
    for (const r of plan.rangs.filter((x) => x.n > 1)) for (const sgn of [-1, 1]) brumes.push([10, 9, r3(sgn > 0 ? r.x1 + 1.5 : r.x0 - 1.5), 3.8, r3((r.z0 + r.z1) / 2), 0.6, 0.004, [2, 1], 1.0]);
    // ordre de dessin d'arrière en avant (contrat : un plan plus lointain n'est jamais dessiné après un plus proche)
    const zKey = (p) => p.at[2] + (p.orient === 'cote' ? p.width / 2 : 0);
    Object.entries(plans).sort((u, v) => zKey(u[1]) - zKey(v[1])).forEach(([k], i) => { plans[k].order = i; });
    out[id] = { plans, lumieres, camera: Q.camera, brumes: brumes.slice(0, 10) };
    const n = Object.keys(plans).length;
    check(n <= 64 && lumieres.length <= 16 && brumes.length <= 10, `${id} en rangs : ${n} plans découpés dans ${new Set(Object.values(plans).map((p) => p.file)).size} images, ${lumieres.length} lumières, ${Math.min(10, brumes.length)} brumes`);
  }
  await browser.close();
  // le Quai reste tel quel ; les trois autres îlots remplacés
  const outAll = { version: 1, ilots: { quai, ...out } };
  writeFileSync(MANIFESTE, `${JSON.stringify(outAll, null, 2)}\n`);
  for (const p of report.provisoire) console.log(`provisoire : ${p}`);
  mkdirSync('artifacts/qa/m09', { recursive: true });
  writeFileSync('artifacts/qa/m09/quartiers-rangs-assemblage.json', `${JSON.stringify(report, null, 2)}\n`);
}

/** Vues des îlots : [clé, x, z, regard, légende]. */
const VUES = {
  parvis: [
    ['parvis', 0, -2.4, 'face', 'Rang 1 : le Parvis, devant la porte du Tournoi'],
    ['rue-gradins', -2, -16, 'face', 'Rang 2 : la rue des Gradins'],
    ['place-paris', 5, -21, 'face', 'Rang 2 : la place des Paris (spot)'],
    ['rue-lices', 0, -29.2, 'face', 'Rang 3 : la rue des Lices'],
    ['placette-tableau', -8, -32.6, 'face', 'Rang 3 : la placette du Tableau (spot)'],
    ['cour-champions', 0, -41, 'face', 'Rang 4 : la cour des Champions (cœur)'],
  ],
  ruelles: [
    ['ruelles', -1.2, 0.8, 'face', 'Rang 1 : les Ruelles, le long du canal'],
    ['ruelle-tanneurs', 0, -12.2, 'face', 'Rang 2 : la ruelle des Tanneurs'],
    ['placette-olivier', 8.6, -15, 'face', 'Rang 2 : la placette de l’Olivier (spot)'],
    ['ruelle-voile', 0, -23.2, 'face', 'Rang 3 : la ruelle du Voile'],
    ['cour-guilde', 0, -35, 'face', 'Rang 4 : la cour de la Guilde (cœur)'],
  ],
  cour: [
    ['cour', 0, 1.8, 'dos', 'La Grande Cour, depuis l’escalier du Quai'],
    ['monument', 0, -1.2, 'dos', 'Devant le monument des Quatre Voies'],
    ['estrade', -7.5, -6.2, 'dos', 'Devant l’estrade des duels'],
    ['belvedere', 0, -22, 'dos', 'Le Belvédère, la ville haute au-delà'],
  ],
};

if (MODE === 'verifier') {
  const DIR = process.argv[3] ?? 'screenshots/qa/m09/quartiers-rangs';
  const OUT = process.argv[4] ?? 'artifacts/qa/m09/quartiers-rangs.json';
  mkdirSync(DIR, { recursive: true });
  const browser = await launch();
  const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4462, process.env.LQV_DIST || 'dist');
  report.figures = {};
  report.decor = {};
  try {
    for (const [id, vues] of Object.entries(VUES)) {
      const pg = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
      pg.setDefaultTimeout(120000);
      watchConsole(pg, report.console);
      await pg.goto(`${srv.base}/?ville=1&qa=1&freeze=1&profondeur=1&ilot=${id}`);
      await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 120000 });
      report.renderer ??= rendererLabel(await webglRenderer(pg));
      const info = await pg.evaluate(() => { const t = window.__lqvVille.town; return { name: t.ilot.name, id: t.ilotId(), dec: t.decorReport() }; });
      report.decor[id] = { loaded: info.dec.loaded, issues: info.dec.issues, gpuMo: Math.round((info.dec.gpuBytes[id] ?? 0) / 1048576 * 10) / 10, images: Object.keys(info.dec.timings).length };
      check(info.id === id && info.dec.loaded.includes(id) && info.dec.issues.length === 0, `${id} : dessiné par son diorama (${report.decor[id].images} images, ${report.decor[id].gpuMo} Mo de mémoire GPU), aucun refus`);
      const shots = [];
      for (const [k, x, z, f, label] of vues) {
        const r = await pg.evaluate(({ x, z, f }) => { const t = window.__lqvVille.town; t.place({ x, z }, f); t.renderNow(); const p = t.walker().pos; const h = t.project({ x: p.x, y: 0, z: p.z }).y - t.project({ x: p.x, y: t.walkerH(), z: p.z }).y; return { pos: p, h }; }, { x, z, f });
        await pg.evaluate(() => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; });
        await pg.waitForTimeout(250);
        const png = await pg.screenshot();
        writeFileSync(join(DIR, `${id}-${k}-1920.png`), png);
        shots.push([png, `${label} : ${Math.round(r.h)} px`]);
        report.figures[`${id}/${k}`] = { at: [r3(r.pos.x), r3(r.pos.z)], figurePx: Math.round(r.h) };
        check(Math.abs(r.pos.x - x) < 0.05 && Math.abs(r.pos.z - z) < 0.05, `${id}/${k} : personnage en (${r3(r.pos.x)}, ${r3(r.pos.z)}), praticable ; ${Math.round(r.h)} px`);
      }
      await pg.context().close();
      // planche de l'îlot : 3 colonnes
      const pp = await (await browser.newContext({ viewport: { width: 2100, height: 1400 }, deviceScaleFactor: 1 })).newPage();
      const planche = await pp.evaluate(async (u) => {
        const im = await Promise.all(u.imgs.map(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; }));
        const pad = 16; const tw = 640; const th = 360; const top = 40; const rows = Math.ceil(im.length / 3);
        const c = document.createElement('canvas'); c.width = 3 * tw + 4 * pad; c.height = top + rows * (th + 36) + 8;
        const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#e8dcc0'; g.font = 'bold 17px system-ui'; g.fillText(u.title, pad, 26); g.font = '14px system-ui';
        im.forEach((i, n) => { const x = pad + (n % 3) * (tw + pad); const y = top + Math.floor(n / 3) * (th + 36); g.drawImage(i, x, y, tw, th); g.fillText(u.labels[n], x, y + th + 22); });
        return c.toDataURL('image/png');
      }, { imgs: shots.map(([p]) => dataUrl(p)), labels: shots.map(([, l]) => l), title: `${info.name} : la ville en rangs (reprise de M09 ; laboratoire ; ${report.provisoire.length ? 'pièces provisoires du kit, ' : ''}rien n’est approuvé)` });
      writeFileSync(join(DIR, `planche-${id}.png`), fromUrl(planche));
      await pp.context().close();
    }
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
