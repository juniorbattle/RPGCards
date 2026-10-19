/**
 * ADR 027 (C7) : le manifeste des feuilles de personnages de la ville (`public/sprites/manifest.json`, copié dans le
 * build par Vite) est contrôlé sans navigateur. Chaque entrée pointe vers un fichier présent dont l'empreinte SHA-256,
 * les dimensions (échelle déclarée) et la taille (≤ 1 Mo) sont conformes, avec sa fiche de provenance commitée ; aucune
 * image du dossier n'échappe au manifeste. Le build ne peut donc pas embarquer une feuille modifiée ou inconnue sans
 * que ce test échoue. Le vérificateur est éprouvé sur des dossiers temporaires (cas valides et fautifs).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { checkManifestEntry, sheetSize, SHEET_MAX_BYTES, specOf, type SpriteManifest } from '../src/ville/spritesExternes';

/** Problèmes du dossier de feuilles `dir` (manifeste, fichiers, empreintes, dimensions, taille, fiches sous `root`). */
function verifySpriteDir(dir: string, root: string): string[] {
  const out: string[] = [];
  const path = join(dir, 'manifest.json');
  if (!existsSync(path)) return ['manifest.json absent'];
  let m: SpriteManifest;
  try { m = JSON.parse(readFileSync(path, 'utf8')) as SpriteManifest; } catch { return ['manifest.json illisible']; }
  if ((m.version !== 1 && m.version !== 2 && m.version !== 3) || !m.sprites || typeof m.sprites !== 'object' || Array.isArray(m.sprites)) return ['manifeste : version 1, 2 ou 3 et objet « sprites » attendus'];
  const listed = new Set<string>();
  for (const [id, e] of Object.entries(m.sprites)) {
    const bad = checkManifestEntry(id, e, m.version);
    if (bad.length) { out.push(...bad); continue; }
    listed.add(e.file);
    const file = join(dir, e.file);
    if (!existsSync(file)) { out.push(`${id} : ${e.file} absent`); continue; }
    const buf = readFileSync(file);
    if (createHash('sha256').update(buf).digest('hex') !== e.sha256) out.push(`${id} : empreinte de ${e.file} différente du manifeste`);
    if (buf.length > SHEET_MAX_BYTES) out.push(`${id} : ${e.file} pèse ${buf.length} octets (> 1 Mo)`);
    const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && buf.toString('latin1', 12, 16) === 'IHDR';
    if (!png) { out.push(`${id} : ${e.file} n'est pas un PNG`); continue; }
    const spec = specOf(e, m.version);
    const [w, h] = sheetSize(spec.scale, spec.cell);
    if (buf.readUInt32BE(16) !== w || buf.readUInt32BE(20) !== h) out.push(`${id} : ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)} au lieu de ${w}×${h}`);
    if (m.version >= 2) {
      const fiche = (e as { fiche: string }).fiche;
      if (!existsSync(join(root, fiche))) out.push(`${id} : fiche de provenance ${fiche} absente`);
    }
  }
  for (const f of readdirSync(dir)) if (f !== 'manifest.json' && !listed.has(f) && statSync(join(dir, f)).isFile()) out.push(`${f} : fichier hors du manifeste`);
  return out;
}

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
/** PNG RGBA transparent de w × h (fixture). */
function png(w: number, h: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const tmp = mkdtempSync(join(tmpdir(), 'lqv-feuilles-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
/** Dossier temporaire : manifeste, feuilles et fiches données. */
function fixture(sprites: Record<string, unknown>, files: Record<string, Buffer>, fiches: string[] = [], version = 2): string {
  const root = join(tmp, String(++n));
  const dir = join(root, 'public', 'sprites');
  mkdirSync(dir, { recursive: true });
  for (const [f, b] of Object.entries(files)) writeFileSync(join(dir, f), b);
  for (const f of fiches) { mkdirSync(join(root, f, '..'), { recursive: true }); writeFileSync(join(root, f), '{}'); }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version, sprites }));
  return root;
}
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const sheet = png(960, 960);
const entry = (o: Record<string, unknown> = {}) => ({
  file: 'player.png', sha256: sha(sheet), cell: [96, 160], cols: 5, rows: 3, scale: 2, anchor: [48, 152], figureH: 148,
  recolor: ['tenue'], source: 'QA : fixture', fiche: 'art-src/sprites/player/fiche.json', approved: false, ...o,
});

describe('manifeste des feuilles de personnages (C7, ADR 027)', () => {
  it('public/sprites/manifest.json : valable, chaque feuille présente à l’empreinte, aux dimensions et au poids déclarés, fiche commitée', () => {
    const root = process.cwd();
    expect(verifySpriteDir(join(root, 'public', 'sprites'), root)).toEqual([]);
  });

  it('le vérificateur accepte une feuille conforme (v2, échelle 2) et un manifeste v1', () => {
    const a = fixture({ player: entry() }, { 'player.png': sheet }, ['art-src/sprites/player/fiche.json']);
    expect(verifySpriteDir(join(a, 'public', 'sprites'), a)).toEqual([]);
    const s1 = png(480, 480);
    const v1 = { file: 'braise.png', sha256: sha(s1), cell: [96, 160], cols: 5, rows: 3, source: 'QA', approved: false };
    const b = fixture({ braise: v1 }, { 'braise.png': s1 }, [], 1);
    expect(verifySpriteDir(join(b, 'public', 'sprites'), b)).toEqual([]);
  });

  it('contrat v3 (pixel art, ADR 028) : dimensions tirées de la grille d’art et de l’agrandissement entier', () => {
    const art = png(720, 720);
    const px = entry({ file: 'player.png', sha256: sha(art), pixel: true, cell: [48, 80], scale: 3, anchor: [24, 76], figureH: 72 });
    const a = fixture({ player: px, braise: entry({ file: 'braise.png' }) }, { 'player.png': art, 'braise.png': sheet }, ['art-src/sprites/player/fiche.json'], 3);
    expect(verifySpriteDir(join(a, 'public', 'sprites'), a)).toEqual([]);
    const b = fixture({ player: { ...px, scale: 2 } }, { 'player.png': art }, ['art-src/sprites/player/fiche.json'], 3);
    expect(verifySpriteDir(join(b, 'public', 'sprites'), b).join()).toMatch(/720×720 au lieu de 480×480/);
    // pixel art dans un manifeste v2 : refusé
    const c = fixture({ player: px }, { 'player.png': art }, ['art-src/sprites/player/fiche.json'], 2);
    expect(verifySpriteDir(join(c, 'public', 'sprites'), c).join()).toMatch(/contrat v3/);
  });

  it('le vérificateur refuse empreinte, fichier absent, dimensions, fiche absente, image hors manifeste, poids', () => {
    const check = (sprites: Record<string, unknown>, files: Record<string, Buffer>, fiches = ['art-src/sprites/player/fiche.json']) => {
      const root = fixture(sprites, files, fiches);
      return verifySpriteDir(join(root, 'public', 'sprites'), root).join(' | ');
    };
    expect(check({ player: entry({ sha256: 'b'.repeat(64) }) }, { 'player.png': sheet })).toMatch(/empreinte/);
    expect(check({ player: entry() }, {})).toMatch(/absent/);
    expect(check({ player: entry({ scale: 1.5 }) }, { 'player.png': sheet })).toMatch(/960×960 au lieu de 720×720/);
    expect(check({ player: entry() }, { 'player.png': sheet }, [])).toMatch(/fiche de provenance/);
    expect(check({ player: entry() }, { 'player.png': sheet, 'intrus.png': png(8, 8) })).toMatch(/intrus\.png : fichier hors du manifeste/);
    const big = Buffer.concat([sheet, Buffer.alloc(SHEET_MAX_BYTES)]);
    expect(check({ player: entry({ sha256: sha(big) }) }, { 'player.png': big })).toMatch(/> 1 Mo/);
    expect(check({ player: entry({ approved: 'oui' }) }, { 'player.png': sheet })).toMatch(/approbation/);
  });
});
