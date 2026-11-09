/**
 * M17 — ce que le joueur a appris : profil (A6), leçons faites, leçons déjà proposées (B1), leçons à revoir (B3), et
 * les conseils du duel qu'une leçon faite éteint (B5). Pur hormis le stockage passé en paramètre.
 *
 * Choix d'exécution : un seul enregistrement par navigateur, `lqv.lecons`, pour le jeu standard ET l'aventure ; ce que
 * le joueur sait du duel est à lui, pas à une aventure (une nouvelle aventure ne refait pas les leçons). Lecture
 * protégée : un stockage refusé ou abîmé rend un état vide, jamais une erreur.
 */
import type { TechniqueId } from '../game/catalog/techniques';
import { cardDef } from '../game/catalog/cards';
import { estLeconId, LECONS, LECONS_BASE, type LeconId } from './catalogue';

export const CLE_LECONS = 'lqv.lecons';
export type Profil = 'decouverte' | 'habitue' | 'connaisseur';
export const PROFILS: ReadonlyArray<{ id: Profil; label: string; detail: string }> = [
  { id: 'decouverte', label: 'Je découvre les jeux de cartes', detail: 'Les six leçons, dans l’ordre, avec toutes les explications.' },
  { id: 'habitue', label: 'J’ai l’habitude des jeux de cartes', detail: 'Les trois leçons de ce qui diffère des autres jeux, phrases courtes.' },
  { id: 'connaisseur', label: 'Je connais Les Quatre Voies', detail: 'Rien d’imposé : les leçons restent dans le menu.' },
];
export const estProfil = (x: unknown): x is Profil => x === 'decouverte' || x === 'habitue' || x === 'connaisseur';

export interface EtatLecons {
  profil: Profil | null;
  faites: LeconId[];
  /** Leçons d'un nouvel élément déjà proposées (B1) : on ne les repropose plus, elles restent dans la bibliothèque. */
  proposees: LeconId[];
  /** Leçons à revoir (B3 : « Revoir en leçon » depuis un conseil du duel), proposées au prochain moment calme. */
  aRevoir: LeconId[];
  /** La question du profil a été posée (au premier lancement), répondue ou non : on ne la repose pas d'elle-même. */
  demande: boolean;
}

interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

const liste = (x: unknown): LeconId[] => (Array.isArray(x) ? [...new Set(x.filter((y): y is LeconId => typeof y === 'string' && estLeconId(y)))] : []);

export function lireLecons(st: Stockage | null): EtatLecons {
  try {
    const raw = st?.getItem(CLE_LECONS);
    const o = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    return { profil: estProfil(o.profil) ? o.profil : null, faites: liste(o.faites), proposees: liste(o.proposees), aRevoir: liste(o.aRevoir), demande: o.demande === true };
  } catch {
    return { profil: null, faites: [], proposees: [], aRevoir: [], demande: false };
  }
}

export function ecrireLecons(st: Stockage | null, e: EtatLecons): boolean {
  try { st?.setItem(CLE_LECONS, JSON.stringify(e)); return !!st; } catch { return false; }
}

export const stockageLecons = (): Stockage | null => { try { return window.localStorage; } catch { return null; } };

const ajoute = (l: readonly LeconId[], id: LeconId): LeconId[] => [...new Set([...l, id])];
export const marquerFaite = (e: EtatLecons, id: LeconId): EtatLecons => ({ ...e, faites: ajoute(e.faites, id), aRevoir: e.aRevoir.filter((x) => x !== id) });
export const marquerProposee = (e: EtatLecons, ids: readonly LeconId[]): EtatLecons => ({ ...e, proposees: [...new Set([...e.proposees, ...ids])], aRevoir: e.aRevoir.filter((x) => !ids.includes(x)) });
export const aRevoir = (e: EtatLecons, id: LeconId): EtatLecons => (e.aRevoir.includes(id) || e.faites.includes(id) ? e : { ...e, aRevoir: [...e.aRevoir, id] });
export const avecProfil = (e: EtatLecons, profil: Profil): EtatLecons => ({ ...e, profil, demande: true });
export const marquerDemande = (e: EtatLecons): EtatLecons => ({ ...e, demande: true });

/** Leçons proposées d'elles-mêmes ? `?lecons=0` les coupe ; en QA (`?qa=1`), seulement avec `?lecons=1` (parcours d'avant inchangés). */
export function leconsPermises(search: string): boolean {
  const q = new URLSearchParams(search);
  if (q.get('lecons') === '0') return false;
  if (q.get('qa') === '1') return q.get('lecons') === '1';
  return true;
}

/** Les leçons de base proposées à un profil (A6). */
export function leconsDuProfil(p: Profil): LeconId[] {
  return p === 'decouverte' ? [...LECONS_BASE] : p === 'habitue' ? ['clash', 'secondaires', 'tactique'] : [];
}
/** Phrases complètes ou courtes (A6). */
export const texteCourt = (p: Profil | null): boolean => p === 'habitue' || p === 'connaisseur';

/** Les conseils du duel couverts par les leçons faites (B5). */
export function conseilsEteints(faites: readonly LeconId[]): string[] {
  return [...new Set(faites.flatMap((id) => LECONS[id].couvre))];
}

/** Ce que le joueur possède, pour les leçons des nouveaux éléments (B1). */
export interface Possessions { familles: boolean; variantes: readonly string[]; techniques: readonly TechniqueId[]; signature: boolean }

const REGARDS = new Set(['eclaireur', 'detour', 'dissimulation', 'filombre', 'echo', 'murmure', 'ombre', 'miroirbrise', 'repere', 'sextant', 'racine']);

/** Les leçons d'éléments que ce que le joueur possède rend utiles (sans la prolongation, proposée quand elle arrive). */
export function leconsDebloquees(p: Possessions): LeconId[] {
  const out: LeconId[] = [];
  if (p.familles) out.push('familles');
  const effets = p.variantes.map((d) => cardDef(d)).filter((d) => !!d.effect && !d.signature);
  if (effets.length) out.push('effets');
  if (effets.some((d) => REGARDS.has(d.effect!))) out.push('regard');
  for (const t of p.techniques) out.push(`tech-${t}` as LeconId);
  if (p.signature) out.push('signature');
  return out;
}

/** Les leçons à proposer maintenant : débloquées ou à revoir, ni faites ni déjà proposées. */
export function aProposer(e: EtatLecons, debloquees: readonly LeconId[]): LeconId[] {
  const deja = new Set([...e.faites, ...e.proposees]);
  return [...new Set([...e.aRevoir, ...debloquees.filter((id) => !deja.has(id))])].filter((id) => !e.faites.includes(id));
}
