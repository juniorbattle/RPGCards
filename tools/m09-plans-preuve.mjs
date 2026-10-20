// M09 V4 — plans de preuve dessinés par code (aucune image externe ni générée), partagés par les outils de preuve des
// décors (`m09-decors-externes.mjs`) et de l'essai technique (`m09-essai-v4.mjs`). `paintPlates` s'exécute dans la page
// (`page.evaluate(paintPlates, FACADES)`) : fonction autonome, sans dépendance.
/**
 * Plans de preuve dessinés par code dans la page (canvas 2D, graine fixe) : formes simples, couleurs de la nuit du jeu
 * et des quatre familles, aucun texte. Les façades sont posées sur le plan pur du Quai (`quai.ts` : FACADES, portes).
 */
export function paintPlates(facades) {
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
export const FACADES = [
  { x0: -19.5, x1: -11.2, h: 7.6, kind: 'maison', door: -15.2 },
  { x0: -10.6, x1: -2.9, h: 9.4, kind: 'salle', door: -6.75 },
  { x0: -2.4, x1: 2.6, h: 8.2, kind: 'maison', door: 0.1 },
  { x0: 3.2, x1: 11.2, h: 7.9, kind: 'fanal', door: 7.2 },
  { x0: 11.7, x1: 19.5, h: 10.2, kind: 'maison', door: 15.6 },
];
