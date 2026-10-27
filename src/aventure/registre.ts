/**
 * M10-B — registre des gains (avenant A-8, proposé) : chaque récompense de l'aventure est un GAIN à clé UNIQUE. Accorder
 * un gain dont la clé existe déjà ne fait rien (idempotence : rechargement, reprise, revanche, double clic). La collection
 * de l'aventure se DÉRIVE du registre seul. Module pur.
 *
 * Clés : `neutres:depart` · `basics:<Famille>` (une seule par famille, qu'elle vienne de l'affiliation ou d'un défi
 * officiel, ADR 031) · `technique:<Technique>` · `variante:<defId>` · `signature:<Famille>`.
 */
import { CATALOG, FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import { COPIES_NEUTRES, deF, RANGS } from './modele';

export type GainKind = 'neutres' | 'basics' | 'variante' | 'signature' | 'technique';

export interface Gain {
  key: string;
  kind: GainKind;
  family: Family | null;
  /** Définitions remises (defId), Signature (famille) ou Technique. */
  items: string[];
  /** Scène ou duel d'origine (`P0`, `P7:Ronce`, `engagement:Voile`, `duel:a3`). */
  source: string;
  at: string;
}

export interface CollectionAv {
  /** Neutres possédées par Rang (4 chacune au départ). */
  neutres: Record<1 | 2 | 3 | 4, number>;
  /** Familles dont les quatre Basics sont possédées. */
  basics: Family[];
  variantes: string[];
  signatures: Family[];
  techniques: TechniqueId[];
}

export const gainNeutres = (at: string): Gain => ({ key: 'neutres:depart', kind: 'neutres', family: null, items: RANGS.flatMap((r) => Array.from({ length: COPIES_NEUTRES }, () => `neutre-${r}`)), source: 'P0', at });
export const gainBasics = (f: Family, source: string, at: string): Gain => ({ key: `basics:${f}`, kind: 'basics', family: f, items: RANGS.map((r) => `${f}-${r}-basic`), source, at });
export const gainTechnique = (t: TechniqueId, source: string, at: string): Gain => ({ key: `technique:${t}`, kind: 'technique', family: null, items: [t], source, at });
export const gainVariante = (defId: string, source: string, at: string): Gain => ({ key: `variante:${defId}`, kind: 'variante', family: CATALOG[defId]?.family ?? null, items: [defId], source, at });
export const gainSignature = (f: Family, source: string, at: string): Gain => ({ key: `signature:${f}`, kind: 'signature', family: f, items: [`sig-${f}`], source, at });

export const aGain = (reg: readonly Gain[], key: string): boolean => reg.some((g) => g.key === key);

/** Avenant 09 : les variantes d'une identité, dans l'ordre A, B, C. */
export const variantesIdentite = (identity: string): string[] =>
  Object.values(CATALOG).filter((d) => d.identity === identity && d.rarity !== 'Basic' && !d.signature).map((d) => d.defId);

/** Avenant 09 : la première variante de l'identité pas encore au registre (revanche), ou null. */
export const prochaineVariante = (reg: readonly Gain[], identity: string): string | null =>
  variantesIdentite(identity).find((v) => !aGain(reg, `variante:${v}`)) ?? null;

/** Avenant 09 : la variante choisie à la victoire si elle est de cette identité et pas encore possédée, sinon la suivante. */
export const varianteChoisie = (reg: readonly Gain[], identity: string, choix?: string): string | null =>
  choix && variantesIdentite(identity).includes(choix) && !aGain(reg, `variante:${choix}`) ? choix : prochaineVariante(reg, identity);

/**
 * Accorde un gain : refusé (avec sa raison) s'il viole une règle de l'ADR 031, ignoré s'il est déjà au registre.
 * Règles : une variante exige les Basics de sa famille (« carte familiale déjà possédée ») et doit exister au catalogue.
 */
export function accorder(reg: readonly Gain[], g: Gain): { registre: Gain[]; nouveau: boolean; refus?: string } {
  if (aGain(reg, g.key)) return { registre: [...reg], nouveau: false };
  if (g.kind === 'variante') {
    const d = CATALOG[g.items[0]!];
    if (!d || d.rarity === 'Basic' || d.signature) return { registre: [...reg], nouveau: false, refus: `Variante inconnue : ${g.items[0]}.` };
    if (!aGain(reg, `basics:${d.family}`)) return { registre: [...reg], nouveau: false, refus: `Variante de ${d.name} refusée : les cartes de base ${deF(d.family)} ne sont pas possédées.` };
  }
  return { registre: [...reg, structuredClone(g)], nouveau: true };
}

/** Collection dérivée du registre (aucune autre source). */
export function collectionDe(reg: readonly Gain[]): CollectionAv {
  const c: CollectionAv = { neutres: { 1: 0, 2: 0, 3: 0, 4: 0 }, basics: [], variantes: [], signatures: [], techniques: [] };
  for (const g of reg) {
    if (g.kind === 'neutres') for (const id of g.items) c.neutres[Number(id.slice(7)) as 1 | 2 | 3 | 4] += 1;
    else if (g.kind === 'basics' && g.family) c.basics.push(g.family);
    else if (g.kind === 'variante') c.variantes.push(g.items[0]!);
    else if (g.kind === 'signature' && g.family) c.signatures.push(g.family);
    else if (g.kind === 'technique') c.techniques.push(g.items[0] as TechniqueId);
  }
  c.basics.sort((a, b) => FAMILIES.indexOf(a) - FAMILIES.indexOf(b));
  c.signatures.sort((a, b) => FAMILIES.indexOf(a) - FAMILIES.indexOf(b));
  c.techniques.sort((a, b) => TECHNIQUE_IDS.indexOf(a) - TECHNIQUE_IDS.indexOf(b));
  return c;
}

/** Contrôle de cohérence du registre (sauvegarde) : clés uniques, éléments connus. Liste vide = cohérent. */
export function controlerRegistre(reg: readonly Gain[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of reg) {
    if (seen.has(g.key)) out.push(`clé en double : ${g.key}`);
    seen.add(g.key);
    if (g.kind === 'variante' && !CATALOG[g.items[0] ?? '']) out.push(`variante inconnue : ${g.items[0]}`);
    if (g.kind === 'technique' && !(TECHNIQUE_IDS as readonly string[]).includes(g.items[0] ?? '')) out.push(`technique inconnue : ${g.items[0]}`);
    if ((g.kind === 'basics' || g.kind === 'signature') && !(FAMILIES as readonly (string | null)[]).includes(g.family)) out.push(`famille inconnue : ${g.key}`);
  }
  return out;
}
