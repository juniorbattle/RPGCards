/**
 * Mémoire de l’IA — construite UNIQUEMENT à partir des événements que son siège a le droit de voir
 * (publics + ses propres événements privés : Sondage, Éclaireur, Clairvoyance, Détour, Racine…).
 * Aucune lecture d’état brut ; le filtrage est refait ici par sécurité.
 *
 * Lot de correction de clôture (passe 225, fiche B2) : TOUS les regards privés sont retenus (une information vue n'est
 * jamais désapprise, §11.3) : la main adverse (Sondage, Éclaireur, Clairvoyance, Détour, Écho, Fil d'ombre ; la carte
 * renvoyée en main par Racine ou par un Repoussement public), le sommet de la pioche adverse (Murmure, retour public au
 * sommet) jusqu'à sa pioche, les Secondaires adverses cachées (Clairvoyance, Ombre portée, Miroir brisé) jusqu'à ce
 * qu'elles quittent leur case, et le sommet de sa propre pioche (Repère, Sextant, retours au sommet).
 */
import { cardDef } from '../catalog/cards';
import type { GameEvent, PlayerId, SlotIndex, Stance } from '../model/types';

export interface AiMemory {
  /** Identités observées dans la main adverse et non encore vues la quitter. */
  knownOppHand: string[];
  /** Historique des modes de Primaire adverses révélés (public). */
  oppStances: Stance[];
  /** Nombre d’Interférences adverses observées (public). */
  oppInterferences: number;
  /** Nombre d’événements lus (QA). */
  observed: number;
  /** M11-D (niveau 2) : modes des Primaires adverses révélées, selon leur Rang (0 : Signature) — habitude publique. */
  oppStancesByRank: Record<number, Stance[]>;
  /** M11-D (niveau 2) : l'adversaire a montré une carte grise (deck d'aventure) : les neutres sont des Primaires possibles. */
  oppNeutral: boolean;
  /** Secondaires adverses vues dans leur case (définition), tant qu'elles y restent : cachées, ou masquées une fois actives. */
  oppSlots: Partial<Record<SlotIndex, string>>;
  /** Sommet de sa propre pioche, du sommet vers le fond (définitions vues), tant qu'il n'est pas pioché. */
  myDeckTop: string[];
}

export function emptyMemory(): AiMemory {
  return { knownOppHand: [], oppStances: [], oppInterferences: 0, observed: 0, oppStancesByRank: {}, oppNeutral: false, oppSlots: {}, myDeckTop: [] };
}

/** Sources de regard sur la MAIN adverse. */
const REGARDS_MAIN = ['Sondage', 'Éclaireur', 'Clairvoyance voilée', 'Détour', 'Écho', 'Fil d’ombre'];

export function buildMemory(events: readonly GameEvent[], viewer: PlayerId): AiMemory {
  const opp: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
  const m = emptyMemory();
  const known = new Map<string, number>();
  const add = (defId: string) => { const id = cardDef(defId).identity; known.set(id, (known.get(id) ?? 0) + 1); };
  const remove = (defId: string | null | undefined) => {
    if (!defId) return;
    const id = cardDef(defId).identity;
    if (known.has(id)) known.delete(id);
  };
  /** Sommet de la pioche adverse connu (Murmure, retour public au sommet) : il rejoint la main à sa prochaine pioche. */
  let oppTop: string | null = null;
  /** Destination du dernier Repoussement de ce siège (Racine : la carte observée va en main, ou sous la pioche). */
  let dernierRepoussement: string | null = null;
  for (const e of events) {
    if (e.vis !== 'public' && e.vis !== viewer) continue; // jamais d’information privée adverse
    m.observed++;
    const d = e.data as Record<string, any>;
    switch (e.kind) {
      case 'peek':
        if (d.player !== viewer) break;
        if (!d.own && REGARDS_MAIN.includes(d.source)) (d.defIds as string[]).forEach(add);
        // Racine : la carte cachée repoussée, observée ; elle rejoint la main adverse (sauf Entrave : sous la pioche)
        if (d.source === 'Racine' && dernierRepoussement === 'hand') (d.defIds as string[]).forEach(add);
        // Murmure : le sommet de la pioche adverse
        if (d.deckTop && (d.defIds as string[]).length) oppTop = (d.defIds as string[])[0]!;
        // Repère, Sextant : le sommet de sa propre pioche (du sommet vers le fond)
        if (d.own && (d.source === 'Repère' || d.source === 'Sextant')) m.myDeckTop = [...(d.defIds as string[])];
        // Clairvoyance (une case), Ombre portée et Miroir brisé (les cases) : Secondaires adverses cachées
        if (d.hiddenSlot) m.oppSlots[d.hiddenSlot.slot as SlotIndex] = d.hiddenSlot.defId;
        for (const h of (d.hiddenSlots ?? []) as Array<{ slot: SlotIndex; defId: string }>) m.oppSlots[h.slot] = h.defId;
        break;
      case 'draw':
        // pioche publique adverse (nombre) : le sommet connu rejoint sa main ; sa propre pioche (privée) : le sommet part
        if (d.player === opp && typeof d.count === 'number' && d.count > 0 && oppTop) { add(oppTop); oppTop = null; }
        if (d.player === viewer && typeof d.cardId === 'string') m.myDeckTop.shift();
        break;
      case 'shuffle':
        if (d.player === opp) oppTop = null;
        if (d.player === viewer) m.myDeckTop = [];
        break;
      case 'primariesRevealed':
        remove(d[opp]?.defId);
        if (d[opp]?.stance) m.oppStances.push(d[opp].stance);
        if (d[opp]?.defId && d[opp]?.stance) {
          const def = cardDef(d[opp].defId);
          (m.oppStancesByRank[def.signature ? 0 : def.rank ?? 0] ??= []).push(d[opp].stance);
          if (def.family === null) m.oppNeutral = true;
        }
        break;
      case 'secondaryRevealed':
      case 'replaced':
      case 'destination':
        if (d.player === opp) remove(d.defId);
        if (d.player === opp && typeof d.defId === 'string' && cardDef(d.defId).family === null) m.oppNeutral = true;
        // une carte qui quitte sa case (consommée, remplacée) n'y est plus ; une Secondaire révélée face visible est publique
        if (d.player === opp && (e.kind !== 'secondaryRevealed' || d.defId) && !(e.kind === 'destination' && d.dest === 'stay')) delete m.oppSlots[d.slot as SlotIndex];
        // retour public au sommet de la pioche (Comète, Zénith, Relance, Cycle) : sommet connu
        if (e.kind === 'destination' && d.dest === 'top' && typeof d.defId === 'string') {
          if (d.player === opp) oppTop = d.defId;
          if (d.player === viewer) m.myDeckTop.unshift(d.defId);
        }
        break;
      case 'repel':
        // un Repoussement de ce siège renvoie une carte adverse : active (identité publique) en main ; cachée, en main ou
        // sous la pioche (Racine l'observe juste après)
        if (d.player === viewer) {
          dernierRepoussement = d.dest;
          if (d.dest === 'hand' && typeof d.defId === 'string') add(d.defId);
          delete m.oppSlots[d.slot as SlotIndex];
        }
        break;
      case 'trim':
        if (d.player === opp) (d.defIds as string[]).forEach(remove);
        break;
      case 'interference':
        if (d.player === opp) m.oppInterferences++;
        break;
    }
  }
  m.knownOppHand = [...known.keys()];
  return m;
}

/** Probabilité a priori d’un Assaut adverse (lissage de Laplace sur l’historique public). */
export function assaultPrior(m: AiMemory | null): number {
  if (!m || !m.oppStances.length) return 0.6;
  const a = m.oppStances.filter((s) => s === 'assault').length;
  return (a + 1.2) / (m.oppStances.length + 2);
}

/**
 * M11-D (niveau 2) : probabilité d'un Assaut adverse pour une Primaire de ce Rang (0 : Signature), lissée vers la fréquence
 * globale (`assaultPrior`) : l'habitude publique d'un joueur selon la force de la carte qu'il joue.
 */
export function assaultPriorByRank(m: AiMemory | null, rank: number): number {
  const base = assaultPrior(m);
  const xs = m?.oppStancesByRank?.[rank] ?? [];
  const a = xs.filter((s) => s === 'assault').length;
  return (a + base * 2) / (xs.length + 2);
}
