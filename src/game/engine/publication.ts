/**
 * Publication des effets et des motifs d’Insight (ADR 011) — fonctions PURES appelées par le moteur
 * au moment même où il émet un événement : le payload public est construit par liste blanche à partir
 * du résultat privé du Clash, jamais diffusé puis masqué plus tard.
 *
 * Règle : l’effet d’une Secondaire réellement camouflée (Dissimulation, identité jamais publique avant
 * ce tour) ne publie ni son nom, ni son texte, ni un nombre secret. Seule une conséquence publiquement
 * observable est annoncée, avec l’origine générique « Secondaire <famille> masquée (case N) » ; un échec
 * ou une annulation, qui n’a aucune conséquence publique, n’est pas annoncé. Le propriétaire reçoit
 * l’effet complet par événement privé (`own`). Les cartes publiques gardent leurs payloads inchangés.
 */
import type { Family } from '../catalog/cards';
import { other, type PlayerId, type PublicEffect, type SlotIndex } from '../model/types';
import { insightLabel, type EffectOutcome, type InsightSource } from './clash';

/** Situation légale fournie par le moteur, évaluée au verrouillage (avant toute consommation). */
export interface Concealment {
  /** La case de ce joueur porte une Secondaire camouflée dont l’identité n’était pas publique. */
  hidden(player: PlayerId, slot: SlotIndex): boolean;
  /** Famille de la carte de cette case (toujours publique, §13.2). */
  family(player: PlayerId, slot: SlotIndex): Family;
}

/** Conséquences observées par le moteur après application (PV réellement soignés, gain d’Insight). */
export interface Observed {
  healed: Record<PlayerId, number>;
  /** Le gain d’Insight a eu lieu et aucun motif public ne l’explique : l’effet camouflé en est la cause visible. */
  insightOnlyHidden: Record<PlayerId, boolean>;
}

export const maskedOrigin = (family: Family, slot: SlotIndex): string => `Secondaire ${family} masquée (case ${slot + 1})`;

export function hiddenSource(e: EffectOutcome, c: Concealment): boolean {
  return e.source.kind === 'secondary' && c.hidden(e.player, e.source.slot);
}

/** Payload public d’un effet, ou `null` s’il n’a aucune conséquence publique à annoncer. */
export function publicEffect(e: EffectOutcome, all: readonly EffectOutcome[], c: Concealment, seen: Observed): PublicEffect | null {
  if (e.source.kind === 'primary' || !c.hidden(e.player, e.source.slot)) {
    const by = e.silencedBy;
    // Neutralisée par une Silence camouflée : statut public (effet d’une Primaire publique), cause générique.
    if (by && c.hidden(by.player, by.slot)) {
      return { player: e.player, effect: e.effect, status: e.status, detail: 'neutralisation par l’effet d’une Secondaire masquée', by: { player: by.player, family: c.family(by.player, by.slot), slot: by.slot } };
    }
    return { player: e.player, effect: e.effect, status: e.status, detail: e.detail };
  }
  const slot = e.source.slot;
  const q = e.consequence;
  if (e.status !== 'success' || !q) return null;
  let detail: string | null = null;
  switch (q.kind) {
    case 'fixed-damage': detail = `+${q.amount} dégâts fixes`; break;
    case 'heal': detail = seen.healed[e.player] > 0 ? `soin de ${seen.healed[e.player]} PV` : null; break;
    case 'insight': detail = seen.insightOnlyHidden[e.player] ? '+1 Insight' : null; break;
    case 'destination': detail = q.dest === 'top' ? 'retour au sommet de la pioche' : 'retour sous la pioche'; break;
    case 'neutralize':
      detail = all.some((x) => x.player === other(e.player) && x.status === 'cancelled' && x.silencedBy?.player === e.player && x.silencedBy.slot === slot)
        ? 'effet en attente de la Primaire adverse neutralisé' : null;
      break;
    case 'peek': detail = null; break; // observation privée : aucune conséquence publique
  }
  if (detail === null) return null;
  return { player: e.player, effect: null, masked: true, family: c.family(e.player, slot), slot, status: 'success', detail };
}

/** Événement privé du propriétaire d’une source camouflée : l’effet complet, tel qu’avant ADR 011. */
export function ownerEffect(e: EffectOutcome): Record<string, unknown> {
  return { player: e.player, effect: e.effect, status: e.status, detail: e.detail, own: true, slot: e.source.kind === 'secondary' ? e.source.slot : null };
}

/**
 * Événements d’Insight : public (gain observable, motifs publics) et, si un motif est camouflé, privé
 * pour le propriétaire avec la liste complète. Un gain plafonné sans motif public n’est pas publié.
 */
export function publishInsight(player: PlayerId, sources: readonly InsightSource[], gained: boolean, insight: number, c: Concealment): {
  public: Record<string, unknown> | null; own: Record<string, unknown> | null; onlyHidden: boolean;
} {
  type EffectSrc = Extract<InsightSource, { kind: 'effect' }>;
  const isHidden = (x: InsightSource): x is EffectSrc => x.kind === 'effect' && c.hidden(player, x.slot);
  const shown = sources.filter((x) => !isHidden(x));
  const hidden = sources.filter(isHidden);
  let pub: Record<string, unknown> | null = null;
  if (gained) {
    const reasons = shown.length ? shown.map(insightLabel) : hidden.map((x) => `effet de la ${maskedOrigin(c.family(player, x.slot), x.slot)}`);
    pub = { player, gain: 1, reasons, insight };
  } else if (shown.length) pub = { player, gain: 0, reasons: shown.map(insightLabel), insight, capped: true };
  const own = hidden.length ? { player, gain: gained ? 1 : 0, reasons: sources.map(insightLabel), insight, ...(gained ? {} : { capped: true }), own: true } : null;
  return { public: pub, own, onlyHidden: gained && !shown.length };
}
