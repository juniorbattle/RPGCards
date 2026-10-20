/**
 * M10-A — duels de l'aventure : configuration moteur et personnalité de chaque adversaire. Le joueur joue **son deck
 * d'aventure tel quel** (règle R-AV, deck explicite : `siegeAventure`), avec **ses PV qui montent à chaque combat**
 * (`pvJoueur`) ; chaque adversaire est tiré de son **palier** selon son rôle et le niveau du joueur (`paliers.ts`, avenant
 * M10-A, AV-08 : pas de format miroir ni de PV égaux). Aucune règle de duel n'est touchée : la configuration est un
 * `GameConfig` ordinaire du moteur.
 */
import { FAMILIES, type Family } from '../game/catalog/cards';
import type { GameConfig } from '../game/model/types';
import { personalityById, type RivalPersonality } from '../presentation/personalities';
import type { VenueId } from '../presentation/venues';
import { nouvelleAventure, type AventureEtat } from './aventure';
import { siegeAventure } from './deck';
import { rencontreDef } from './directeur';
import { deF, figure, FIGURES, KAI_PROLOGUE, TECHNIQUES_RUE, TENANTE } from './modele';
import { ELITE_JOUTE, MEMBRES_EPREUVE, varianteDe } from './competitions';
import { adversaire, PALIER_NOM, pvJoueur, type Adversaire, type RoleAdverse } from './paliers';

export interface DuelPrevu {
  rencontre: string;
  titre: string;
  personnalite: RivalPersonality;
  venue: VenueId;
  config: GameConfig;
  /** Récompense de progression annoncée avant le duel (vide si revanche ou duel facultatif). */
  enjeu: string | null;
  /** Le deck de l'adversaire et son palier, en clair (préparation). */
  note: string;
}

/** Personnalité d'affichage : l'apparence (rival V2 ou PNJ) avec le nom, le titre, la famille et le profil d'IA du rôle. */
export function personnalite(apparence: string, o: { nom: string; titre: string; famille?: Family; techniques?: RivalPersonality['techniques']; gender?: 'f' | 'm'; profil?: RivalPersonality['aiProfile'] | null }): RivalPersonality {
  const base = personalityById(apparence);
  if (!base) throw new Error(`Apparence inconnue : ${apparence}`);
  return { ...base, name: o.nom, title: o.titre, family: o.famille ?? base.family, techniques: o.techniques ?? base.techniques, gender: o.gender ?? base.gender, aiProfile: o.profil ?? base.aiProfile };
}

/**
 * Niveau du joueur (AV-08 ; annexe de calibrage, amendement 1, décision du responsable du 2026-10-20, fiche du lot M10-D,
 * D1) : les familles **rejointes ou engagées** (états `affilié`, `défiée`, `chef`). Une affiliation quittée garde ses
 * Basics mais ne compte qu'à l'engagement de son défi : changer de voie ne durcit pas la maison.
 */
export const niveauDe = (e: AventureEtat): number => FAMILIES.filter((f) => e.familles[f] === 'affilie' || e.familles[f] === 'defiee' || e.familles[f] === 'chef').length;

/** Configuration d'un duel : le joueur (deck d'aventure, PV de ses combats) contre l'adversaire de son palier. */
function config(e: AventureEtat, seed: number, adv: Adversaire, nom: string): GameConfig {
  return { seed, players: { p1: siegeAventure(e.deck, 'Vous', pvJoueur(e.combats)), p2: siegeAventure(adv.deck, nom, adv.pv) } };
}
const note = (nom: string, adv: Adversaire): string => `${nom} (${PALIER_NOM[adv.palier]}) joue ${adv.texte}.`;

/** Duel public du prologue : le deck du joueur (les seize cartes grises) contre les seize cartes grises de Kaï. */
export function duelPrologue(seed: number, e: AventureEtat = nouvelleAventure('')): DuelPrevu {
  const adv = adversaire('prologue', null, 0, [...TECHNIQUES_RUE]);
  const p = personnalite(KAI_PROLOGUE.apparence, { nom: KAI_PROLOGUE.nom, titre: KAI_PROLOGUE.titre, techniques: [...TECHNIQUES_RUE], profil: adv.profil });
  return {
    rencontre: 'prologue', titre: 'Duel public — Kaï, le gris du Quai', personnalite: p, venue: KAI_PROLOGUE.venue, enjeu: null,
    config: config(e, seed, adv, p.name),
    note: 'Kaï joue, comme vous, les seize cartes grises de la populace : sans famille, sans effet, sans Signature.',
  };
}

/** Duel contre une figure structurante (cadet, bras droit, chef) : son enjeu est dans son deck (variante, Signature). */
export function duelFigure(id: string, e: AventureEtat, seed: number, revanche: boolean): DuelPrevu {
  const fig = figure(id);
  const adv = adversaire(fig.role as RoleAdverse, fig.famille, niveauDe(e), [...fig.techniques]);
  const p = personnalite(fig.apparence, { nom: fig.nom, titre: fig.titre, famille: fig.famille, techniques: fig.techniques, gender: fig.gender, profil: adv.profil });
  const enjeu = revanche ? null : fig.enjeu.kind === 'variante' ? fig.enjeu.defId : `sig-${fig.famille}`;
  return {
    rencontre: fig.id, titre: `${revanche ? 'Revanche' : 'Défi'} — ${fig.nom}, ${fig.titre}`, personnalite: p, venue: fig.venue, enjeu,
    config: config(e, seed, adv, fig.nom), note: note(fig.nom, adv),
  };
}

/** Duel facultatif (rue, rival) : sans récompense ; la rue est de la populace tant que le joueur n'a qu'une famille. */
export function duelFacultatif(id: string, e: AventureEtat, seed: number): DuelPrevu {
  const r = rencontreDef(id);
  if (!r) throw new Error(`Rencontre inconnue : ${id}`);
  const base = personalityById(r.apparence)!;
  const kai = id === 'rival-kai';
  const adv = kai ? adversaire('rival', 'Cendre', niveauDe(e), ['Sondage', 'Lecture']) : adversaire('rue', base.family, niveauDe(e));
  const p = kai ? personnalite('braise', { nom: 'Kaï', titre: 'la Braise du quai', profil: adv.profil }) : personnalite(r.apparence, { nom: base.name, titre: base.title, profil: adv.profil });
  return {
    rencontre: id, titre: kai ? 'Kaï vous défie' : `Duel de rue — ${base.name}`, personnalite: p, venue: 'rue', enjeu: null,
    config: config(e, seed, adv, p.name), note: note(p.name, adv),
  };
}

/** Duel d'Épreuve du quartier (série de trois, PV pleins à chaque duel). */
export function duelEpreuve(f: Family, etape: number, e: AventureEtat, seed: number, rejouee: boolean): DuelPrevu {
  const id = MEMBRES_EPREUVE[f][Math.min(2, etape)]!;
  const adv = adversaire('epreuve', f, niveauDe(e));
  const p = personnalite(id, { nom: personalityById(id)!.name, titre: `membre ${deF(f)}`, famille: f, profil: adv.profil });
  return {
    rencontre: `epreuve:${f}`, titre: `Épreuve du quartier ${deF(f)} — duel ${etape + 1} sur 3 — ${p.name}`, personnalite: p, venue: VENUE_DE[f], enjeu: rejouee || etape < 2 ? null : varianteDe(f, 1),
    config: config(e, seed, adv, p.name), note: note(p.name, adv),
  };
}

/** Duel de la Joute de la maison (contrainte de construction vérifiée avant le duel). */
export function duelJoute(f: Family, e: AventureEtat, seed: number, rejouee: boolean): DuelPrevu {
  const id = ELITE_JOUTE[f];
  const adv = adversaire('joute', f, niveauDe(e));
  const p = personnalite(id, { nom: personalityById(id)!.name, titre: `${personalityById(id)!.gender === 'f' ? 'championne' : 'champion'} de la Joute ${deF(f)}`, famille: f, profil: adv.profil });
  return {
    rencontre: `joute:${f}`, titre: `Joute de la maison ${deF(f)} — ${p.name}`, personnalite: p, venue: VENUE_DE[f], enjeu: rejouee ? null : varianteDe(f, 2),
    config: config(e, seed, adv, p.name), note: note(p.name, adv),
  };
}

/** Duels du Championnat : champions (seize variantes et Signature) ; la Signature du joueur suit les contraintes. */
export function duelChampionnat(m: 'poule' | 'miroir' | 'finale', e: AventureEtat, seed: number, chef?: Family): DuelPrevu {
  let p: RivalPersonality;
  let titre: string;
  let adv: Adversaire;
  if (m === 'poule') {
    const fig = figure(`chef-${chef!}`);
    adv = adversaire('championnat', fig.famille, niveauDe(e), [...fig.techniques]);
    p = personnalite(fig.apparence, { nom: fig.nom, titre: fig.titre, famille: fig.famille, techniques: fig.techniques, gender: fig.gender, profil: adv.profil });
    titre = `Championnat — les Quatre Bannières — ${fig.nom}`;
  } else if (m === 'miroir') {
    adv = adversaire('championnat', 'Cendre', niveauDe(e), ['Sondage', 'Lecture']);
    p = personnalite('braise', { nom: 'Kaï', titre: 'la Braise du quai, finaliste', profil: adv.profil });
    titre = 'Championnat — le Miroir — Kaï';
  } else {
    adv = adversaire('finale', TENANTE.famille, niveauDe(e), ['Lecture', 'Ancrage']);
    p = personnalite(TENANTE.apparence, { nom: TENANTE.nom, titre: TENANTE.titre, famille: TENANTE.famille, techniques: ['Lecture', 'Ancrage'], profil: adv.profil });
    titre = `Championnat — la Finale — ${TENANTE.nom}, ${TENANTE.titre}`;
  }
  return {
    rencontre: m === 'poule' ? `champ:poule:${chef}` : `champ:${m}`, titre, personnalite: p, venue: 'arene', enjeu: null,
    config: config(e, seed, adv, p.name), note: `${note(p.name, adv)} Votre Signature suit les contraintes de la manche.`,
  };
}

const VENUE_DE: Record<Family, VenueId> = { Cendre: 'rue', Ronce: 'bar', Voile: 'salle', Astre: 'arene' };

/** Tous les adversaires possibles (préparation des personnages aux temps morts, contrôles). */
export const APPARENCES = [...new Set([KAI_PROLOGUE.apparence, ...FIGURES.map((f) => f.apparence), 'pnj-docker-1', 'pnj-joueuse-5', 'pnj-commis-5', TENANTE.apparence, ...Object.values(MEMBRES_EPREUVE).flat(), ...Object.values(ELITE_JOUTE)])];
