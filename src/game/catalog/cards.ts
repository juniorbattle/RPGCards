/**
 * Catalogue normatif — règlement V3.0 (§2, §8, §11) + avenant mandaté V3.2.
 * Données pures, sérialisables, sans dépendance de rendu.
 */

export const FAMILIES = ['Cendre', 'Voile', 'Ronce', 'Astre'] as const;
export type Family = (typeof FAMILIES)[number];
export type OrdinaryRank = 1 | 2 | 3 | 4;
export type Rarity = 'Basic' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Signature';

export const FAMILY_SYMBOL: Record<Family, string> = { Cendre: '◆', Voile: '◈', Ronce: '✿', Astre: '✦' };
export const FAMILY_THEME: Record<Family, string> = {
  Cendre: 'Pression, prise de risque offensive',
  Voile: 'Information, camouflage et perturbation',
  Ronce: 'Garde, contrôle et préservation',
  Astre: 'Adaptation, recirculation, synergies',
};
export const ROMAN: Record<OrdinaryRank, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
/** §2.2 — progression définitive 3/6/9/12. */
export const BASIC_POWER: Record<OrdinaryRank, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };

export type EffectId =
  | 'etincelle' | 'braise' | 'ferveur' | 'contrecoup'
  | 'eclaireur' | 'detour' | 'dissimulation' | 'silence'
  | 'racine' | 'ecaille' | 'entrave' | 'tenacite'
  | 'repere' | 'prisme' | 'relance' | 'convergence'
  | 'flamme' | 'clairvoyance' | 'emprise' | 'cycle';

/** Moment de déclenchement imprimé (§10.1). */
export type EffectTrigger =
  | 'primary-reveal'
  | 'secondary-reveal'
  | 'use-rank'
  | 'use-damage'
  | 'use-interfere';

export interface EffectDef {
  id: EffectId;
  name: string;
  trigger: EffectTrigger;
  /** Restriction de rôle imprimée (texte court, affichable). */
  role: string;
  text: string;
}

export const EFFECTS: Record<EffectId, EffectDef> = {
  etincelle: { id: 'etincelle', name: 'Étincelle', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang d’un Assaut', text: 'Si la Primaire gagne avec exactement 1 point de score d’avance et blesse : +2 dégâts fixes après multiplication et absorption.' },
  braise: { id: 'braise', name: 'Braise', trigger: 'primary-reveal', role: 'Primaire · Assaut', text: 'Si elle gagne contre un Assaut sans Amplification de dégâts valide : +2 dégâts fixes. L’égalité A/A n’est pas une victoire.' },
  ferveur: { id: 'ferveur', name: 'Ferveur', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Si la Primaire Cendre gagne et blesse : +1 Insight après le Clash (limite +1/tour, réserve 2).' },
  contrecoup: { id: 'contrecoup', name: 'Contrecoup', trigger: 'primary-reveal', role: 'Primaire · Assaut', text: 'Si elle perd contre un Assaut : inflige malgré tout 3 dégâts fixes non multipliables, simultanément.' },
  eclaireur: { id: 'eclaireur', name: 'Éclaireur', trigger: 'secondary-reveal', role: 'Secondaire · révélation volontaire', text: 'Révèle privément une carte aléatoire de la main adverse.' },
  detour: { id: 'detour', name: 'Détour', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Si son Interférence réussit et n’est pas annulée : révèle privément une carte aléatoire de la main adverse après le Clash.' },
  dissimulation: { id: 'dissimulation', name: 'Dissimulation', trigger: 'secondary-reveal', role: 'Secondaire · révélation volontaire', text: 'Masque à l’adversaire identité, Rang et Puissance de l’autre Secondaire active du propriétaire jusqu’à la fin du tour.' },
  silence: { id: 'silence', name: 'Silence', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Si elle Interfère avec succès contre une Secondaire de Rang IV sans être annulée : neutralise aussi l’effet encore en attente de la Primaire adverse.' },
  racine: { id: 'racine', name: 'Racine', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang d’une Garde', text: 'Si la Garde gagne et Repousse effectivement une carte cachée : vous voyez privément son identité.' },
  ecaille: { id: 'ecaille', name: 'Écaille', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang d’une Garde', text: 'Si la Garde gagne contre Assaut : soigne 2 PV après le Clash, sans dépasser PV max.' },
  entrave: { id: 'entrave', name: 'Entrave', trigger: 'primary-reveal', role: 'Primaire · Garde', text: 'Si elle gagne contre Assaut et Repousse une carte cachée (Basic) : la cible va sous la pioche adverse au lieu de la main.' },
  tenacite: { id: 'tenacite', name: 'Ténacité', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang d’une Garde', text: 'Si la Garde perd malgré l’Amplification et que Ténacité n’est pas Interférée : retourne sous votre pioche au lieu de la défausse.' },
  repere: { id: 'repere', name: 'Repère', trigger: 'secondary-reveal', role: 'Secondaire · révélation volontaire', text: 'Montre privément la carte au sommet de votre pioche.' },
  prisme: { id: 'prisme', name: 'Prisme', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Obtient +1 d’affinité au coefficient même avec une Primaire d’une autre famille (sans double +1).' },
  relance: { id: 'relance', name: 'Relance', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Si son Interférence réussit contre une Secondaire de Rang III sans être annulée : retourne au sommet de votre pioche.' },
  convergence: { id: 'convergence', name: 'Convergence', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Avec une Primaire d’une autre famille : coefficient ×6 au lieu de ×4 (×5 avec Astre). S’additionne.' },
  flamme: { id: 'flamme', name: 'Flamme conquérante', trigger: 'primary-reveal', role: 'Signature · Assaut', text: 'Si elle gagne en Assaut, blesse et a bénéficié d’au moins un soutien Dégâts non annulé : Repousse une Secondaire adverse cachée.' },
  clairvoyance: { id: 'clairvoyance', name: 'Clairvoyance voilée', trigger: 'primary-reveal', role: 'Signature · révélation', text: 'À la révélation : voit privément une carte aléatoire de la main adverse, puis la plus ancienne Secondaire adverse cachée.' },
  emprise: { id: 'emprise', name: 'Emprise', trigger: 'primary-reveal', role: 'Signature · Garde', text: 'Si elle gagne une Garde contre Assaut : Repousse une Secondaire adverse encore en jeu, cachée ou active (une seule cible).' },
  cycle: { id: 'cycle', name: 'Cycle astral', trigger: 'primary-reveal', role: 'Signature', text: 'Si elle gagne et qu’exactement un de ses soutiens engagés reste non annulé (Dégâts ou Interférence réussie) : ce soutien retourne au sommet de la pioche.' },
};

export interface CardDef {
  /** Identifiant de définition unique (identité + variante). */
  defId: string;
  /** Identité de deck (unicité) : `Cendre-3`, `Signature`. */
  identity: string;
  /** Famille, ou `null` pour une carte NEUTRE (avenant M10-A, AV-01, ADR 030) : jamais d'affinité. */
  family: Family | null;
  /** Rang ordinaire 1..4, ou `null` pour une Signature ∞. */
  rank: OrdinaryRank | null;
  power: number;
  rarity: Rarity;
  name: string;
  effect: EffectId | null;
  signature: boolean;
}

const VARIANTS: Record<Family, Record<OrdinaryRank, [EffectId, Rarity]>> = {
  Cendre: { 1: ['etincelle', 'Uncommon'], 2: ['braise', 'Uncommon'], 3: ['ferveur', 'Rare'], 4: ['contrecoup', 'Epic'] },
  Voile: { 1: ['eclaireur', 'Uncommon'], 2: ['detour', 'Rare'], 3: ['dissimulation', 'Epic'], 4: ['silence', 'Legendary'] },
  Ronce: { 1: ['racine', 'Uncommon'], 2: ['ecaille', 'Rare'], 3: ['entrave', 'Rare'], 4: ['tenacite', 'Epic'] },
  Astre: { 1: ['repere', 'Uncommon'], 2: ['prisme', 'Rare'], 3: ['relance', 'Epic'], 4: ['convergence', 'Legendary'] },
};

export const SIGNATURES: Record<Family, { name: string; power: number; effect: EffectId }> = {
  Cendre: { name: 'Brasier Originel', power: 14, effect: 'flamme' },
  Voile: { name: 'Miroir du Voile', power: 12, effect: 'clairvoyance' },
  Ronce: { name: 'Couronne de Ronce', power: 12, effect: 'emprise' },
  Astre: { name: 'Convergence Astrale', power: 13, effect: 'cycle' },
};

const RANKS: OrdinaryRank[] = [1, 2, 3, 4];

function buildCatalog(): Record<string, CardDef> {
  const out: Record<string, CardDef> = {};
  for (const family of FAMILIES) {
    for (const rank of RANKS) {
      const identity = `${family}-${rank}`;
      const basic: CardDef = {
        defId: `${identity}-basic`, identity, family, rank, power: BASIC_POWER[rank],
        rarity: 'Basic', name: `${family} ${ROMAN[rank]}`, effect: null, signature: false,
      };
      const [effect, rarity] = VARIANTS[family][rank];
      const variant: CardDef = { ...basic, defId: `${identity}-${effect}`, rarity, effect };
      out[basic.defId] = basic;
      out[variant.defId] = variant;
    }
    const sig = SIGNATURES[family];
    out[`sig-${family}`] = {
      defId: `sig-${family}`, identity: 'Signature', family, rank: null, power: sig.power,
      rarity: 'Signature', name: sig.name, effect: sig.effect, signature: true,
    };
  }
  return out;
}

/** Carte du catalogue du mode Duel standard : toujours une famille. */
export type StandardCardDef = CardDef & { family: Family };

/** Catalogue du mode Duel standard (16 Basics, 16 variantes, 4 Signatures), inchangé par l'avenant M10-A. */
export const CATALOG: Readonly<Record<string, StandardCardDef>> = Object.freeze(buildCatalog() as Record<string, StandardCardDef>);

/**
 * Avenant M10-A (AV-01, ADR 030) : les quatre définitions NEUTRES du mode Aventure (`neutre-1` à `neutre-4`), Puissance
 * 3 / 6 / 9 / 12, sans famille, effet ni bonus. Catalogue à part : `CATALOG` (et tout ce qui le parcourt : galerie,
 * illustrations préparées, validation du deck standard) reste celui du mode standard ; `cardDef` connaît les deux.
 */
export const NEUTRAL_CATALOG: Readonly<Record<string, CardDef>> = Object.freeze(Object.fromEntries(RANKS.map((rank): [string, CardDef] => [
  `neutre-${rank}`,
  { defId: `neutre-${rank}`, identity: `Neutre-${rank}`, family: null, rank, power: BASIC_POWER[rank], rarity: 'Basic', name: `Neutre ${ROMAN[rank]}`, effect: null, signature: false },
])));

export const isNeutralDef = (defId: string): boolean => Object.prototype.hasOwnProperty.call(NEUTRAL_CATALOG, defId);

export function cardDef(defId: string): CardDef {
  const def = CATALOG[defId] ?? NEUTRAL_CATALOG[defId];
  if (!def) throw new Error(`Carte inconnue : ${defId}`);
  return def;
}

export function rankLabel(def: CardDef): string {
  return def.rank === null ? '∞' : ROMAN[def.rank];
}

/** Titre lisible : « Cendre III — Ferveur » ou « Brasier Originel ». */
export function cardTitle(def: CardDef): string {
  if (def.signature) return def.name;
  return def.effect ? `${def.name} — ${EFFECTS[def.effect].name}` : def.name;
}

export interface DeckSpec {
  signature: Family;
  /** `all` = les 16 variantes du catalogue initial ; `none` = 16 Basic ; sinon liste d’identités jouées en variante. */
  variants: 'all' | 'none' | string[];
}

/** §2.1 — 16 identités ordinaires (une chacune) + 1 Signature. */
export function buildDeck(spec: DeckSpec): string[] {
  const defs: string[] = [];
  for (const family of FAMILIES) {
    for (const rank of RANKS) {
      const identity = `${family}-${rank}`;
      const useVariant = spec.variants === 'all' || (Array.isArray(spec.variants) && spec.variants.includes(identity));
      const [effect] = VARIANTS[family][rank];
      defs.push(useVariant ? `${identity}-${effect}` : `${identity}-basic`);
    }
  }
  defs.push(`sig-${spec.signature}`);
  return defs;
}
