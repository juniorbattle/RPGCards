/**
 * M09 — accessoires de la ville en rangs (retours R1 du responsable, fiche du lot M10-E, 2026-10-21 : « le chemin
 * lumineux ne doit pas être caché par ces props »). Un accessoire est un plan peint debout, vu de face : vu de la caméra,
 * il cache le sol derrière lui, sur une profondeur qui grandit avec sa hauteur (caméra basse : 6 à 16°). Fonctions pures :
 * le sol caché par un accessoire pour une caméra donnée, et les points d'un chemin lumineux cachés quand le personnage le
 * suit (la caméra suit le personnage : `framingFor`).
 */
import { framingFor, type RigParams } from './cameras';
import type { CheminSegment } from './rangs';

/**
 * Accessoire debout : milieu en x, z de son pied (bord avant), largeur et hauteur de son plan (m) ; `profil` (facultatif) :
 * hauteur opaque de chaque colonne de l'image, en fraction de `h`, de gauche à droite (silhouette : un banc sous un arbre
 * ne cache pas comme un mur).
 */
export interface AccessoireDebout { id: string; x: number; z: number; w: number; h: number; profil?: readonly number[] }

/** Hauteur opaque de l'accessoire autour de x (m), sur `marge` m de part et d'autre ; 0 hors de lui. */
function hauteurEn(a: AccessoireDebout, x: number, marge: number): number {
  const g = a.x - a.w / 2;
  if (x < g - marge || x > g + a.w + marge) return 0;
  if (!a.profil?.length) return a.h;
  const n = a.profil.length;
  const i0 = Math.max(0, Math.floor(((x - marge - g) / a.w) * n));
  const i1 = Math.min(n - 1, Math.floor(((x + marge - g) / a.w) * n));
  let m = 0;
  for (let i = i0; i <= i1; i++) m = Math.max(m, a.profil[i]!);
  return m * a.h;
}
export interface PointCache { accessoire: string; x: number; z: number; depuis: { x: number; z: number } }

/**
 * Le point du sol `g` est-il caché par l'accessoire `a`, vu de la caméra `c` ? Le rayon de la caméra au point coupe le
 * plan de l'accessoire (z = a.z) à la hauteur y = c.y (1 − t) et en x = c.x + t (g.x − c.x), t = (c.z − a.z) / (c.z − g.z) ;
 * caché si la colonne de l'accessoire y est opaque jusqu'à cette hauteur (estimation prudente : les trous sous le haut
 * d'une colonne ne comptent pas) ; `marge` élargit l'accessoire sur ses côtés.
 */
export function solCache(g: { x: number; z: number }, a: AccessoireDebout, c: { x: number; y: number; z: number }, marge = 0): boolean {
  if (g.z >= a.z || c.z <= a.z || c.y <= a.h) return false;
  const t = (c.z - a.z) / (c.z - g.z);
  const y = c.y * (1 - t);
  const x = c.x + t * (g.x - c.x);
  return y <= hauteurEn(a, x, marge);
}

/** Points d'un chemin, tous les `pas` m (bouts compris). */
export function pointsDuChemin(segments: readonly CheminSegment[], pas = 0.25): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (const s of segments) {
    const L = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
    const n = Math.max(1, Math.ceil(L / pas));
    for (let i = 0; i <= n; i++) out.push({ x: s.x0 + ((s.x1 - s.x0) * i) / n, z: s.z0 + ((s.z1 - s.z0) * i) / n });
  }
  return out;
}

/**
 * Points du chemin cachés par un accessoire quand le personnage suit ce chemin : pour chaque position du personnage sur
 * le chemin, la caméra du cadrage de l'îlot, et les points du chemin à moins de `portee` m de lui (le chemin se révèle
 * autour du personnage, `chemins.ts`). `marge` : largeur visible du chemin de part et d'autre de son tracé (m).
 * `opacite` : opacité de l'accessoire pour cette position du personnage et de la caméra (le diorama efface les plans
 * loin devant le personnage et tout près de la caméra) ; un accessoire à moins de moitié opaque ne cache rien.
 */
export function cheminsCaches(segments: readonly CheminSegment[], accessoires: readonly AccessoireDebout[], rig: RigParams, opts: { portee?: number; marge?: number; pas?: number; opacite?: (a: AccessoireDebout, p: { x: number; z: number }, c: { x: number; y: number; z: number }) => number } = {}): PointCache[] {
  const portee = opts.portee ?? 8;
  const marge = opts.marge ?? 0.5;
  const pts = pointsDuChemin(segments, opts.pas ?? 0.25);
  const out: PointCache[] = [];
  const vus = new Set<string>();
  for (const p of pts) {
    const c = framingFor(rig, p).pos;
    for (const q of pts) {
      if (Math.hypot(q.x - p.x, q.z - p.z) > portee) continue;
      for (const a of accessoires) {
        if (!solCache(q, a, c, marge) || (opts.opacite && opts.opacite(a, p, c) < 0.5)) continue;
        const k = `${a.id}|${q.x.toFixed(2)}|${q.z.toFixed(2)}`;
        if (vus.has(k)) continue;
        vus.add(k);
        out.push({ accessoire: a.id, x: q.x, z: q.z, depuis: p });
      }
    }
  }
  return out;
}
