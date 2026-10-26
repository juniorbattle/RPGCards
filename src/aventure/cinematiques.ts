/**
 * M11 — cinématiques runtime (`docs/m11/07_CINEMATIQUES.md`, PROPOSÉ ; ADR 043). Demande du responsable (2026-10-26) :
 * « ajouter des cinématiques runtimes pour optimiser certains passages de gameplay ». Des plans joués par le moteur de la
 * ville (aucune vidéo, aucune image) : la caméra de l'îlot vise un autre point que le joueur, se rapproche ou s'éloigne,
 * coupe ou glisse ; des bandes, un carton de lieu, et toujours « Passer ». Mode Aventure seulement.
 *
 * Ce module est PUR : il choisit les plans (où regarder, combien de temps), les textes des cartons et le réglage ; le
 * déroulé (bandes, minuterie, touches) est dans `cinema.ts`, les actions (marche d'un personnage) dans l'application.
 */
import type { IlotId } from '../ville/ilots';
import type { Vec2 } from '../ville/monde';

/**
 * Un plan : la caméra vise `at`, avec des réglages relatifs à ceux de l'îlot (`zoom` multiplie la distance, `hauteur`
 * s'ajoute à la hauteur visée) ; `mouvement` : `coupe` (franche), `glisse` (amortie, constante `tau` en s) ou
 * `travelling` (du plan précédent à celui-ci, minuté sur `ms`, adouci aux deux bouts) ; `ms` : durée du plan.
 */
export interface Plan { at: Vec2; zoom?: number; hauteur?: number; mouvement: 'coupe' | 'glisse' | 'travelling'; ms: number; tau?: number }

export type CinematiqueId = `lieu-${IlotId}` | 'rival' | 'guetteur';

/** Carton de la première arrivée dans un quartier : le nom vient de l'îlot, la ligne d'ici. */
export const LIGNES_LIEU: Readonly<Record<IlotId, string>> = {
  quai: 'soir de tournoi',
  parvis: 'devant l’arène, sous les bannières des quatre familles',
  ruelles: 'linge tendu, fontaine et canal',
  cour: 'le cœur de la ville, au pied du Belvédère',
  port: 'au pied du vieux phare',
  haute: 'l’esplanade des Hôtels, en terrasse',
};

/** Durées (ms) : le travelling d'une arrivée, la mise au point sur Kaï, le retour au joueur. */
export const DUREES = { arriveeTenue: 700, arriveeTravelling: 3200, arriveeRetour: 800, rivalPoint: 900, guetteur: 450 } as const;

/**
 * Première arrivée dans un quartier : la caméra, un peu plus loin et plus haut, part du côté de la rue opposé au joueur
 * (bornes de la caméra de l'îlot), traverse le premier rang jusqu'à lui (le chemin lumineux s'y révèle), puis revient à
 * son cadrage ordinaire.
 */
export function plansArrivee(joueur: Vec2, bornes: { minX: number; maxX: number }): Plan[] {
  const milieu = (bornes.minX + bornes.maxX) / 2;
  const depart = joueur.x <= milieu ? bornes.maxX : bornes.minX;
  // la caméra ne dépasse pas ses bornes : le travelling s'arrête à la borne quand le joueur est au-delà (toute sa durée sert)
  const fin = { x: Math.min(bornes.maxX, Math.max(bornes.minX, joueur.x)), z: joueur.z };
  const large = { zoom: 1.22, hauteur: 0.7 };
  return [
    { at: { x: depart, z: joueur.z }, ...large, mouvement: 'coupe', ms: DUREES.arriveeTenue },
    { at: fin, ...large, mouvement: 'travelling', ms: DUREES.arriveeTravelling },
    { at: { ...joueur }, mouvement: 'glisse', tau: 0.45, ms: DUREES.arriveeRetour },
  ];
}

/** Deux personnages dans le même cadre : le milieu des deux, d'autant plus près qu'ils sont proches. */
export function cadrageDuo(a: Vec2, b: Vec2): { at: Vec2; zoom: number; hauteur: number } {
  const d = Math.hypot(a.x - b.x, a.z - b.z);
  return { at: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, zoom: Math.min(1, Math.max(0.66, 0.6 + d * 0.06)), hauteur: -0.7 };
}

/**
 * Kaï surgit (événement fixe) : la caméra se porte sur lui, tout près, pendant la bulle « ! » ; puis elle prend les deux
 * personnages pendant qu'il court au joueur (le dialogue s'ouvre sur ce cadre).
 */
export function plansRival(apparition: Vec2, approche: Vec2, joueur: Vec2, pointMs: number = DUREES.rivalPoint): Plan[] {
  const duo = cadrageDuo(approche, joueur);
  return [
    { at: { ...apparition }, zoom: 0.6, hauteur: -1.1, mouvement: 'glisse', tau: 0.32, ms: pointMs },
    { ...duo, mouvement: 'glisse', tau: 0.55, ms: 0 },
  ];
}

/** Un guetteur repère le joueur : un plan court, sans bandes, sur les deux personnages pendant qu'il vient. */
export function plansGuetteur(approche: Vec2, joueur: Vec2): Plan[] {
  return [{ ...cadrageDuo(approche, joueur), mouvement: 'glisse', tau: 0.4, ms: 0 }];
}

/** Adoucissement des deux bouts d'un travelling (0 → 0, 1 → 1). */
export const adoucir = (t: number): number => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/** Interpolation d'un travelling entre deux plans, à l'instant `t` (0 à 1). */
export function entre(a: Plan, b: Plan, t: number): { at: Vec2; zoom: number; hauteur: number } {
  const k = adoucir(t);
  const m = (x: number, y: number) => x + (y - x) * k;
  return { at: { x: m(a.at.x, b.at.x), z: m(a.at.z, b.at.z) }, zoom: m(a.zoom ?? 1, b.zoom ?? 1), hauteur: m(a.hauteur ?? 0, b.hauteur ?? 0) };
}

// ------------------------------------------------------------------ réglage (dans ce navigateur, à part des sauvegardes)

export const CLE_CINE = 'lqv.cine';
interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Cinématiques activées ? Oui par défaut ; lecture protégée (un stockage refusé ne casse rien). */
export function lireCine(st: Stockage | null): boolean {
  try { return st?.getItem(CLE_CINE) !== '0'; } catch { return true; }
}

export function ecrireCine(st: Stockage | null, actives: boolean): boolean {
  try { st?.setItem(CLE_CINE, actives ? '1' : '0'); return !!st; } catch { return false; }
}

/**
 * Les cinématiques sont-elles permises par l'adresse ? `?cine=0` les coupe ; en QA (`?qa=1`), seulement avec `?cine=1`
 * (les parcours automatisés d'avant restent déterministes, comme les rencontres en vue).
 */
export function cinePermise(search: string): boolean {
  const q = new URLSearchParams(search);
  if (q.get('cine') === '0') return false;
  if (q.get('qa') === '1') return q.get('cine') === '1';
  return true;
}

/** Une cinématique d'arrivée se joue une fois par aventure et par quartier (mémoire `cinematiques` de la sauvegarde). */
export const arriveeAJouer = (ilot: IlotId, vues: readonly string[] | undefined): boolean => !(vues ?? []).includes(`lieu-${ilot}`);
