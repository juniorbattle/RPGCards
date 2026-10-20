/**
 * M10-B — quêtes DÉRIVÉES des faits (PROGRESSION_ET_RECOMPENSES §6) : aucune quête n'est un état stocké ; l'objectif
 * courant et le journal se recalculent depuis l'état de l'aventure. Pas de quête « échouée » (ADR 029). Pur.
 */
import { CATALOG, cardTitle, FAMILIES } from '../game/catalog/cards';
import { CONTRAINTE_JOUTE, manche, ouvertChampionnat, varianteDe } from './competitions';
import { chapitre, statutDefi, type AventureEtat } from './aventure';
import { deF, emissaire, figureDe, KAI_PROLOGUE, MAISONS, ROLES } from './modele';
import { aGain } from './registre';

export interface Quete {
  id: string;
  titre: string;
  type: 'principale' | 'famille' | 'facultative' | 'rival';
  etapes: Array<{ texte: string; faite: boolean }>;
}

/** Objectif affiché dans la ville (première étape non faite de la quête principale ouverte). */
export function objectif(e: AventureEtat): string {
  if (!e.scenes.includes('P2')) return `Le Quai bruisse du tournoi. Approchez-vous des braseros, à l’est : ${KAI_PROLOGUE.nom} y attend.`;
  if (e.prologue === null) return `${KAI_PROLOGUE.nom} vous lance un défi. Retournez le voir pour le relever.`;
  if (e.affiliation === null) {
    const p = e.premier ? emissaire(e.premier) : null;
    if (p && !e.scenes.includes('P6')) return `${p.nom}, ${deF(p.famille)}, veut vous parler.`;
    return 'Les quatre familles vous invitent. Rendez visite à leurs émissaires et choisissez votre voie.';
  }
  const f = e.affiliation;
  const ch = chapitre(e);
  if (ch === 'maison') {
    for (const r of ROLES) {
      const fig = figureDe(f, r);
      if (!e.vaincues.includes(fig.id)) return `Défiez ${fig.nom}, ${fig.titre} (${MAISONS[f].nom}).`;
    }
  }
  if (ch === 'voies') {
    const ouvertes = FAMILIES.filter((x) => e.familles[x] === 'defiee');
    for (const x of ouvertes) for (const r of ROLES) {
      const fig = figureDe(x, r);
      if (!e.vaincues.includes(fig.id) && statutDefi(e, fig).ouvert) return `Défiez ${fig.nom}, ${fig.titre}.`;
    }
    return 'Votre chef est vaincu : engagez le défi d’une autre famille à la Salle des Bannières (salle de jeu de cartes).';
  }
  if (ch === 'championnat') {
    const m = manche(e.competitions);
    if (m === 'poule') return `Championnat (porte de l’arène, Parvis) — les Quatre Bannières : battez trois chefs, une Signature différente à chaque victoire (${Object.keys(e.competitions.championnat.poule).length}/3).`;
    if (m === 'miroir') return 'Championnat — le Miroir : Kaï vous attend dans l’arène.';
    return 'Championnat — la Finale : deux manches gagnantes contre la Tenante du titre, une Signature différente à chaque manche.';
  }
  if (ch === 'champion') return 'Personne en ville ne joue mieux que vous. Revanches, Épreuves et Joutes restent ouvertes.';
  return '';
}

/** Journal des quêtes (menu). */
export function quetes(e: AventureEtat): Quete[] {
  const out: Quete[] = [{
    id: 'prologue', titre: 'Prologue — Les cartes grises du Quai', type: 'principale', etapes: [
      { texte: `Parler à ${KAI_PROLOGUE.nom}`, faite: e.scenes.includes('P2') },
      { texte: 'Le duel public', faite: e.prologue !== null },
      { texte: 'Écouter les émissaires', faite: e.scenes.includes('P5') },
      { texte: 'Choisir sa voie (confirmer une affiliation)', faite: e.affiliation !== null },
    ],
  }];
  const f = e.affiliation;
  if (f) out.push({ id: `maison:${f}`, titre: `La maison — ${MAISONS[f].nom}`, type: 'principale', etapes: ROLES.map((r) => { const fig = figureDe(f, r); return { texte: `Battre ${fig.nom}, ${fig.titre}`, faite: e.vaincues.includes(fig.id) }; }) });
  for (const x of FAMILIES) {
    if (x === f || (e.familles[x] !== 'defiee' && e.familles[x] !== 'chef')) continue;
    out.push({ id: `voie:${x}`, titre: `La voie ${deF(x)}`, type: 'famille', etapes: [{ texte: 'Défi officiel engagé', faite: aGain(e.registre, `basics:${x}`) }, ...ROLES.map((r) => { const fig = figureDe(x, r); return { texte: `Battre ${fig.nom}`, faite: e.vaincues.includes(fig.id) }; })] });
  }
  if (ouvertChampionnat(e.familles)) {
    const c = e.competitions.championnat;
    out.push({ id: 'championnat', titre: 'Le Championnat des Champions', type: 'principale', etapes: [
      { texte: `Les Quatre Bannières (${Object.keys(c.poule).length}/3 chefs, une Signature différente par victoire)`, faite: Object.keys(c.poule).length >= 3 },
      { texte: 'Le Miroir (Kaï)', faite: c.miroir },
      { texte: `La Finale (${c.finale.filter((m) => m.gagnee).length}/2 manches)`, faite: c.titre },
    ] });
  }
  for (const x of FAMILIES) {
    if (!aGain(e.registre, `basics:${x}`)) continue;
    out.push({ id: `competitions:${x}`, titre: `Compétitions ${deF(x)} (facultatives)`, type: 'facultative', etapes: [
      { texte: `Épreuve du quartier (trois duels) : ${nomV(varianteDe(x, 1))}`, faite: !!e.competitions.epreuves[x]?.gagnee },
      { texte: `Joute de la maison (${CONTRAINTE_JOUTE[x].texte}) : ${nomV(varianteDe(x, 2))}`, faite: !!e.competitions.joutes[x]?.gagnee },
    ] });
  }
  return out;
}

const nomV = (d: string) => (CATALOG[d] ? cardTitle(CATALOG[d]!) : d);
