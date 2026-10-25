// Captures comparatives M03.2 : AVANT (runtime M03, build désigné par LQV_BEFORE + LQV_BEFORE_SHA, ex. 0ab0584)
// / APRÈS (build courant) / PREVIEW (document de revue, recadrages seulement — jamais un asset du jeu),
// aux MÊMES seeds, scénarios, tailles d’écran et phases. Mesures sur les captures réelles : luminance
// (table, zone du visage, image entière), hauteur du visage du rival (projection exacte du cadrage),
// taille des cartes de la main, chevauchements de la composition.
// Sortie : screenshots/qa/m03-2/*.png + comparaison-*.png + manifest.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as THREE from 'three';
import { dragTo, launch, startPreview, view, waitDecision, watchConsole } from './browser.mjs';

// M032_ONLY=id1,id2 : sous-ensemble de cas (vérification rapide), écrit dans M032_OUT (jamais dans les preuves).
const ONLY = process.env.M032_ONLY ? process.env.M032_ONLY.split(',') : null;
const OUT = process.env.M032_OUT ?? (ONLY ? 'artifacts/qa/tmp/m03-2-partiel' : 'screenshots/qa/m03-2');
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const BEFORE = process.env.LQV_BEFORE ?? '';
// Commit dont le build « avant » est issu (ex. 0ab0584, parent direct de M03.2), consigné tel quel.
const BEFORE_SHA = process.env.LQV_BEFORE_SHA ?? '?';
const Q = 'qa=1&aiDelay=0&freeze=1';
const manifest = { commit, before: BEFORE ? `runtime M03 — build de ${BEFORE_SHA} (LQV_BEFORE)` : null, date: new Date().toISOString(), note: 'Chromium headless + WebGL logiciel SwiftShader (CPU) ; freeze=1 ; captures réelles.', cases: [], comparisons: [], issues: [] };

const CLASH = (prim, stance, plan) => ({ clash: { prim, stance, plan } });
const CASES = [
  { id: '01-vue-A-1280', vp: [1280, 720], url: `?seed=202&autostart=1&rival=ronce&${Q}&intro=1`, panel: 1, desc: 'Vue A frontale (observation de début de tour)' },
  { id: '01-vue-A-1920', vp: [1920, 1080], url: `?seed=202&autostart=1&rival=ronce&${Q}&intro=1`, panel: 1, desc: 'Vue A frontale, 1920×1080' },
  { id: '02-vue-B-1280', vp: [1280, 720], url: `?seed=202&autostart=1&rival=ronce&${Q}`, act: 'place', panel: 2, desc: 'Vue B inclinée : Primaire posée, choix ASSAUT / GARDE' },
  { id: '03-tactique-1280', vp: [1280, 720], url: `?scenario=interference&${Q}`, act: 'tactics', panel: 5, desc: 'Phase tactique (vue A) : Primaires révélées, Secondaires actives' },
  { id: '04-clash-aa', vp: [1280, 720], url: `?scenario=clash-aa&${Q}`, ...CLASH('Cendre-4', 'assault', null), panel: 3, desc: 'Choc ASSAUT contre ASSAUT (vous dominez), temps « issue »' },
  { id: '05-clash-ag-garde', vp: [1280, 720], url: `?scenario=clash-ag&${Q}`, ...CLASH('Cendre-3', 'assault', null), desc: 'ASSAUT contre GARDE : Garde victorieuse, temps « issue »' },
  { id: '06-clash-ag-absorption', vp: [1280, 720], url: `?scenario=clash-ag&${Q}`, ...CLASH('Cendre-3', 'assault', 'rank'), panel: 4, desc: 'Victoire au Rang, la Garde absorbe 6, 3 blessures (avenant 07), temps « issue »' },
  { id: '07-clash-gg', vp: [1280, 720], url: `?scenario=clash-ag&${Q}`, ...CLASH('Ronce-4', 'guard', null), desc: 'GARDE contre GARDE (neutre), temps « issue »' },
  { id: '08-mobile-portrait', vp: [390, 844], mobile: true, url: `?seed=404&autostart=1&rival=ronce&${Q}&intro=1`, desc: 'Mobile portrait 390×844, vue A' },
  { id: '09-mobile-paysage', vp: [844, 390], mobile: true, url: `?seed=404&autostart=1&rival=ronce&${Q}&intro=1`, panel: 6, desc: 'Mobile paysage 844×390, vue A' },
  { id: '10-paysage-960', vp: [960, 540], mobile: true, url: `?seed=404&autostart=1&rival=ronce&${Q}&intro=1`, desc: 'Petite tablette paysage 960×540, vue A' },
  { id: '11-mobile-paysage-clash', vp: [844, 390], mobile: true, url: `?scenario=clash-ag&${Q}`, ...CLASH('Cendre-3', 'assault', 'rank'), desc: 'Mobile paysage : Clash (absorption), temps « issue »' },
  { id: '12-mobile-portrait-clash', vp: [390, 844], mobile: true, url: `?scenario=clash-ag&${Q}`, ...CLASH('Cendre-3', 'assault', 'rank'), desc: 'Mobile portrait : Clash (absorption), temps « issue »' },
];

// --- Planche d’expressions : 3 rivaux × 6 humeurs imposées (pose QA), même recadrage avant / après -------
// Recadrage fixe (haut-centre de la vue A, 1280×720) : la différence de taille du visage reste visible.
const MOODS = [['confident', 'sûr·e de soi'], ['surprised', 'surpris·e'], ['pained', 'touché·e'], ['annoyed', 'contrarié·e'], ['triumphant', 'triomphant·e'], ['defeated', 'abattu·e']];
const RIVALS = [['braise', 'Kaï · Braise'], ['ronce', 'Maëlle · Ronces'], ['voile', 'Sélène · Voile']];
const FACE_CLIP = { x: 448, y: 0, width: 384, height: 340 };
async function expressions(server, which) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const out = {};
  try {
    for (const [r] of RIVALS) for (const [m] of MOODS) {
      const page = await ctx.newPage();
      watchConsole(page, manifest.issues);
      await page.goto(`${server.base}/?seed=202&autostart=1&rival=${r}&${Q}&intro=1&pose=${m}`);
      await page.waitForFunction(() => !!window.__lqv);
      await page.waitForTimeout(900);
      out[`${r}-${m}`] = (await page.screenshot({ clip: FACE_CLIP })).toString('base64');
      await page.close();
    }
  } finally {
    await ctx.close();
  }
  return out;
}

// --- Hauteur du visage du rival (yeux → menton) : projection exacte du cadrage ancré (arena.frame) -------
const GEOM = {
  avant: { rivalZ: -2.9, neckY: 2.5, scale: 1 },
  apres: { rivalZ: -2.7, neckY: 1.72, scale: 1.34 },
};
function faceHeight(which, anchors, W, H) {
  const g = GEOM[which];
  const pos = new THREE.Vector3(0, 3.15, 8.6);
  const look = new THREE.Vector3(0, 2.45, g.rivalZ);
  const head = new THREE.Vector3(0, g.neckY + 0.6 * g.scale, g.rivalZ);
  const edge = new THREE.Vector3(0, 1.05, -2.35);
  const fwd = new THREE.Vector3().subVectors(look, pos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  const tan = (p) => { const d = new THREE.Vector3().subVectors(p, pos); return d.dot(up) / d.dot(fwd); };
  const yh = anchors.head * H;
  const ye = anchors.edge * H;
  const k = (ye - yh) / (tan(head) - tan(edge));
  const cy = yh + k * tan(head);
  const y = (p) => cy - k * tan(p);
  const eyes = new THREE.Vector3(0, head.y + 0.02 * g.scale, g.rivalZ + 0.02);
  const chin = new THREE.Vector3(0, head.y - 0.51 * g.scale, g.rivalZ + 0.02);
  return Math.round(y(chin) - y(eyes));
}

// --- Analyse d’une capture (dans une page dédiée) : luminance relative moyenne par région --------------
async function analyze(helper, png, regions) {
  return helper.evaluate(async ({ src, regions }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const out = {};
    for (const [name, [x0, y0, x1, y1]] of Object.entries(regions)) {
      const X = Math.round(x0 * c.width), Y = Math.round(y0 * c.height);
      const w = Math.max(1, Math.round((x1 - x0) * c.width)), h = Math.max(1, Math.round((y1 - y0) * c.height));
      const d = g.getImageData(X, Y, w, h).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      out[name] = Number((s / (d.length / 4)).toFixed(4));
    }
    return out;
  }, { src: `data:image/png;base64,${png.toString('base64')}`, regions });
}

/** Textes à lire (boîte visible + couleur calculée) pour la mesure de contraste sur la capture. */
async function textSamples(page) {
  return page.evaluate(() => {
    const out = [];
    const add = (kind, el) => {
      const r = el.getBoundingClientRect();
      const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom);
      if (x1 - x0 < 4 || y1 - y0 < 4) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return;
      const [cr, cg, cb, ca = 1] = cs.color.match(/[\d.]+/g).map(Number);
      out.push({ kind, x: x0, y: y0, w: x1 - x0, h: y1 - y0, rgba: [cr, cg, cb, ca] });
    };
    // Pendant un Clash, ce qui se lit est le verdict et ses conséquences ; les cases sont sous la scène.
    if (document.querySelector('#stage .clash-stage')) {
      document.querySelectorAll('.cs-verdict b').forEach((el) => add('verdict du Clash', el));
      document.querySelectorAll('.cs-bullets li').forEach((el) => add('conséquences du Clash', el));
    } else {
      document.querySelectorAll('.zone > .zone-label').forEach((el) => add('étiquettes de cases', el));
      document.querySelectorAll('.empty-hint').forEach((el) => add('aides des cases', el));
    }
    document.querySelectorAll('.command .msg').forEach((el) => add('texte des commandes', el));
    document.querySelectorAll('.hand .card .name').forEach((el) => add('noms des cartes (main)', el));
    return out;
  });
}

/** Contraste WCAG texte / fond RÉEL : fond = pixel de luminance médiane de la boîte sur la capture
 *  (le texte clair y est minoritaire) ; une couleur de texte semi-transparente est d’abord composée sur
 *  ce fond. Par type : contraste minimal, nombre d’éléments, part ≥ 4,5:1. */
async function contrast(helper, png, items) {
  const ratios = await helper.evaluate(async ({ src, items }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
    return items.map((it) => {
      const d = g.getImageData(Math.round(it.x), Math.round(it.y), Math.max(1, Math.round(it.w)), Math.max(1, Math.round(it.h))).data;
      const px = [];
      for (let i = 0; i < d.length; i += 4) px.push([L(d[i], d[i + 1], d[i + 2]), d[i], d[i + 1], d[i + 2]]);
      px.sort((a, b) => a[0] - b[0]);
      const [bg, br, bgG, bb] = px[Math.floor(px.length / 2)];
      const [r, gg, b, a] = it.rgba;
      const fg = L(a * r + (1 - a) * br, a * gg + (1 - a) * bgG, a * b + (1 - a) * bb);
      return { kind: it.kind, ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) };
    });
  }, { src: `data:image/png;base64,${png.toString('base64')}`, items });
  const out = {};
  for (const r of ratios) {
    const o = (out[r.kind] ??= { min: Infinity, n: 0, aa: 0 });
    o.min = Math.min(o.min, r.ratio);
    o.n++;
    if (r.ratio >= 4.5) o.aa++;
  }
  for (const o of Object.values(out)) o.min = Math.round(o.min * 10) / 10;
  return out;
}

/** Composition : chevauchements main / cases / commandes / HUD, débordement horizontal (comme qa-browser). */
async function layout(page) {
  return page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const boxes = [];
    document.querySelectorAll('.hand .card').forEach((el) => boxes.push(['main', r(el)]));
    document.querySelectorAll('.side .zone').forEach((el) => boxes.push(['case', r(el)]));
    for (const sel of ['.command', '.hud.me', '.hud.opp']) { const el = document.querySelector(sel); if (el) boxes.push([sel, r(el)]); }
    const hit = (a, b) => a.right - 2 > b.left && a.left + 2 < b.right && a.bottom - 2 > b.top && a.top + 2 < b.bottom;
    const issues = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [na, a] = boxes[i];
      const [nb, b] = boxes[j];
      if (na === nb && na !== '.command') continue;
      if (hit(a, b)) issues.push(`${na} / ${nb}`);
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('défilement horizontal');
    const hand = document.querySelector('.hand .card');
    const label = document.querySelector('.zone-label');
    const cs = getComputedStyle(document.getElementById('app'));
    return {
      overlaps: [...new Set(issues)],
      handCardPx: hand ? Math.round(r(hand).height) : null,
      // libellé court des petits écrans : le texte visible est le ::after (le libellé long a une taille 0)
      zoneLabelPx: label ? (parseFloat(getComputedStyle(label).fontSize) || parseFloat(getComputedStyle(label, '::after').fontSize)) : null,
      anchors: { A: { head: parseFloat(cs.getPropertyValue('--a-head')), edge: parseFloat(cs.getPropertyValue('--a-edge')) }, B: { head: parseFloat(cs.getPropertyValue('--b-head')), edge: parseFloat(cs.getPropertyValue('--b-edge')) } },
    };
  });
}

async function drive(page, c) {
  if (c.act === 'place') {
    await waitDecision(page);
    const card = (await view(page)).me.hand.find((x) => x.defId.startsWith('Cendre'));
    await dragTo(page, `[data-key="hand-${card.cardId}"]`, '[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
  } else if (c.act === 'tactics') {
    await waitDecision(page);
    const card = (await view(page)).me.hand.find((x) => x.defId.startsWith('Cendre-4'));
    await page.click(`[data-key="hand-${card.cardId}"]`);
    await page.click('[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
  } else if (c.clash) {
    const { prim, stance, plan } = c.clash;
    const v = await waitDecision(page);
    const card = v.me.hand.find((x) => x.defId === prim || x.defId.startsWith(prim));
    const tap = (sel) => (c.mobile ? page.tap(sel, { timeout: 5000 }) : page.click(sel, { timeout: 5000 }));
    await tap(`[data-key="hand-${card.cardId}"]`);
    await tap('[data-drop="primary"]');
    await tap(`[data-key="stance-${stance}"]`);
    await tap('[data-key="act-commit"]');
    for (let i = 0; i < 6; i++) {
      const w = await waitDecision(page);
      if (w.phase === 'LECTURE') { await tap('[data-key="act-lecture-pass"]'); continue; }
      if (w.phase === 'TACTICS' && w.awaitingMe) {
        if (plan) { await tap('[data-key="zone-me-0"]'); await tap(`[data-key="menu-0-${plan}"]`); }
        await tap('[data-key="act-tactics"]');
        continue;
      }
      break;
    }
  }
}

async function capture(browser, helper, server, which, c) {
  const [w, h] = c.vp;
  const make = () => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!c.mobile && w < h, hasTouch: !!c.mobile });
  let url = c.url;
  if (c.clash) {
    // Repérage du temps « issue » (séquence figée jusqu’au bout), puis capture de ce temps.
    const ctx = await make();
    const page = await ctx.newPage();
    watchConsole(page, manifest.issues);
    await page.goto(`${server.base}/${url}&beat=99`);
    await page.waitForFunction(() => !!window.__lqv);
    const ok = await drive(page, c).then(() => true, () => false);
    await page.waitForTimeout(300);
    const kinds = await page.evaluate(() => window.__lqv.controller.seq?.beats.map((b) => b.kind) ?? []);
    await ctx.close();
    url = `${url}&beat=${ok ? Math.max(0, kinds.indexOf('outcome')) : 0}`;
  }
  const ctx = await make();
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  watchConsole(page, manifest.issues);
  await page.goto(`${server.base}/${url}`);
  await page.waitForFunction(() => !!window.__lqv);
  await page.waitForTimeout(400);
  // Un parcours impossible par l’interface est un CONSTAT (ex. cible recouverte), pas une panne d’outil.
  const driveError = await drive(page, c).then(() => null, (e) => String(e.message).split('\n').find((l) => /intercepts|Timeout/.test(l))?.trim() ?? String(e.message).split('\n')[0]);
  await page.waitForTimeout(c.clash ? 700 : 500);
  const file = `${OUT}/${c.id}-${which}.png`;
  const png = await page.screenshot({ path: file });
  const lay = await layout(page);
  const p = await page.evaluate(() => window.__lqv.presentation());
  const vw = p.view === 'B' ? lay.anchors.B : lay.anchors.A;
  const regions = {
    image: [0, 0, 1, 1],
    table: [0.25, Math.min(0.9, vw.edge + 0.03), 0.75, Math.min(0.95, vw.edge + 0.25)],
    visage: [0.44, Math.max(0, vw.head - 0.06), 0.56, Math.min(1, vw.head + 0.08)],
  };
  const lum = await analyze(helper, png, regions);
  const con = await contrast(helper, png, await textSamples(page));
  await ctx.close();
  return { file, view: p.view, rival: p.rival ? `${p.personality}:${p.rival.mood}` : null, lum, contrast: con, ...lay, faceH: p.view === 'A' ? faceHeight(which, lay.anchors.A, w, h) : null, driveError };
}

const browser = await launch();
const helper = await (await browser.newContext()).newPage();
const serverAfter = await startPreview(4201);
const serverBefore = BEFORE && existsSync(`${BEFORE}/index.html`) ? await startPreview(4202, BEFORE) : null;
const faces = {};
const conLine = (c) => Object.entries(c ?? {}).map(([k, o]) => `${k} ${o.min}:1 (${o.aa}/${o.n} ≥ 4,5)`).join(', ') || '–';
try {
  for (const c of CASES.filter((x) => !ONLY || ONLY.includes(x.id))) {
    const entry = { id: c.id, desc: c.desc, viewport: `${c.vp[0]}×${c.vp[1]}`, url: c.url, panel: c.panel ?? null };
    entry.apres = await capture(browser, helper, serverAfter, 'apres', c);
    if (serverBefore) entry.avant = await capture(browser, helper, serverBefore, 'avant', c);
    manifest.cases.push(entry);
    const f = (x) => (x ? `visage ${x.faceH ?? '–'} px · lum. table ${x.lum.table} / visage ${x.lum.visage} · main ${x.handCardPx ?? '–'} px · contraste min ${conLine(x.contrast)} · chevauchements ${x.overlaps.length}${x.overlaps.length ? ` (${x.overlaps.slice(0, 3).join(', ')})` : ''}${x.driveError ? ` · PARCOURS IMPOSSIBLE : ${x.driveError}` : ''}` : '');
    console.log(`✓ ${c.id} — après : ${f(entry.apres)}${entry.avant ? `\n    avant : ${f(entry.avant)}` : ''}`);
  }
  if (!ONLY) {
    faces.apres = await expressions(serverAfter, 'apres');
    if (serverBefore) faces.avant = await expressions(serverBefore, 'avant');
  }
  if (faces.apres) console.log(`✓ 13-expressions — ${Object.keys(faces.apres).length} poses après${faces.avant ? `, ${Object.keys(faces.avant).length} avant` : ''}`);
} finally {
  serverAfter.stop();
  serverBefore?.stop();
}

// --- Planches : preview (recadrage) | avant | après ---------------------------------------------------
const REF = 'reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg';
const refUrl = `data:image/jpeg;base64,${readFileSync(REF).toString('base64')}`;
const png64 = (f) => (existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : '');
const PANELS = { 1: [0, 0, 908, 516], 2: [906, 0, 766, 516], 3: [0, 516, 798, 292], 4: [796, 516, 876, 292], 5: [0, 806, 1340, 135], 6: [1338, 796, 334, 145] };
const crop = ([x, y, w, h], width) => {
  const k = width / w;
  return `<div style="width:${width}px;height:${Math.round(h * k)}px;background:url(${refUrl}) no-repeat;background-size:${Math.round(1672 * k)}px ${Math.round(941 * k)}px;background-position:-${Math.round(x * k)}px -${Math.round(y * k)}px;border:1px solid #6b5530;border-radius:6px"></div>`;
};
try {
  for (const e of manifest.cases) {
    const portrait = e.viewport === '390×844';
    const colW = portrait ? 300 : 620;
    const fig = (cap, inner) => `<figure style="margin:0"><figcaption style="font-size:12px;color:#b9ae9c;margin-bottom:4px">${cap}</figcaption>${inner}</figure>`;
    const img = (f) => `<img src="${png64(f)}" style="width:${colW}px;border:1px solid #6b5530;border-radius:6px;display:block">`;
    const metric = (x) => (x ? `<div style="font-size:11px;color:#d8cdb8;margin-top:4px">${x.faceH ? `visage ${x.faceH} px · ` : ''}luminance table ${x.lum.table} · visage ${x.lum.visage} · image ${x.lum.image}${x.handCardPx ? ` · carte de main ${x.handCardPx} px` : ''}<br>contraste minimal mesuré : ${conLine(x.contrast)}<br>chevauchements ${x.overlaps.length}${x.overlaps.length ? ` (${x.overlaps.slice(0, 3).join(', ')})` : ''}${x.driveError ? `<br><b style="color:#ff9a7a">Parcours impossible par l’interface : ${x.driveError.replace(/</g, '&lt;').slice(0, 160)}</b>` : ''}</div>` : '');
    const cols = [];
    if (e.panel) cols.push(fig(`Preview validée (document de revue, panneau ${e.panel})`, crop(PANELS[e.panel], portrait ? 300 : 520)));
    if (e.avant) cols.push(fig(`AVANT — runtime M03, build ${BEFORE_SHA} (même seed, même taille, même phase)`, img(e.avant.file) + metric(e.avant)));
    cols.push(fig(`APRÈS — build ${commit} (M03.2)`, img(e.apres.file) + metric(e.apres)));
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0a10;color:#f3ece0;font-family:system-ui;padding:14px">
<h2 style="font-family:Georgia;color:#ffe7b0;margin:0 0 4px;font-size:19px">${e.id} — ${e.desc} (${e.viewport})</h2>
<div style="font-size:12px;color:#b9ae9c;margin-bottom:8px">Captures réelles, Chromium headless + SwiftShader (CPU) ; la preview n’est qu’un document de revue.</div>
<div style="display:flex;gap:12px;align-items:flex-start">${cols.join('')}</div></body>`;
    const page = await browser.newPage({ viewport: { width: 1900, height: 600 } });
    await page.setContent(html);
    await page.waitForTimeout(150);
    const out = `${OUT}/comparaison-${e.id}.png`;
    await page.screenshot({ path: out, fullPage: true });
    await page.close();
    manifest.comparisons.push(out);
  }
  // Planche d’expressions (poses QA de revue, jamais des états de jeu : en duel, les humeurs ne
  // suivent que des faits publics).
  const cell = (b64) => `<img src="data:image/png;base64,${b64}" style="width:192px;height:170px;border:1px solid #4a3f2a;border-radius:6px;display:block">`;
  const rows = [];
  for (const [r, label] of RIVALS) {
    for (const which of ['avant', 'apres']) {
      if (!faces[which]) continue;
      rows.push(`<tr><th style="font-size:12px;color:${which === 'apres' ? '#ffe7b0' : '#9a8f7c'};padding:4px;text-align:right;width:120px">${label}<br>${which === 'apres' ? `APRÈS (${commit})` : `AVANT (${BEFORE_SHA})`}</th>${MOODS.map(([m]) => `<td style="padding:3px">${cell(faces[which][`${r}-${m}`])}</td>`).join('')}</tr>`);
    }
  }
  const sheet = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0a10;color:#f3ece0;font-family:system-ui;padding:14px">
<h2 style="font-family:Georgia;color:#ffe7b0;margin:0 0 4px;font-size:19px">13-expressions — rivaux × humeurs, vue A 1280×720, même recadrage (${FACE_CLIP.width}×${FACE_CLIP.height} px en haut au centre)</h2>
<div style="font-size:12px;color:#b9ae9c;margin-bottom:8px">Humeur imposée par le paramètre QA <code>pose=</code> (revue seulement) ; en duel, le rival ne réagit qu’à des faits publics. Captures réelles, SwiftShader (CPU).</div>
<table style="border-collapse:collapse"><tr><td></td>${MOODS.map(([, l]) => `<th style="font-size:12px;color:#e2c48a;padding:4px">${l}</th>`).join('')}</tr>${rows.join('')}</table></body>`;
  const page = await browser.newPage({ viewport: { width: 1400, height: 600 } });
  await page.setContent(sheet);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/13-expressions.png`, fullPage: true });
  await page.close();
  manifest.comparisons.push(`${OUT}/13-expressions.png`);
} finally {
  await browser.close();
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`${manifest.cases.length} cas · ${manifest.comparisons.length} planches · problèmes console : ${manifest.issues.length}${manifest.issues.length ? `\n${manifest.issues.slice(0, 8).join('\n')}` : ''}`);
if (manifest.issues.length) process.exitCode = 1;
