/**
 * M10-A — équilibrage du mode Aventure (avenant M10-A, AV-08 ; décision du responsable sur l'ARB-M10-09) : **pas de
 * format miroir ni de PV égaux**. La difficulté d'un adversaire vient de son **palier de deck** ; les **PV du joueur
 * montent à chaque combat, sans plafond** (« comme dans un RPG » : l'entraînement augmente les PV et les chances de
 * victoire). Note du responsable : « la plupart des cartes de famille remplacent certaines cartes basiques, voire toutes,
 * selon le niveau du joueur » : la composition d'un adversaire suit le **niveau** du joueur (le nombre de familles qu'il a
 * rejointes ou dont il a engagé le défi, 1 à 4 : `niveauDe`, annexe de calibrage, amendement 1). Tous les decks suivent la règle R-AV (AV-03). Module pur, partagé par le jeu
 * (`rencontres.ts`) et la simulation de calibrage (`tools/m10a-paliers.ts`).
 *
 * VALEURS VALIDÉES par le responsable le 2026-10-20 (annexe de calibrage `docs/m10/CALIBRAGE_M10A.md` de l'avenant
 * `contracts/06_AVENANT_M10A_MODE_AVENTURE.md`, fiche du lot M10-A, K1 à K5), mesurées par simulation IA contre IA ;
 * elles ne changent que sur une nouvelle décision du responsable.
 */
import { FAMILIES, type Family, type OrdinaryRank } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import type { RivalPersonality } from '../presentation/personalities';
import type { DeckAv } from './deck';
import { MAISONS, NEUTRES, RANGS, TECHNIQUES_RUE } from './modele';

/** Paliers de la note du responsable : populace, membres de famille, duellistes avancés, élite, champions. */
export type PalierId = 'populace' | 'membre' | 'avance' | 'elite' | 'champion';
export const PALIER_NOM: Record<PalierId, string> = { populace: 'populace', membre: 'membre de famille', avance: 'duelliste avancé', elite: 'élite', champion: 'champion' };


/** PV du joueur : départ, puis gain par combat mené à son terme (victoire ou défaite ; un abandon ne compte pas). */
export const PV_DEPART = 50;
export const PV_PAR_COMBAT = 3;
export const pvJoueur = (combats: number): number => PV_DEPART + PV_PAR_COMBAT * Math.max(0, combats);

/** Rôle d'un adversaire dans l'aventure. */
export type RoleAdverse = 'prologue' | 'rue' | 'epreuve' | 'cadet' | 'brasDroit' | 'joute' | 'chef' | 'rival' | 'championnat' | 'finale';

/**
 * PV des adversaires par rôle, selon le niveau du joueur (index 0 : niveau 1) : ils montent avec le palier de leur deck
 * et ne dépendent jamais des PV du joueur (jamais égaux par construction).
 */
export const PV_ADVERSE: Record<RoleAdverse, readonly [number, number, number, number]> = {
  prologue: [40, 40, 40, 40],
  rue: [40, 50, 60, 70],
  epreuve: [35, 45, 55, 65],
  cadet: [50, 65, 75, 85],
  brasDroit: [55, 80, 85, 95],
  joute: [60, 75, 85, 90],
  chef: [55, 80, 95, 105],
  rival: [60, 70, 80, 90],
  championnat: [110, 110, 110, 110],
  finale: [120, 120, 120, 120],
};

/**
 * Profil d'IA par rôle (même vue que les rivaux, ADR 011) : les cadets sont des novices de leur maison ; `null` : le
 * profil propre du personnage (bras droits : Kaï offensif, Maëlle prudente, Sélène lectrice, Orin équilibré).
 */
export const PROFIL_ROLE: Record<RoleAdverse, RivalPersonality['aiProfile'] | null> = {
  prologue: 'offensif', rue: 'novice', epreuve: 'novice', cadet: 'novice', brasDroit: null, joute: 'equilibre',
  chef: 'lecteur', rival: 'offensif', championnat: 'lecteur', finale: 'lecteur',
};

/**
 * Composition d'un membre de famille (et d'un chef) selon le niveau du joueur (index 0 : niveau 1) : `autres` cartes
 * d'autres familles (Basics, dont `autresVariantes` en variante), les Rangs de sa famille joués en variante, sa Signature.
 */
export interface Composition { autres: number; variantes: readonly OrdinaryRank[]; autresVariantes: number; signature: boolean }
const C = (autres: number, variantes: OrdinaryRank[], autresVariantes = 0, signature = false): Composition => ({ autres, variantes, autresVariantes, signature });
export const COMPOSITION: Record<'rue' | 'epreuve' | 'cadet' | 'brasDroit' | 'joute' | 'chef', readonly [Composition, Composition, Composition, Composition]> = {
  rue: [C(0, []), C(2, []), C(4, []), C(8, [])],
  epreuve: [C(0, []), C(2, []), C(4, []), C(8, [])],
  cadet: [C(2, [3]), C(4, [3]), C(8, [3, 4]), C(12, [3, 4])],
  brasDroit: [C(2, [4]), C(8, [3, 4], 2), C(12, [3, 4]), C(12, [1, 2, 3, 4], 2)],
  joute: [C(4, [3, 4]), C(8, [3, 4], 2), C(12, [3, 4], 2), C(12, [1, 2, 3, 4], 4)],
  chef: [C(0, [3, 4], 0, true), C(8, [1, 2, 3, 4], 0, true), C(12, [1, 2, 3, 4], 2, true), C(12, [1, 2, 3, 4], 4, true)],
};

const VARIANTES: Record<Family, Record<OrdinaryRank, string>> = {
  Cendre: { 1: 'etincelle', 2: 'braise', 3: 'ferveur', 4: 'contrecoup' },
  Voile: { 1: 'eclaireur', 2: 'detour', 3: 'dissimulation', 4: 'silence' },
  Ronce: { 1: 'racine', 2: 'ecaille', 3: 'entrave', 4: 'tenacite' },
  Astre: { 1: 'repere', 2: 'prisme', 3: 'relance', 4: 'convergence' },
};
const carte = (f: Family, r: OrdinaryRank, variante: boolean): string => (variante ? `${f}-${r}-${VARIANTES[f][r]}` : `${f}-${r}-basic`);

/**
 * Les cartes d'autres familles d'un membre, dans un ordre qui garde quatre cartes par Rang : avec 4 cartes, une par Rang ;
 * avec 8, deux par Rang ; avec 12, les trois autres familles au complet (familles prises à partir de la suivante dans le
 * catalogue : déterministe). Les `v` premières sont jouées en variante.
 */
function autresCartes(f: Family, k: number, v: number): string[] {
  const [a1, a2, a3] = [1, 2, 3].map((j) => FAMILIES[(FAMILIES.indexOf(f) + j) % 4]!);
  const ordre: [Family, OrdinaryRank][] = [[a1!, 1], [a2!, 2], [a3!, 3], [a1!, 4], [a2!, 1], [a3!, 2], [a1!, 3], [a2!, 4], [a3!, 1], [a1!, 2], [a2!, 3], [a3!, 4]];
  return ordre.slice(0, k).map(([g, r], i) => carte(g, r, i < v));
}

/** Complète des cartes familiales (une par identité au plus) par des neutres jusqu'à quatre cartes par Rang. */
function completer(familiales: string[], signature: Family | null, techniques: TechniqueId[]): DeckAv {
  const rang = (c: string) => Number(c.split('-')[1]) as OrdinaryRank;
  const cartes = [...familiales];
  for (const r of RANGS) for (let n = familiales.filter((c) => rang(c) === r).length; n < 4; n++) cartes.push(NEUTRES[r].defId);
  return { cartes, signature, techniques };
}

const techniquesDe = (f: Family): TechniqueId[] => ['Sondage', MAISONS[f].technique];

/** Deck d'un membre de famille ou d'un chef selon une composition. */
export function deckMembre(f: Family, c: Composition, techniques: TechniqueId[] = techniquesDe(f)): DeckAv {
  return completer([...RANGS.map((r) => carte(f, r, c.variantes.includes(r))), ...autresCartes(f, c.autres, c.autresVariantes)], c.signature ? f : null, techniques);
}

/** Les seize cartes grises de la populace. */
export const deckPopulace = (techniques: TechniqueId[] = [...TECHNIQUES_RUE]): DeckAv => completer([], null, techniques);

/** Un deck complet en variantes et sa Signature (champions). */
export const deckChampion = (f: Family, techniques: TechniqueId[] = techniquesDe(f)): DeckAv => completer(FAMILIES.flatMap((g) => RANGS.map((r) => carte(g, r, true))), f, techniques);

/**
 * Le Miroir (M10-E, PROGRESSION §4) : un deck d'auteur construit sur les familles dominantes du joueur et la famille de
 * l'adversaire, jouées en variantes ; les autres familles en Basics ; la Signature de l'adversaire. Seize identités, une
 * par famille et par Rang : le format standard, aucune règle nouvelle.
 */
export const deckMiroir = (variantes: readonly Family[], f: Family, techniques: TechniqueId[] = techniquesDe(f)): DeckAv => completer(FAMILIES.flatMap((g) => RANGS.map((r) => carte(g, r, variantes.includes(g)))), f, techniques);

/** L'adversaire du Miroir : PV et profil d'IA d'un champion (rôle `championnat`), deck `deckMiroir`. */
export function adversaireMiroir(variantes: readonly Family[], f: Family, niveau: number, techniques?: TechniqueId[]): Adversaire {
  const i = Math.max(1, Math.min(4, niveau)) - 1;
  const deck = deckMiroir(variantes, f, techniques);
  return { palier: palierDe(deck), deck, pv: PV_ADVERSE.championnat[i]!, profil: PROFIL_ROLE.championnat, texte: texteDeck(deck) };
}

export interface Adversaire {
  palier: PalierId;
  deck: DeckAv;
  pv: number;
  /** Profil d'IA ; `null` : celui du personnage. */
  profil: RivalPersonality['aiProfile'] | null;
  /** Composition en clair (préparation du duel). */
  texte: string;
}

/** Description d'un deck (préparation du duel). */
export function texteDeck(d: DeckAv): string {
  const n = d.cartes.filter((c) => c.startsWith('neutre-')).length;
  if (n === 16) return `les seize cartes grises de la populace${d.signature ? ' et une Signature' : ', sans Signature'}`;
  const v = d.cartes.filter((c) => !c.startsWith('neutre-') && !c.endsWith('-basic')).length;
  const fams = new Set(d.cartes.filter((c) => !c.startsWith('neutre-')).map((c) => c.split('-')[0])).size;
  const fam = `${16 - n} cartes de ${fams > 1 ? `${fams} familles` : 'sa famille'}${v ? ` (dont ${v} variante${v > 1 ? 's' : ''})` : ''}`;
  return `${fam}${n ? `, ${n} carte${n > 1 ? 's' : ''} grise${n > 1 ? 's' : ''}` : ''}${d.signature ? ' et sa Signature' : ', sans Signature'}`;
}

/** Palier d'un deck adverse : populace (16 neutres), membre (neutres et cartes de famille), avancé (quatre familles,
 *  sans Signature), élite (Signature), champion (seize variantes et Signature). */
export function palierDe(d: DeckAv): PalierId {
  const n = d.cartes.filter((c) => c.startsWith('neutre-')).length;
  const v = d.cartes.filter((c) => !c.startsWith('neutre-') && !c.endsWith('-basic')).length;
  if (n === 16) return 'populace';
  if (d.signature) return v === 16 ? 'champion' : 'elite';
  return n > 0 ? 'membre' : 'avance';
}

/**
 * L'adversaire d'un duel : rôle, famille (`null` : populace) et niveau du joueur (familles rejointes ou engagées). PV et
 * profil d'IA : ceux de son rôle à ce niveau (`PV_ADVERSE`, `PROFIL_ROLE`).
 *   - prologue, duels de rue tant que le joueur n'a qu'une famille : la populace ;
 *   - Épreuve, cadet (variante III en jeu), bras droit (III et IV), rue ensuite : membres de famille, des cartes d'autres
 *     familles selon le niveau (`COMPOSITION`) ; avec les quatre familles au complet, des duellistes avancés ;
 *   - Joute : avancé ; chef : ses quatre variantes, sa Signature et des cartes d'autres familles selon le niveau : élite ;
 *   - rival (Kaï, facultatif) : comme un bras droit de la Cendre ; Championnat : champions.
 */
export function adversaire(role: RoleAdverse, famille: Family | null, niveau: number, techniques?: TechniqueId[]): Adversaire {
  const i = Math.max(1, Math.min(4, niveau)) - 1;
  const f = famille ?? 'Cendre';
  let deck: DeckAv;
  if (role === 'prologue' || (role === 'rue' && (!famille || niveau < 2))) deck = deckPopulace(techniques);
  else if (role === 'championnat' || role === 'finale') deck = deckChampion(f, techniques);
  else if (role === 'rival') deck = deckMembre('Cendre', COMPOSITION.brasDroit[i]!, techniques);
  else deck = deckMembre(f, COMPOSITION[role][i]!, techniques);
  return { palier: palierDe(deck), deck, pv: PV_ADVERSE[role][i]!, profil: PROFIL_ROLE[role], texte: texteDeck(deck) };
}
