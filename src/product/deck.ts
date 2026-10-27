/**
 * Configuration du deck du joueur (M04) — validation à partir du catalogue canonique, SEULE source
 * de vérité (§2.1, §11.1) : 16 identités ordinaires, une version chacune (Basic ou variante
 * possédée), + 1 Signature ∞ possédée, + 2 Techniques connues distinctes (§12). Aucune règle n’est
 * recopiée ici : le deck physique est construit par `buildDeck` du moteur, puis contrôlé.
 */
import { buildDeck, CATALOG, cardDef, FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import type { GameConfig } from '../game/model/types';

export interface DeckChoice {
  signature: Family;
  /** Définitions de VARIANTES jouées (ex. `Cendre-3-ferveur`) ; les autres identités jouent leur Basic. */
  variants: string[];
  techniques: TechniqueId[];
}

/** Ce que le joueur possède (collection) : seules ces cartes et Techniques sont équipables. */
export interface Collection {
  variants: string[];
  signatures: Family[];
  techniques: TechniqueId[];
}

export interface DeckIssue {
  code: 'signature' | 'variant-unknown' | 'variant-duplicate' | 'variant-locked' | 'tech-count' | 'tech-unknown' | 'tech-duplicate' | 'tech-locked' | 'deck-shape';
  text: string;
  ref?: string;
}

/** Les 16 identités ordinaires (famille × Rang), dans l’ordre du catalogue. */
export const IDENTITIES: readonly string[] = FAMILIES.flatMap((f) => [1, 2, 3, 4].map((r) => `${f}-${r}`));

/** Variantes du catalogue pour une identité, dans l'ordre A, B, C (avenant 09 : trois par identité). */
export function variantsOf(identity: string): string[] {
  return Object.values(CATALOG).filter((d) => d.identity === identity && d.rarity !== 'Basic' && !d.signature).map((d) => d.defId);
}

/** La variante A d'une identité (catalogue initial). */
export const variantA = (identity: string): string => variantsOf(identity)[0]!;

export const ALL_VARIANTS: readonly string[] = IDENTITIES.flatMap(variantsOf);

/** Carte équipée pour une identité : la variante choisie, sinon la Basic. */
export function equippedFor(choice: DeckChoice, identity: string): string {
  return choice.variants.find((v) => CATALOG[v]?.identity === identity) ?? `${identity}-basic`;
}

/** Les 17 définitions du deck (via le constructeur canonique du moteur). */
export function deckDefs(choice: DeckChoice): string[] {
  // avenant 09 : la définition exacte de chaque variante (A, B ou C) est transmise au constructeur
  return buildDeck({ signature: choice.signature, variants: [...choice.variants] });
}

/** Contrôle complet ; liste vide = deck légal. Chaque problème porte une raison affichable. */
export function validateDeck(choice: DeckChoice, owned: Collection): DeckIssue[] {
  const out: DeckIssue[] = [];
  if (!(FAMILIES as readonly string[]).includes(choice.signature)) out.push({ code: 'signature', text: 'Signature inconnue.' });
  else if (!owned.signatures.includes(choice.signature)) out.push({ code: 'signature', text: `Signature ${choice.signature} non possédée.`, ref: choice.signature });
  const seen = new Set<string>();
  for (const v of choice.variants) {
    const d = CATALOG[v];
    if (!d || d.rarity === 'Basic' || d.signature) { out.push({ code: 'variant-unknown', text: `Variante inconnue : ${v}.`, ref: v }); continue; }
    if (seen.has(d.identity)) out.push({ code: 'variant-duplicate', text: `Deux versions de ${d.name} : une seule par identité.`, ref: d.identity });
    seen.add(d.identity);
    if (!owned.variants.includes(v)) out.push({ code: 'variant-locked', text: `${d.name} — variante non possédée.`, ref: v });
  }
  const techs = choice.techniques;
  if (techs.length !== 2) out.push({ code: 'tech-count', text: `Équipez exactement deux Techniques (${techs.length}/2).` });
  if (new Set(techs).size !== techs.length) out.push({ code: 'tech-duplicate', text: 'Une même Technique ne peut être équipée deux fois.' });
  for (const t of techs) {
    if (!(TECHNIQUE_IDS as readonly string[]).includes(t)) out.push({ code: 'tech-unknown', text: `Technique inconnue : ${t}.`, ref: t });
    else if (!owned.techniques.includes(t)) out.push({ code: 'tech-locked', text: `Technique ${t} non apprise.`, ref: t });
  }
  // Forme du deck physique (§2.1) : vérifiée sur le deck réellement construit par le moteur.
  if (!out.some((i) => i.code === 'signature' || i.code === 'variant-unknown')) {
    const defs = deckDefs(choice);
    const ids = defs.map((d) => cardDef(d).identity);
    const sigs = defs.filter((d) => cardDef(d).signature).length;
    if (defs.length !== 17 || new Set(ids).size !== 17 || sigs !== 1) out.push({ code: 'deck-shape', text: 'Le deck doit compter 17 cartes : 16 identités ordinaires uniques + 1 Signature.' });
  }
  return out;
}

/** Configuration moteur du siège du joueur (PV propres au personnage, fournis par l’appelant). */
export function playerSeat(choice: DeckChoice, name: string, hp: number): GameConfig['players']['p1'] {
  // Une variante A s'écrit par son identité (configurations, replays et empreintes d'avant l'avenant 09 inchangés) ; une
  // variante B ou C par sa définition.
  return { name, hp, signature: choice.signature, variants: choice.variants.map((v) => (v === variantA(cardDef(v).identity) ? cardDef(v).identity : v)), techniques: [...choice.techniques] };
}

/** Résumé lisible : nombre de variantes par famille et par rareté. */
export function deckSummary(choice: DeckChoice): { variants: number; byFamily: Record<Family, number>; byRarity: Record<string, number> } {
  const byFamily = Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<Family, number>;
  const byRarity: Record<string, number> = {};
  for (const v of choice.variants) {
    const d = CATALOG[v];
    if (!d) continue;
    byFamily[d.family] += 1;
    byRarity[d.rarity] = (byRarity[d.rarity] ?? 0) + 1;
  }
  return { variants: choice.variants.length, byFamily, byRarity };
}

/** Bascule Basic ↔ variante pour une identité (jamais deux versions d’une identité). */
export function setVersion(choice: DeckChoice, identity: string, defId: string | null): DeckChoice {
  const variants = choice.variants.filter((v) => CATALOG[v]?.identity !== identity);
  if (defId && defId !== `${identity}-basic`) variants.push(defId);
  variants.sort((a, b) => IDENTITIES.indexOf(cardDef(a).identity) - IDENTITIES.indexOf(cardDef(b).identity));
  return { ...choice, variants };
}

/** Équipe / retire une Technique : au plus deux, la plus ancienne cède sa place. */
export function toggleTechnique(choice: DeckChoice, t: TechniqueId): DeckChoice {
  const has = choice.techniques.includes(t);
  const techniques = has ? choice.techniques.filter((x) => x !== t) : [...choice.techniques, t].slice(-2);
  return { ...choice, techniques };
}
