/**
 * M13 — le chef d'orchestre (pur) : la correspondance « état public du jeu → musique » (contrat
 * `docs/m13/02_MUSIQUE_INTERACTIVE.md`, §1 et §3). Seuls des faits publics y entrent (écran, quartier, chapitre,
 * adversaire, PV publics, Clash, Signature annoncée, prolongation, issue) ; jamais un événement privé de l'adversaire
 * (ADR 011), jamais le hasard du moteur de jeu. Tout se vérifie sans Web Audio (`test/m13-chef.test.ts`).
 */
import type { GameEvent, PlayerId } from '../../game/model/types';
import type { OptVersion, VersionId } from './arrangement';
import type { PonctuationId } from './ponctuations';

/** Ce qui doit jouer maintenant : une version (ou le silence), son contexte, ses couches. */
export interface Consigne { version: VersionId | null; options?: OptVersion; couches?: Record<string, number> }

// ------------------------------------------------------------------ jeu standard

/** Écran du jeu standard → musique (contrat 2, §3) : l'accueil au titre, les écrans de préparation au lounge. */
export function musiqueEcran(ecran: string): Consigne {
  if (ecran === 'home' || ecran === 'new') return { version: 'I-1' };
  if (ecran === 'duel') return { version: null };
  return { version: 'I-2' };
}

// ------------------------------------------------------------------ rôle musical d'un duel

export type Famille = 'Cendre' | 'Ronce' | 'Voile' | 'Astre';
export type RoleDuel = { role: 'duel' } | { role: 'maison'; famille: Famille } | { role: 'kai' } | { role: 'championnat' } | { role: 'finale' };

/** Jeu standard : Kaï (la Braise) a son thème ; les autres rivaux jouent le duel ordinaire. */
export const roleDuelStandard = (rival: string): RoleDuel => (rival === 'braise' ? { role: 'kai' } : { role: 'duel' });

/**
 * Aventure : la rencontre dit le rôle (priorités du contrat 1, §2 : Kaï, puis Championnat, puis Maison, puis Duel).
 * Kaï : le prologue, les événements du rival, son défi facultatif, le bras droit de la Cendre, le Miroir quand c'est lui ;
 * Championnat : la poule et le Miroir ; Finale ; Maison : cadet, bras droit, chef, Joute ; le reste : duel ordinaire.
 */
export function roleDuelAventure(rencontre: string, adversaire = ''): RoleDuel {
  if (rencontre === 'prologue' || rencontre.startsWith('rival:') || rencontre === 'rival-kai' || rencontre === 'brasDroit-Cendre') return { role: 'kai' };
  if (rencontre === 'champ:finale') return { role: 'finale' };
  if (rencontre.startsWith('champ:')) return adversaire === 'braise' ? { role: 'kai' } : { role: 'championnat' };
  const m = /^(?:cadet|brasDroit|chef)-(Cendre|Ronce|Voile|Astre)$/.exec(rencontre) ?? /^joute:(Cendre|Ronce|Voile|Astre)$/.exec(rencontre);
  if (m) return { role: 'maison', famille: m[1] as Famille };
  return { role: 'duel' };
}

/**
 * La version d'un duel selon son rôle et sa tension. Lot MU-B : le thème III pour tous les rôles ; les thèmes des
 * Maisons, de Kaï et du Championnat (lot MU-C) prennent leur place quand ils existent (`disponibles`).
 */
export function versionDuel(r: RoleDuel, tendu: boolean, disponibles: ReadonlySet<string> = new Set()): VersionId {
  const propre: Record<RoleDuel['role'], string | null> = {
    duel: null,
    maison: r.role === 'maison' ? `IV-${({ Cendre: 1, Voile: 2, Ronce: 3, Astre: 4 } as const)[r.famille]}` : null,
    kai: 'V-1',
    championnat: 'VI-1',
    finale: 'VI-2',
  };
  const p = propre[r.role];
  if (p && disponibles.has(p)) return p as VersionId;
  return tendu ? 'III-2' : 'III-1';
}

// ------------------------------------------------------------------ suivi d'un duel (faits publics)

export interface SuiviDuel {
  /** Clashes publics vus (la mélodie entre au premier). */
  clashes: number;
  /** Une Signature a été annoncée (les cuivres entrent). */
  signature: boolean;
  prolongation: number;
  /** PV d'un camp sous 30 % de son maximum, ou prolongation (le duel tendu). */
  tendu: boolean;
  fini: boolean;
}
export const SUIVI_DEPART: SuiviDuel = { clashes: 0, signature: false, prolongation: 0, tendu: false, fini: false };

export interface PvPublics { me: number; meMax: number; opp: number; oppMax: number }

/** Le seuil du duel tendu (contrat 1, §2) : sous 30 % des PV maximum d'un camp. */
export const SEUIL_TENDU = 0.3;
export const estTendu = (pv: PvPublics | null, prolongation: number): boolean =>
  prolongation > 0 || (!!pv && (pv.me <= pv.meMax * SEUIL_TENDU || pv.opp <= pv.oppMax * SEUIL_TENDU));

export interface Reaction {
  suivi: SuiviDuel;
  ponctuations: PonctuationId[];
  /** Fin du duel (victoire ou défaite du joueur) : la musique s'arrête sur le temps fort, puis le jingle. */
  fin: 'victoire' | 'defaite' | null;
}

/**
 * Les événements d'un temps du duel (dans l'ordre de la présentation) → le nouvel état et les accents : Clash gagné ou
 * perdu par le joueur (pas d'accent sur une égalité), Signature annoncée, prolongation ; la fin. Événements publics
 * seulement : un événement privé (même du joueur) ne fait jamais bouger la musique.
 */
export function suivreDuel(s: SuiviDuel, events: readonly GameEvent[], viewer: PlayerId, pv: PvPublics | null): Reaction {
  let n = { ...s };
  const ponctuations: PonctuationId[] = [];
  let fin: Reaction['fin'] = null;
  for (const e of events) {
    if (e.vis !== 'public') continue;
    const d = e.data as Record<string, unknown>;
    switch (e.kind) {
      case 'clash': {
        n.clashes += 1;
        const w = d.winner as PlayerId | null | undefined;
        if (w) ponctuations.push(w === viewer ? 'gagne' : 'perdu');
        break;
      }
      case 'signatureAnnounced':
        if (!n.signature) ponctuations.push('signature');
        n.signature = true;
        break;
      case 'overtime':
        n.prolongation = typeof d.overtime === 'number' ? d.overtime : n.prolongation + 1;
        ponctuations.push('prolongation');
        break;
      case 'victory':
        n.fini = true;
        fin = d.winner === viewer ? 'victoire' : 'defaite';
        break;
    }
  }
  n = { ...n, tendu: n.tendu || estTendu(pv, n.prolongation) };
  // la fin efface les accents du même temps (la cymbale étouffée suffit)
  return { suivi: n, ponctuations: fin ? [] : ponctuations, fin };
}

/** L'état d'un duel repris en cours : tous ses événements rejoués sans accent. */
export function suiviDepuis(events: readonly GameEvent[], viewer: PlayerId, pv: PvPublics | null): SuiviDuel {
  return suivreDuel(SUIVI_DEPART, events, viewer, pv).suivi;
}

/** L'intensité du duel (0 à 1) : elle monte avec les Clashes et quand les PV baissent (batterie, accompagnement). */
export function intensiteDuel(s: SuiviDuel, pv: PvPublics | null): number {
  const usure = pv ? 1 - Math.min(pv.me / Math.max(1, pv.meMax), pv.opp / Math.max(1, pv.oppMax)) : 0;
  return Math.round(Math.min(1, 0.35 + Math.min(s.clashes, 8) * 0.04 + usure * 0.4 + (s.signature ? 0.1 : 0)) * 100) / 100;
}

/** La consigne d'un duel : la version (tendue ou non), les couches (mélodie, tension, cuivres), l'intensité. */
export function consigneDuel(r: RoleDuel, s: SuiviDuel, pv: PvPublics | null, disponibles?: ReadonlySet<string>): Consigne {
  return {
    version: versionDuel(r, s.tendu, disponibles),
    options: { intensite: intensiteDuel(s, pv) },
    couches: { melodie: s.clashes > 0 ? 1 : 0, tension: s.tendu ? 1 : 0, cuivres: s.signature ? 1 : 0 },
  };
}

// ------------------------------------------------------------------ aventure

/** Le quartier → la version de la ville (contrat 1, §2). */
export function versionQuartier(ilot: string): VersionId {
  if (ilot === 'parvis' || ilot === 'cour') return 'II-2';
  if (ilot === 'ruelles' || ilot === 'haute') return 'II-3';
  return 'II-1';
}

/** Le chapitre de la trame en nombre (0 : prologue ; 1 à 5 ; 6 : le titre de champion). */
export function numeroChapitre(c: 'prologue' | 'I' | 'II' | 'III' | 'IV' | 'V' | 'titre'): number {
  return { prologue: 0, I: 1, II: 2, III: 3, IV: 4, V: 5, titre: 6 }[c];
}

/** La ville de l'aventure : la version du quartier, arrangée selon le chapitre (la ville qui grandit). */
export const consigneVille = (ilot: string, chapitre?: number): Consigne => ({ version: versionQuartier(ilot), options: chapitre === undefined ? {} : { chapitre } });

/** Le combo du Fanal (source localisée) : sa porte sur le Quai ; on l'entend à `RAYON_FANAL` mètres. */
export const FANAL = { ilot: 'quai', x: 7.2, z: -1.3 } as const;
export const RAYON_FANAL = 16;
/** Proximité (0 loin, 1 à la porte) du joueur au Fanal ; null hors du Quai. */
export function proximiteFanal(ilot: string, pos: { x: number; z: number }): number | null {
  if (ilot !== FANAL.ilot) return null;
  const d = Math.hypot(pos.x - FANAL.x, pos.z - FANAL.z);
  return Math.round(Math.max(0, 1 - d / RAYON_FANAL) * 100) / 100;
}
