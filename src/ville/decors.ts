/**
 * M09 V4 — plans de décor de la ville (ADR 028, B2 : « diorama de plans peints ») : contrat du manifeste, contrôle,
 * politique d'approbation et préparation. Exception d'AGENTS (« Images de la ville : feuilles de personnages et décors »)
 * sous les mêmes garde-fous que les feuilles de personnages (`spritesExternes.ts`) : un plan n'entre dans la ville que
 * s'il figure dans `decors/manifest.json` (à côté de la page ; copié de `public/decors/` par Vite), que sa forme, son
 * empreinte SHA-256 et ses dimensions sont conformes et, hors QA, qu'il est approuvé par le responsable
 * (`approved: true`). Sinon l'îlot garde son décor dessiné par code et la raison est rapportée, jamais en silence.
 *
 * Contrat v1 des plans. Le manifeste décrit, par îlot, un diorama complet : 1 à `DECOR_MAX_PLATES` plans peints, chacun
 * posé dans le monde (mètres ; x le long de la rue, z vers la caméra, y vers le haut) :
 *   - `orient: 'face'` : plan vertical tourné vers la caméra de face, `at` = [x du milieu, y du bas, z] ;
 *     `orient: 'sol'` : plan couché (eau, sol peint), `at` = [x du milieu, y du plan, z du milieu] ;
 *   - `width` : largeur au monde (m) ; la hauteur (ou la profondeur, couché) suit le rapport de l'image (`size`) ;
 *   - `order` : ordre de dessin, entier unique ; d'arrière en avant (un plan plus proche a un ordre plus grand), il
 *     départage les plans à la même profondeur ;
 *   - `blend` : `decoupe` (bords détourés, écrit la profondeur : flou de profondeur juste, personnages devant ou derrière)
 *     ou `fondu` (ciel, brume peinte, lueurs : mêlé sans écrire la profondeur) ;
 *   - `lit` (0 à 1, défaut 0) : part de la lumière des lanternes du moteur ajoutée à la lumière peinte ; `fog` (0 à 1,
 *     défaut 1) : part de la brume du moteur (0 pour un ciel déjà peint dans sa brume) ;
 *   - `file`, `sha256`, `size` (px de l'image), `source`, `fiche` (`art-src/decors/<id>/fiche.json`), `approved`.
 * Par îlot aussi : `camera` (cadrage propre au diorama, passe 60 : inclinaison, distance, champ, hauteur visée, bornes en
 * x ; le décor par code garde le sien) ; `brumes` (nappes de brume du moteur posées entre les plans, passe 60 : largeur,
 * hauteur, x, y, z, opacité, dérive, échelle du bruit) ; `lumieres` (lumières du moteur posées sur les lanternes peintes : personnages éclairés, halos) et
 * `sol` (défaut vrai : le sol où l'on marche, pavés mouillés et reflets, reste au moteur). Le moteur garde aussi la brume,
 * la profondeur de champ et le halo (ADR 028, B2).
 *
 * Tout ou rien par îlot : le diorama ne remplace le décor par code que si tous ses plans sont conformes et admis ; un
 * seul plan refusé, et l'îlot garde son décor par code (jamais de mélange des deux). Budgets du contrat v1 (à revoir
 * après l'essai technique) : PNG ≤ 8 Mo, côté ≤ 4096 px, 8 plans au plus, 32 Mo de fichiers et 160 Mo de mémoire GPU
 * (mipmaps comprises) par îlot ; 12 plans au plus depuis la passe 60 (diorama plus profond).
 *
 * Passe 62 (profondeur praticable, preuve ; champs facultatifs, le Quai actuel ne les emploie pas) :
 *   - `uv` : sous-rectangle de l'image [u0, v0, u1, v1] (fractions, origine en haut à gauche) ; plusieurs plans peuvent
 *     découper la même image (une seule texture au GPU, comptée une fois) ;
 *   - `orient: 'cote'` : plan vertical parallèle à z (mur d'un passage), `at` = [x, y du bas, z du milieu], `width` =
 *     longueur le long de z ; `vers` : côté peint (`est` : tourné vers +x, défaut ; `ouest`), le haut de l'image
 *     en haut, le bord gauche de l'image vers la caméra (z le plus grand) ; l'autre côté n'est pas dessiné ;
 *   - `coupe` : le plan s'efface quand le personnage passe derrière lui, dans sa largeur (vue en coupe) ;
 *   - `camera` : `followZ` (part de la profondeur suivie), `aimZ`, `pitchFond` et `zFond` (inclinaison atteinte
 *     quand le personnage est en `zFond`) ;
 *   - un îlot peut lire un autre manifeste du même dossier (`manifest`, laboratoire : `manifest-profondeur.json`).
 */
import * as THREE from 'three';
import { admit, type SpritePolicy } from './spritesExternes';

export const DECOR_VERSION = 1;
/**
 * Plans par îlot : 8 au contrat v1, 12 depuis la passe 60 (profondeur : troisième rang), 16 depuis la passe 62 (profondeur
 * praticable : façades, pied et murs des passages découpés dans les mêmes images, textures partagées), 24 depuis la
 * passe 63 (zones arrière : emprise des blocs, murs aux bouts de la rue haute).
 */
export const DECOR_MAX_PLATES = 24;
export const DECOR_MAX_SIDE = 4096;
export const DECOR_MAX_BYTES = 8 * 1024 * 1024;
export const DECOR_MAX_ILOT_BYTES = 32 * 1024 * 1024;
export const DECOR_MAX_GPU_BYTES = 160 * 1024 * 1024;
/** Lumières du moteur par îlot (celles des uniformes partagés, `MAX_LIGHTS` de `materiaux.ts`). */
export const DECOR_MAX_LIGHTS = 16;
export const DECOR_LIGHT_COLORS = ['Cendre', 'Voile', 'Ronce', 'Astre', 'ambre'] as const;
export type DecorLightColor = (typeof DECOR_LIGHT_COLORS)[number] | [number, number, number];

export interface PlateEntry {
  /** Fichier PNG relatif au manifeste. */
  file: string;
  /** Empreinte SHA-256 (hex) du fichier exact. */
  sha256: string;
  /** Dimensions de l'image (px), vérifiées au décodage et par le test du manifeste. */
  size: [number, number];
  /** Position au monde (m) : face [x milieu, y bas, z] ; couché [x milieu, y, z milieu] ; côté [x, y bas, z milieu]. */
  at: [number, number, number];
  /** Largeur au monde (m) ; d'un plan de côté : sa longueur le long de z. */
  width: number;
  orient: 'face' | 'sol' | 'cote';
  /** Sous-rectangle de l'image [u0, v0, u1, v1] (fractions, origine en haut à gauche ; passe 62) ; défaut : l'image entière. */
  uv?: [number, number, number, number];
  /** Effacé quand le personnage passe derrière lui (passe 62). */
  coupe?: boolean;
  /** Plan de côté : face peinte tournée vers l'est (+x, défaut) ou l'ouest (passe 62). */
  vers?: 'est' | 'ouest';
  order: number;
  blend: 'decoupe' | 'fondu';
  /** Part de l'éclairage du moteur (0 à 1, défaut 0). */
  lit?: number;
  /** Part de la brume du moteur (0 à 1, défaut 1 ; 0 pour un ciel déjà peint dans sa brume). */
  fog?: number;
  /**
   * Voile atmosphérique (0 à 1, défaut 0 ; passe 60) : la couleur du plan tirée vers le bleu de nuit clair de l'air
   * (perspective aérienne) ; les rangs lointains s'éclaircissent et perdent leur contraste, la profondeur se lit.
   */
  voile?: number;
  /** Provenance : outil, fichier source, auteur, date. */
  source: string;
  /** Fiche de provenance commitée : `art-src/decors/<id>/fiche.json`. */
  fiche: string;
  /** Approuvé par le responsable (jamais vrai sans sa décision citée au JOURNAL). */
  approved: boolean;
}

export interface DecorLight {
  at: [number, number, number];
  /** Couleur d'une famille, l'ambre des lanternes, ou une couleur linéaire. */
  color: DecorLightColor;
  intensity: number;
  radius: number;
  /** Taille du halo additif (m ; 0 = aucun). */
  halo?: number;
  flicker?: 'lantern' | 'candle' | 'window' | 'none';
}

/** Cadrage propre au diorama (mêmes bornes que le réglage par l'URL, `parseRig`) et bornes du point visé en x. */
export interface DecorCamera {
  pitch?: number; distance?: number; fov?: number; aimY?: number; minX?: number; maxX?: number;
  /** Profondeur praticable (passe 62) : part du déplacement en z suivie, z visé au milieu de la rue, inclinaison atteinte
   *  quand le personnage est en `zFond` (interpolée depuis `aimZ`). */
  followZ?: number; aimZ?: number; pitchFond?: number; zFond?: number;
}
/**
 * Nappe de brume du moteur : largeur, hauteur, x, y, z, opacité, vitesse de dérive, échelle du bruit [x, y], et ton
 * (facultatif, de 0,5 à 4 : clarté de la brume rapportée à la couleur de la brume du moteur ; 1,25 par défaut, celui du
 * décor par code).
 */
export type DecorMist = [number, number, number, number, number, number, number, [number, number]] | [number, number, number, number, number, number, number, [number, number], number];
export const DECOR_MAX_MISTS = 6;

export interface IlotDecorEntry {
  plans: Record<string, PlateEntry>;
  lumieres?: DecorLight[];
  /** Sol du moteur (pavés mouillés, reflets) sous le diorama ; défaut vrai. */
  sol?: boolean;
  camera?: DecorCamera;
  brumes?: DecorMist[];
}
export interface DecorManifest { version: 1; ilots: Record<string, IlotDecorEntry> }

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isInt = (x: unknown): x is number => isNum(x) && Number.isInteger(x);
const isVec3 = (x: unknown): x is [number, number, number] => Array.isArray(x) && x.length === 3 && x.every(isNum);

/** Mémoire GPU d'un plan (RGBA 8 bits, mipmaps comprises). */
export function plateGpuBytes(size: readonly [number, number]): number {
  return Math.round(size[0] * size[1] * 4 * (4 / 3));
}

/** Contrôle pur d'un plan (forme, dimensions, pose au monde, mélange, fiche, statut) : problèmes, vide si valable. */
export function checkPlate(label: string, e: unknown): string[] {
  const out: string[] = [];
  if (!e || typeof e !== 'object') return [`${label} : entrée absente`];
  const x = e as Partial<PlateEntry>;
  if (typeof x.file !== 'string' || !/^[\w.-]+\.png$/.test(x.file)) out.push(`${label} : fichier invalide`);
  if (typeof x.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(x.sha256)) out.push(`${label} : empreinte SHA-256 invalide`);
  const s = x.size;
  if (!Array.isArray(s) || s.length !== 2 || !isInt(s[0]) || !isInt(s[1]) || s[0] < 1 || s[1] < 1 || s[0] > DECOR_MAX_SIDE || s[1] > DECOR_MAX_SIDE) {
    out.push(`${label} : dimensions invalides (px entiers, ${DECOR_MAX_SIDE} au plus par côté)`);
  }
  if (!isVec3(x.at)) out.push(`${label} : position au monde invalide ([x, y, z] en mètres)`);
  if (!isNum(x.width) || x.width <= 0 || x.width > 400) out.push(`${label} : largeur au monde invalide (m, de 0 à 400)`);
  if (x.orient !== 'face' && x.orient !== 'sol' && x.orient !== 'cote') out.push(`${label} : orientation « face », « sol » ou « cote » attendue`);
  if (x.uv !== undefined) {
    const u = x.uv as unknown;
    const ok = Array.isArray(u) && u.length === 4 && u.every(isNum) && (([u0, v0, u1, v1]: [number, number, number, number]) => u0 >= 0 && v0 >= 0 && u1 <= 1 && v1 <= 1 && u0 < u1 && v0 < v1)(u as [number, number, number, number]);
    if (!ok) out.push(`${label} : sous-rectangle « uv » invalide ([u0, v0, u1, v1], 0 ≤ u0 < u1 ≤ 1, 0 ≤ v0 < v1 ≤ 1)`);
  }
  if (x.coupe !== undefined && typeof x.coupe !== 'boolean') out.push(`${label} : champ « coupe » non booléen`);
  if (x.vers !== undefined && (x.orient !== 'cote' || (x.vers !== 'est' && x.vers !== 'ouest'))) out.push(`${label} : « vers » (est ou ouest) réservé aux plans de côté`);
  if (!isInt(x.order) || x.order < 0 || x.order > 99) out.push(`${label} : ordre de dessin entier de 0 à 99 attendu`);
  if (x.blend !== 'decoupe' && x.blend !== 'fondu') out.push(`${label} : mélange « decoupe » ou « fondu » attendu`);
  if (x.lit !== undefined && (!isNum(x.lit) || x.lit < 0 || x.lit > 1)) out.push(`${label} : part d'éclairage hors de 0 à 1`);
  if (x.fog !== undefined && (!isNum(x.fog) || x.fog < 0 || x.fog > 1)) out.push(`${label} : part de brume hors de 0 à 1`);
  if (x.voile !== undefined && (!isNum(x.voile) || x.voile < 0 || x.voile > 1)) out.push(`${label} : voile atmosphérique hors de 0 à 1`);
  if (typeof x.source !== 'string' || !x.source.trim()) out.push(`${label} : provenance manquante`);
  if (typeof x.fiche !== 'string' || !/^art-src\/decors\/[\w.-]+\/fiche\.json$/.test(x.fiche)) out.push(`${label} : fiche de provenance manquante (art-src/decors/<id>/fiche.json)`);
  if (typeof x.approved !== 'boolean') out.push(`${label} : statut d'approbation manquant`);
  return out;
}

/** Contrôle pur d'une lumière du diorama. */
export function checkLight(label: string, e: unknown): string[] {
  const out: string[] = [];
  if (!e || typeof e !== 'object') return [`${label} : entrée absente`];
  const x = e as Partial<DecorLight>;
  if (!isVec3(x.at)) out.push(`${label} : position invalide`);
  const c = x.color as unknown;
  if (!(DECOR_LIGHT_COLORS as readonly unknown[]).includes(c) && !(isVec3(c) && c.every((v) => v >= 0 && v <= 4))) out.push(`${label} : couleur inconnue (${DECOR_LIGHT_COLORS.join(', ')} ou [r, g, b] linéaire)`);
  if (!isNum(x.intensity) || x.intensity < 0 || x.intensity > 50) out.push(`${label} : intensité hors de 0 à 50`);
  if (!isNum(x.radius) || x.radius <= 0 || x.radius > 60) out.push(`${label} : rayon hors de 0 à 60 m`);
  if (x.halo !== undefined && (!isNum(x.halo) || x.halo < 0 || x.halo > 20)) out.push(`${label} : halo hors de 0 à 20 m`);
  if (x.flicker !== undefined && !['lantern', 'candle', 'window', 'none'].includes(x.flicker)) out.push(`${label} : scintillement inconnu`);
  return out;
}

/**
 * Contrôle pur du diorama d'un îlot : chaque plan, nombre de plans, ordres uniques et cohérents avec la profondeur
 * (plans de face : un plan plus proche ne passe jamais avant un plan plus lointain), lumières, budget de mémoire GPU.
 */
export function checkIlotDecor(ilot: string, e: unknown): string[] {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return [`${ilot} : diorama illisible`];
  const x = e as Partial<IlotDecorEntry>;
  const out: string[] = [];
  const plans = x.plans;
  if (!plans || typeof plans !== 'object' || Array.isArray(plans)) return [`${ilot} : objet « plans » attendu`];
  const ids = Object.keys(plans);
  if (ids.length < 1 || ids.length > DECOR_MAX_PLATES) out.push(`${ilot} : ${ids.length} plans (de 1 à ${DECOR_MAX_PLATES})`);
  const valid: [string, PlateEntry][] = [];
  for (const id of ids) {
    if (!/^[\w-]+$/.test(id)) { out.push(`${ilot}/${id} : identifiant de plan invalide`); continue; }
    const bad = checkPlate(`${ilot}/${id}`, plans[id]);
    if (bad.length) out.push(...bad);
    else valid.push([id, plans[id]!]);
  }
  const orders = new Map<number, string>();
  for (const [id, p] of valid) {
    const dup = orders.get(p.order);
    if (dup) out.push(`${ilot} : ordre ${p.order} partagé par « ${dup} » et « ${id} »`);
    else orders.set(p.order, id);
  }
  const faces = valid.filter(([, p]) => p.orient === 'face');
  for (const [a, pa] of faces) {
    for (const [b, pb] of faces) {
      if (pa.at[2] < pb.at[2] && pa.order > pb.order) out.push(`${ilot} : « ${a} » (z ${pa.at[2]}) plus lointain que « ${b} » (z ${pb.at[2]}) mais dessiné après (ordre ${pa.order} > ${pb.order})`);
    }
  }
  const gpu = uniqueImageBytes(valid.map(([, p]) => p));
  if (gpu > DECOR_MAX_GPU_BYTES) out.push(`${ilot} : ${Math.round(gpu / 1048576)} Mo de mémoire GPU (> ${DECOR_MAX_GPU_BYTES / 1048576} Mo)`);
  if (x.lumieres !== undefined) {
    if (!Array.isArray(x.lumieres) || x.lumieres.length > DECOR_MAX_LIGHTS) out.push(`${ilot} : lumières en liste de ${DECOR_MAX_LIGHTS} au plus`);
    else x.lumieres.forEach((l, i) => out.push(...checkLight(`${ilot}/lumière ${i + 1}`, l)));
  }
  if (x.sol !== undefined && typeof x.sol !== 'boolean') out.push(`${ilot} : champ « sol » non booléen`);
  if (x.camera !== undefined) {
    const c = x.camera as Partial<DecorCamera> | null;
    const bad = (k: keyof DecorCamera, lo: number, hi: number) => c && c[k] !== undefined && (!isNum(c[k]) || c[k]! < lo || c[k]! > hi);
    if (!c || typeof c !== 'object' || bad('pitch', 0, 30) || bad('distance', 6, 60) || bad('fov', 15, 60) || bad('aimY', 0, 12) || bad('minX', -60, 60) || bad('maxX', -60, 60) || (isNum(c.minX) && isNum(c.maxX) && c.minX > c.maxX)
      || bad('followZ', 0, 1) || bad('aimZ', -60, 60) || bad('pitchFond', 0, 45) || bad('zFond', -80, 20)) {
      out.push(`${ilot} : cadrage invalide (inclinaison 0–30°, distance 6–60 m, champ 15–60°, hauteur visée 0–12 m, minX ≤ maxX ; suivi en profondeur 0–1, inclinaison au fond 0–45°)`);
    }
  }
  if (x.brumes !== undefined) {
    const b = x.brumes as unknown;
    const okTone = (m: unknown[]) => m.length === 8 || (m.length === 9 && isNum(m[8]) && (m[8] as number) >= 0.5 && (m[8] as number) <= 4);
    const okMist = (m: unknown) => Array.isArray(m) && okTone(m) && m.slice(0, 7).every(isNum) && (m[0] as number) > 0 && (m[1] as number) > 0 && (m[5] as number) >= 0 && (m[5] as number) <= 1 && Array.isArray(m[7]) && m[7].length === 2 && (m[7] as unknown[]).every(isNum);
    if (!Array.isArray(b) || b.length > DECOR_MAX_MISTS || !b.every(okMist)) out.push(`${ilot} : brumes en liste de ${DECOR_MAX_MISTS} au plus ([largeur, hauteur, x, y, z, opacité 0–1, dérive, [échelle x, y], ton 0,5–4 facultatif])`);
  }
  return out;
}

/** Plans d'un diorama valable, dans l'ordre de dessin (d'arrière en avant). */
export function platesInOrder(e: IlotDecorEntry): [string, PlateEntry][] {
  return Object.entries(e.plans).sort((a, b) => a[1].order - b[1].order);
}

/** Pose d'un plan au monde : centre, largeur (longueur le long de z, de côté), hauteur (profondeur, couché). */
export interface PlateRect { center: [number, number, number]; w: number; h: number; orient: 'face' | 'sol' | 'cote' }
export function plateRect(e: Pick<PlateEntry, 'at' | 'width' | 'size' | 'orient' | 'uv'>): PlateRect {
  const [u0, v0, u1, v1] = e.uv ?? [0, 0, 1, 1];
  const h = e.width * (((v1 - v0) * e.size[1]) / ((u1 - u0) * e.size[0]));
  const [x, y, z] = e.at;
  if (e.orient === 'sol') return { center: [x, y, z], w: e.width, h, orient: 'sol' };
  return { center: [x, y + h / 2, z], w: e.width, h, orient: e.orient };
}

/** Mémoire GPU des images d'un diorama, chaque image comptée une fois (plusieurs plans peuvent découper la même). */
export function uniqueImageBytes(plates: readonly Pick<PlateEntry, 'file' | 'sha256' | 'size'>[]): number {
  const seen = new Map<string, number>();
  for (const p of plates) seen.set(`${p.file}|${p.sha256}`, plateGpuBytes(p.size));
  return [...seen.values()].reduce((a, b) => a + b, 0);
}

/**
 * Décision pure d'admission d'un diorama (tout ou rien) : conformité, puis approbation selon la politique (hors QA, un
 * seul plan non approuvé fait refuser l'îlot entier ; en QA, les plans non approuvés passent et sont nommés).
 */
export function decideIlot(policy: SpritePolicy, ilot: string, e: unknown): { ok: boolean; unapproved: string[]; issues: string[] } {
  if (policy === 'code') return { ok: false, unapproved: [], issues: [] };
  const issues = checkIlotDecor(ilot, e);
  if (issues.length) return { ok: false, unapproved: [], issues: [...issues, `${ilot} : diorama refusé, décor par code gardé`] };
  const plates = platesInOrder(e as IlotDecorEntry);
  const unapproved = plates.filter(([, p]) => !p.approved).map(([id]) => `${ilot}/${id}`);
  const ok = plates.every(([, p]) => admit(policy, p.approved).ok);
  if (!ok) return { ok: false, unapproved: [], issues: unapproved.map((u) => `${u} : plan non approuvé, refusé hors QA (décor par code gardé)`) };
  return { ok: true, unapproved, issues: [] };
}

/**
 * Politique des plans : la même que celle des feuilles (`spritePolicy`), réglée par `?qa=1&decors=code|approuvees`.
 */
export { spritePolicy as decorPolicy } from './spritesExternes';

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export interface DecorManifestRead { manifest: DecorManifest | null; issue: string | null }
const manifests = new Map<string, Promise<DecorManifestRead>>();
/** Manifeste par défaut d'un dossier de plans (le laboratoire de la profondeur en lit un autre, passe 62). */
export const DECOR_MANIFEST = 'manifest.json';
/** Manifestes déjà lus (accès immédiat : la décision d'un îlot est synchrone une fois le manifeste connu). */
const manifestsRead = new Map<string, DecorManifestRead>();

/** Manifeste des plans (une seule lecture par emplacement) ; absent : null sans problème ; illisible : la raison. */
export function readDecorManifest(base = 'decors/', name = DECOR_MANIFEST): Promise<DecorManifestRead> {
  const key = `${base}${name}`;
  let m = manifests.get(key);
  if (!m) {
    m = fetch(key, { cache: 'no-store' })
      .then(async (r): Promise<DecorManifestRead> => {
        if (!r.ok) return { manifest: null, issue: null };
        const j = (await r.json()) as Partial<DecorManifest> | null;
        if (!j || j.version !== DECOR_VERSION || !j.ilots || typeof j.ilots !== 'object' || Array.isArray(j.ilots)) {
          return { manifest: null, issue: `manifeste des décors illisible (version ${DECOR_VERSION} et objet « ilots » attendus)` };
        }
        return { manifest: j as DecorManifest, issue: null };
      })
      .catch(() => ({ manifest: null, issue: null }))
      .then((res) => { manifestsRead.set(key, res); return res; });
    manifests.set(key, m);
  }
  return m;
}

interface DecodedPlate { bitmap: ImageBitmap; bytes: number; fetchMs: number; hashMs: number; decodeMs: number }
/** Plans décodés (partagés entre les villes, libérés en quittant l'îlot) : promesse et, une fois réglée, résultat. */
const decoding = new Map<string, Promise<DecodedPlate | string>>();
const decoded = new Map<string, DecodedPlate | string>();
const plateKey = (base: string, p: PlateEntry) => `${base}|${p.file}|${p.sha256}|${p.size[0]}×${p.size[1]}`;

/** Lecture, empreinte, décodage hors du fil principal (ImageBitmap prémultipliée) et contrôle des dimensions d'un plan. */
function decodePlate(base: string, p: PlateEntry): Promise<DecodedPlate | string> {
  const k = plateKey(base, p);
  let d = decoding.get(k);
  if (!d) {
    d = (async (): Promise<DecodedPlate | string> => {
      try {
        const t0 = performance.now();
        const res = await fetch(`${base}${p.file}`);
        if (!res.ok) return `${p.file} introuvable (${res.status})`;
        const buf = await res.arrayBuffer();
        const t1 = performance.now();
        const sum = hex(await crypto.subtle.digest('SHA-256', buf));
        const t2 = performance.now();
        if (sum !== p.sha256) return `empreinte ${sum.slice(0, 12)}… ≠ manifeste ${p.sha256.slice(0, 12)}…`;
        if (buf.byteLength > DECOR_MAX_BYTES) return `${p.file} pèse ${buf.byteLength} octets (> ${DECOR_MAX_BYTES / 1048576} Mo)`;
        // Retourné à la création (`flipY` est ignoré pour une ImageBitmap) ; prémultiplié : bords détourés filtrés sans
        // frange sombre, quel que soit le contenu des pixels transparents ; aucune conversion de couleur.
        const bitmap = await createImageBitmap(new Blob([buf], { type: 'image/png' }), { imageOrientation: 'flipY', premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' });
        if (bitmap.width !== p.size[0] || bitmap.height !== p.size[1]) {
          const why = `${bitmap.width}×${bitmap.height} au lieu de ${p.size[0]}×${p.size[1]}`;
          bitmap.close();
          return why;
        }
        const ms = (x: number) => Math.round(x * 10) / 10;
        return { bitmap, bytes: buf.byteLength, fetchMs: ms(t1 - t0), hashMs: ms(t2 - t1), decodeMs: ms(performance.now() - t2) };
      } catch (err) {
        return (err as Error).message;
      }
    })().then((r) => { if (decoding.get(k) === d) decoded.set(k, r); return r; });
    decoding.set(k, d);
  }
  return d;
}

/**
 * Prépare à l'avance (avant la création de la ville, aux temps morts) la lecture du manifeste et le décodage des plans de
 * ces îlots : à la création de la ville, la décision de l'îlot de départ est alors immédiate (diorama construit tout de
 * suite, sans détour par le décor par code). Sans effet visible ; jamais rejeté.
 */
export async function preloadDecors(ilots: readonly string[], policy: SpritePolicy, base = 'decors/', name = DECOR_MANIFEST): Promise<void> {
  if (policy === 'code') return;
  const read = await readDecorManifest(base, name);
  const all = read.manifest?.ilots;
  if (!all) return;
  await Promise.all(ilots.map(async (id) => {
    if (!Object.prototype.hasOwnProperty.call(all, id)) return;
    if (!decideIlot(policy, id, all[id]).ok) return;
    await Promise.all(platesInOrder(all[id]!).map(([, p]) => decodePlate(base, p)));
  }));
}

export interface PreparedPlate { id: string; entry: PlateEntry; texture: THREE.Texture }
export interface PreparedDiorama { ilot: string; plates: PreparedPlate[]; lights: DecorLight[]; ground: boolean; gpuBytes: number; camera: DecorCamera | null; mists: DecorMist[] }
export type DecorState = { state: 'code' } | { state: 'attente' } | { state: 'diorama'; diorama: PreparedDiorama };

export interface PlateTiming { bytes: number; fetchMs: number; hashMs: number; decodeMs: number; uploadMs: number }
export interface DecorReport {
  policy: SpritePolicy;
  /** Îlots dessinés par leur diorama. */
  loaded: string[];
  /** Plans non approuvés affichés (QA seulement), `îlot/plan`. */
  unapproved: string[];
  /** Refus motivés ; l'îlot garde son décor par code. */
  issues: string[];
  /** Mesures par plan préparé (`îlot/plan`) : octets, lecture, empreinte, décodage, envoi au GPU (ms). */
  timings: Record<string, PlateTiming>;
  /** Mémoire GPU des plans de chaque îlot préparé (octets, mipmaps comprises). */
  gpuBytes: Record<string, number>;
}

export interface DecorResolver {
  readonly policy: SpritePolicy;
  /** Lit le manifeste, contrôle et décode les plans de cet îlot (sans les envoyer au GPU) ; jamais rejeté. */
  prepare(ilot: string): Promise<void>;
  /**
   * Décision immédiate pour un îlot : diorama prêt (plans décodés, envoyés au GPU à cet appel s'ils ne l'étaient pas),
   * en attente (manifeste ou décodage en cours), ou décor par code (pas de diorama, refusé, politique `code`).
   */
  peek(ilot: string): DecorState;
  /** Libère les textures et les images des plans d'un îlot (en le quittant) ; un retour les prépare de nouveau. */
  release(ilot: string): void;
  report(): DecorReport;
}

/** Résolveur d'une ville : applique la politique au manifeste, envoie chaque plan une fois à son GPU, tient le rapport. */
export function createDecorResolver(policy: SpritePolicy, upload: (t: THREE.Texture) => void, opts: { base?: string; manifest?: string } = {}): DecorResolver {
  const base = opts.base ?? 'decors/';
  const name = opts.manifest ?? DECOR_MANIFEST;
  const report: DecorReport = { policy, loaded: [], unapproved: [], issues: [], timings: {}, gpuBytes: {} };
  const done = new Map<string, DecorState>();
  const issue = (s: string) => { if (!report.issues.includes(s)) report.issues.push(s); };
  const entryOf = (ilot: string): IlotDecorEntry | null | undefined => {
    const read = manifestsRead.get(`${base}${name}`);
    if (!read) return undefined;
    if (read.issue) issue(read.issue);
    const all = read.manifest?.ilots;
    return all && Object.prototype.hasOwnProperty.call(all, ilot) ? all[ilot]! : null;
  };
  return {
    policy,
    async prepare(ilot) {
      if (policy === 'code' || done.has(ilot)) return;
      const read = await readDecorManifest(base, name);
      const e = read.manifest?.ilots?.[ilot];
      if (!e || !decideIlot(policy, ilot, e).ok) return;
      await Promise.all(platesInOrder(e).map(([, p]) => decodePlate(base, p)));
    },
    peek(ilot) {
      if (policy === 'code') return { state: 'code' };
      const d = done.get(ilot);
      if (d) return d;
      const e = entryOf(ilot);
      if (e === undefined) return { state: 'attente' };
      if (e === null) { done.set(ilot, { state: 'code' }); return { state: 'code' }; }
      const decision = decideIlot(policy, ilot, e);
      if (!decision.ok) { decision.issues.forEach(issue); done.set(ilot, { state: 'code' }); return { state: 'code' }; }
      const plates = platesInOrder(e);
      const results = plates.map(([, p]) => decoded.get(plateKey(base, p)));
      if (results.some((r) => r === undefined)) {
        // décodage pas encore lancé (îlot jamais préparé) ou en cours
        for (const [, p] of plates) void decodePlate(base, p);
        return { state: 'attente' };
      }
      const bad = results.map((r, i) => (typeof r === 'string' ? `${ilot}/${plates[i]![0]} : ${r}` : null)).filter((x): x is string => !!x);
      if (bad.length) { bad.forEach(issue); issue(`${ilot} : diorama refusé, décor par code gardé`); done.set(ilot, { state: 'code' }); return { state: 'code' }; }
      // une texture par image : les plans qui découpent la même image (`uv`, passe 62) la partagent
      const shared = new Map<string, THREE.Texture>();
      const prepared: PreparedPlate[] = plates.map(([id, p], i) => {
        const r = results[i] as DecodedPlate;
        const k = plateKey(base, p);
        const had = shared.get(k);
        if (had) return { id, entry: p, texture: had };
        const tex = new THREE.Texture(r.bitmap);
        shared.set(k, tex);
        tex.name = `plan:${ilot}/${id}`;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.premultiplyAlpha = false;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        const u0 = performance.now();
        upload(tex);
        report.timings[`${ilot}/${id}`] = { bytes: r.bytes, fetchMs: r.fetchMs, hashMs: r.hashMs, decodeMs: r.decodeMs, uploadMs: Math.round((performance.now() - u0) * 10) / 10 };
        return { id, entry: p, texture: tex };
      });
      const gpuBytes = uniqueImageBytes(plates.map(([, p]) => p));
      report.gpuBytes[ilot] = gpuBytes;
      if (!report.loaded.includes(ilot)) report.loaded.push(ilot);
      for (const u of decision.unapproved) if (!report.unapproved.includes(u)) report.unapproved.push(u);
      const st: DecorState = { state: 'diorama', diorama: { ilot, plates: prepared, lights: e.lumieres ?? [], ground: e.sol !== false, gpuBytes, camera: e.camera ?? null, mists: e.brumes ?? [] } };
      done.set(ilot, st);
      return st;
    },
    release(ilot) {
      const d = done.get(ilot);
      if (!d || d.state !== 'diorama') return;
      done.delete(ilot);
      // une image partagée avec un autre îlot encore préparé reste (son plan l'utilise)
      const kept = new Set([...done.values()].flatMap((s) => (s.state === 'diorama' ? s.diorama.plates.map((q) => plateKey(base, q.entry)) : [])));
      const disposed = new Set<THREE.Texture>();
      for (const p of d.diorama.plates) {
        if (disposed.has(p.texture)) continue;
        disposed.add(p.texture);
        p.texture.dispose();
        const k = plateKey(base, p.entry);
        if (kept.has(k)) continue;
        const r = decoded.get(k);
        if (r && typeof r !== 'string') r.bitmap.close();
        decoded.delete(k);
        decoding.delete(k);
      }
    },
    report: () => ({ policy, loaded: [...report.loaded], unapproved: [...report.unapproved], issues: [...report.issues], timings: { ...report.timings }, gpuBytes: { ...report.gpuBytes } }),
  };
}
