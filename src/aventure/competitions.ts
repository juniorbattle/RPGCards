/**
 * M10-D/E (prototype `?aventure=1`, PROPOSÉ) — compétitions facultatives et Championnat des Champions, en logique PURE.
 *
 * - **Épreuve du quartier** d'une famille (ouverte avec ses Basics) : trois membres en série, PV pleins à chaque duel ;
 *   une défaite remet la série à zéro ; la première série gagnée donne la **variante de Rang I** (ARB-M10-06, option a).
 * - **Joute de la maison** (ouverte après la victoire contre son bras droit) : un duel sous une **contrainte de
 *   construction** propre à la famille ; la première victoire donne la **variante de Rang II**.
 * - **Championnat des Champions** (ouvert quand les quatre chefs sont vaincus) : poule des Quatre Bannières (les quatre
 *   chefs ; une Signature différente pour chaque victoire ; trois victoires qualifient, acquises même si l'on rejoue les
 *   autres), le Miroir (Kaï), la Finale en deux manches gagnantes avec une Signature différente à chaque manche. Aucune
 *   carte : un titre. Aucune statistique gonflée : toutes les contraintes portent sur le deck (PROGRESSION §4).
 * Toutes les récompenses passent par le registre (clés uniques) : une revanche ne duplique rien.
 */
import { CATALOG, FAMILIES, type Family } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import type { DeckAv } from './deck';
import { deF } from './modele';
import { accorder, aGain, gainVariante, type Gain } from './registre';

export interface EtatCompetitions {
  /** Épreuves : duels gagnés d'affilée (0 à 3) et série gagnée. */
  epreuves: Partial<Record<Family, { etape: number; gagnee: boolean }>>;
  joutes: Partial<Record<Family, { gagnee: boolean }>>;
  championnat: {
    /** Poule : Signature équipée lors de chaque victoire contre un chef (une différente par victoire). */
    poule: Partial<Record<Family, Family>>;
    miroir: boolean;
    /** Finale : Signatures des manches gagnées et perdues, dans l'ordre. */
    finale: Array<{ signature: Family; gagnee: boolean }>;
    titre: boolean;
  };
}

export function nouvellesCompetitions(): EtatCompetitions {
  return { epreuves: {}, joutes: {}, championnat: { poule: {}, miroir: false, finale: [], titre: false } };
}

/** Variante de l'Épreuve (Rang I) et de la Joute (Rang II) d'une famille. */
export const varianteDe = (f: Family, rang: 1 | 2): string => Object.values(CATALOG).find((d) => d.family === f && d.rank === rang && d.rarity !== 'Basic' && !d.signature)!.defId;

/** Les trois membres de l'Épreuve d'une famille (gabarits PNJ à graine fixe, ADR 023). */
export const MEMBRES_EPREUVE: Record<Family, [string, string, string]> = {
  Cendre: ['pnj-docker-61', 'pnj-joueuse-62', 'pnj-docker-63'],
  Ronce: ['pnj-marchande-64', 'pnj-commis-65', 'pnj-marchande-66'],
  Voile: ['pnj-commis-67', 'pnj-joueuse-68', 'pnj-commis-69'],
  Astre: ['pnj-joueuse-70', 'pnj-docker-71', 'pnj-marchande-72'],
};
/** Membre d'élite de la Joute de chaque maison. */
export const ELITE_JOUTE: Record<Family, string> = { Cendre: 'pnj-docker-73', Ronce: 'pnj-marchande-74', Voile: 'pnj-joueuse-75', Astre: 'pnj-commis-76' };

/** Contrainte de construction de la Joute (texte et contrôle) : jamais une règle de duel. */
export const CONTRAINTE_JOUTE: Record<Family, { texte: string; ok: (d: DeckAv) => boolean }> = {
  Cendre: { texte: 'la variante Cendre IV (Contrecoup) équipée', ok: (d) => d.cartes.includes('Cendre-4-contrecoup') },
  Ronce: { texte: 'au moins trois cartes Ronce dans le deck', ok: (d) => d.cartes.filter((c) => CATALOG[c]?.family === 'Ronce').length >= 3 },
  Voile: { texte: 'la Technique Lecture ou Dissipation équipée', ok: (d) => d.techniques.some((t: TechniqueId) => t === 'Lecture' || t === 'Dissipation') },
  Astre: { texte: 'au moins trois familles représentées dans le deck', ok: (d) => new Set(d.cartes.map((c) => CATALOG[c]?.family).filter(Boolean)).size >= 3 },
};

export type Statut = { ouvert: true; texte: string } | { ouvert: false; texte: string };

export function statutEpreuve(c: EtatCompetitions, reg: readonly Gain[], f: Family): Statut {
  if (!aGain(reg, `basics:${f}`)) return { ouvert: false, texte: `Réservée aux duellistes qui ont reçu les cartes ${deF(f)}.` };
  const e = c.epreuves[f];
  if (e?.gagnee) return { ouvert: true, texte: 'Épreuve déjà remportée : vous pouvez la rejouer, sans récompense.' };
  return { ouvert: true, texte: `Duel ${(e?.etape ?? 0) + 1} sur 3 ; une défaite fait repartir la série du début.` };
}

export function statutJoute(c: EtatCompetitions, vaincues: readonly string[], f: Family, d: DeckAv): Statut {
  if (!vaincues.includes(`brasDroit-${f}`)) return { ouvert: false, texte: `Ouverte après la victoire contre le bras droit ${deF(f)}.` };
  if (!CONTRAINTE_JOUTE[f].ok(d)) return { ouvert: false, texte: `Contrainte de la Joute : ${CONTRAINTE_JOUTE[f].texte}. Ajustez votre deck.` };
  return { ouvert: true, texte: c.joutes[f]?.gagnee ? 'Joute déjà remportée : sans récompense.' : `Contrainte respectée : ${CONTRAINTE_JOUTE[f].texte}.` };
}

/** Résultat d'un duel d'Épreuve : série, et variante I à la première série gagnée. */
export function finEpreuve(c0: EtatCompetitions, reg0: readonly Gain[], f: Family, victoire: boolean, duel: string, at: string): { c: EtatCompetitions; registre: Gain[]; gains: Gain[] } {
  const c = structuredClone(c0);
  const e = c.epreuves[f] ?? { etape: 0, gagnee: false };
  let registre = [...reg0];
  const gains: Gain[] = [];
  if (!victoire) e.etape = 0;
  else if (++e.etape >= 3) {
    e.etape = 0;
    if (!e.gagnee) {
      e.gagnee = true;
      const r = accorder(registre, gainVariante(varianteDe(f, 1), `epreuve:${f}:${duel}`, at));
      registre = r.registre;
      if (r.nouveau) gains.push(r.registre.at(-1)!);
    }
  }
  c.epreuves[f] = e;
  return { c, registre, gains };
}

export function finJoute(c0: EtatCompetitions, reg0: readonly Gain[], f: Family, victoire: boolean, duel: string, at: string): { c: EtatCompetitions; registre: Gain[]; gains: Gain[] } {
  const c = structuredClone(c0);
  if (!victoire) return { c, registre: [...reg0], gains: [] };
  const r = accorder(reg0, gainVariante(varianteDe(f, 2), `joute:${f}:${duel}`, at));
  c.joutes[f] = { gagnee: true };
  return { c, registre: r.registre, gains: r.nouveau ? [r.registre.at(-1)!] : [] };
}

// --- Championnat des Champions ---------------------------------------------------------------------------------------

export type MancheChampionnat = 'poule' | 'miroir' | 'finale' | 'titre';

export function manche(c: EtatCompetitions): MancheChampionnat {
  const ch = c.championnat;
  if (ch.titre) return 'titre';
  if (ch.miroir) return 'finale';
  if (Object.keys(ch.poule).length >= 3) return 'miroir';
  return 'poule';
}

export function ouvertChampionnat(familles: Record<Family, string>): boolean {
  return FAMILIES.every((f) => familles[f] === 'chef');
}

/** Peut-on défier ce chef dans la poule avec la Signature équipée ? (une Signature différente par victoire). */
export function statutPoule(c: EtatCompetitions, chef: Family, signature: Family | null): Statut {
  const p = c.championnat.poule;
  if (p[chef]) return { ouvert: false, texte: `Déjà vaincu dans la poule (avec ${CATALOG[`sig-${p[chef]}`]!.name}).` };
  if (!signature) return { ouvert: false, texte: 'Équipez une Signature.' };
  if (Object.values(p).includes(signature)) return { ouvert: false, texte: `Le ${CATALOG[`sig-${signature}`]!.name} a déjà servi dans la poule : équipez une autre Signature.` };
  return { ouvert: true, texte: `Avec ${CATALOG[`sig-${signature}`]!.name}.` };
}

/** Finale : la Signature équipée doit différer de celle de la manche précédente. */
export function statutFinale(c: EtatCompetitions, signature: Family | null): Statut {
  if (!signature) return { ouvert: false, texte: 'Équipez une Signature.' };
  const prev = c.championnat.finale.at(-1);
  if (prev && prev.signature === signature) return { ouvert: false, texte: `Changez de Signature entre deux manches (la précédente : ${CATALOG[`sig-${signature}`]!.name}).` };
  const g = c.championnat.finale.filter((m) => m.gagnee).length;
  const p = c.championnat.finale.length - g;
  return { ouvert: true, texte: `Manche ${c.championnat.finale.length + 1} — ${g} gagnée(s), ${p} perdue(s) ; deux manches gagnantes.` };
}

export function finPoule(c0: EtatCompetitions, chef: Family, signature: Family, victoire: boolean): EtatCompetitions {
  const c = structuredClone(c0);
  if (victoire && !c.championnat.poule[chef] && !Object.values(c.championnat.poule).includes(signature)) c.championnat.poule[chef] = signature;
  return c;
}

export function finMiroir(c0: EtatCompetitions, victoire: boolean): EtatCompetitions {
  const c = structuredClone(c0);
  if (victoire && manche(c) === 'miroir') c.championnat.miroir = true;
  return c;
}

/** Finale en deux manches gagnantes ; deux manches perdues : la finale recommence (sans perte). */
export function finFinale(c0: EtatCompetitions, signature: Family, victoire: boolean): EtatCompetitions {
  const c = structuredClone(c0);
  if (manche(c) !== 'finale') return c;
  c.championnat.finale.push({ signature, gagnee: victoire });
  const g = c.championnat.finale.filter((m) => m.gagnee).length;
  if (g >= 2) c.championnat.titre = true;
  else if (c.championnat.finale.length - g >= 2) c.championnat.finale = [];
  return c;
}
