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
  | 'flamme' | 'clairvoyance' | 'emprise' | 'cycle'
  // avenant 09 (M12, appliqué à titre provisoire) : variantes B puis C de chaque identité
  | 'tison' | 'escarbille' | 'percee' | 'bravade' | 'surenchere' | 'brulure' | 'fournaise' | 'phenix'
  | 'leurre' | 'murmure' | 'echo' | 'filombre' | 'ombre' | 'contrejour' | 'eclipse' | 'miroirbrise'
  | 'epine' | 'bouture' | 'seve' | 'lierre' | 'mur' | 'profondes' | 'rempart' | 'herse'
  | 'boussole' | 'comete' | 'constellation' | 'sextant' | 'equinoxe' | 'harmonie' | 'zenith' | 'solstice';

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
  // Avenant 09 (M12, `docs/m12/04_AVENANT_09_VARIANTES.md`, appliqué à titre provisoire) — Cendre
  tison: { id: 'tison', name: 'Tison', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Coefficient +1 si la Primaire est en Assaut. Si la Primaire perd le Clash, le propriétaire subit 2 dégâts fixes.' },
  escarbille: { id: 'escarbille', name: 'Escarbille', trigger: 'secondary-reveal', role: 'Secondaire · révélation volontaire', text: 'Révélation volontaire : le propriétaire subit 1 dégât fixe et pioche une carte. Sans effet s’il a 1 PV.' },
  percee: { id: 'percee', name: 'Percée', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Si la Primaire gagne en Assaut contre une Garde : la Garde dominée absorbe 2 de moins (minimum 0).' },
  bravade: { id: 'bravade', name: 'Bravade', trigger: 'primary-reveal', role: 'Primaire · Assaut', text: 'Si elle perd en Assaut contre une Garde : la Garde victorieuse ne Repousse pas et son propriétaire ne gagne pas l’Insight de Garde victorieuse.' },
  surenchere: { id: 'surenchere', name: 'Surenchère', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Soutien +2 au score. Si la Primaire perd le Clash, le propriétaire subit 3 dégâts fixes.' },
  brulure: { id: 'brulure', name: 'Brûlure', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Si son Interférence réussit et n’est pas annulée : l’adversaire subit 2 dégâts fixes.' },
  fournaise: { id: 'fournaise', name: 'Fournaise', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Si la Primaire gagne en Assaut contre une Garde : la Garde dominée n’absorbe que le quart de sa Puissance imprimée (arrondi au supérieur) au lieu de la moitié.' },
  phenix: { id: 'phenix', name: 'Phénix', trigger: 'primary-reveal', role: 'Primaire', text: 'Si elle perd le Clash : elle retourne dans la main du propriétaire au lieu de la défausse.' },
  // Voile
  leurre: { id: 'leurre', name: 'Leurre', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Une Interférence adverse dirigée contre Leurre échoue, quel que soit son Rang.' },
  murmure: { id: 'murmure', name: 'Murmure', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Si son Interférence réussit et n’est pas annulée : le propriétaire voit privément la carte au sommet de la pioche adverse.' },
  echo: { id: 'echo', name: 'Écho', trigger: 'primary-reveal', role: 'Primaire', text: 'Si elle perd le Clash : le propriétaire voit privément une carte aléatoire de la main adverse.' },
  filombre: { id: 'filombre', name: 'Fil d’ombre', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Si la Primaire gagne et que Fil d’ombre n’est pas Interféré : le propriétaire voit privément une carte aléatoire de la main adverse.' },
  ombre: { id: 'ombre', name: 'Ombre portée', trigger: 'primary-reveal', role: 'Primaire · révélation', text: 'À la révélation : le propriétaire voit privément la plus ancienne Secondaire adverse encore cachée.' },
  contrejour: { id: 'contrejour', name: 'Contre-jour', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Son Interférence réussit aussi contre une Secondaire d’un Rang imprimé supérieur d’un cran au sien.' },
  eclipse: { id: 'eclipse', name: 'Éclipse', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Si la Primaire gagne et blesse : l’adversaire perd 1 Insight de sa réserve et n’en gagne aucun ce tour.' },
  miroirbrise: { id: 'miroirbrise', name: 'Miroir brisé', trigger: 'primary-reveal', role: 'Primaire · révélation', text: 'À la révélation : le propriétaire voit privément les Secondaires adverses encore cachées (deux au plus).' },
  // Ronce
  epine: { id: 'epine', name: 'Épine', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang d’une Garde', text: 'Si la Garde gagne contre un Assaut : l’adversaire subit 1 dégât fixe.' },
  bouture: { id: 'bouture', name: 'Bouture', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Si son Interférence réussit et n’est pas annulée : le propriétaire soigne 2 PV (sans dépasser ses PV max).' },
  seve: { id: 'seve', name: 'Sève', trigger: 'secondary-reveal', role: 'Secondaire · révélation volontaire', text: 'Révélation volontaire : si le propriétaire a moins de PV que l’adversaire, il soigne 2 PV (sans dépasser ses PV max).' },
  lierre: { id: 'lierre', name: 'Lierre', trigger: 'use-interfere', role: 'Secondaire · Interférer', text: 'Si son Interférence réussit et n’est pas annulée : Lierre reste active dans sa case au lieu d’aller à la défausse.' },
  mur: { id: 'mur', name: 'Mur de ronces', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Soutien +2 au score si la Primaire est en Garde.' },
  profondes: { id: 'profondes', name: 'Racines profondes', trigger: 'primary-reveal', role: 'Primaire · Garde', text: 'Si elle gagne en Garde : elle retourne dans la main du propriétaire au lieu de la défausse.' },
  rempart: { id: 'rempart', name: 'Rempart', trigger: 'primary-reveal', role: 'Primaire · Garde', text: 'En Garde, si un Assaut la domine : elle absorbe les trois quarts de sa Puissance imprimée (arrondi au supérieur) au lieu de la moitié, toujours dans la limite de P_Assaut − 1.' },
  herse: { id: 'herse', name: 'Herse', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang d’une Garde', text: 'Si la Garde gagne contre un Assaut : l’adversaire subit 3 dégâts fixes.' },
  // Astre
  boussole: { id: 'boussole', name: 'Boussole', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Compte l’affinité (+1) avec une Primaire de toute famille (sans double +1).' },
  comete: { id: 'comete', name: 'Comète', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Si la Primaire gagne et que Comète n’est pas Interférée : Comète retourne au sommet de la pioche du propriétaire au lieu de la défausse.' },
  constellation: { id: 'constellation', name: 'Constellation', trigger: 'use-damage', role: 'Secondaire · Amplifier les dégâts', text: 'Coefficient +1 si l’autre soutien engagé du propriétaire (Rang ou Dégâts), non annulé, est d’une autre famille que Constellation.' },
  sextant: { id: 'sextant', name: 'Sextant', trigger: 'secondary-reveal', role: 'Secondaire · révélation volontaire', text: 'Révélation volontaire : le propriétaire voit privément les deux cartes du sommet de sa pioche.' },
  equinoxe: { id: 'equinoxe', name: 'Équinoxe', trigger: 'primary-reveal', role: 'Primaire · Assaut', text: 'En Assaut, à égalité de score contre un Assaut : elle gagne l’égalité (elle inflige ses dégâts ; ceux de l’adversaire ne s’appliquent pas). Sans effet contre une autre Équinoxe.' },
  harmonie: { id: 'harmonie', name: 'Harmonie', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Soutien +2 au score si l’autre soutien engagé du propriétaire (Rang ou Dégâts), non annulé, est d’une autre famille qu’Harmonie.' },
  zenith: { id: 'zenith', name: 'Zénith', trigger: 'use-rank', role: 'Secondaire · Amplifier le Rang', text: 'Soutien +1 au score si la Primaire est d’une autre famille. Si la Primaire gagne et que Zénith n’est pas Interféré : Zénith retourne au sommet de la pioche du propriétaire au lieu de la défausse.' },
  solstice: { id: 'solstice', name: 'Solstice', trigger: 'primary-reveal', role: 'Primaire', text: 'Si elle gagne le Clash : +1 Insight (limite +1 par tour, réserve 2).' },
};

/** Effets de Primaire résolus dès la révélation (regards immédiats) : jamais « armés », jamais neutralisés par Silence. */
export const INSTANT_PRIMARY_EFFECTS: ReadonlySet<EffectId> = new Set<EffectId>(['clairvoyance', 'ombre', 'miroirbrise']);

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

/** Variantes de chaque identité, dans l'ordre A (catalogue initial), B et C (avenant 09). */
export const VARIANTS: Readonly<Record<Family, Record<OrdinaryRank, ReadonlyArray<readonly [EffectId, Rarity]>>>> = {
  Cendre: {
    1: [['etincelle', 'Uncommon'], ['tison', 'Uncommon'], ['escarbille', 'Uncommon']],
    2: [['braise', 'Uncommon'], ['percee', 'Uncommon'], ['bravade', 'Rare']],
    3: [['ferveur', 'Rare'], ['surenchere', 'Rare'], ['brulure', 'Rare']],
    4: [['contrecoup', 'Epic'], ['fournaise', 'Epic'], ['phenix', 'Epic']],
  },
  Voile: {
    1: [['eclaireur', 'Uncommon'], ['leurre', 'Uncommon'], ['murmure', 'Uncommon']],
    2: [['detour', 'Rare'], ['echo', 'Uncommon'], ['filombre', 'Rare']],
    3: [['dissimulation', 'Epic'], ['ombre', 'Rare'], ['contrejour', 'Rare']],
    4: [['silence', 'Legendary'], ['eclipse', 'Epic'], ['miroirbrise', 'Epic']],
  },
  Ronce: {
    1: [['racine', 'Uncommon'], ['epine', 'Uncommon'], ['bouture', 'Uncommon']],
    2: [['ecaille', 'Rare'], ['seve', 'Uncommon'], ['lierre', 'Rare']],
    3: [['entrave', 'Rare'], ['mur', 'Rare'], ['profondes', 'Rare']],
    4: [['tenacite', 'Epic'], ['rempart', 'Epic'], ['herse', 'Legendary']],
  },
  Astre: {
    1: [['repere', 'Uncommon'], ['boussole', 'Uncommon'], ['comete', 'Uncommon']],
    2: [['prisme', 'Rare'], ['constellation', 'Rare'], ['sextant', 'Uncommon']],
    3: [['relance', 'Epic'], ['equinoxe', 'Epic'], ['harmonie', 'Rare']],
    4: [['convergence', 'Legendary'], ['zenith', 'Legendary'], ['solstice', 'Epic']],
  },
};

/** Lettre d'une variante dans son identité (A, B ou C), ou null pour une Basic, une Signature ou une neutre. */
export function variantLetter(def: CardDef): 'A' | 'B' | 'C' | null {
  if (!def.effect || def.signature || def.family === null || def.rank === null) return null;
  const i = VARIANTS[def.family][def.rank].findIndex(([e]) => e === def.effect);
  return i < 0 ? null : (['A', 'B', 'C'] as const)[i]!;
}

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
      out[basic.defId] = basic;
      for (const [effect, rarity] of VARIANTS[family][rank]) {
        const variant: CardDef = { ...basic, defId: `${identity}-${effect}`, rarity, effect };
        out[variant.defId] = variant;
      }
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

/** Catalogue du mode Duel standard (16 Basics, 48 variantes depuis l'avenant 09 — 16 avant —, 4 Signatures). */
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
  /**
   * `all` = les 16 variantes A (catalogue initial) ; `none` = 16 Basic ; sinon une liste : une IDENTITÉ (`Cendre-3`) est
   * jouée en variante A, une DÉFINITION de variante (`Cendre-3-surenchere`, avenant 09) est jouée telle quelle.
   */
  variants: 'all' | 'none' | string[];
}

/** §2.1 — 16 identités ordinaires (une chacune) + 1 Signature. */
export function buildDeck(spec: DeckSpec): string[] {
  const defs: string[] = [];
  for (const family of FAMILIES) {
    for (const rank of RANKS) {
      const identity = `${family}-${rank}`;
      const [[effectA]] = VARIANTS[family][rank] as [readonly [EffectId, Rarity]];
      const chosen = Array.isArray(spec.variants) ? spec.variants.find((v) => v.startsWith(`${identity}-`) && CATALOG[v]?.effect) : undefined;
      const useA = spec.variants === 'all' || (Array.isArray(spec.variants) && spec.variants.includes(identity));
      defs.push(chosen ?? (useA ? `${identity}-${effectA}` : `${identity}-basic`));
    }
  }
  defs.push(`sig-${spec.signature}`);
  return defs;
}
