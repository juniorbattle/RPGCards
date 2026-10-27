/**
 * M10-F — ouverture et fin d'un duel de l'aventure, sur la sauvegarde : la logique que l'application (`app.ts`) exécute
 * autour de chaque duel, sortie de l'écran pour que le parcours complet du prologue au titre (`test/m10f.test.ts`) teste
 * le même code. Pur hormis la mutation de la sauvegarde passée en paramètre (comme l'application) ; aucune règle de duel.
 */
import { CATALOG, type Family } from '../game/catalog/cards';
import type { GameEvent } from '../game/model/types';
import { appliquer, type AventureEtat, type Evenement, type FaitsPublics, type Issue } from './aventure';
import { battre, conclure, noterVu } from './directeur';
import { chapitreDetaille } from './aventure';
import { isKId, type KId } from './rival';
import { estGuetteur } from './vue';
import { faitsPublics } from './faits';
import { figure } from './modele';
import { pvJoueur } from './paliers';
import { aGain, prochaineVariante, variantesIdentite, type Gain } from './registre';
import type { DuelPrevu } from './rencontres';
import { CATALOG_AVENTURE, type AventureSave, type DuelAventure } from './sauvegarde';

/** Étiquette des règles des duels de l'aventure (celle du moteur, `RULES`). */
export const REGLES_DUEL = 'V3.0+delta-V3.3.2';

export const figureOuNull = (id: string) => { try { return figure(id); } catch { return null; } };

/**
 * Nouveau duel : numéroté par le compteur de la sauvegarde, avec la configuration de la préparation ; le défi d'une
 * figure structurante est lancé (fait `lancerDefi`). Renvoie le duel et le refus éventuel du lancement (affiché).
 */
export function ouvrirDuel(s: AventureSave, prevu: DuelPrevu, at: string): { duel: DuelAventure; refus?: string } {
  const n = s.compteur;
  s.compteur = n + 1;
  const duel: DuelAventure = { id: `a${n + 1}`, rencontre: prevu.rencontre, seed: prevu.config.seed, startedAt: at, rules: REGLES_DUEL, catalog: CATALOG_AVENTURE, config: structuredClone(prevu.config), commands: [], hash: '', turn: 0, pret: false };
  let refus: string | undefined;
  if (prevu.rencontre !== 'prologue' && figureOuNull(prevu.rencontre)) {
    const r = appliquer(s.etat, { type: 'lancerDefi', figure: prevu.rencontre }, at);
    if (r.refus) refus = r.refus;
    else s.etat = r.etat;
  }
  s.duel = duel;
  return refus ? { duel, refus } : { duel };
}

/**
 * Avenant 09 : les trois variantes (A, B, C) à choisir si une VICTOIRE dans cette rencontre donne la première variante de
 * son identité (première victoire contre un cadet ou un bras droit, série d'Épreuve à son dernier duel, Joute pas encore
 * gagnée) et qu'aucune n'est encore possédée ; sinon null (la récompense, s'il y en a une, est la suivante qui manque).
 */
export function choixVariante(e: AventureEtat, rencontre: string): string[] | null {
  const fig = figureOuNull(rencontre);
  let identite: string | null = null;
  if (fig) identite = fig.enjeu.kind === 'variante' && !e.vaincues.includes(fig.id) ? CATALOG[fig.enjeu.defId]!.identity : null;
  else {
    const m = rencontre.match(/^(epreuve|joute):(\w+)$/);
    const f = m?.[2] as Family | undefined;
    if (m?.[1] === 'epreuve' && f) identite = (e.competitions.epreuves[f]?.etape ?? 0) === 2 && !e.competitions.epreuves[f]?.gagnee ? `${f}-1` : null;
    if (m?.[1] === 'joute' && f) identite = e.competitions.joutes[f]?.gagnee ? null : `${f}-2`;
  }
  if (!identite) return null;
  const ids = variantesIdentite(identite);
  return ids.some((v) => aGain(e.registre, `variante:${v}`)) ? null : ids;
}

/**
 * Avenant 09 : ce qu'une victoire dans cette rencontre mettrait en jeu, côté variantes : le choix (première variante de
 * l'identité, `choixVariante`) ou la suivante qui manque (revanche contre un lieutenant, série d'Épreuve regagnée à son
 * dernier duel, Joute regagnée) ; null sinon (Signature, duel sans enjeu, plus rien à gagner).
 */
export function enjeuVariante(e: AventureEtat, rencontre: string): { choix: string[] } | { suivante: string } | null {
  const choix = choixVariante(e, rencontre);
  if (choix) return { choix };
  const fig = figureOuNull(rencontre);
  const m = rencontre.match(/^(epreuve|joute):(\w+)$/);
  const f = m?.[2] as Family | undefined;
  const identite = fig ? (fig.enjeu.kind === 'variante' && e.vaincues.includes(fig.id) ? CATALOG[fig.enjeu.defId]!.identity : null)
    : m?.[1] === 'epreuve' && f ? ((e.competitions.epreuves[f]?.etape ?? 0) === 2 && e.competitions.epreuves[f]?.gagnee ? `${f}-1` : null)
    : m?.[1] === 'joute' && f ? (e.competitions.joutes[f]?.gagnee ? `${f}-2` : null)
    : null;
  const suivante = identite ? prochaineVariante(e.registre, identite) : null;
  return suivante ? { suivante } : null;
}

export interface FinDuel {
  gains: Gain[];
  faits: FaitsPublics;
  /** PV du joueur avant et après ce combat (AV-08). */
  pv: [number, number];
  refus?: string;
}

/**
 * Fin de duel : faits publics → machine de l'aventure → registre (une seule écriture par l'appelant ensuite). `events` :
 * le journal du duel, dont seuls les faits publics sont lus. `variante` : la variante choisie à la victoire (avenant 09,
 * `choixVariante`) ; absente ou invalide, la récompense est la suivante qui manque (A d'abord).
 */
export function conclureDuel(s: AventureSave, duel: DuelAventure, events: readonly GameEvent[], issue: Issue, turns: number, at: string, variante?: string): FinDuel {
  const rencontre = duel.rencontre;
  let gains: Gain[] = [];
  let refus: string | undefined;
  s.duel = null;
  // familles des Primaires révélées par le joueur (publiques) : le Miroir du Championnat les lit (M10-E)
  const faits = faitsPublics(events);
  const familles = faits.familles;
  s.historique = [...s.historique, { id: duel.id, rencontre, issue, turns, at, ...(familles ? { familles } : {}) }].slice(-60);
  s.directeur = battre(s.directeur);
  // AV-08 : les PV du joueur montent à chaque combat mené à son terme (pas à l'abandon)
  const pvAvant = pvJoueur(s.etat.combats);
  s.etat = appliquer(s.etat, { type: 'combat', issue }, at).etat;
  const pvApres = pvJoueur(s.etat.combats);
  if (rencontre === 'prologue') s.etat = appliquer(s.etat, { type: 'duelPrologue', issue, faits }, at).etat;
  else if (figureOuNull(rencontre)) {
    const r = appliquer(s.etat, { type: 'duelStructurant', figure: rencontre, issue, duel: duel.id, ...(variante ? { variante } : {}) }, at);
    refus = r.refus;
    s.etat = r.etat;
    gains = r.gains;
  } else if (/^(epreuve|joute|champ):/.test(rencontre)) {
    const [k, a, b] = rencontre.split(':');
    const v = variante ? { variante } : {};
    const ev: Evenement = k === 'epreuve' ? { type: 'epreuve', famille: a as Family, issue, duel: duel.id, ...v }
      : k === 'joute' ? { type: 'joute', famille: a as Family, issue, duel: duel.id, ...v }
      : { type: 'championnat', manche: a as 'poule' | 'miroir' | 'finale', chef: b as Family | undefined, signature: duel.config.players.p1.signature!, issue }; // le Championnat exige une Signature équipée (statutPoule, statutFinale)
    const r = appliquer(s.etat, ev, at);
    refus = r.refus;
    s.etat = r.etat;
    gains = r.gains;
  } else if (rencontre.startsWith('rival:') && isKId(rencontre.slice(6))) {
    // M11-A : événement fixe du rival ; accompli à l'issue d'un duel mené à son terme (un abandon le laisse dû)
    s.etat = appliquer(s.etat, { type: 'rival', id: rencontre.slice(6) as KId, issue }, at).etat;
  } else {
    // M11-A : l'issue d'un duel contre un guetteur règle son repos (rencontres en vue)
    if (estGuetteur(rencontre)) s.directeur = noterVu(s.directeur, rencontre, issue, chapitreDetaille(s.etat));
    s.directeur = conclure(s.directeur, rencontre, true);
    // M10-E : l'ombre de Kaï menée à son terme compte pour la quête du rival (chapitre en cours)
    if (rencontre === 'rival-kai') s.etat = appliquer(s.etat, { type: 'ombre', issue }, at).etat;
  }
  return { gains, faits, pv: [pvAvant, pvApres], ...(refus ? { refus } : {}) };
}
