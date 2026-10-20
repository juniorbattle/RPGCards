/**
 * M10-A — deck du mode Aventure, règle R-AV (avenant M10-A, AV-03 à AV-06) :
 *   16 cartes ordinaires, exactement 4 de chaque Rang ; chaque identité familiale au plus une fois (Basic ou une variante
 *   possédée) ; neutres pour compléter (au plus celles possédées) ; 0 ou 1 Signature possédée ; 2 Techniques connues.
 * Le deck standard (16 identités + 1 Signature) en est le cas particulier « 0 neutre + 1 Signature » : `versStandard`.
 * Module pur. Depuis l'avenant M10-A (ARB-M10-02), les neutres entrent dans le moteur : le deck de l'aventure se joue tel
 * quel, en deck explicite (`siegeAventure`).
 */
import { CATALOG, FAMILIES, type Family, type OrdinaryRank } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import type { GameConfig } from '../game/model/types';
import { validateDeck, type DeckChoice } from '../product/deck';
import { deF, isNeutre, NEUTRES, RANGS, rangNeutre, TECHNIQUES_RUE } from './modele';
import type { CollectionAv } from './registre';

export interface DeckAv {
  /** 16 définitions : `neutre-<r>`, `<Famille>-<r>-basic` ou une variante. */
  cartes: string[];
  signature: Family | null;
  techniques: TechniqueId[];
}

export const rangDe = (defId: string): OrdinaryRank => (isNeutre(defId) ? rangNeutre(defId) : (CATALOG[defId]?.rank ?? 0) as OrdinaryRank);
const identiteDe = (defId: string): string | null => (isNeutre(defId) ? null : CATALOG[defId]?.identity ?? null);

/** Deck du prologue : les seize neutres, Techniques de la rue, sans Signature. */
export function deckDepart(): DeckAv {
  return { cartes: RANGS.flatMap((r) => Array.from({ length: 4 }, () => NEUTRES[r].defId)), signature: null, techniques: [...TECHNIQUES_RUE] };
}

export interface ProblemeDeck { code: string; text: string }

/** Contrôle R-AV complet ; liste vide = deck légal. */
export function validerDeckAv(d: DeckAv, col: CollectionAv): ProblemeDeck[] {
  const out: ProblemeDeck[] = [];
  if (d.cartes.length !== 16) out.push({ code: 'taille', text: `Le deck doit compter 16 cartes ordinaires (${d.cartes.length}).` });
  const parRang: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const neutres: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const ids = new Set<string>();
  for (const c of d.cartes) {
    if (isNeutre(c)) { const r = rangNeutre(c); parRang[r]! += 1; neutres[r]! += 1; continue; }
    const def = CATALOG[c];
    if (!def || def.signature) { out.push({ code: 'inconnue', text: `Carte inconnue dans le deck : ${c}.` }); continue; }
    parRang[def.rank!]! += 1;
    if (ids.has(def.identity)) out.push({ code: 'double', text: `Deux versions de ${def.name} : une seule par identité.` });
    ids.add(def.identity);
    if (!col.basics.includes(def.family)) out.push({ code: 'non-possedee', text: `${def.name} : cartes ${deF(def.family)} non possédées.` });
    else if (def.rarity !== 'Basic' && !col.variantes.includes(c)) out.push({ code: 'non-possedee', text: `${def.name} — variante non possédée.` });
  }
  for (const r of RANGS) {
    if (parRang[r] !== 4) out.push({ code: 'rang', text: `Il faut exactement quatre cartes de Rang ${['', 'I', 'II', 'III', 'IV'][r]} (${parRang[r]}).` });
    if (neutres[r]! > col.neutres[r]) out.push({ code: 'neutres', text: `Plus de neutres de Rang ${r} que possédées.` });
  }
  if (d.signature !== null && !col.signatures.includes(d.signature)) out.push({ code: 'signature', text: `Signature ${d.signature} non possédée.` });
  if (d.techniques.length !== 2 || new Set(d.techniques).size !== 2) out.push({ code: 'techniques', text: 'Équipez exactement deux Techniques distinctes.' });
  for (const t of d.techniques) if (!(TECHNIQUE_IDS as readonly string[]).includes(t) || !col.techniques.includes(t)) out.push({ code: 'techniques', text: `Technique ${t} non apprise.` });
  return out;
}

/**
 * Remise des Basics d'une famille (A-5, proposé) : une neutre de chaque Rang sort du deck, la Basic du même Rang y
 * entre (le deck reste à 4 par Rang). Sans effet pour un Rang dont l'identité est déjà jouée.
 */
export function integrerBasics(d: DeckAv, f: Family): DeckAv {
  const cartes = [...d.cartes];
  for (const r of RANGS) {
    if (cartes.some((c) => identiteDe(c) === `${f}-${r}`)) continue;
    const i = cartes.lastIndexOf(NEUTRES[r].defId);
    if (i >= 0) cartes[i] = `${f}-${r}-basic`;
  }
  return { ...d, cartes: trier(cartes) };
}

/** Équipe une version d'une identité (Basic ou variante possédée) à la place de l'autre. */
export function equiperVersion(d: DeckAv, defId: string): DeckAv {
  const def = CATALOG[defId];
  if (!def || def.signature) return d;
  const i = d.cartes.findIndex((c) => identiteDe(c) === def.identity);
  if (i < 0) return d;
  const cartes = [...d.cartes];
  cartes[i] = defId;
  return { ...d, cartes };
}

/**
 * Éditeur (M10-C) : définitions jouables dans la case `i` sans rompre la forme R-AV — même Rang, identité absente des
 * autres cases, possédée (Basic d'une famille dont on a les cartes de base, variante gagnée), neutre dans la limite de
 * celles possédées. La carte en place en fait partie.
 */
export function choixPourCase(d: DeckAv, col: CollectionAv, i: number): string[] {
  const actuelle = d.cartes[i];
  if (actuelle === undefined) return [];
  const r = rangDe(actuelle);
  const autres = d.cartes.filter((_, j) => j !== i);
  const prises = new Set(autres.map(identiteDe));
  const out: string[] = [];
  if (autres.filter((c) => c === NEUTRES[r].defId).length < col.neutres[r]) out.push(NEUTRES[r].defId);
  for (const f of col.basics) {
    const identity = `${f}-${r}`;
    if (prises.has(identity)) continue;
    out.push(`${identity}-basic`, ...col.variantes.filter((v) => CATALOG[v]?.identity === identity));
  }
  return out;
}

/** Met `defId` dans la case `i` s'il fait partie des choix de cette case ; sinon le deck reste tel quel. */
export function remplacerCase(d: DeckAv, col: CollectionAv, i: number, defId: string): DeckAv {
  if (!choixPourCase(d, col, i).includes(defId)) return d;
  const cartes = [...d.cartes];
  cartes[i] = defId;
  return { ...d, cartes: trier(cartes) };
}

/** Équipe ou retire une Technique apprise (deux au plus : la plus ancienne cède sa place). */
export function basculerTechnique(d: DeckAv, col: CollectionAv, t: TechniqueId): DeckAv {
  if (d.techniques.includes(t)) return { ...d, techniques: d.techniques.filter((x) => x !== t) };
  if (!col.techniques.includes(t)) return d;
  return { ...d, techniques: [...d.techniques, t].slice(-2) };
}

/** Une Signature possédée (ou aucune) : une seule équipée (A-7). */
export function equiperSignature(d: DeckAv, f: Family | null): DeckAv {
  return { ...d, signature: f };
}

/** Ajoute une Technique apprise ; s'il y en a déjà deux, elles restent (le joueur choisit dans l'éditeur). */
export function equiperTechnique(d: DeckAv, t: TechniqueId): DeckAv {
  if (d.techniques.includes(t)) return d;
  return { ...d, techniques: [...d.techniques, t].slice(-2) };
}

function trier(cartes: string[]): string[] {
  const ordre = (c: string) => rangDe(c) * 10 + (isNeutre(c) ? 9 : FAMILIES.indexOf(CATALOG[c]!.family));
  return [...cartes].sort((a, b) => ordre(a) - ordre(b));
}

/**
 * Le deck est-il au format standard (A-6) ? Aucune neutre et une Signature : alors le validateur du mode Duel standard
 * l'accepte tel quel. Renvoie le `DeckChoice` standard, ou null.
 */
export function versStandard(d: DeckAv): DeckChoice | null {
  if (d.signature === null || d.cartes.some(isNeutre)) return null;
  return { signature: d.signature, variants: d.cartes.filter((c) => CATALOG[c]?.rarity !== 'Basic'), techniques: [...d.techniques] };
}

/** Validation standard d'un deck Aventure devenu standard (collection Aventure traduite). */
export function standardLegal(d: DeckAv, col: CollectionAv): boolean {
  const s = versStandard(d);
  return !!s && validateDeck(s, { variants: col.variantes, signatures: col.signatures, techniques: col.techniques }).length === 0;
}

/** Définitions envoyées au moteur : les 16 cartes ordinaires, puis la Signature équipée s'il y en a une (16 ou 17). */
export const deckMoteur = (d: DeckAv): string[] => [...d.cartes, ...(d.signature ? [`sig-${d.signature}`] : [])];

/**
 * Siège moteur d'un duel de l'aventure (AV-03) : le deck tel qu'il est, en liste explicite (neutres, Basics, variantes,
 * Signature éventuelle) ; le moteur en contrôle la forme R-AV.
 */
export function siegeAventure(d: DeckAv, name: string, hp: number): GameConfig['players']['p1'] {
  return { name, hp, signature: d.signature, variants: [], techniques: [...d.techniques], deck: deckMoteur(d) };
}

/** Nombre de cartes neutres du deck. */
export const neutresDuDeck = (d: DeckAv): number => d.cartes.filter(isNeutre).length;
