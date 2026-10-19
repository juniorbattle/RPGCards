/**
 * Lieu « rue » — le Quai, la nuit (M08 C2, ADR 022 ; porte de validation, cadrage validé par le responsable le
 * 2026-10-18). Mise en scène de théâtre de rue, la scène entière plutôt que les petits objets :
 *
 * - Toile de fond : le bout de la rue s’ouvre sur le port (eau, bateaux à quai et leurs mâts, rive d’en face et son
 *   phare, lune voilée, toits lointains), peinte une fois, floutée et voilée comme celle de la salle.
 * - Châssis : deux façades de maisons du quai qui fuient vers le port de part et d’autre du rival (boutiques, fenêtres
 *   chaudes allumées, toits et cheminées découpés sur le ciel) ; lanternes murales sur potence ; enseigne qui se balance.
 * - Deux guirlandes de lanternes tendues au-dessus de la rue (elles justifient le projecteur de table) ; deux
 *   lanternes-tempête aux coins lointains de la table (à la place des bougies) ; caisses, tonneaux, bittes d’amarrage.
 * - Pavés mouillés qui accrochent les lanternes ; bancs de brume froide qui dérivent ; papillons de nuit.
 * - Plan de feux : clair de lune froid (ambiance), projecteurs du visage et de la table chauds, quatre lanternes
 *   (lumières pratiques) ; brume bleu nuit. L’étalonnage de la finition (ombres froides, hautes lumières ambrées) fait
 *   la palette « nuit de port ».
 *
 * Gréement, caméra, table, rival : ceux de l’arène (ADR 022). Tout est peint par code, graine d’art.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FAMILIES } from '../../game/catalog/cards';
import { hashString, makeRng } from '../../game/engine/rng';
import { drawEmblem } from '../../art/emblems';
import { FAMILY_PALETTE } from '../../art/palette';
import { TABLE_TOP } from '../world';
import { canvas, disposeTree, flameTexture, haloTexture, lightPoints, texture, tickLightPoints, type Ctx2, type LightPoint } from './common';
import type { VenueDef, VenueSet } from './types';

/** Toile de fond (44 × 22 unités, centrée en y 7,2, z −13) : y monde → ordonnée du canvas. */
const BW = 2048;
const BH = 1024;
const by = (y: number) => ((18.2 - y) * BH) / 22;
const bx = (x: number) => ((x + 22) * BW) / 44;

/** Façades : plan de 12 × 6,4 unités le long de la rue (z −2,6 → −14,6), du sol au-dessus des toits ; la rue fait
 *  10 unités de large : ses maisons occupent les deux zones de décor que laissent les HUD (entre eux et la table). */
const FAC_LEN = 12;
const FAC_H = 6.4;
const FAC_X = 5.3;
const FAC_Z = -8.6;
/** Les façades s’ouvrent un peu vers la salle (comme des châssis de coulisse) : on lit leurs devantures au lieu de les
 *  voir de profil, et la rue se resserre vers le port. */
const FAC_TILT = 0.16;
/** Distance au milieu de la rue du nu de la façade, à la profondeur z. */
const wallX = (z: number) => FAC_X + (z - FAC_Z) * Math.tan(FAC_TILT);
const FW = 1280;
const FH = 640;

function rueBackdropTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(BW, BH);
  const rng = makeRng(hashString(`rue-backdrop|${seed}`));
  // Ciel de nuit : bleu profond en haut, lueur froide du port à l’horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, by(1.8));
  sky.addColorStop(0, '#02040b');
  sky.addColorStop(0.45, '#071228');
  sky.addColorStop(0.8, '#11243f');
  sky.addColorStop(1, '#1f3a55');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BW, BH);
  for (let i = 0; i < 520; i++) {
    const x = rng() * BW;
    const y = rng() * by(3.2);
    const r = rng() < 0.95 ? 0.6 + rng() * 0.9 : 1.4 + rng() * 1.2;
    ctx.fillStyle = `rgba(${215 + Math.floor(rng() * 40)},${225 + Math.floor(rng() * 30)},255,${0.25 + rng() * 0.55})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lune voilée, basse au-dessus du port, à droite de la tête du rival (le visage reste le point le plus lumineux :
  // rapport de luminance visage / fond ≥ 6 dans la zone de repère de M07 L3, à gauche de la tête).
  const mx = bx(3.7);
  const my = by(4.7);
  const glow = ctx.createRadialGradient(mx, my, 8, mx, my, 190);
  glow.addColorStop(0, 'rgba(200,220,255,0.38)');
  glow.addColorStop(0.3, 'rgba(120,160,220,0.11)');
  glow.addColorStop(1, 'rgba(60,90,160,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, BW, BH);
  ctx.fillStyle = '#e8eefc';
  ctx.beginPath(); ctx.arc(mx, my, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,170,210,0.35)';
  ctx.beginPath(); ctx.arc(mx + 7, my - 4, 7, 0, Math.PI * 2); ctx.arc(mx - 8, my + 6, 5, 0, Math.PI * 2); ctx.fill();
  // Nuages bas étirés, éclairés par la lune.
  for (let i = 0; i < 14; i++) {
    const cx = rng() * BW;
    const cy = by(4.2 + rng() * 2.6);
    const w = 160 + rng() * 320;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w);
    g.addColorStop(0, 'rgba(70,95,140,0.16)');
    g.addColorStop(1, 'rgba(70,95,140,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.16); ctx.translate(-cx, -cy);
    ctx.fillStyle = g; ctx.fillRect(cx - w, cy - w, 2 * w, 2 * w);
    ctx.restore();
  }
  // Rive d’en face : toits bas, phare, petites lumières.
  const shoreTop = by(2.2);
  const horizon = by(1.75);
  ctx.fillStyle = '#0b1424';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let x = 0; x <= BW; x += 18 + rng() * 26) ctx.lineTo(x, shoreTop + (rng() - 0.3) * 18);
  ctx.lineTo(BW, horizon);
  ctx.closePath();
  ctx.fill();
  const lx = bx(-2.1);
  ctx.fillStyle = '#0d1729';
  ctx.beginPath(); ctx.moveTo(lx - 9, horizon); ctx.lineTo(lx - 5, by(3.3)); ctx.lineTo(lx + 5, by(3.3)); ctx.lineTo(lx + 9, horizon); ctx.closePath(); ctx.fill();
  ctx.fillRect(lx - 8, by(3.45), 16, 8);
  const beam = ctx.createRadialGradient(lx, by(3.4), 1, lx, by(3.4), 70);
  beam.addColorStop(0, 'rgba(255,236,190,0.95)');
  beam.addColorStop(0.15, 'rgba(255,214,150,0.4)');
  beam.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = beam;
  ctx.fillRect(lx - 70, by(3.4) - 70, 140, 140);
  const shoreLights: number[] = [];
  for (let i = 0; i < 46; i++) {
    const x = rng() * BW;
    shoreLights.push(x);
    ctx.fillStyle = `rgba(255,${180 + Math.floor(rng() * 50)},${100 + Math.floor(rng() * 60)},${0.5 + rng() * 0.5})`;
    ctx.fillRect(x, shoreTop + 8 + rng() * (horizon - shoreTop - 12), 2, 2);
  }
  // Eau du port : bandes de reflets, colonne de lune, traînées chaudes des lumières.
  const quay = by(0.75);
  const water = ctx.createLinearGradient(0, horizon, 0, quay);
  water.addColorStop(0, '#13263d');
  water.addColorStop(1, '#070d18');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, BW, quay - horizon);
  for (let i = 0; i < 160; i++) {
    const y = horizon + rng() * (quay - horizon);
    const x = rng() * BW;
    ctx.fillStyle = `rgba(110,150,200,${0.08 + rng() * 0.14})`;
    ctx.fillRect(x, y, 20 + rng() * 70, 1.5);
  }
  for (let y = horizon + 2; y < quay; y += 3) {
    const w = 10 + (y - horizon) * 0.5;
    ctx.fillStyle = `rgba(210,225,255,${0.14 + rng() * 0.22})`;
    ctx.fillRect(mx - w / 2 + (rng() - 0.5) * w, y, w * (0.3 + rng() * 0.5), 1.5);
  }
  for (const x of [...shoreLights.slice(0, 18), lx]) {
    for (let y = horizon + 2; y < horizon + 34; y += 3) {
      ctx.fillStyle = `rgba(255,190,110,${0.1 + rng() * 0.15})`;
      ctx.fillRect(x - 2 + (rng() - 0.5) * 4, y, 4, 1.5);
    }
  }
  // Bateaux à quai : coques, mâts, gréements, fanal.
  for (const [x, w, mast] of [[-3.1, 2.6, 8.4], [2.7, 3.0, 9.2], [-0.2, 1.8, 6.4]] as const) {
    const x0 = bx(x - w / 2);
    const x1 = bx(x + w / 2);
    const top = by(1.25);
    ctx.fillStyle = '#060a12';
    ctx.beginPath();
    ctx.moveTo(x0, top); ctx.lineTo(x1 + 14, top - 6); ctx.lineTo(x1 - 10, by(0.7)); ctx.lineTo(x0 + 14, by(0.7)); ctx.closePath();
    ctx.fill();
    const m = bx(x);
    ctx.strokeStyle = '#070b14';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(m, top); ctx.lineTo(m, by(mast)); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(m - 40, by(mast * 0.62)); ctx.lineTo(m + 50, by(mast * 0.62)); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(12,18,30,0.9)';
    ctx.beginPath(); ctx.moveTo(m, by(mast)); ctx.lineTo(x0 - 10, top); ctx.moveTo(m, by(mast)); ctx.lineTo(x1 + 10, top - 4); ctx.stroke();
    const f = ctx.createRadialGradient(m + 6, by(mast * 0.62) - 6, 0, m + 6, by(mast * 0.62) - 6, 26);
    f.addColorStop(0, 'rgba(255,214,140,0.9)');
    f.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = f;
    ctx.fillRect(m - 20, by(mast * 0.62) - 32, 52, 52);
  }
  // Grue du port, en silhouette au-dessus des toits (à gauche).
  {
    const gx = bx(-7.6);
    ctx.strokeStyle = '#05080f';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(gx, by(0.5)); ctx.lineTo(gx, by(8.6)); ctx.lineTo(gx + 420, by(8.1)); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx, by(9.6)); ctx.lineTo(gx + 420, by(8.1)); ctx.moveTo(gx, by(9.6)); ctx.lineTo(gx - 120, by(8.4)); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx + 330, by(8.15)); ctx.lineTo(gx + 330, by(6.3)); ctx.stroke();
    for (let y = 1.2; y < 8.4; y += 0.75) { ctx.beginPath(); ctx.moveTo(gx - 6, by(y)); ctx.lineTo(gx + 6, by(y + 0.6)); ctx.stroke(); }
  }
  // Quai de pierre au premier plan de la toile (le sol 3D le recouvre plus bas).
  ctx.fillStyle = '#10131a';
  ctx.fillRect(0, quay, BW, BH - quay);
  ctx.fillStyle = '#1b2029';
  ctx.fillRect(0, quay - 6, BW, 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  for (let y = quay + 14; y < BH; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(BW, y); ctx.stroke(); }
  // Caisses et bittes d’amarrage sur le quai lointain.
  for (const [x, w, h] of [[-4.6, 0.9, 0.8], [-3.9, 0.7, 1.3], [4.4, 1.1, 0.9], [5.2, 0.6, 0.6]] as const) {
    ctx.fillStyle = '#0a0d13';
    ctx.fillRect(bx(x), by(0.75 + h), bx(x + w) - bx(x), by(0.75) - by(0.75 + h));
    ctx.strokeStyle = 'rgba(70,90,120,0.25)';
    ctx.strokeRect(bx(x) + 3, by(0.75 + h) + 3, bx(x + w) - bx(x) - 6, by(0.75) - by(0.75 + h) - 6);
  }
  // Toits lointains de la rue, au-dessus des façades (de chaque côté de l’ouverture sur le port).
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#060912';
    ctx.beginPath();
    const xa = side < 0 ? 0 : bx(4.6);
    const xb = side < 0 ? bx(-4.6) : BW;
    ctx.moveTo(xa, BH);
    let x = xa;
    while (x < xb) {
      const w = 60 + rng() * 120;
      const h = by(5.6 + rng() * 2.2);
      ctx.lineTo(x, h);
      if (rng() < 0.5) { ctx.lineTo(x + w * 0.5, h - 26 - rng() * 30); }
      ctx.lineTo(x + w, h);
      if (rng() < 0.6) { const cx = x + w * (0.2 + rng() * 0.5); ctx.lineTo(cx, h); ctx.lineTo(cx, h - 34); ctx.lineTo(cx + 16, h - 34); ctx.lineTo(cx + 16, h); }
      x += w;
    }
    ctx.lineTo(xb, BH);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(255,${170 + Math.floor(rng() * 50)},90,${0.35 + rng() * 0.4})`;
      ctx.fillRect(xa + rng() * (xb - xa), by(4.8 + rng() * 0.9), 5, 7);
    }
  }
  // Perspective atmosphérique (comme la salle, une fois dans la texture) : flou de profondeur, brume froide du
  // port au ras de l’eau, côtés dans l’ombre.
  const sharp = canvas(BW, BH);
  sharp.ctx.drawImage(c, 0, 0);
  ctx.clearRect(0, 0, BW, BH);
  ctx.filter = 'blur(2.5px)';
  ctx.drawImage(sharp.c, 0, 0);
  ctx.filter = 'none';
  const mist = ctx.createLinearGradient(0, by(4), 0, by(0));
  mist.addColorStop(0, 'rgba(40,66,96,0)');
  mist.addColorStop(0.6, 'rgba(46,74,104,0.32)');
  mist.addColorStop(1, 'rgba(20,32,48,0.2)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, by(4), BW, by(0) - by(4));
  const sides = ctx.createLinearGradient(0, 0, BW, 0);
  sides.addColorStop(0, 'rgba(3,4,8,0.6)');
  sides.addColorStop(0.3, 'rgba(3,4,8,0)');
  sides.addColorStop(0.7, 'rgba(3,4,8,0)');
  sides.addColorStop(1, 'rgba(3,4,8,0.6)');
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, BW, BH);
  return texture(c, 2);
}

interface House { x: number; w: number; roof: number; wall: string; trim: string; lit: [boolean, boolean, boolean] }

/** Rangée de quatre maisons du quai (canvas FW × FH = 12 × 6,4 unités, du sol aux cheminées), raccordable en x. */
function facadeTextures(seed: number): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const { c, ctx } = canvas(FW, FH);
  const glow = canvas(FW / 4, FH / 4);
  const rng = makeRng(hashString(`rue-facade|${seed}`));
  const ux = FW / FAC_LEN;
  const uy = FH / FAC_H;
  const Y = (y: number) => FH - y * uy;
  const houses: House[] = [
    { x: 0, w: 3.2, roof: 5.3, wall: '#5a4a3c', trim: '#2c221b', lit: [false, false, false] },
    { x: 3.2, w: 2.7, roof: 5.9, wall: '#4a5260', trim: '#23272f', lit: [false, true, false] },
    { x: 5.9, w: 3.3, roof: 4.9, wall: '#64503a', trim: '#2e2219', lit: [false, false, false] },
    { x: 9.2, w: 2.8, roof: 5.6, wall: '#46423f', trim: '#1f1c1a', lit: [true, false, true] },
  ];
  const window = (x: number, y: number, w: number, h: number, lit: boolean, shutters: boolean) => {
    const X = x * ux;
    const W = w * ux;
    const T = Y(y + h);
    const H = h * uy;
    ctx.fillStyle = '#15110d';
    ctx.fillRect(X - 4, T - 4, W + 8, H + 8);
    if (lit) {
      // intérieur chaud, plus clair au centre ; rideaux tirés sur les côtés ; silhouettes d’objets sur l’appui
      const g = ctx.createRadialGradient(X + W / 2, T + H * 0.45, 2, X + W / 2, T + H * 0.45, Math.max(W, H) * 0.7);
      g.addColorStop(0, '#b88a58');
      g.addColorStop(1, '#4e2c17');
      ctx.fillStyle = g;
      ctx.fillRect(X, T, W, H);
      ctx.fillStyle = 'rgba(58,22,16,0.85)';
      ctx.beginPath(); ctx.moveTo(X, T); ctx.lineTo(X + W * 0.28, T); ctx.quadraticCurveTo(X + W * 0.12, T + H * 0.5, X + W * 0.2, T + H); ctx.lineTo(X, T + H); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(X + W, T); ctx.lineTo(X + W * 0.72, T); ctx.quadraticCurveTo(X + W * 0.88, T + H * 0.5, X + W * 0.8, T + H); ctx.lineTo(X + W, T + H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(40,20,12,0.8)';
      for (let k = 0; k < 3; k++) ctx.fillRect(X + W * (0.35 + k * 0.1), T + H * (0.72 - (k % 2) * 0.08), W * 0.05, H * (0.28 + (k % 2) * 0.08));
      const q = glow.ctx;
      q.fillStyle = 'rgba(255,184,104,0.45)';
      q.fillRect((X + W * 0.25) / 4, T / 4, (W * 0.5) / 4, H / 4);
    } else {
      const g = ctx.createLinearGradient(0, T, 0, T + H);
      g.addColorStop(0, '#2b3a52');
      g.addColorStop(1, '#141c2a');
      ctx.fillStyle = g;
      ctx.fillRect(X, T, W, H);
    }
    // petits carreaux : meneaux et traverses
    ctx.strokeStyle = lit ? 'rgba(46,22,8,0.95)' : 'rgba(10,12,18,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let k = 1; k < (W > 100 ? 3 : 2); k++) { ctx.moveTo(X + (W * k) / (W > 100 ? 3 : 2), T); ctx.lineTo(X + (W * k) / (W > 100 ? 3 : 2), T + H); }
    for (let k = 1; k < 3; k++) { ctx.moveTo(X, T + (H * k) / 3); ctx.lineTo(X + W, T + (H * k) / 3); }
    ctx.stroke();
    if (shutters) {
      ctx.fillStyle = 'rgba(40,58,62,0.95)';
      ctx.fillRect(X - 4 - W * 0.42, T - 2, W * 0.4, H + 4);
      ctx.fillRect(X + W + 4 + W * 0.02, T - 2, W * 0.4, H + 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) {
        const yy = T + (k + 0.5) * (H / 6);
        ctx.beginPath(); ctx.moveTo(X - 4 - W * 0.42, yy); ctx.lineTo(X - 4 - W * 0.02, yy); ctx.moveTo(X + W + 4 + W * 0.02, yy); ctx.lineTo(X + W + 4 + W * 0.42, yy); ctx.stroke();
      }
    }
    // appui de fenêtre
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(X - 8, T + H + 4, W + 16, 6);
  };
  for (const hs of houses) {
    const X0 = hs.x * ux;
    const X1 = (hs.x + hs.w) * ux;
    // mur
    const g = ctx.createLinearGradient(0, Y(hs.roof), 0, FH);
    g.addColorStop(0, hs.wall);
    g.addColorStop(1, '#1d1814');
    ctx.fillStyle = g;
    ctx.fillRect(X0, Y(hs.roof), X1 - X0, FH - Y(hs.roof));
    // grain du crépi, taches d’humidité
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,230,200,0.035)';
      ctx.fillRect(X0 + rng() * (X1 - X0), Y(hs.roof) + rng() * (FH - Y(hs.roof)), 8 + rng() * 30, 3 + rng() * 10);
    }
    const damp = ctx.createLinearGradient(0, Y(1.4), 0, FH);
    damp.addColorStop(0, 'rgba(10,12,16,0)');
    damp.addColorStop(1, 'rgba(10,12,16,0.55)');
    ctx.fillStyle = damp;
    ctx.fillRect(X0, Y(1.4), X1 - X0, Y(0) - Y(1.4));
    // corniche et bandeau d’étage
    ctx.fillStyle = hs.trim;
    ctx.fillRect(X0, Y(hs.roof) - 2, X1 - X0, 16);
    ctx.fillRect(X0, Y(2.85), X1 - X0, 10);
    // soubassement de pierre
    ctx.fillStyle = '#24262b';
    ctx.fillRect(X0, Y(0.42), X1 - X0, 0.42 * uy);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let x = X0; x < X1; x += 46) ctx.strokeRect(x, Y(0.42), 46, 0.42 * uy);
    // toit : bord de tuiles et cheminée découpés sur le ciel
    ctx.fillStyle = '#17120f';
    ctx.beginPath();
    ctx.moveTo(X0 - 6, Y(hs.roof) + 4);
    ctx.lineTo(X0 + 20, Y(hs.roof + 0.42));
    ctx.lineTo(X1 - 20, Y(hs.roof + 0.42));
    ctx.lineTo(X1 + 6, Y(hs.roof) + 4);
    ctx.closePath();
    ctx.fill();
    const chx = X0 + (X1 - X0) * (0.25 + rng() * 0.5);
    ctx.fillRect(chx, Y(hs.roof + 0.95), 0.32 * ux, 0.6 * uy);
    ctx.fillStyle = '#2a201a';
    ctx.fillRect(chx - 4, Y(hs.roof + 0.98), 0.32 * ux + 8, 10);
    // rez-de-chaussée : porte et vitrine de boutique
    const mid = hs.x + hs.w / 2;
    const doorX = hs.x + hs.w * (rng() < 0.5 ? 0.18 : 0.62);
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(doorX * ux, Y(2.25), 0.85 * ux, 2.25 * uy - 0.42 * uy);
    ctx.strokeStyle = 'rgba(120,90,60,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(doorX * ux + 8, Y(2.1), 0.85 * ux - 16, 1.5 * uy);
    const shopX = doorX < mid ? doorX + 1.05 : hs.x + 0.3;
    window(shopX, 0.8, 1.05, 1.1, hs.lit[0], false);
    // étage : deux fenêtres à volets
    window(hs.x + hs.w * 0.22, 3.3, 0.5, 0.85, hs.lit[1], true);
    window(hs.x + hs.w * 0.64, 3.3, 0.5, 0.85, hs.lit[2], true);
    // descente d’eau entre deux maisons
    ctx.fillStyle = '#121418';
    ctx.fillRect(X1 - 7, Y(hs.roof), 7, FH - Y(hs.roof));
  }
  // halo doux des vitres allumées (texture d’émission floutée)
  const g2 = canvas(FW / 4, FH / 4);
  g2.ctx.filter = 'blur(2px)';
  g2.ctx.drawImage(glow.c, 0, 0);
  g2.ctx.filter = 'none';
  g2.ctx.drawImage(glow.c, 0, 0);
  const map = texture(c, 4);
  map.wrapS = THREE.RepeatWrapping;
  const gt = texture(g2.c, 1);
  gt.wrapS = THREE.RepeatWrapping;
  return { map, glow: gt };
}

/** Pavés mouillés : pierres arrondies bleu-gris, joints sombres, reflets froids, flaques. */
function cobbleTexture(seed: number): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(hashString(`rue-pave|${seed}`));
  ctx.fillStyle = '#08090c';
  ctx.fillRect(0, 0, S, S);
  const rows = 16;
  const h = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -h * 0.5 : 0;
    while (x < S) {
      const w = h * (0.9 + rng() * 0.5);
      const l = 26 + Math.floor(rng() * 18);
      ctx.fillStyle = `rgb(${l},${l + 3},${l + 9})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, r * h + 2, w - 4, h - 4, 6);
      ctx.fill();
      ctx.fillStyle = `rgba(150,175,215,${0.05 + rng() * 0.08})`;
      ctx.fillRect(x + 6, r * h + 4, w - 12, 3);
      x += w;
    }
  }
  for (let i = 0; i < 7; i++) {
    const px = rng() * S;
    const py = rng() * S;
    const pr = 30 + rng() * 60;
    ctx.save(); ctx.translate(px, py); ctx.scale(1.8, 0.7);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, pr);
    g.addColorStop(0, 'rgba(10,16,26,0.75)');
    g.addColorStop(0.7, 'rgba(14,22,36,0.5)');
    g.addColorStop(1, 'rgba(14,22,36,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-pr, -pr, 2 * pr, 2 * pr);
    ctx.restore();
  }
  const t = texture(c, 8);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 8);
  return t;
}

/** Banc de brume : volutes douces, raccordables en x (dérive par décalage de texture). */
function mistTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(512, 128);
  const rng = makeRng(hashString(`rue-brume|${seed}`));
  for (let i = 0; i < 38; i++) {
    const x = rng() * 512;
    const y = 40 + rng() * 60;
    const r = 30 + rng() * 60;
    for (const dx of [-512, 0, 512]) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, 'rgba(120,150,190,0.2)');
      g.addColorStop(1, 'rgba(120,150,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y - r, 2 * r, 2 * r);
    }
  }
  const fade = ctx.createLinearGradient(0, 0, 0, 128);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.35, 'rgba(0,0,0,0)');
  fade.addColorStop(0.85, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 512, 128);
  const t = texture(c, 1);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Enseigne de la taverne de cartes : planche, liseré doré, deux cartes croisées frappées des quatre emblèmes. */
function signTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 160);
  ctx.fillStyle = '#3a2416';
  ctx.beginPath(); ctx.roundRect(4, 4, 248, 152, 14); ctx.fill();
  ctx.strokeStyle = '#c9a25e';
  ctx.lineWidth = 5;
  ctx.stroke();
  for (const [a, x] of [[-0.25, 108], [0.25, 148]] as const) {
    ctx.save(); ctx.translate(x, 82); ctx.rotate(a);
    ctx.fillStyle = '#e9dcc0';
    ctx.beginPath(); ctx.roundRect(-30, -46, 60, 92, 7); ctx.fill();
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  FAMILIES.forEach((f, i) => {
    ctx.fillStyle = FAMILY_PALETTE[f].hex === undefined ? '#333' : `#${FAMILY_PALETTE[f].hex.toString(16).padStart(6, '0')}`;
    drawEmblem(ctx, f, 128 + (i % 2 ? 16 : -16), 66 + (i > 1 ? 32 : 0), 11);
  });
  return texture(c, 2);
}

/** Lanterne-tempête unitaire (base au sol) : socle, chapeau conique, anse ; le verre est à part. */
function lanternFrameGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.12, 0.13, 0.05, 10).translate(0, 0.025, 0);
  const cap = new THREE.ConeGeometry(0.14, 0.11, 10).translate(0, 0.355, 0);
  const ring = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10).translate(0, 0.3, 0);
  const handle = new THREE.TorusGeometry(0.07, 0.012, 6, 12, Math.PI).translate(0, 0.41, 0);
  const posts = [0, 1, 2, 3].map((k) => new THREE.CylinderGeometry(0.008, 0.008, 0.26, 4).translate(Math.cos((k * Math.PI) / 2 + 0.6) * 0.105, 0.17, Math.sin((k * Math.PI) / 2 + 0.6) * 0.105));
  const g = mergeGeometries([base, cap, ring, handle, ...posts].map((x) => x.toNonIndexed()))!;
  return g;
}

interface LanternSpot { x: number; y: number; z: number; s: number }

function mountRue({ artSeed }: { artSeed: number }): VenueSet {
  const group = new THREE.Group();
  const rng = makeRng(hashString(`rue|${artSeed}`));

  // --- Toile de fond et sol
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: rueBackdropTexture(artSeed), fog: false }));
  backdrop.position.set(0, 7.2, -13);
  group.add(backdrop);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: cobbleTexture(artSeed), roughness: 0.38, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2);
  group.add(floor);

  // --- Façades (châssis) : la même rangée de maisons de chaque côté, décalée d’une maison et demie à droite.
  const fac = facadeTextures(artSeed);
  const facMat = new THREE.MeshStandardMaterial({ map: fac.map, emissiveMap: fac.glow, emissive: new THREE.Color(0xffb46a), emissiveIntensity: 0.32, roughness: 0.92, transparent: false, alphaTest: 0.5 });
  const wall = (side: -1 | 1) => {
    const geo = new THREE.PlaneGeometry(FAC_LEN, FAC_H);
    const uv = geo.attributes.uv!;
    for (let i = 0; i < uv.count; i++) uv.setX(i, side < 0 ? uv.getX(i) : 1.375 - uv.getX(i));
    const m = new THREE.Mesh(geo, facMat);
    m.rotation.y = side < 0 ? Math.PI / 2 - FAC_TILT : -(Math.PI / 2 - FAC_TILT);
    m.position.set(side * FAC_X, FAC_H / 2, FAC_Z);
    return m;
  };
  group.add(wall(-1), wall(1));

  // --- Ferronnerie (potences des lanternes et de l’enseigne, bittes d’amarrage) et accessoires du quai, fusionnés.
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.55, metalness: 0.6 });
  const wallLanterns: LanternSpot[] = [{ x: -4.3, y: 2.6, z: -8.2, s: 1.8 }, { x: 4.3, y: 2.6, z: -9.0, s: 1.8 }];
  const tableLanterns: LanternSpot[] = [{ x: -3.7, y: TABLE_TOP, z: -1.75, s: 1 }, { x: 3.7, y: TABLE_TOP, z: -1.75, s: 1 }];
  const ironParts: THREE.BufferGeometry[] = [];
  for (const l of wallLanterns) {
    const side = Math.sign(l.x);
    ironParts.push(new THREE.BoxGeometry(wallX(l.z) - Math.abs(l.x) + 0.1, 0.05, 0.05).translate(side * (wallX(l.z) + Math.abs(l.x)) / 2, l.y + 0.42 * l.s + 0.18, l.z));
    ironParts.push(new THREE.BoxGeometry(0.03, 0.2, 0.03).translate(l.x, l.y + 0.42 * l.s + 0.08, l.z));
  }
  ironParts.push(new THREE.BoxGeometry(1.1, 0.05, 0.05).translate(wallX(-11.4) - 0.55, 3.55, -11.4));
  for (const [x, z] of [[-3.6, -11.2], [3.9, -11.9], [-1.4, -12.3]] as const) {
    ironParts.push(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 10).translate(x, 0.275, z));
    ironParts.push(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10).translate(x, 0.58, z));
  }
  group.add(new THREE.Mesh(mergeGeometries(ironParts.map((g) => g.toNonIndexed()))!, iron));
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1d, roughness: 0.85 });
  const crates: THREE.BufferGeometry[] = [];
  for (const [x, y, z, s, a] of [[-4.3, 0, -3.9, 0.85, 0.2], [-4.25, 0.85, -4.0, 0.62, -0.3], [-3.6, 0, -4.8, 0.7, 0.5], [4.35, 0, -9.0, 0.9, -0.15], [4.4, 0.9, -8.9, 0.6, 0.4]] as const) {
    crates.push(new THREE.BoxGeometry(s, s, s).rotateY(a).translate(x, y + s / 2, z));
  }
  for (const [x, z, a] of [[3.95, -4.3, 0], [4.45, -5.0, 0.6], [-4.45, -8.2, 0.3]] as const) {
    crates.push(new THREE.CylinderGeometry(0.34, 0.3, 0.9, 12).rotateY(a).translate(x, 0.45, z));
  }
  group.add(new THREE.Mesh(mergeGeometries(crates.map((g) => g.toNonIndexed()))!, woodMat));

  // --- Enseigne suspendue à sa potence (se balance)
  const signPivot = new THREE.Group();
  signPivot.position.set(wallX(-11.4) - 0.85, 3.53, -11.4);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.8, side: THREE.DoubleSide }));
  sign.position.set(0, -0.36, 0);
  sign.rotation.y = -0.35;
  signPivot.add(sign);
  group.add(signPivot);

  // --- Lanternes (murales et de table) : cadres instanciés, verres instanciés, flammes et halos en points.
  const lanterns = [...tableLanterns, ...wallLanterns];
  const frames = new THREE.InstancedMesh(lanternFrameGeometry(), iron, lanterns.length);
  const glass = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 10, 1, true).translate(0, 0.17, 0), new THREE.MeshStandardMaterial({ color: 0x3a2412, emissive: 0xffb262, emissiveIntensity: 1.5, roughness: 0.2, transparent: true, opacity: 0.82, depthWrite: false }), lanterns.length);
  const m4 = new THREE.Matrix4();
  lanterns.forEach((l, i) => {
    m4.compose(new THREE.Vector3(l.x, l.y, l.z), new THREE.Quaternion(), new THREE.Vector3(l.s, l.s, l.s));
    frames.setMatrixAt(i, m4);
    glass.setMatrixAt(i, m4);
  });
  group.add(frames, glass);
  const wicks: LightPoint[] = lanterns.map((l) => ({ x: l.x, y: l.y + 0.1 * l.s, z: l.z, r: 0.05 * l.s }));
  const halos = lightPoints(wicks, 0.75, 0.04, haloTexture(), 0.12, [0.95, 0.72, 0.48], rng);
  const flames = lightPoints(wicks, 0.18, 0.02, flameTexture(), 0.3, [1, 0.95, 0.85], rng);
  group.add(halos, flames);

  // --- Guirlandes de lanternes en éventail : tendues d’un mât au-dessus de la rue (hors champ) jusqu’aux façades, elles
  // encadrent le haut de l’image comme un lambrequin de théâtre et laissent la tête du rival dégagée.
  const strands: Array<{ a: THREE.Vector3; b: THREE.Vector3; sag: number }> = [];
  for (const side of [-1, 1]) {
    for (const [za, ya] of [[-4.6, 3.55], [-7.8, 3.7], [-11, 3.85]] as const) {
      strands.push({ a: new THREE.Vector3(0, 6.4, za - 1.2), b: new THREE.Vector3(side * wallX(za), ya, za), sag: 0.45 });
    }
  }
  const at = (st: (typeof strands)[number], t: number) => new THREE.Vector3().lerpVectors(st.a, st.b, t).setY(st.a.y + (st.b.y - st.a.y) * t - st.sag * Math.sin(Math.PI * t));
  const BULBS = 10;
  const bulbBase: Array<{ x: number; y: number; z: number; k: number; ph: number }> = [];
  const wire: number[] = [];
  const wireK: number[] = [];
  strands.forEach((st, si) => {
    const SEG = 24;
    for (let i = 0; i < SEG; i++) {
      const a = at(st, i / SEG);
      const b = at(st, (i + 1) / SEG);
      wire.push(a.x, a.y, a.z, b.x, b.y, b.z);
      wireK.push(Math.sin((Math.PI * i) / SEG), si, Math.sin((Math.PI * (i + 1)) / SEG), si);
    }
    for (let i = 0; i < BULBS; i++) {
      const t = 0.2 + (i / (BULBS - 1)) * 0.77;
      const a = at(st, t);
      bulbBase.push({ x: a.x, y: a.y - 0.07, z: a.z, k: Math.sin(Math.PI * t), ph: si });
    }
  });
  const wireGeo = new THREE.BufferGeometry();
  const wireBase = new Float32Array(wire);
  wireGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wire), 3));
  const wires = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x0c0d10 }));
  group.add(wires);
  const bulbSrc: LightPoint[] = bulbBase.map((b) => ({ x: b.x, y: b.y, z: b.z, r: 0.04 }));
  const bulbTints: Array<readonly [number, number, number]> = [[1, 0.78, 0.5], [1, 0.62, 0.42], [1, 0.84, 0.6]];
  const bulbHalos = lightPoints(bulbSrc, 0.36, 0, haloTexture(), 0.08, bulbTints[0]!, rng);
  // Teintes des ampoules : chaudes, une sur quatre aux couleurs des familles (fête du port).
  {
    const tint = bulbHalos.geometry.attributes.tint!;
    bulbBase.forEach((_, i) => {
      const fam = FAMILIES[i % 4]!;
      const col = i % 4 === 1 ? new THREE.Color(FAMILY_PALETTE[fam].hex).lerp(new THREE.Color(0xffd8a0), 0.35) : null;
      const t = col ? [col.r, col.g, col.b] : bulbTints[i % 3]!;
      tint.setXYZ(i, t[0]!, t[1]!, t[2]!);
    });
  }
  const bulbCores = lightPoints(bulbSrc, 0.09, 0, haloTexture(), 0, [1, 0.97, 0.9], rng);
  group.add(bulbHalos, bulbCores);
  const pointMats = [halos.material, flames.material, bulbHalos.material, bulbCores.material];

  // --- Bancs de brume froide qui dérivent au ras des pavés
  const mistTex = mistTexture(artSeed);
  const mists: THREE.Mesh[] = [];
  for (const [y, z, w, h, o] of [[0.55, -9.6, 12, 1.4, 0.28], [0.7, -12.4, 14, 1.8, 0.36]] as const) {
    const tex = mistTex.clone();
    tex.repeat.set(w / 10, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o, depthWrite: false }));
    m.position.set(0, y, z);
    group.add(m);
    mists.push(m);
  }

  // --- Papillons de nuit autour des lanternes murales et de la guirlande proche
  const MOTHS = 30;
  const moth = Array.from({ length: MOTHS }, (_, i) => {
    const l = i < 20 ? wallLanterns[i % 2]! : null;
    return {
      cx: l ? l.x - Math.sign(l.x) * 0.1 : -3 + rng() * 6,
      cy: l ? l.y + 0.35 : 3.9 + rng() * 0.3,
      cz: l ? l.z : -4.6,
      r: 0.2 + rng() * 0.35,
      w: 1.5 + rng() * 2.5,
      p: rng() * Math.PI * 2,
    };
  });
  const mothGeo = new THREE.BufferGeometry();
  const mothPos = new Float32Array(MOTHS * 3);
  mothGeo.setAttribute('position', new THREE.BufferAttribute(mothPos, 3));
  const moths = new THREE.Points(mothGeo, new THREE.PointsMaterial({ color: 0xe6dcc4, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }));
  moths.frustumCulled = false;
  group.add(moths);

  const placeMoths = (clock: number) => {
    moth.forEach((m, i) => {
      const a = clock * m.w + m.p;
      mothPos[i * 3] = m.cx + Math.cos(a) * m.r;
      mothPos[i * 3 + 1] = m.cy + Math.sin(a * 1.7) * m.r * 0.5;
      mothPos[i * 3 + 2] = m.cz + Math.sin(a) * m.r * 0.6;
    });
    mothGeo.attributes.position!.needsUpdate = true;
  };
  placeMoths(0);

  return {
    group,
    update(dt, clock, still) {
      tickLightPoints(pointMats, clock, still);
      // Guirlandes : le milieu de chaque brin se balance plus que ses attaches (vent du port).
      const sway = (k: number, ph: number) => (still ? 0 : Math.sin(clock * 0.8 + ph * 1.3) * 0.09 * k);
      const bp = bulbHalos.geometry.attributes.position!;
      const cp = bulbCores.geometry.attributes.position!;
      bulbBase.forEach((b, i) => {
        const dz = sway(b.k, b.ph);
        bp.setZ(i, b.z + dz);
        cp.setZ(i, b.z + dz);
        bp.setY(i, b.y - Math.abs(dz) * 0.3);
        cp.setY(i, b.y - Math.abs(dz) * 0.3);
      });
      bp.needsUpdate = true;
      cp.needsUpdate = true;
      const wp = wireGeo.attributes.position!;
      for (let i = 0; i < wp.count; i++) {
        const dz = sway(wireK[i * 2]!, wireK[i * 2 + 1]!);
        wp.setXYZ(i, wireBase[i * 3]!, wireBase[i * 3 + 1]! - Math.abs(dz) * 0.3, wireBase[i * 3 + 2]! + dz);
      }
      wp.needsUpdate = true;
      signPivot.rotation.x = still ? 0 : Math.sin(clock * 1.1) * 0.08;
      mists.forEach((m, i) => { const t = (m.material as THREE.MeshBasicMaterial).map!; t.offset.x = still ? i * 0.31 : (t.offset.x + dt * (0.006 + i * 0.003)) % 1; });
      if (!still) placeMoths(clock);
    },
    prerender(scale) {
      for (const m of pointMats) m.uniforms.uScale!.value = scale;
    },
    ablatable: { candles: [frames, glass, halos, flames, bulbHalos, bulbCores], banners: [signPivot, wires], dust: [moths, ...mists] },
    dispose() { disposeTree(group); },
  };
}

/** Lanternes à huile : flamme vitrée, lumière plus jaune que les bougies, vacillement lent. */
const LANTERN = { color: 0xffad5c, decay: 1.8, flicker: 'lantern' } as const;

export const RUE: VenueDef = {
  id: 'rue',
  background: 0x04070d,
  // Brume de port bleu nuit : les façades et le bout de la rue s’y enfoncent, le rival et la table restent nets.
  fog: { color: 0x182638, near: 11.5, far: 27 },
  // Clair de lune froid et plus bas que la salle ; projecteurs chauds (lanternes) sur le visage et la table.
  house: { sky: 0x9fb4dc, ground: 0x15110e, intensity: 0.52 },
  key: { color: 0xffe4c4, intensity: 1.8 },
  stage: { color: 0xffcf98, intensity: 1.5 },
  practicals: [
    { pos: [-3.7, TABLE_TOP + 0.5, -1.8], intensity: 2.0, distance: 6, ...LANTERN },
    { pos: [3.7, TABLE_TOP + 0.5, -1.8], intensity: 2.0, distance: 6, ...LANTERN },
    { pos: [-4.1, 3.0, -8.2], intensity: 4.4, distance: 9, ...LANTERN },
    { pos: [4.1, 3.0, -9.0], intensity: 4.4, distance: 9, ...LANTERN },
  ],
  bloom: { strength: 0.3, radius: 0.4, threshold: 1.0 },
  mount: mountRue,
};
