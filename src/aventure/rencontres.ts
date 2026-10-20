/**
 * M10-B — duels de l'aventure : configuration moteur et personnalité de chaque adversaire. RÉGIME DU PROTOTYPE (avenant
 * A-0) : tant que les neutres n'entrent pas dans le moteur (ARB-M10-02), chaque duel se joue avec des decks standard de
 * PRÊT (bandeau « provisoire ») ; les adversaires structurants suivent la règle du miroir de format (A-10) autant que le
 * deck standard le permet : leurs variantes selon leur rang. Aucune règle de duel n'est touchée : la configuration est
 * un `GameConfig` ordinaire du moteur.
 */
import type { Family } from '../game/catalog/cards';
import type { GameConfig } from '../game/model/types';
import { personalityById, type RivalPersonality } from '../presentation/personalities';
import type { VenueId } from '../presentation/venues';
import { siegePret, type DeckAv } from './deck';
import { rencontreDef } from './directeur';
import { deF, figure, FIGURES, KAI_PROLOGUE, PV_JOUEUR, PV_PROLOGUE, SIGNATURE_PRET, TECHNIQUES_RUE, TENANTE, type Figure } from './modele';
import { ELITE_JOUTE, MEMBRES_EPREUVE, varianteDe } from './competitions';

export interface DuelPrevu {
  rencontre: string;
  titre: string;
  personnalite: RivalPersonality;
  venue: VenueId;
  config: GameConfig;
  /** Récompense de progression annoncée avant le duel (vide si revanche ou duel facultatif). */
  enjeu: string | null;
  /** Ce que le deck de prêt remplace (bandeau). */
  pret: string;
}

/** Personnalité d'affichage : l'apparence (rival V2 ou PNJ) avec le nom, le titre et la famille de la figure. */
export function personnalite(apparence: string, o: { nom: string; titre: string; famille?: Family; techniques?: RivalPersonality['techniques']; gender?: 'f' | 'm' }): RivalPersonality {
  const base = personalityById(apparence);
  if (!base) throw new Error(`Apparence inconnue : ${apparence}`);
  return { ...base, name: o.nom, title: o.titre, family: o.famille ?? base.family, techniques: o.techniques ?? base.techniques, gender: o.gender ?? base.gender };
}

const famVariants = (f: Family, rangs: number[]) => rangs.map((r) => `${f}-${r}`);

/** Variantes jouées par une figure (miroir de format, A-10) : cadet III ; bras droit III et IV ; chef les quatre. */
export function variantesDe(fig: Figure): string[] {
  return fig.role === 'cadet' ? famVariants(fig.famille, [3]) : fig.role === 'brasDroit' ? famVariants(fig.famille, [3, 4]) : famVariants(fig.famille, [1, 2, 3, 4]);
}

/** Duel public du prologue : deck de prêt identique pour les deux (16 Basics + Signature de prêt), PV 60. */
export function duelPrologue(seed: number): DuelPrevu {
  const p = personnalite(KAI_PROLOGUE.apparence, { nom: KAI_PROLOGUE.nom, titre: KAI_PROLOGUE.titre, techniques: [...TECHNIQUES_RUE] });
  const seat = (name: string): GameConfig['players']['p1'] => ({ name, hp: PV_PROLOGUE, signature: SIGNATURE_PRET, variants: [], techniques: [...TECHNIQUES_RUE] });
  return {
    rencontre: 'prologue', titre: 'Duel public — Kaï, le gris du Quai', personnalite: p, venue: KAI_PROLOGUE.venue, enjeu: null,
    config: { seed, players: { p1: seat('Vous'), p2: seat(p.name) } },
    pret: 'Vos seize cartes grises n’entrent pas encore en duel (avenant M10-A non ratifié) : les deux duellistes jouent le même deck de prêt, 16 Basics et le Brasier Originel.',
  };
}

/** Duel contre une figure structurante (cadet, bras droit, chef). */
export function duelFigure(id: string, deck: DeckAv, seed: number, revanche: boolean): DuelPrevu {
  const fig = figure(id);
  const p = personnalite(fig.apparence, { nom: fig.nom, titre: fig.titre, famille: fig.famille, techniques: fig.techniques, gender: fig.gender });
  const enjeu = revanche ? null : fig.enjeu.kind === 'variante' ? fig.enjeu.defId : `sig-${fig.famille}`;
  return {
    rencontre: fig.id, titre: `${revanche ? 'Revanche' : 'Défi'} — ${fig.nom}, ${fig.titre}`, personnalite: p, venue: fig.venue, enjeu,
    config: { seed, players: { p1: siegePret(deck, 'Vous', PV_JOUEUR), p2: { name: fig.nom, hp: fig.hp, signature: fig.famille, variants: variantesDe(fig), techniques: [...fig.techniques] } } },
    pret: `Deck de prêt (avenant M10-A non ratifié) : vos cartes familiales jouent telles qu’équipées ; vos neutres sont remplacées par des Basics de prêt${deck.signature ? '' : ', et la Signature de prêt (Brasier Originel) tient la place de la Signature que vous n’avez pas encore'} ; ${fig.nom} joue sa Signature (le moteur l’exige encore).`,
  };
}

/** Duel facultatif (rue, rival) : sans récompense. */
export function duelFacultatif(id: string, deck: DeckAv, seed: number): DuelPrevu {
  const r = rencontreDef(id);
  if (!r) throw new Error(`Rencontre inconnue : ${id}`);
  const base = personalityById(r.apparence)!;
  const kai = id === 'rival-kai';
  const p = kai ? personnalite('braise', { nom: 'Kaï', titre: 'la Braise du quai' }) : base;
  return {
    rencontre: id, titre: kai ? 'Kaï vous défie' : `Duel de rue — ${base.name}`, personnalite: p, venue: kai ? 'rue' : 'rue', enjeu: null,
    config: { seed, players: { p1: siegePret(deck, 'Vous', PV_JOUEUR), p2: { name: p.name, hp: kai ? 80 : 60, signature: p.family, variants: kai ? famVariants('Cendre', [1, 2]) : [], techniques: [...p.techniques] } } },
    pret: 'Deck de prêt (avenant M10-A non ratifié) : vos neutres sont remplacées par des Basics de prêt.',
  };
}

/** Duel d'Épreuve du quartier (série de trois, PV pleins à chaque duel). */
export function duelEpreuve(f: Family, etape: number, deck: DeckAv, seed: number, rejouee: boolean): DuelPrevu {
  const id = MEMBRES_EPREUVE[f][Math.min(2, etape)]!;
  const p = personnalite(id, { nom: personalityById(id)!.name, titre: `membre ${deF(f)}`, famille: f });
  return {
    rencontre: `epreuve:${f}`, titre: `Épreuve du quartier ${deF(f)} — duel ${etape + 1} sur 3 — ${p.name}`, personnalite: p, venue: VENUE_DE[f], enjeu: rejouee || etape < 2 ? null : varianteDe(f, 1),
    config: { seed, players: { p1: siegePret(deck, 'Vous', PV_JOUEUR), p2: { name: p.name, hp: 60, signature: f, variants: [], techniques: [...p.techniques] } } },
    pret: 'Deck de prêt (avenant M10-A non ratifié) : vos neutres sont remplacées par des Basics de prêt.',
  };
}

/** Duel de la Joute de la maison (contrainte de construction vérifiée avant le duel). */
export function duelJoute(f: Family, deck: DeckAv, seed: number, rejouee: boolean): DuelPrevu {
  const id = ELITE_JOUTE[f];
  const p = personnalite(id, { nom: personalityById(id)!.name, titre: `${personalityById(id)!.gender === 'f' ? 'championne' : 'champion'} de la Joute ${deF(f)}`, famille: f });
  return {
    rencontre: `joute:${f}`, titre: `Joute de la maison ${deF(f)} — ${p.name}`, personnalite: p, venue: VENUE_DE[f], enjeu: rejouee ? null : varianteDe(f, 2),
    config: { seed, players: { p1: siegePret(deck, 'Vous', PV_JOUEUR), p2: { name: p.name, hp: 80, signature: f, variants: famVariants(f, [3, 4]), techniques: [...p.techniques] } } },
    pret: 'Deck de prêt (avenant M10-A non ratifié) : vos neutres sont remplacées par des Basics de prêt.',
  };
}

/** Duels du Championnat : decks d'auteur complets (16 variantes + Signature), PV 90 pour tous (mesure M10-A). */
export function duelChampionnat(m: 'poule' | 'miroir' | 'finale', deck: DeckAv, seed: number, chef?: Family): DuelPrevu {
  let p: RivalPersonality;
  let signature: Family;
  let titre: string;
  if (m === 'poule') {
    const fig = figure(`chef-${chef!}`);
    p = personnalite(fig.apparence, { nom: fig.nom, titre: fig.titre, famille: fig.famille, techniques: fig.techniques, gender: fig.gender });
    signature = fig.famille;
    titre = `Championnat — les Quatre Bannières — ${fig.nom}`;
  } else if (m === 'miroir') {
    p = personnalite('braise', { nom: 'Kaï', titre: 'la Braise du quai, finaliste' });
    signature = 'Cendre';
    titre = 'Championnat — le Miroir — Kaï';
  } else {
    p = personnalite(TENANTE.apparence, { nom: TENANTE.nom, titre: TENANTE.titre, famille: TENANTE.famille, techniques: ['Lecture', 'Ancrage'] });
    signature = TENANTE.famille;
    titre = `Championnat — la Finale — ${TENANTE.nom}, ${TENANTE.titre}`;
  }
  return {
    rencontre: m === 'poule' ? `champ:poule:${chef}` : `champ:${m}`, titre, personnalite: p, venue: 'arene', enjeu: null,
    config: { seed, players: { p1: siegePret(deck, 'Vous', PV_JOUEUR), p2: { name: p.name, hp: PV_JOUEUR, signature, variants: 'all', techniques: [...p.techniques] } } },
    pret: 'Decks complets des deux côtés ; Signature équipée selon les contraintes de la manche.',
  };
}

const VENUE_DE: Record<Family, VenueId> = { Cendre: 'rue', Ronce: 'bar', Voile: 'salle', Astre: 'arene' };

/** Tous les adversaires possibles (préparation des personnages aux temps morts, contrôles). */
export const APPARENCES = [...new Set([KAI_PROLOGUE.apparence, ...FIGURES.map((f) => f.apparence), 'pnj-docker-1', 'pnj-joueuse-5', 'pnj-commis-5', TENANTE.apparence, ...Object.values(MEMBRES_EPREUVE).flat(), ...Object.values(ELITE_JOUTE)])];
