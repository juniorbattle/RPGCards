/**
 * M09 — PRÉPARATION (décision réservée au responsable : approbation d'assets, amendement de la règle « aucune image
 * externe au runtime ») : feuilles de sprites externes pour les personnages clés (Aseprite plus tard), à la manière de
 * Cité du Tournoi (`src/characters/BakedCast.ts` : manifeste de provenance et empreinte). **Inactif par défaut** :
 * seulement avec `?qa=1&sprites=externes`, et seulement si un manifeste existe à `sprites/manifest.json` à côté de la
 * page (le dépôt n'en contient aucun : sans lui, les marcheurs dessinés par code restent). Une feuille n'est acceptée
 * que si son empreinte SHA-256 correspond au manifeste et que sa grille est celle de l'atlas procédural (5 × 3 cellules :
 * repos + 4 temps de marche, face / dos / profil), pour rester interchangeable sans toucher au moteur de la ville.
 */
import * as THREE from 'three';

export interface SpriteManifestEntry {
  /** Fichier PNG relatif au manifeste. */
  file: string;
  /** Empreinte SHA-256 (hex) du fichier exact. */
  sha256: string;
  /** Taille d'une cellule (px) et grille ; doit valoir celle de l'atlas procédural. */
  cell: [number, number];
  cols: number;
  rows: number;
  /** Provenance : outil, fichier source, auteur, date (traçabilité, comme les images de référence). */
  source: string;
  /** Approuvé par le responsable pour la production (jamais vrai sans sa décision). */
  approved: boolean;
}

export interface SpriteManifest { version: 1; sprites: Record<string, SpriteManifestEntry> }

/** Contrôle pur d'une entrée de manifeste (forme, grille attendue) : liste des problèmes, vide si valable. */
export function checkManifestEntry(id: string, e: unknown, expected: { cell: [number, number]; cols: number; rows: number }): string[] {
  const out: string[] = [];
  if (!e || typeof e !== 'object') return [`${id} : entrée absente`];
  const x = e as Partial<SpriteManifestEntry>;
  if (typeof x.file !== 'string' || !/^[\w.-]+\.png$/.test(x.file)) out.push(`${id} : fichier invalide`);
  if (typeof x.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(x.sha256)) out.push(`${id} : empreinte SHA-256 invalide`);
  if (!Array.isArray(x.cell) || x.cell[0] !== expected.cell[0] || x.cell[1] !== expected.cell[1]) out.push(`${id} : cellule différente de ${expected.cell.join('×')}`);
  if (x.cols !== expected.cols || x.rows !== expected.rows) out.push(`${id} : grille différente de ${expected.cols}×${expected.rows}`);
  if (typeof x.source !== 'string' || !x.source.trim()) out.push(`${id} : provenance manquante`);
  if (typeof x.approved !== 'boolean') out.push(`${id} : statut d'approbation manquant`);
  return out;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

let manifest: Promise<SpriteManifest | null> | null = null;

/** Manifeste des feuilles externes (une seule lecture), ou null s'il n'existe pas. */
export function spriteManifest(base = 'sprites/'): Promise<SpriteManifest | null> {
  manifest ??= fetch(`${base}manifest.json`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((m: SpriteManifest | null) => (m && m.version === 1 && m.sprites && typeof m.sprites === 'object' ? m : null))
    .catch(() => null);
  return manifest;
}

export interface ExternalAtlas { texture: THREE.Texture; entry: SpriteManifestEntry }

/**
 * Feuille externe d'un personnage, vérifiée (forme, grille, empreinte, dimensions), ou null : on retombe alors sur
 * l'atlas dessiné par code. Les refus sont rapportés dans `issues` (jamais silencieux en QA).
 */
export async function loadExternalAtlas(id: string, expected: { cell: [number, number]; cols: number; rows: number }, issues: string[], base = 'sprites/'): Promise<ExternalAtlas | null> {
  const m = await spriteManifest(base);
  const e = m?.sprites[id];
  if (!e) return null;
  const bad = checkManifestEntry(id, e, expected);
  if (bad.length) { issues.push(...bad); return null; }
  try {
    const res = await fetch(`${base}${e.file}`, { cache: 'no-store' });
    if (!res.ok) { issues.push(`${id} : ${e.file} introuvable (${res.status})`); return null; }
    const buf = await res.arrayBuffer();
    const sum = hex(await crypto.subtle.digest('SHA-256', buf));
    if (sum !== e.sha256) { issues.push(`${id} : empreinte ${sum.slice(0, 12)}… ≠ manifeste ${e.sha256.slice(0, 12)}…`); return null; }
    // Retournée à la création (`flipY` est ignoré pour une ImageBitmap) : même convention de lignes que l'atlas sur canvas.
    const bmp = await createImageBitmap(new Blob([buf], { type: 'image/png' }), { imageOrientation: 'flipY' });
    if (bmp.width !== e.cell[0] * e.cols || bmp.height !== e.cell[1] * e.rows) { issues.push(`${id} : ${bmp.width}×${bmp.height} au lieu de ${e.cell[0] * e.cols}×${e.cell[1] * e.rows}`); return null; }
    const tex = new THREE.Texture(bmp);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.needsUpdate = true;
    return { texture: tex, entry: e };
  } catch (err) {
    issues.push(`${id} : ${(err as Error).message}`);
    return null;
  }
}
