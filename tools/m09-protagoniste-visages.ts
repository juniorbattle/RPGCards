// Protagoniste, types de visage par calque (passe 169 ; décisions du responsable : « Calques de visage », trois types) —
// traitement PAR SCRIPT : le visage d'une feuille de visage (`player-v<k>` : la silhouette A au carré, redessinée avec ce
// visage, générée puis traitée par `tools/m09-protagoniste-feuille.mjs`) est extrait et posé sur les trois autres feuilles du
// protagoniste (`player-b`, `player-a2`, `player-b2`), de face et de profil (de dos, rien ne change).
//   - visage d'une case : pour chaque ligne du haut de la figure, l'étendue de sa peau (`classerTeintes`,
//     `src/ville/teintes.ts`), les traits (yeux, sourcils, nez, bouche) étant dedans ;
//   - calage : ligne des yeux ; de face, milieu du visage à cette ligne ; de profil, l'œil ;
//   - des sourcils à la bouche, la feuille cible perd d'abord les traits de son visage (remplis de sa peau la plus courante),
//     puis reçoit ceux du calque, dans l'intersection des deux étendues (rien sur les cheveux ni hors de la tête).
// Sorties : `public/sprites/<feuille>-v<k>.png` (même grille, même ancrage, même plan de marche que la feuille cible),
// entrées du manifeste (`approved` selon le registre), fiches ; planche `screenshots/qa/protagoniste/visages/`.
// Usage : npx tsx tools/m09-protagoniste-visages.ts [k, défaut : tous les visages posés]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { lirePng } from '../test/png';
import { CHEVEUX, classerTeintes, IRIS, PEAU } from '../src/ville/teintes';

const CIBLES = ['player-b', 'player-a2', 'player-b2'];
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const reg = JSON.parse(readFileSync('art-src/approbations.json', 'utf8')) as { images: { fichier: string; sha256: string }[] };
const approuve = (f: string, s: string) => reg.images.some((i) => i.fichier === f && i.sha256 === s);
const visages = (process.argv[2] ? [Number(process.argv[2])] : [1, 2, 3]).filter((k) => man.sprites[`player-v${k}`]);

interface Art { px: Uint8Array; w: number; h: number; cw: number; ch: number; scale: number }
function lire(id: string): Art {
  const e = man.sprites[id];
  const im = lirePng(`public/sprites/${e.file}`);
  const [cw, ch] = e.cell as [number, number];
  const w = cw * 5; const h = ch * 3; const S = e.scale as number;
  const px = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = ((j * S + (S >> 1)) * im.width + i * S + (S >> 1)) * 4; px.set(im.data.subarray(k, k + 4), (j * w + i) * 4); }
  return { px, w, h, cw, ch, scale: S };
}

/**
 * Visage d'une case : pour chaque ligne du haut de la figure, l'étendue de la peau (du premier au dernier pixel de peau :
 * les traits du visage sont dedans) ; centre des iris (ou du visage) et ligne des yeux.
 */
function visage(a: Art, cls: Uint8Array, r: number, c: number) {
  const x0 = c * a.cw; const y0 = r * a.ch;
  const op = (i: number, j: number) => a.px[((y0 + j) * a.w + x0 + i) * 4 + 3]! > 128;
  let top = a.ch; let bot = -1;
  for (let j = 0; j < a.ch; j++) for (let i = 0; i < a.cw; i++) if (op(i, j)) { top = Math.min(top, j); bot = Math.max(bot, j); }
  const tete = top + Math.round(0.4 * (bot - top + 1));
  // peau dans l'ombre (orbites, joues) : tons chauds plus sombres que ceux que \`classerTeintes\` repeint ; ils comptent
  // pour l'étendue du visage
  const ombre = (i: number, j: number) => {
    const p = ((y0 + j) * a.w + x0 + i) * 4;
    if (a.px[p + 3]! <= 128 || cls[(y0 + j) * a.w + x0 + i] !== 0) return false;
    const [R, G, B] = [a.px[p]!, a.px[p + 1]!, a.px[p + 2]!];
    const mx = Math.max(R, G, B); const mn = Math.min(R, G, B);
    if (mx < 90 || mx - mn < 30 || R < G || G < B) return false;
    const h = ((G - B) / (mx - mn)) * 60;
    return h >= 15 && h <= 55;
  };
  const etendue: ([number, number] | null)[] = Array.from({ length: a.ch }, () => null);
  for (let j = top; j <= tete; j++) {
    let g = -1; let d = -1;
    for (let i = 0; i < a.cw; i++) if (cls[(y0 + j) * a.w + x0 + i] === PEAU || ombre(i, j)) { if (g < 0) g = i; d = i; }
    if (g >= 0 && d - g >= 2) etendue[j] = [g, d];
  }
  let sx = 0; let sy = 0; let n = 0;
  for (let j = top; j <= tete; j++) for (let i = 0; i < a.cw; i++) if (cls[(y0 + j) * a.w + x0 + i] === IRIS) { sx += i; sy += j; n++; }
  if (!n) return null;
  const yeux = Math.round(sy / n);
  const e = etendue[yeux];
  // de face, le visage est calé sur le milieu de son étendue à la ligne des yeux (un iris mal repéré ne le décale pas) ;
  // de profil, sur l'œil
  return { etendue, yeux, cx: r === 0 && e ? (e[0] + e[1]) / 2 : sx / n };
}

function poser(src: Art, dst: Art): { px: Uint8Array; cases: number } {
  const out = dst.px.slice();
  const cs = classerTeintes({ px: src.px, w: src.w, h: src.h }, src.cw, src.ch);
  const cd = classerTeintes({ px: dst.px, w: dst.w, h: dst.h }, dst.cw, dst.ch);
  let cases = 0;
  for (const r of [0, 2]) for (let c = 0; c < 5; c++) {
    const vs = visage(src, cs, r, c);
    const vd = visage(dst, cd, r, c);
    if (!vs || !vd) continue;
    const dx = Math.round(vd.cx - vs.cx);
    const dy = vd.yeux - vs.yeux;
    const at = (a: Art, i: number, j: number) => (((r * a.ch + j) * a.w) + c * a.cw + i) * 4;
    // traits : des sourcils (3 lignes au-dessus des yeux) à la bouche (9 lignes au-dessous)
    const j0 = vd.yeux - 4; const j1 = vd.yeux + 9;
    // peau la plus courante du visage cible : elle efface ses traits avant la pose du calque
    const n = new Map<string, number>();
    for (let j = j0; j <= j1; j++) for (let i = 0; i < dst.cw; i++) if (j >= 0 && j < dst.ch && cd[(r * dst.ch + j) * dst.w + c * dst.cw + i] === PEAU) { const p = at(dst, i, j); const key = `${dst.px[p]},${dst.px[p + 1]},${dst.px[p + 2]}`; n.set(key, (n.get(key) ?? 0) + 1); }
    const fond = [...n].sort((a, b) => b[1] - a[1])[0]?.[0].split(',').map(Number);
    if (!fond) continue;
    for (let j = j0; j <= j1; j++) {
      const ed = vd.etendue[j];
      const es = vs.etendue[j - dy];
      if (!ed) continue;
      // traits cibles effacés sur toute l'étendue de la ligne
      for (let i = ed[0] + 1; i < ed[1]; i++) out.set([...fond, 255], at(dst, i, j));
      if (!es) continue;
      // calque posé dans l'intersection des deux étendues (bords exclus : le trait du contour reste celui de la cible)
      for (let i = Math.max(ed[0] + 1, es[0] + 1 + dx); i < Math.min(ed[1], es[1] + dx); i++) {
        const p = at(src, i - dx, j - dy);
        // ni mèche ni vide du calque : la peau de la cible reste
        if (src.px[p + 3]! <= 128 || cs[(r * src.ch + j - dy) * src.w + c * src.cw + i - dx] === CHEVEUX) continue;
        out.set(src.px.subarray(p, p + 4), at(dst, i, j));
      }
    }
    cases++;
  }
  return { px: out, cases };
}

function png(a: Art, px: Uint8Array): Buffer {
  const W = a.w * a.scale; const H = a.h * a.scale;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (Math.floor(y / a.scale) * a.w + Math.floor(x / a.scale)) * 4; px.subarray(s, s + 4).forEach((v, k) => { raw[y * (W * 4 + 1) + 1 + x * 4 + k] = v; }); }
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const NOMS: Record<number, string> = { 1: 'visage en amande', 2: 'visage rond', 3: 'visage anguleux' };
for (const k of visages) {
  const idSrc = `player-v${k}`;
  const src = lire(idSrc);
  const ficheSrc = JSON.parse(readFileSync(`art-src/sprites/${idSrc}/fiche.json`, 'utf8'));
  for (const cible of CIBLES) {
    const dst = lire(cible);
    const { px, cases } = poser(src, dst);
    const b = png(dst, px);
    const id = `${cible}-v${k}`;
    const file = `${id}.png`;
    writeFileSync(`public/sprites/${file}`, b);
    const e = man.sprites[cible];
    const entry = { ...e, file, sha256: sha(b), source: `calque de visage (${NOMS[k]}, ${idSrc}.png) posé par script sur ${e.file} (tools/m09-protagoniste-visages.ts)`, fiche: `art-src/sprites/${id}/fiche.json`, approved: approuve(`public/sprites/${file}`, sha(b)) };
    man.sprites[id] = entry;
    mkdirSync(`art-src/sprites/${id}`, { recursive: true });
    writeFileSync(`art-src/sprites/${id}/fiche.json`, `${JSON.stringify({
      id,
      statut: `protagoniste, ${NOMS[k]} posé sur ${cible} (passe 169), NON APPROUVÉE par le responsable : refusée hors QA (approved: false) tant qu’il n’a pas donné l’ordre, dans une passe à part`,
      auteur: ficheSrc.auteur,
      generation: 'aucune image générée pour cette feuille : traitement par script de deux images du projet',
      aseprite: ficheSrc.aseprite, licences: ficheSrc.licences, contenu: ficheSrc.contenu,
      sources: [{ chemin: `public/sprites/${e.file}`, sha256: e.sha256, role: 'feuille cible' }, { chemin: `public/sprites/${man.sprites[idSrc].file}`, sha256: man.sprites[idSrc].sha256, role: 'feuille du visage (calque)' }],
      traitement: { scripts: ['tools/m09-protagoniste-visages.ts', 'src/ville/teintes.ts (classerTeintes)'], etapes: ['visage de chaque case de face et de profil : étendue de la peau sur chaque ligne du haut de la figure', 'calage sur la ligne des yeux (de face, le milieu du visage ; de profil, l’œil)', 'des sourcils à la bouche, traits du visage cible remplis de sa peau la plus courante', 'traits et peau du calque posés dans l’intersection des deux étendues', `cases traitées : ${cases} sur 10 (face et profil)`, `agrandissement ×${dst.scale} au plus proche`] },
      sortie: { fichier: `public/sprites/${file}`, sha256: sha(b), octets: b.length, entree_du_manifeste: entry },
      chaine_des_empreintes: [`${e.sha256} (feuille cible)`, `${man.sprites[idSrc].sha256} (calque)`, `${sha(b)} (feuille ×${dst.scale})`],
    }, null, 2)}\n`);
    console.log(`${id} : ${cases}/10 cases, ${Math.round(b.length / 1024)} Ko (approved: ${entry.approved})`);
  }
}
writeFileSync('public/sprites/manifest.json', `${JSON.stringify(man, null, 2)}\n`);
if (!existsSync('screenshots/qa/protagoniste/visages')) mkdirSync('screenshots/qa/protagoniste/visages', { recursive: true });
