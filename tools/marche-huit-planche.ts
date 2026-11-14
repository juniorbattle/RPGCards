// Planche de la marche de profil du protagoniste en huit temps (décision du responsable du 2026-11-13, T4) : pour chaque
// feuille demandée, la rangée de profil d'origine (repos et quatre foulées), puis les huit temps redessinés par code
// (`src/ville/marcheProfil.ts`) : contact, appui, passage, élan, puis l'autre jambe ; ligne du sol, aplomb de la hanche et
// position du pied d'appui (il recule d'un quart de pas par temps : aucun glissement). Tons clés de la feuille (la tenue
// est recolorée en jeu). Rien n'est écrit dans `public/` : la feuille dérivée n'existe qu'en mémoire.
// Usage : npx tsx tools/marche-huit-planche.ts [sortie.png] [feuilles, séparées par des virgules]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import { lirePng } from '../test/png';
import { appuisProche, cycleProfil8, hancheDe, TEMPS_PROFIL, type Case } from '../src/ville/marcheProfil';

const OUT = process.argv[2] ?? 'screenshots/qa/retours-2026-11-13/planche-profil-huit.png';
const IDS = (process.argv[3] ?? 'player,player-a3,player-a2-v2,player-a4-v3,player-b,player-b3,player-b2-v1,player-b4-v2').split(',');
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));

/** Les cinq cases de profil d'une feuille, en pixels d'art (centre des blocs agrandis). */
export function casesProfil(id: string): { cases: Case[]; e: { cell: [number, number]; anchor: [number, number]; figureH: number; profil: { contacts: [number, number]; passages: [number, number] } } } {
  const e = man.sprites[id];
  const sheet = lirePng(`public/sprites/${e.file}`);
  const [CW, CH] = e.cell as [number, number];
  const S = e.scale as number;
  const cases = [0, 1, 2, 3, 4].map((col) => {
    const px = new Uint8ClampedArray(CW * CH * 4);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const i = (((2 * CH + y) * S + (S >> 1)) * sheet.width + (col * CW + x) * S + (S >> 1)) * 4;
      px.set(sheet.data.subarray(i, i + 4), (y * CW + x) * 4);
    }
    return { px, w: CW, h: CH };
  });
  return { cases, e };
}

// --- image de sortie (RGBA), dessin simple, PNG
const Z = Number(process.env.LQV_Z) || 3;
const PAD = 16;
const CWMAX = 64 * Z;
const CHMAX = 100 * Z;
const LIGNE = 22 + CHMAX + 18;
const W = PAD * 2 + 140 + 13 * (CWMAX + 6);
const H = PAD * 2 + 30 + IDS.length * LIGNE;
const img = new Uint8Array(W * H * 4);
const fond = [29, 33, 43, 255];
for (let i = 0; i < W * H; i++) img.set(fond, i * 4);
const rect = (x: number, y: number, w: number, h: number, c: readonly number[]) => {
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) img.set(c, (yy * W + xx) * 4);
};
const poser = (c: Case, x0: number, y0: number) => {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const i = (y * c.w + x) * 4;
    if (c.px[i + 3]! > 128) rect(x0 + x * Z, y0 + y * Z, Z, Z, [c.px[i]!, c.px[i + 1]!, c.px[i + 2]!, 255]);
  }
};
// chiffres et lettres en points 3 × 5 (étiquettes des temps)
const GLYPHES: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', V: '101101101101010', P: '110101110100100', C: '011100100100011', E: '111100110100111', '-': '000000111000000',
};
const ecrire = (t: string, x: number, y: number, c: readonly number[], z = 3) => {
  [...t].forEach((ch, n) => { const g = GLYPHES[ch]; if (g) for (let k = 0; k < 15; k++) if (g[k] === '1') rect(x + n * 4 * z + (k % 3) * z, y + Math.floor(k / 3) * z, z, z, c); });
};

let y = PAD + 30;
const rapport: Record<string, unknown> = {};
for (const id of IDS) {
  const { cases, e } = casesProfil(id);
  const f = { sol: e.anchor[1] - 1, ancreX: e.anchor[0], figureH: e.figureH };
  const cyc = cycleProfil8(cases, f, e.profil.contacts);
  const hanche = hancheDe(f);
  rapport[id] = { pas: cyc.pas, hauts: cyc.hauts, hanche };
  // étiquette : identifiant (en tirets : « A » / « B »), puis les cases
  // étiquette : silhouette, coupe, visage (« A », « A3 », « B2-V1 »…)
  const nom = id.replace(/^player-?/, '').toUpperCase();
  ecrire(!nom ? 'A' : nom.startsWith('V') ? `A-${nom}` : nom, PAD, y + 30, [232, 220, 192, 255], 4);
  let x = PAD + 140;
  const [cw, ch] = e.cell;
  const cadre = (k: number, label: string, c: readonly number[]) => {
    rect(x - 2, y + 20, cw * Z + 4, ch * Z + 4, [44, 49, 62, 255]);
    ecrire(label, x, y + 4, c, 3);
    void k;
  };
  // d'origine : repos et quatre foulées
  for (let k = 0; k < 5; k++) {
    cadre(k, String(k), [150, 150, 150, 255]);
    rect(x, y + 22 + (f.sol + 1) * Z, cw * Z, 1, [90, 90, 110, 255]);
    poser(cases[k]!, x, y + 22);
    x += cw * Z + 6;
  }
  x += 14;
  const appuis = appuisProche(e.figureH);
  for (let k = 0; k < TEMPS_PROFIL; k++) {
    cadre(k, String(k + 1), [243, 216, 152, 255]);
    // sol, aplomb de la hanche, appui de la jambe proche (cheville à plat)
    rect(x, y + 22 + (f.sol + 1) * Z, cw * Z, 1, [120, 120, 150, 255]);
    rect(x + f.ancreX * Z, y + 22 + hanche * Z, 1, (f.sol - hanche) * Z, [70, 76, 96, 255]);
    const a = appuis[k];
    if (a !== null && a !== undefined) rect(x + Math.round((f.ancreX + 0.5 + a) * Z) - 1, y + 22 + (f.sol + 2) * Z, 3, 6, [240, 200, 90, 255]);
    poser(cyc.temps[k]!, x, y + 22);
    x += cw * Z + 6;
  }
  y += LIGNE;
}

const crc = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return (b: Buffer) => { let c = 0xffffffff; for (const v of b) c = t[(c ^ v) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
const bloc = (type: string, data: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const brut = Buffer.alloc((W * 4 + 1) * H);
for (let r = 0; r < H; r++) { brut[r * (W * 4 + 1)] = 0; Buffer.from(img.buffer, r * W * 4, W * 4).copy(brut, r * (W * 4 + 1) + 1); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ihdr), bloc('IDAT', deflateSync(brut)), bloc('IEND', Buffer.alloc(0))]));
console.log(`${OUT} : ${IDS.length} feuilles · ${JSON.stringify(rapport)}`);
