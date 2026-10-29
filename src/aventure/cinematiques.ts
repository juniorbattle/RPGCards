/**
 * M11 — cinématiques runtime (`docs/m11/07_CINEMATIQUES.md`, PROPOSÉ ; ADR 043). Demande du responsable (2026-10-26) :
 * « ajouter des cinématiques runtimes pour optimiser certains passages de gameplay ». Des plans joués par le moteur de la
 * ville (aucune vidéo, aucune image) : la caméra de l'îlot vise un autre point que le joueur, se rapproche ou s'éloigne,
 * coupe ou glisse ; des bandes, un carton de lieu, et toujours « Passer ». Mode Aventure seulement.
 *
 * Ce module est PUR : il choisit les plans (où regarder, combien de temps), les textes des cartons et le réglage ; le
 * déroulé (bandes, minuterie, touches) est dans `cinema.ts`, les actions (marche d'un personnage) dans l'application.
 */
import type { Family } from '../game/catalog/cards';
import type { IlotId } from '../ville/ilots';
import type { Vec2 } from '../ville/monde';

/**
 * Un plan : la caméra vise `at`, avec des réglages relatifs à ceux de l'îlot (`zoom` multiplie la distance, `hauteur`
 * s'ajoute à la hauteur visée) ; `mouvement` : `coupe` (franche), `glisse` (amortie, constante `tau` en s) ou
 * `travelling` (du plan précédent à celui-ci, minuté sur `ms`, adouci aux deux bouts) ; `ms` : durée du plan.
 */
/**
 * Un plan : point visé et réglages relatifs à ceux de l'îlot (`zoom`, `hauteur`), ou des personnages à cadrer
 * (`sujets`, `Town.cadrer` : leurs pieds au-dessus de la boîte de dialogue ; `serre` plus serré, `zoom` plus large).
 */
export interface Plan { at: Vec2; zoom?: number; hauteur?: number; sujets?: readonly Vec2[]; serre?: number; mouvement: 'coupe' | 'glisse' | 'travelling'; ms: number; tau?: number }

export type CinematiqueId = `lieu-${IlotId}` | 'rival' | 'guetteur' | 'prologue-kai' | 'prologue-foule' | `affiliation-${Family}` | `chef-${Family}` | `chapitre-${ChapitreCarton}` | 'championnat' | 'titre';

/** Chapitres qui ont leur carton (le I s'ouvre avec l'affiliation, le titre avec sa propre scène). */
export type ChapitreCarton = 'II' | 'III' | 'IV' | 'V';

/** Cartons de chapitre : le titre et une ligne (ce qui reste à faire). */
export const CARTONS_CHAPITRE: Readonly<Record<ChapitreCarton, { titre: string; ligne: string }>> = {
  II: { titre: 'Chapitre II', ligne: 'les trois voies · trois maisons à défier' },
  III: { titre: 'Chapitre III', ligne: 'les trois voies · deux maisons à défier' },
  IV: { titre: 'Chapitre IV', ligne: 'les trois voies · une dernière maison' },
  V: { titre: 'Chapitre V', ligne: 'le Championnat des Champions' },
};

export const estChapitreCarton = (c: string): c is ChapitreCarton => c === 'II' || c === 'III' || c === 'IV' || c === 'V';

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
export const DUREES = {
  arriveeTenue: 700, arriveeTravelling: 3200, arriveeRetour: 800, rivalPoint: 900, guetteur: 450,
  chapitreTravelling: 3000, chefPoint: 1500, chefDuo: 1300, affiliationTenue: 700, affiliationRecul: 2400,
  titreTenue: 800, titreTravelling: 3400, kaiPrologue: 1300,
} as const;

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

/** Deux personnages dans le même cadre : le milieu des deux, d'autant plus près qu'ils sont proches (plans larges). */
export function cadrageDuo(a: Vec2, b: Vec2): { at: Vec2; zoom: number; hauteur: number } {
  const d = Math.hypot(a.x - b.x, a.z - b.z);
  return { at: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, zoom: Math.min(1, Math.max(0.66, 0.6 + d * 0.06)), hauteur: -0.7 };
}

/**
 * Des personnages cadrés (retour du responsable du 2026-10-29 : la première scène avec le rival « donne l'impression
 * de manquer le cadre de vue ») : la caméra les cadre sur leur hauteur réelle, pieds au-dessus de la boîte de dialogue
 * (`cadrageSujets`, `src/ville/cameras.ts`), au lieu de réglages relatifs à ceux de l'îlot.
 */
export function sur(points: readonly Vec2[], serre?: number): { at: Vec2; sujets: Vec2[]; serre?: number } {
  const n = Math.max(1, points.length);
  return { at: { x: points.reduce((s, p) => s + p.x, 0) / n, z: points.reduce((s, p) => s + p.z, 0) / n }, sujets: points.map((p) => ({ ...p })), ...(serre ? { serre } : {}) };
}

/**
 * Kaï surgit (événement fixe) : la caméra se porte sur lui, tout près, pendant la bulle « ! » ; puis elle prend les deux
 * personnages pendant qu'il court au joueur (le dialogue s'ouvre sur ce cadre).
 */
export function plansRival(apparition: Vec2, approche: Vec2, joueur: Vec2, pointMs: number = DUREES.rivalPoint): Plan[] {
  return [
    { ...sur([apparition], 1.15), mouvement: 'glisse', tau: 0.32, ms: pointMs },
    { ...sur([approche, joueur]), mouvement: 'glisse', tau: 0.55, ms: 0 },
  ];
}

/** Un guetteur repère le joueur : un plan court, sans bandes, sur les deux personnages pendant qu'il vient. */
export function plansGuetteur(approche: Vec2, joueur: Vec2): Plan[] {
  return [{ ...sur([approche, joueur]), mouvement: 'glisse', tau: 0.4, ms: 0 }];
}

/** Cadre d'un dialogue de scène : sur un personnage (gros plan) ou sur plusieurs ; `bandes` : la scène les garde. */
export interface CadreDialogue { at: Vec2; zoom?: number; hauteur?: number; sujets?: readonly Vec2[]; serre?: number; bandes?: boolean }

/** Le cadre d'un dialogue : sur `a` seul, ou sur `a` et `b` ensemble. */
export function cadreDialogue(a: Vec2, b?: Vec2 | null, bandes = true): CadreDialogue {
  return { ...(b ? sur([a, b]) : sur([a], 1.1)), bandes };
}

/** Un groupe dans le même cadre (la foule et le joueur) : tous dans la largeur. */
export function cadreGroupe(points: readonly Vec2[], bandes = true): CadreDialogue {
  return { ...sur(points), bandes };
}

/**
 * Carton de chapitre : la caméra, un peu plus loin, glisse lentement vers le joueur depuis le côté de la rue où il y a
 * le plus de place (bornes de la caméra de l'îlot), puis revient à son cadrage ordinaire.
 */
export function plansChapitre(joueur: Vec2, bornes: { minX: number; maxX: number }): Plan[] {
  const x = Math.min(bornes.maxX, Math.max(bornes.minX, joueur.x));
  const cote = bornes.maxX - x >= x - bornes.minX ? 1 : -1;
  const depart = { x: Math.min(bornes.maxX, Math.max(bornes.minX, x + cote * 4)), z: joueur.z };
  return [
    { at: depart, zoom: 1.18, hauteur: 0.6, mouvement: 'coupe', ms: 500 },
    { at: { x, z: joueur.z }, zoom: 1.06, hauteur: 0.3, mouvement: 'travelling', ms: DUREES.chapitreTravelling },
    { at: { ...joueur }, mouvement: 'glisse', tau: 0.45, ms: 700 },
  ];
}

/** Un chef vaincu : la caméra se porte sur lui, tout près (il s'incline), puis prend les deux personnages. */
export function plansChef(chef: Vec2, joueur: Vec2): Plan[] {
  return [
    { ...sur([chef], 1.15), mouvement: 'glisse', tau: 0.35, ms: DUREES.chefPoint },
    { ...sur([chef, joueur]), mouvement: 'glisse', tau: 0.6, ms: DUREES.chefDuo },
  ];
}

/** L'affiliation confirmée : gros plan sur le joueur dans ses nouvelles couleurs, puis la caméra recule lentement. */
export function plansAffiliation(joueur: Vec2): Plan[] {
  return [
    { ...sur([joueur], 1.25), mouvement: 'coupe', ms: DUREES.affiliationTenue },
    { ...sur([joueur]), zoom: 1.7, mouvement: 'travelling', ms: DUREES.affiliationRecul },
  ];
}

/**
 * Le titre : plan large de la place (plus loin, plus haut) depuis un bord, travelling jusqu'au héraut et au joueur ;
 * le dialogue de la proclamation s'ouvre sur eux.
 */
export function plansTitre(heraut: Vec2 | null, joueur: Vec2, bornes: { minX: number; maxX: number }): Plan[] {
  const cible = heraut ? cadrageDuo(heraut, joueur) : { at: { ...joueur }, zoom: 0.8, hauteur: -0.6 };
  const depart = cible.at.x <= (bornes.minX + bornes.maxX) / 2 ? bornes.maxX : bornes.minX;
  return [
    { at: { x: depart, z: cible.at.z }, zoom: 1.32, hauteur: 1.1, mouvement: 'coupe', ms: DUREES.titreTenue },
    { ...cible, mouvement: 'travelling', ms: DUREES.titreTravelling },
  ];
}

/** Kaï au prologue : la caméra se porte sur lui, aux braseros, avant sa première réplique. */
export function plansKaiPrologue(kai: Vec2): Plan[] {
  return [{ ...sur([kai], 1.1), mouvement: 'glisse', tau: 0.5, ms: DUREES.kaiPrologue }];
}

/** L'émissaire fend la foule : la caméra garde la foule et le joueur pendant qu'il s'avance jusqu'à lui. */
export function plansEmissaire(foule: readonly Vec2[], arrivee: Vec2, joueur: Vec2): Plan[] {
  return [
    { ...sur([...foule, joueur]), mouvement: 'glisse', tau: 0.5, ms: 400 },
    { ...sur([arrivee, joueur]), mouvement: 'glisse', tau: 0.9, ms: 0 },
  ];
}

/** Adoucissement des deux bouts d'un travelling (0 → 0, 1 → 1). */
export const adoucir = (t: number): number => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/** Interpolation d'un travelling entre deux plans, à l'instant `t` (0 à 1) ; des personnages cadrés restent cadrés. */
export function entre(a: Plan, b: Plan, t: number): { at: Vec2; zoom: number; hauteur: number; sujets?: readonly Vec2[]; serre?: number } {
  const k = adoucir(t);
  const m = (x: number, y: number) => x + (y - x) * k;
  const sujets = b.sujets ?? a.sujets;
  return {
    at: { x: m(a.at.x, b.at.x), z: m(a.at.z, b.at.z) }, zoom: m(a.zoom ?? 1, b.zoom ?? 1), hauteur: m(a.hauteur ?? 0, b.hauteur ?? 0),
    ...(sujets ? { sujets, serre: m(a.serre ?? 1, b.serre ?? 1) } : {}),
  };
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
export const arriveeAJouer = (ilot: IlotId, vues: readonly string[] | undefined): boolean => aJouer(`lieu-${ilot}`, vues);

/** Une scène du récit se joue une fois par aventure (mémoire `cinematiques` de la sauvegarde). */
export const aJouer = (id: CinematiqueId, vues: readonly string[] | undefined): boolean => !(vues ?? []).includes(id);
