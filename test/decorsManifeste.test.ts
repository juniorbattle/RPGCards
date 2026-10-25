/**
 * ADR 028 (B2) : le manifeste des plans de décor de la ville (`public/decors/manifest.json`, copié dans le build par
 * Vite) est contrôlé sans navigateur, comme celui des feuilles de personnages (`spritesManifeste.test.ts`). Chaque
 * diorama est conforme (`checkIlotDecor`) et désigne un îlot de la ville ; chaque plan pointe vers un PNG présent dont
 * l'empreinte SHA-256, les dimensions déclarées et le poids (≤ 8 Mo) sont conformes, avec sa fiche de provenance
 * commitée ; les fichiers d'un îlot pèsent 32 Mo au plus ; aucune image du dossier n'échappe au manifeste. Le build ne
 * peut donc pas embarquer un plan modifié ou inconnu sans que ce test échoue. Le vérificateur est éprouvé sur des
 * dossiers temporaires (cas valides et fautifs).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { checkIlotDecor, DECOR_MAX_BYTES, DECOR_MAX_ILOT_BYTES, DECOR_VERSION, platesInOrder, type DecorManifest, type IlotDecorEntry } from '../src/ville/decors';
import { isIlotId } from '../src/ville/ilots';

/**
 * Problèmes du dossier de plans `dir` (manifeste, îlots, fichiers, empreintes, dimensions, poids, fiches sous `root`).
 * Passe 62 : les manifestes de laboratoire du même dossier (`manifest-<nom>.json`, preuve de la profondeur praticable)
 * sont contrôlés de la même façon ; une image découpée par plusieurs plans (`uv`) ne compte qu'une fois par îlot.
 */
function verifyDecorDir(dir: string, root: string): string[] {
  const out: string[] = [];
  if (!existsSync(join(dir, 'manifest.json'))) return ['manifest.json absent'];
  const names = readdirSync(dir).filter((f) => /^manifest(-[\w-]+)?\.json$/.test(f)).sort();
  const listed = new Set<string>();
  for (const name of names) {
    const tag = name === 'manifest.json' ? '' : `${name} : `;
    let m: DecorManifest;
    try { m = JSON.parse(readFileSync(join(dir, name), 'utf8')) as DecorManifest; } catch { out.push(`${name} illisible`); continue; }
    if (m.version !== DECOR_VERSION || !m.ilots || typeof m.ilots !== 'object' || Array.isArray(m.ilots)) { out.push(`${tag}manifeste : version ${DECOR_VERSION} et objet « ilots » attendus`); continue; }
    for (const [ilot, e] of Object.entries(m.ilots)) {
      if (!isIlotId(ilot)) out.push(`${tag}${ilot} : îlot inconnu de la ville`);
      const bad = checkIlotDecor(ilot, e);
      if (bad.length) { out.push(...bad.map((x) => tag + x)); continue; }
      const counted = new Set<string>();
      let bytes = 0;
      for (const [id, p] of platesInOrder(e as IlotDecorEntry)) {
        listed.add(p.file);
        const file = join(dir, p.file);
        if (!existsSync(file)) { out.push(`${tag}${ilot}/${id} : ${p.file} absent`); continue; }
        const buf = readFileSync(file);
        if (!counted.has(p.file)) { counted.add(p.file); bytes += buf.length; }
        if (createHash('sha256').update(buf).digest('hex') !== p.sha256) out.push(`${tag}${ilot}/${id} : empreinte de ${p.file} différente du manifeste`);
        if (buf.length > DECOR_MAX_BYTES) out.push(`${tag}${ilot}/${id} : ${p.file} pèse ${buf.length} octets (> 8 Mo)`);
        const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && buf.toString('latin1', 12, 16) === 'IHDR';
        if (!png) { out.push(`${tag}${ilot}/${id} : ${p.file} n'est pas un PNG`); continue; }
        if (buf.readUInt32BE(16) !== p.size[0] || buf.readUInt32BE(20) !== p.size[1]) out.push(`${tag}${ilot}/${id} : ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)} au lieu de ${p.size[0]}×${p.size[1]}`);
        if (!existsSync(join(root, p.fiche))) out.push(`${tag}${ilot}/${id} : fiche de provenance ${p.fiche} absente`);
      }
      if (bytes > DECOR_MAX_ILOT_BYTES) out.push(`${tag}${ilot} : ${bytes} octets de plans (> ${DECOR_MAX_ILOT_BYTES / 1048576} Mo)`);
    }
  }
  for (const f of readdirSync(dir)) if (!names.includes(f) && !listed.has(f) && statSync(join(dir, f)).isFile()) out.push(`${f} : fichier hors du manifeste`);
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

const tmp = mkdtempSync(join(tmpdir(), 'lqv-decors-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
/** Dossier temporaire : manifeste, plans et fiches donnés. */
function fixture(ilots: Record<string, unknown>, files: Record<string, Buffer>, fiches: string[] = []): string {
  const root = join(tmp, String(++n));
  const dir = join(root, 'public', 'decors');
  mkdirSync(dir, { recursive: true });
  for (const [f, b] of Object.entries(files)) writeFileSync(join(dir, f), b);
  for (const f of fiches) { mkdirSync(join(root, f, '..'), { recursive: true }); writeFileSync(join(root, f), '{}'); }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: 1, ilots }));
  return root;
}
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const sky = png(512, 256);
const front = png(768, 256);
const plate = (file: string, buf: Buffer, o: Record<string, unknown> = {}) => ({
  file, sha256: sha(buf), size: [buf.readUInt32BE(16), buf.readUInt32BE(20)], at: [0, 0, -3], width: 40, orient: 'face', order: 1, blend: 'decoupe',
  source: 'QA : fixture', fiche: 'art-src/decors/quai/fiche.json', approved: false, ...o,
});
const quai = (o: Record<string, unknown> = {}) => ({ plans: { ciel: plate('ciel.png', sky, { at: [0, -2, -60], width: 200, order: 0, blend: 'fondu' }), facades: plate('facades.png', front), ...o } });
const FICHE = ['art-src/decors/quai/fiche.json'];

describe('manifeste des plans de décor (ADR 028, B2)', () => {
  it('public/decors/manifest.json : valable, chaque plan présent à l’empreinte, aux dimensions et au poids déclarés, fiche commitée', () => {
    const root = process.cwd();
    expect(verifyDecorDir(join(root, 'public', 'decors'), root)).toEqual([]);
    // hache toutes les images des îlots : délai large sous la charge du passage complet (passe 125)
  }, 30000);

  it('le vérificateur accepte un diorama conforme', () => {
    const a = fixture({ quai: quai() }, { 'ciel.png': sky, 'facades.png': front }, FICHE);
    expect(verifyDecorDir(join(a, 'public', 'decors'), a)).toEqual([]);
  });

  it('le vérificateur refuse empreinte, fichier absent, dimensions, fiche absente, îlot inconnu, image hors manifeste, poids', () => {
    const check = (ilots: Record<string, unknown>, files: Record<string, Buffer>, fiches = FICHE) => {
      const root = fixture(ilots, files, fiches);
      return verifyDecorDir(join(root, 'public', 'decors'), root).join(' | ');
    };
    const files = { 'ciel.png': sky, 'facades.png': front };
    expect(check({ quai: quai({ facades: plate('facades.png', front, { sha256: 'c'.repeat(64) }) }) }, files)).toMatch(/empreinte/);
    expect(check({ quai: quai() }, { 'ciel.png': sky })).toMatch(/facades\.png absent/);
    expect(check({ quai: quai({ facades: plate('facades.png', front, { size: [1024, 256] }) }) }, files)).toMatch(/768×256 au lieu de 1024×256/);
    expect(check({ quai: quai() }, files, [])).toMatch(/fiche de provenance/);
    expect(check({ halles: quai() }, files)).toMatch(/halles : îlot inconnu/);
    expect(check({ quai: quai() }, { ...files, 'intrus.png': png(8, 8) })).toMatch(/intrus\.png : fichier hors du manifeste/);
    const big = Buffer.concat([front, Buffer.alloc(DECOR_MAX_BYTES)]);
    expect(check({ quai: quai({ facades: plate('facades.png', big, { size: [768, 256] }) }) }, { 'ciel.png': sky, 'facades.png': big })).toMatch(/> 8 Mo/);
    // un diorama non conforme (ordre contraire à la profondeur) est refusé en entier
    expect(check({ quai: quai({ facades: plate('facades.png', front, { order: 0 }), ciel: plate('ciel.png', sky, { at: [0, -2, -60], order: 1 }) }) }, files)).toMatch(/plus lointain/);
  });
});
