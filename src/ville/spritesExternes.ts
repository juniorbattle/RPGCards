/**
 * M09 — feuilles de personnages de la ville (ADR 027) : contrat du manifeste, contrôle, politique d'approbation et
 * préparation. Exception unique à la règle « aucune image externe au runtime » (AGENTS, section « Feuilles de
 * personnages de la ville ») : une feuille n'entre dans la ville que si elle figure dans `sprites/manifest.json` (à côté
 * de la page ; copié de `public/sprites/` par Vite), que sa forme, sa grille, son empreinte SHA-256 et ses dimensions
 * sont conformes et, hors QA, qu'elle est approuvée par le responsable (`approved: true`). Sinon le personnage dessiné
 * par code reste (`sprites.ts`) et la raison est rapportée (`issues`), jamais en silence. Méthode du manifeste de
 * provenance et d'empreinte d'après Cité du Tournoi (`src/characters/BakedCast.ts`, lecture seule).
 *
 * Contrat v2 (C1, C5) : grille logique de 96 × 160 px par case, 5 colonnes (repos, puis 4 temps de marche) × 3 rangées
 * (face, dos, profil droit ; le gauche est le miroir), dessinée à l'échelle `scale` (1, 1,5 ou 2 : 192 × 320 px par
 * case et feuille de 960 × 960 à l'échelle 2) ; ancrage des pieds `anchor` et hauteur de figure `figureH` en px
 * logiques (la taille du panneau en découle) ; tons clés réservés `recolor` (recoloration dans le nuanceur) ; fiche de
 * provenance `fiche` (`art-src/sprites/<id>/fiche.json`). Contrat v1 (passe 42) toujours accepté : échelle 1, ancrage
 * [48, 152], figure de 148, ni teinte ni fiche.
 *
 * Clés du manifeste : l'identifiant exact d'abord, puis la feuille commune d'un dessin recoloré : `player` pour les
 * quatre `player-<Famille>`, `pnj-<gabarit>` pour tous les `pnj-<gabarit>-<graine>` (ADR 027, D5).
 */
import * as THREE from 'three';

/** Grille logique du contrat (celle de l'atlas dessiné par code). */
export const SHEET_CELL: readonly [number, number] = [96, 160];
export const SHEET_COLS = 5;
export const SHEET_ROWS = 3;
/** Ancrage des pieds et hauteur de figure par défaut (contrat v1, atlas par code), en px logiques de la case. */
export const DEFAULT_ANCHOR: readonly [number, number] = [48, 152];
export const DEFAULT_FIGURE_H = 148;
/** Échelles admises : px de la feuille par px logique. */
export const SHEET_SCALES = [1, 1.5, 2] as const;
/** Budget d'une feuille (AGENTS) : vérifié par le test du manifeste. */
export const SHEET_MAX_BYTES = 1024 * 1024;

/**
 * Recoloration (C5). Une feuille peint chaque zone recolorable dans un ton clé réservé, à quatre niveaux ; le nuanceur
 * (`SPRITE_FRAG`) remplace ces tons par la rampe du personnage (`recolorTargets`, `sprites.ts`) : peau, cheveux, tenue,
 * chemise des PNJ tirées de `npcLook` (graine), tenue et accent du duelliste joueur tirés de `FAMILY_PALETTE` (famille).
 * Teintes clés (sRGB, canaux actifs à la même valeur, les autres à 0) : peau rouge, cheveux jaune, tenue magenta,
 * chemise cyan, accent vert. Niveaux (valeur des canaux actifs) : 64 ombre profonde, 128 ombre, 191 aplat, 255 rehaut
 * (tenue : #400040, #800080, #bf00bf, #ff00ff). Aucune autre couleur de la feuille ne doit approcher ces teintes, et un
 * trait d'encre sépare une zone clé de toute autre couleur (sinon un liseré mêlé reste à la frontière).
 */
export const RECOLOR_SLOTS = ['peau', 'cheveux', 'tenue', 'chemise', 'accent'] as const;
export type RecolorSlot = (typeof RECOLOR_SLOTS)[number];
export const RECOLOR_KEYS: Readonly<Record<RecolorSlot, readonly [number, number, number]>> = {
  peau: [1, 0, 0], cheveux: [1, 1, 0], tenue: [1, 0, 1], chemise: [0, 1, 1], accent: [0, 1, 0],
};
export const RECOLOR_LEVELS = [64, 128, 191, 255] as const;
/** Ordre des niveaux, du plus sombre au plus clair (clés d'un `Tone`). */
export const RAMP_STEPS = ['deep', 'shade', 'base', 'hi'] as const;

/** Couleur d'un ton clé (`#rrggbb`) : emplacement et niveau (0 ombre profonde … 3 rehaut). */
export function keyColor(slot: RecolorSlot, level: number): string {
  const v = RECOLOR_LEVELS[level]!;
  return `#${RECOLOR_KEYS[slot].map((on) => (on ? v : 0).toString(16).padStart(2, '0')).join('')}`;
}

export interface SpriteManifestEntryV1 {
  /** Fichier PNG relatif au manifeste. */
  file: string;
  /** Empreinte SHA-256 (hex) du fichier exact. */
  sha256: string;
  /** Taille logique d'une case (px) et grille ; doivent valoir celles du contrat. */
  cell: [number, number];
  cols: number;
  rows: number;
  /** Provenance : outil, fichier source, auteur, date (traçabilité, comme les images de référence). */
  source: string;
  /** Approuvé par le responsable (jamais vrai sans sa décision citée au JOURNAL). */
  approved: boolean;
}

export interface SpriteManifestEntryV2 extends SpriteManifestEntryV1 {
  /** Px de la feuille par px logique (1, 1,5 ou 2). */
  scale: number;
  /** Pieds (milieu entre les deux pieds au repos, face et dos ; bassin en profil), px logiques de la case. */
  anchor: [number, number];
  /** Hauteur de la figure, de la semelle au sommet de la tête (cheveux compris), px logiques. */
  figureH: number;
  /** Emplacements peints en tons clés réservés (recoloration dans le nuanceur). */
  recolor?: RecolorSlot[];
  /** Fiche de provenance commitée : `art-src/sprites/<id>/fiche.json`. */
  fiche: string;
}

export type SpriteManifestEntry = SpriteManifestEntryV1 | SpriteManifestEntryV2;
export interface SpriteManifest { version: 1 | 2; sprites: Record<string, SpriteManifestEntry> }

/** Géométrie et teintes d'une feuille, déduites de son entrée (v1 : valeurs de l'atlas par code). */
export interface SheetSpec {
  scale: number;
  anchor: readonly [number, number];
  figureH: number;
  recolor: readonly RecolorSlot[];
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * Contrôle pur d'une entrée de manifeste (forme, grille du contrat, échelle, ancrage, figure, teintes, fiche) : liste
 * des problèmes, vide si l'entrée est valable. `version` : celle du manifeste qui la contient.
 */
export function checkManifestEntry(id: string, e: unknown, version: 1 | 2 = 2): string[] {
  const out: string[] = [];
  if (!e || typeof e !== 'object') return [`${id} : entrée absente`];
  const x = e as Partial<SpriteManifestEntryV2>;
  if (typeof x.file !== 'string' || !/^[\w.-]+\.png$/.test(x.file)) out.push(`${id} : fichier invalide`);
  if (typeof x.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(x.sha256)) out.push(`${id} : empreinte SHA-256 invalide`);
  if (!Array.isArray(x.cell) || x.cell[0] !== SHEET_CELL[0] || x.cell[1] !== SHEET_CELL[1]) out.push(`${id} : cellule différente de ${SHEET_CELL.join('×')}`);
  if (x.cols !== SHEET_COLS || x.rows !== SHEET_ROWS) out.push(`${id} : grille différente de ${SHEET_COLS}×${SHEET_ROWS}`);
  if (typeof x.source !== 'string' || !x.source.trim()) out.push(`${id} : provenance manquante`);
  if (typeof x.approved !== 'boolean') out.push(`${id} : statut d'approbation manquant`);
  if (version === 1) return out;
  if (!(SHEET_SCALES as readonly unknown[]).includes(x.scale)) out.push(`${id} : échelle ${String(x.scale)} hors de ${SHEET_SCALES.join(', ')}`);
  const a = x.anchor;
  if (!Array.isArray(a) || a.length !== 2 || !isNum(a[0]) || !isNum(a[1]) || a[0] <= 0 || a[0] >= SHEET_CELL[0] || a[1] <= 0 || a[1] > SHEET_CELL[1]) {
    out.push(`${id} : ancrage des pieds invalide (px logiques dans la case ${SHEET_CELL.join('×')})`);
  } else if (!isNum(x.figureH) || x.figureH < SHEET_CELL[1] / 2 || x.figureH > a[1]) {
    out.push(`${id} : hauteur de figure invalide (de ${SHEET_CELL[1] / 2} à la ligne des pieds, ${a[1]})`);
  }
  if (x.recolor !== undefined) {
    const r = x.recolor as unknown;
    if (!Array.isArray(r) || r.some((s) => !(RECOLOR_SLOTS as readonly unknown[]).includes(s)) || new Set(r).size !== r.length) {
      out.push(`${id} : teintes inconnues ou répétées (${RECOLOR_SLOTS.join(', ')})`);
    }
  }
  if (typeof x.fiche !== 'string' || !/^art-src\/sprites\/[\w.-]+\/fiche\.json$/.test(x.fiche)) out.push(`${id} : fiche de provenance manquante (art-src/sprites/<id>/fiche.json)`);
  return out;
}

/** Spécification d'une entrée valable (à n'appeler qu'après `checkManifestEntry`). */
export function specOf(e: SpriteManifestEntry, version: 1 | 2): SheetSpec {
  if (version === 1) return { scale: 1, anchor: DEFAULT_ANCHOR, figureH: DEFAULT_FIGURE_H, recolor: [] };
  const v = e as SpriteManifestEntryV2;
  return { scale: v.scale, anchor: [v.anchor[0], v.anchor[1]], figureH: v.figureH, recolor: v.recolor ?? [] };
}

/** Dimensions attendues d'une feuille (px) pour une échelle. */
export function sheetSize(scale: number): [number, number] {
  return [Math.round(SHEET_CELL[0] * scale) * SHEET_COLS, Math.round(SHEET_CELL[1] * scale) * SHEET_ROWS];
}

/** Clés du manifeste essayées pour un personnage, dans l'ordre : l'identifiant, puis la feuille commune de son dessin. */
export function sheetKeys(id: string): string[] {
  const keys = [id];
  if (/^player-[A-Za-z]+$/.test(id)) keys.push('player');
  const n = /^(pnj-[a-z]+)-\d+$/.exec(id);
  if (n) keys.push(n[1]!);
  return keys;
}

/**
 * Politique des feuilles : `approuvees` (jeu, défaut) n'accepte que les feuilles approuvées ; `qa` (`?qa=1`) affiche
 * aussi les non approuvées et le rapporte ; `code` (`?qa=1&sprites=code`) garde l'atlas dessiné par code ;
 * `?qa=1&sprites=approuvees` éprouve la politique du jeu avec les crochets de QA. (`sprites=externes`, ancien
 * interrupteur de la passe 42, vaut désormais `qa`.)
 */
export type SpritePolicy = 'code' | 'approuvees' | 'qa';
export function spritePolicy(qa: boolean, param: string | null): SpritePolicy {
  if (!qa) return 'approuvees';
  if (param === 'code') return 'code';
  if (param === 'approuvees') return 'approuvees';
  return 'qa';
}

/** Décision d'approbation (C2) : hors QA, une feuille non approuvée est refusée ; en QA elle passe, signalée. */
export function admit(policy: SpritePolicy, approved: boolean): { ok: boolean; unapproved: boolean } {
  if (policy === 'code') return { ok: false, unapproved: !approved };
  return { ok: approved || policy === 'qa', unapproved: !approved };
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

interface ManifestRead { manifest: SpriteManifest | null; issue: string | null }
const manifests = new Map<string, Promise<ManifestRead>>();

/** Manifeste des feuilles (une seule lecture par emplacement) ; absent : null sans problème ; illisible : la raison. */
export function readManifest(base = 'sprites/'): Promise<ManifestRead> {
  let m = manifests.get(base);
  if (!m) {
    m = fetch(`${base}manifest.json`, { cache: 'no-store' })
      .then(async (r): Promise<ManifestRead> => {
        if (!r.ok) return { manifest: null, issue: null };
        const j = (await r.json()) as Partial<SpriteManifest> | null;
        if (!j || (j.version !== 1 && j.version !== 2) || !j.sprites || typeof j.sprites !== 'object' || Array.isArray(j.sprites)) {
          return { manifest: null, issue: 'manifeste des feuilles illisible (version 1 ou 2 et objet « sprites » attendus)' };
        }
        return { manifest: j as SpriteManifest, issue: null };
      })
      .catch(() => ({ manifest: null, issue: null }));
    manifests.set(base, m);
  }
  return m;
}

/** Feuilles décodées, partagées entre les villes (comme les atlas par code) : clé = emplacement, fichier, empreinte. */
const decoded = new Map<string, Promise<THREE.Texture | string>>();

/** Lecture, empreinte, décodage hors du fil principal (ImageBitmap) et contrôle des dimensions d'une feuille. */
function decodeSheet(base: string, e: SpriteManifestEntry, spec: SheetSpec): Promise<THREE.Texture | string> {
  const k = `${base}|${e.file}|${e.sha256}|${spec.scale}`;
  let p = decoded.get(k);
  if (!p) {
    p = (async () => {
      try {
        const t0 = performance.now();
        const res = await fetch(`${base}${e.file}`, { cache: 'no-store' });
        if (!res.ok) return `${e.file} introuvable (${res.status})`;
        const buf = await res.arrayBuffer();
        const t1 = performance.now();
        const sum = hex(await crypto.subtle.digest('SHA-256', buf));
        const t2 = performance.now();
        if (sum !== e.sha256) return `empreinte ${sum.slice(0, 12)}… ≠ manifeste ${e.sha256.slice(0, 12)}…`;
        // Retournée à la création (`flipY` est ignoré pour une ImageBitmap) : même convention de lignes que l'atlas sur
        // canvas. Ni prémultiplication ni conversion de couleur : les tons clés et le fond d'encre sous l'alpha restent exacts.
        const bmp = await createImageBitmap(new Blob([buf], { type: 'image/png' }), { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        const [w, h] = sheetSize(spec.scale);
        if (bmp.width !== w || bmp.height !== h) {
          const why = `${bmp.width}×${bmp.height} au lieu de ${w}×${h} (échelle ${spec.scale})`;
          bmp.close();
          return why;
        }
        const tex = new THREE.Texture(bmp);
        const ms = (x: number) => Math.round(x * 10) / 10;
        tex.userData.timing = { bytes: buf.byteLength, fetchMs: ms(t1 - t0), hashMs: ms(t2 - t1), decodeMs: ms(performance.now() - t2) };
        tex.name = `feuille:${e.file}`;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        return tex;
      } catch (err) {
        return (err as Error).message;
      }
    })();
    decoded.set(k, p);
  }
  return p;
}

export interface PreparedSheet {
  /** Clé du manifeste (identifiant, ou feuille commune `player` / `pnj-<gabarit>`). */
  key: string;
  texture: THREE.Texture;
  spec: SheetSpec;
  approved: boolean;
}
export type SheetState = { state: 'code' } | { state: 'attente' } | { state: 'prete'; sheet: PreparedSheet };

export interface ExternalReport {
  policy: SpritePolicy;
  /** Personnages dessinés par une feuille. */
  loaded: string[];
  /** Parmi eux, feuilles non approuvées (affichées en QA seulement). */
  unapproved: string[];
  /** Refus motivés (forme, grille, empreinte, dimensions, statut, teintes) ; le personnage garde son dessin par code. */
  issues: string[];
  /** Mesures par feuille préparée (clé du manifeste) : octets, lecture, empreinte, décodage, envoi au GPU (ms). */
  timings: Record<string, SheetTiming>;
}
export interface SheetTiming { bytes: number; fetchMs: number; hashMs: number; decodeMs: number; uploadMs: number }

export interface SheetResolver {
  readonly policy: SpritePolicy;
  /**
   * Prépare les feuilles de ces personnages : manifeste, contrôle, empreinte, décodage, envoi au GPU (`upload`). Résolu
   * quand chacune est prête ou refusée (jamais rejeté).
   */
  prepare(ids: readonly string[]): Promise<void>;
  /** État immédiat : feuille prête, en attente (manifeste ou décodage en cours, ou pas encore préparée), dessin par code. */
  peek(id: string): SheetState;
  report(): ExternalReport;
}

/**
 * Résolveur d'une ville : applique la politique aux feuilles du manifeste, envoie chaque texture une fois à son GPU et
 * tient le rapport. `check` ajoute un contrôle propre au personnage (teintes sans couleur cible, `ville.ts`).
 */
export function createSheetResolver(policy: SpritePolicy, upload: (t: THREE.Texture) => void, opts: { base?: string; check?: (id: string, spec: SheetSpec) => string[] } = {}): SheetResolver {
  const base = opts.base ?? 'sprites/';
  const report: ExternalReport = { policy, loaded: [], unapproved: [], issues: [], timings: {} };
  const done = new Map<string, SheetState>();
  const running = new Map<string, Promise<void>>();
  const uploaded = new WeakSet<THREE.Texture>();
  let read: ManifestRead | null = null;
  const issue = (s: string) => { if (!report.issues.includes(s)) report.issues.push(s); };
  const entryOf = (id: string): { key: string; entry: SpriteManifestEntry } | null => {
    const sprites = read?.manifest?.sprites;
    if (!sprites) return null;
    for (const key of sheetKeys(id)) if (Object.prototype.hasOwnProperty.call(sprites, key)) return { key, entry: sprites[key]! };
    return null;
  };
  const one = async (id: string): Promise<SheetState> => {
    const found = entryOf(id);
    if (!found) return { state: 'code' };
    const { key, entry } = found;
    const version = read!.manifest!.version;
    const label = key === id ? id : `${id} (feuille ${key})`;
    const bad = checkManifestEntry(label, entry, version);
    if (bad.length) { bad.forEach(issue); return { state: 'code' }; }
    const a = admit(policy, entry.approved);
    if (!a.ok) { issue(`${label} : feuille non approuvée, refusée hors QA (dessin par code gardé)`); return { state: 'code' }; }
    const spec = specOf(entry, version);
    const extra = opts.check?.(id, spec) ?? [];
    if (extra.length) { extra.forEach(issue); return { state: 'code' }; }
    const tex = await decodeSheet(base, entry, spec);
    if (typeof tex === 'string') { issue(`${label} : ${tex}`); return { state: 'code' }; }
    if (!uploaded.has(tex)) {
      uploaded.add(tex);
      const u0 = performance.now();
      upload(tex);
      report.timings[key] = { ...(tex.userData.timing as Omit<SheetTiming, 'uploadMs'>), uploadMs: Math.round((performance.now() - u0) * 10) / 10 };
    }
    if (!report.loaded.includes(id)) report.loaded.push(id);
    if (a.unapproved && !report.unapproved.includes(id)) report.unapproved.push(id);
    return { state: 'prete', sheet: { key, texture: tex, spec, approved: entry.approved } };
  };
  return {
    policy,
    async prepare(ids) {
      if (policy === 'code') return;
      if (!read) {
        read = await readManifest(base);
        if (read.issue) issue(read.issue);
      }
      await Promise.all(ids.map((id) => {
        if (done.has(id)) return undefined;
        let r = running.get(id);
        if (!r) {
          r = one(id).then((st) => { done.set(id, st); running.delete(id); });
          running.set(id, r);
        }
        return r;
      }));
    },
    peek(id) {
      if (policy === 'code') return { state: 'code' };
      const d = done.get(id);
      if (d) return d;
      // manifeste lu : un personnage sans entrée est décidé tout de suite (dessin par code), sans attendre de préparation
      if (read && !entryOf(id)) return { state: 'code' };
      return { state: 'attente' };
    },
    report: () => ({ policy, loaded: [...report.loaded], unapproved: [...report.unapproved], issues: [...report.issues], timings: { ...report.timings } }),
  };
}
