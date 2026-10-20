/**
 * M10-B — machine d'états PURE de l'aventure : scènes du prologue, états des quatre familles (ADR 029 §4), affiliation
 * par choix libre et confirmée (option B), registre des gains (ADR 031), défis structurants. Aucune dépendance au DOM, au
 * rendu, au stockage ni au moteur de duel : l'appelant lui transmet des FAITS (scène jouée, duel terminé et ses faits
 * publics, choix du joueur). Propositions : `docs/m10/` ; rien n'est ratifié hors ADR 029 à 031.
 */
import { FAMILIES, type Family } from '../game/catalog/cards';
import { deF, figure, figureDe, FIGURES, leF, MAISONS, ORDRE_ETAT, ROLE_LABEL, TECHNIQUES_RUE, type EtatFamille, type Figure, type SceneId } from './modele';
import { accorder, aGain, collectionDe, gainBasics, gainNeutres, gainSignature, gainTechnique, gainVariante, type Gain } from './registre';
import { deckDepart, equiperTechnique, equiperVersion, integrerBasics, type DeckAv } from './deck';
import { finEpreuve, finFinale, finJoute, finMiroir, finPoule, nouvellesCompetitions, ouvertChampionnat, statutEpreuve, statutJoute, type EtatCompetitions } from './competitions';

/** Faits PUBLICS d'un duel (journal public du joueur) : aucun secret (ADR 011, ADR 029 §5). */
export interface FaitsPublics {
  assautsGagnes: number;
  gardesGagnees: number;
  interferencesReussies: number;
}

export type Issue = 'victoire' | 'defaite' | 'abandon';

export interface AventureEtat {
  /** Scènes jouées, dans l'ordre. */
  scenes: SceneId[];
  familles: Record<Family, EtatFamille>;
  /** Famille d'accueil courante (seule `affilie`), null avant la confirmation. */
  affiliation: Family | null;
  /** Famille dont l'émissaire s'est avancé le premier (P5), selon un fait public du duel. */
  premier: Family | null;
  /** Issue du duel public du prologue (répliques seulement : ne bloque rien). */
  prologue: Issue | null;
  /** Figures structurantes dont un duel a été lancé (le changement d'affiliation se ferme au premier lieutenant). */
  engages: string[];
  /** Figures vaincues au moins une fois. */
  vaincues: string[];
  registre: Gain[];
  deck: DeckAv;
  /** Lieux visités et personnes rencontrées : notés à part des états (ADR 029 §4). */
  visites: string[];
  rencontres: string[];
  /** Changements d'affiliation (P-N6), pour mémoire. */
  changements: Array<{ de: Family; vers: Family; at: string }>;
  /** Compétitions facultatives et Championnat (M10-D/E en avance, `competitions.ts`). */
  competitions: EtatCompetitions;
  /**
   * Combats menés à leur terme (victoire ou défaite ; un abandon ne compte pas) : les PV du joueur en dépendent
   * (avenant M10-A, AV-08 : ils montent à chaque combat, sans plafond ; `paliers.ts`, `pvJoueur`).
   */
  combats: number;
}

export type Evenement =
  | { type: 'scene'; id: SceneId }
  | { type: 'duelPrologue'; issue: Issue; faits: FaitsPublics }
  | { type: 'confirmer'; famille: Family }
  | { type: 'changer'; famille: Family }
  | { type: 'engager'; famille: Family }
  | { type: 'lancerDefi'; figure: string }
  | { type: 'duelStructurant'; figure: string; issue: Issue; duel: string }
  | { type: 'epreuve'; famille: Family; issue: Issue; duel: string }
  | { type: 'joute'; famille: Family; issue: Issue; duel: string }
  | { type: 'championnat'; manche: 'poule' | 'miroir' | 'finale'; chef?: Family; signature: Family; issue: Issue }
  | { type: 'visite'; lieu: string }
  | { type: 'rencontre'; personne: string }
  /** Un duel de l'aventure s'achève (tout duel : structurant, compétition, rue, rival, Championnat). */
  | { type: 'combat'; issue: Issue };

export interface Resultat {
  etat: AventureEtat;
  /** Gains nouvellement accordés (écran de récompense). */
  gains: Gain[];
  /** Refus motivé (l'état est inchangé). */
  refus?: string;
}

export function nouvelleAventure(at: string): AventureEtat {
  const familles = Object.fromEntries(FAMILIES.map((f) => [f, 'inconnue'])) as Record<Family, EtatFamille>;
  const base: AventureEtat = { scenes: ['P0'], familles, affiliation: null, premier: null, prologue: null, engages: [], vaincues: [], registre: [], deck: deckDepart(), visites: [], rencontres: [], changements: [], competitions: nouvellesCompetitions(), combats: 0 };
  let reg = accorder(base.registre, gainNeutres(at)).registre;
  for (const t of TECHNIQUES_RUE) reg = accorder(reg, gainTechnique(t, 'P0', at)).registre;
  return { ...base, registre: reg };
}

const capitale = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const monter = (a: EtatFamille, b: EtatFamille): EtatFamille => (ORDRE_ETAT[b] > ORDRE_ETAT[a] ? b : a);
const joue = (e: AventureEtat, s: SceneId) => e.scenes.includes(s);

/** Premier émissaire selon les faits publics du duel (P5) : Assauts → Cendre, Gardes → Ronce, Interférences → Voile,
 *  sinon Astre. Un fait égal à l'autre n'en décide pas : le jeu équilibré revient à l'Astre. */
export function premierEmissaire(f: FaitsPublics): Family {
  if (f.interferencesReussies >= 2) return 'Voile';
  if (f.assautsGagnes > f.gardesGagnees) return 'Cendre';
  if (f.gardesGagnees > f.assautsGagnes) return 'Ronce';
  return 'Astre';
}

/** Une famille peut-elle être rejointe maintenant (écran de confirmation) ? Raison affichable sinon. */
export function peutConfirmer(e: AventureEtat, f: Family): { ok: true } | { ok: false; raison: string } {
  if (e.familles[f] === 'inconnue' || e.familles[f] === 'remarque') return { ok: false, raison: `${capitale(leF(f))} ne vous a pas encore adressé d’invitation.` };
  if (e.affiliation === f) return { ok: false, raison: `Vous êtes déjà ${deF(f)}.` };
  if (e.affiliation !== null) return { ok: false, raison: `Vous êtes ${deF(e.affiliation)} : changez d’abord d’affiliation auprès de votre émissaire.` };
  if (e.familles[f] !== 'invite') return { ok: false, raison: `L’invitation ${deF(f)} n’est plus ouverte.` };
  return { ok: true };
}

/** Changement d'affiliation possible (P-N6, proposé) : affilié, et aucun lieutenant de sa famille engagé. */
export function peutChanger(e: AventureEtat): boolean {
  const f = e.affiliation;
  return f !== null && !e.engages.some((id) => figure(id).famille === f);
}

/** Figures défiables maintenant (structurantes), dans l'ordre cadet → bras droit → chef de chaque famille ouverte. */
export function defisOuverts(e: AventureEtat): Figure[] {
  return FIGURES.filter((fig) => statutDefi(e, fig).ouvert);
}

/** Statut d'un défi structurant : ouvert ou verrouillé avec sa raison (jamais caché, P-N4). */
export function statutDefi(e: AventureEtat, fig: Figure): { ouvert: boolean; raison: string; deja: boolean } {
  const deja = e.vaincues.includes(fig.id);
  const fam = fig.famille;
  if (!aGain(e.registre, `basics:${fam}`) || (e.familles[fam] !== 'affilie' && e.familles[fam] !== 'defiee' && e.familles[fam] !== 'chef')) {
    return { ouvert: false, deja, raison: e.affiliation === null ? 'Choisissez d’abord votre voie.' : `Engagez d’abord le défi officiel ${deF(fam)} à la Salle des Bannières.` };
  }
  if (fig.role === 'brasDroit' && !e.vaincues.includes(figureDe(fam, 'cadet').id)) return { ouvert: false, deja, raison: `Battez d’abord ${figureDe(fam, 'cadet').nom}, ${ROLE_LABEL.cadet} ${deF(fam)}.` };
  if (fig.role === 'chef' && !e.vaincues.includes(figureDe(fam, 'brasDroit').id)) return { ouvert: false, deja, raison: `Battez d’abord ${figureDe(fam, 'brasDroit').nom}, ${ROLE_LABEL.brasDroit} ${deF(fam)}.` };
  return { ouvert: true, deja, raison: deja ? 'Revanche (sans récompense)' : 'Défi de progression' };
}

/** Défi officiel d'une autre famille (ADR 031 §4) : après la Signature de sa famille d'accueil (A-6, proposé). */
export function peutEngager(e: AventureEtat, f: Family): { ok: true } | { ok: false; raison: string } {
  if (e.affiliation === null) return { ok: false, raison: 'Choisissez d’abord votre voie.' };
  if (f === e.affiliation) return { ok: false, raison: `${capitale(leF(f))} est votre famille.` };
  if (e.familles[f] === 'defiee' || e.familles[f] === 'chef') return { ok: false, raison: `Le défi ${deF(f)} est déjà engagé.` };
  if (!aGain(e.registre, `signature:${e.affiliation}`)) return { ok: false, raison: `Battez d’abord le chef ${deF(e.affiliation)} : on n’engage les autres familles qu’en duelliste reconnu.` };
  return { ok: true };
}

/** Applique un fait ; un refus laisse l'état inchangé. Idempotent pour les gains (registre). */
export function appliquer(e0: AventureEtat, ev: Evenement, at: string): Resultat {
  const r = appliquerBrut(e0, ev, at);
  // « Une variante remplace une Basic de même identité dans le deck » (cadrage M10, ADR 031) : équipée à son gain.
  if (!r.refus) for (const g of r.gains) if (g.kind === 'variante') r.etat.deck = equiperVersion(r.etat.deck, g.items[0]!);
  return r;
}

function appliquerBrut(e0: AventureEtat, ev: Evenement, at: string): Resultat {
  const e: AventureEtat = structuredClone(e0);
  const gains: Gain[] = [];
  const grant = (g: Gain): string | undefined => {
    const r = accorder(e.registre, g);
    e.registre = r.registre;
    if (r.nouveau) gains.push(g);
    return r.refus;
  };
  const refuse = (raison: string): Resultat => ({ etat: structuredClone(e0), gains: [], refus: raison });

  switch (ev.type) {
    case 'scene':
      if (!joue(e, ev.id)) e.scenes.push(ev.id);
      return { etat: e, gains };

    case 'duelPrologue': {
      if (e.prologue !== null) return { etat: e, gains }; // rejouer le fait ne change rien (reprise)
      e.prologue = ev.issue;
      for (const s of ['P3', 'P4', 'P5'] as SceneId[]) if (!joue(e, s)) e.scenes.push(s);
      // P5 : les quatre familles remarquent, puis invitent (ADR 029 ; P-N3 : les quatre émissaires invitent).
      for (const f of FAMILIES) e.familles[f] = monter(e.familles[f], 'invite');
      e.premier = premierEmissaire(ev.faits);
      return { etat: e, gains };
    }

    case 'confirmer': {
      const ok = peutConfirmer(e, ev.famille);
      if (!ok.ok) return refuse(ok.raison);
      e.affiliation = ev.famille;
      e.familles[ev.famille] = 'affilie';
      if (!joue(e, 'P6')) e.scenes.push('P6');
      if (!joue(e, 'P7')) e.scenes.push('P7');
      const nouveauxBasics = !aGain(e.registre, `basics:${ev.famille}`);
      grant(gainBasics(ev.famille, `P7:${ev.famille}`, at));
      grant(gainTechnique(MAISONS[ev.famille].technique, `P7:${ev.famille}`, at));
      if (nouveauxBasics) e.deck = equiperTechnique(integrerBasics(e.deck, ev.famille), MAISONS[ev.famille].technique);
      return { etat: e, gains };
    }

    case 'changer': {
      if (!peutChanger(e)) return refuse('Votre voie est engagée : vous avez déjà défié un lieutenant de votre famille.');
      const de = e.affiliation!;
      if (de === ev.famille) return refuse(`Vous êtes déjà ${deF(de)}.`);
      if (e.familles[ev.famille] !== 'invite') return refuse(`${capitale(leF(ev.famille))} ne vous a pas adressé d’invitation.`);
      // P-N6 : seule régression d'état permise, explicite ; les cartes reçues restent (gains définitifs).
      e.familles[de] = 'invite';
      e.affiliation = null;
      e.changements.push({ de, vers: ev.famille, at });
      const r = appliquerBrut(e, { type: 'confirmer', famille: ev.famille }, at);
      return r.refus ? refuse(r.refus) : { etat: r.etat, gains: r.gains };
    }

    case 'engager': {
      const ok = peutEngager(e, ev.famille);
      if (!ok.ok) return refuse(ok.raison);
      e.familles[ev.famille] = 'defiee';
      const nouveauxBasics = !aGain(e.registre, `basics:${ev.famille}`);
      grant(gainBasics(ev.famille, `engagement:${ev.famille}`, at));
      grant(gainTechnique(MAISONS[ev.famille].technique, `engagement:${ev.famille}`, at));
      if (nouveauxBasics) e.deck = integrerBasics(e.deck, ev.famille);
      return { etat: e, gains };
    }

    case 'lancerDefi': {
      const fig = figure(ev.figure);
      const st = statutDefi(e, fig);
      if (!st.ouvert) return refuse(st.raison);
      if (!e.engages.includes(fig.id)) e.engages.push(fig.id);
      return { etat: e, gains };
    }

    case 'duelStructurant': {
      const fig = figure(ev.figure);
      if (!e.engages.includes(fig.id)) return refuse('Ce défi n’a pas été lancé.');
      if (ev.issue !== 'victoire') return { etat: e, gains }; // défaite, abandon : rien de perdu, le défi reste ouvert
      const premiere = !e.vaincues.includes(fig.id);
      if (premiere) e.vaincues.push(fig.id);
      // Récompense de progression : à la PREMIÈRE victoire seulement (une revanche ne duplique rien, ADR 031).
      if (premiere) {
        const src = `duel:${ev.duel}`;
        if (fig.enjeu.kind === 'variante') {
          const refus = grant(gainVariante(fig.enjeu.defId, src, at));
          if (refus) return refuse(refus);
        } else {
          grant(gainSignature(fig.famille, src, at));
          e.familles[fig.famille] = 'chef';
          if (e.deck.signature === null) e.deck = { ...e.deck, signature: fig.famille };
        }
      }
      return { etat: e, gains };
    }

    case 'epreuve': {
      const st = statutEpreuve(e.competitions, e.registre, ev.famille);
      if (!st.ouvert) return refuse(st.texte);
      const r = finEpreuve(e.competitions, e.registre, ev.famille, ev.issue === 'victoire', ev.duel, at);
      e.competitions = r.c;
      e.registre = r.registre;
      gains.push(...r.gains);
      return { etat: e, gains };
    }

    case 'joute': {
      if (!e.vaincues.includes(`brasDroit-${ev.famille}`)) return refuse(statutJoute(e.competitions, e.vaincues, ev.famille, e.deck).texte);
      const r = finJoute(e.competitions, e.registre, ev.famille, ev.issue === 'victoire', ev.duel, at);
      e.competitions = r.c;
      e.registre = r.registre;
      gains.push(...r.gains);
      return { etat: e, gains };
    }

    case 'championnat': {
      if (!ouvertChampionnat(e.familles)) return refuse('Le Championnat s’ouvre quand les quatre chefs sont vaincus.');
      const v = ev.issue === 'victoire';
      if (ev.manche === 'poule' && ev.chef) e.competitions = finPoule(e.competitions, ev.chef, ev.signature, v);
      else if (ev.manche === 'miroir') e.competitions = finMiroir(e.competitions, v);
      else if (ev.manche === 'finale') e.competitions = finFinale(e.competitions, ev.signature, v);
      return { etat: e, gains };
    }

    case 'visite':
      if (!e.visites.includes(ev.lieu)) e.visites.push(ev.lieu);
      return { etat: e, gains };

    case 'rencontre':
      // Parler à quelqu'un (un émissaire compris) n'engage rien (ADR 031 §4) : simple rencontre.
      if (!e.rencontres.includes(ev.personne)) e.rencontres.push(ev.personne);
      return { etat: e, gains };

    case 'combat':
      // AV-08 : chaque combat mené à son terme fait monter les PV du joueur ; un abandon ne compte pas.
      if (ev.issue !== 'abandon') e.combats += 1;
      return { etat: e, gains };
  }
}

/** Chapitre courant (journal des quêtes, HUD). */
export function chapitre(e: AventureEtat): 'prologue' | 'maison' | 'voies' | 'championnat' | 'champion' {
  if (e.competitions?.championnat.titre) return 'champion';
  if (e.affiliation === null || !aGain(e.registre, `basics:${e.affiliation}`)) return 'prologue';
  if (!aGain(e.registre, `signature:${e.affiliation}`)) return 'maison';
  if (FAMILIES.every((f) => e.familles[f] === 'chef')) return 'championnat';
  return 'voies';
}

/** Vérification de cohérence (sauvegarde, tests) : la collection dérivée et le deck s'accordent avec les états. */
export function controlerEtat(e: AventureEtat): string[] {
  const out: string[] = [];
  const col = collectionDe(e.registre);
  for (const f of FAMILIES) {
    const st = e.familles[f];
    if (col.basics.includes(f) && ORDRE_ETAT[st] < 2) out.push(`${f} : cartes de base sans invitation`);
    if (col.signatures.includes(f) && st !== 'chef') out.push(`${f} : Signature sans chef vaincu`);
  }
  if (e.affiliation && e.familles[e.affiliation] !== 'affilie' && e.familles[e.affiliation] !== 'chef') out.push('affiliation incohérente');
  if (FAMILIES.filter((f) => e.familles[f] === 'affilie').length > 1) out.push('plusieurs familles affiliées');
  if (e.deck.signature && !col.signatures.includes(e.deck.signature)) out.push('Signature équipée non possédée');
  return out;
}
