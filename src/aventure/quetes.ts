/**
 * M10-B — quêtes DÉRIVÉES des faits (PROGRESSION_ET_RECOMPENSES §6) : aucune quête n'est un état stocké ; l'objectif
 * courant et le journal se recalculent depuis l'état de l'aventure. Pas de quête « échouée » (ADR 029). Pur.
 */
import { FAMILIES } from '../game/catalog/cards';
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
  if (e.prologue === null) return `${KAI_PROLOGUE.nom} vous a défié. Retournez le voir pour relever le défi.`;
  if (e.affiliation === null) {
    const p = e.premier ? emissaire(e.premier) : null;
    if (p && !e.scenes.includes('P6')) return `${p.nom}, ${deF(p.famille)}, veut vous parler.`;
    return 'Quatre familles vous ont invité. Rendez visite à leurs émissaires et choisissez votre voie.';
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
    return 'Duelliste reconnu : engagez le défi d’une autre famille à la Salle des Bannières (salle de jeu de cartes).';
  }
  if (ch === 'championnat') return 'Les quatre chefs sont vaincus : le Championnat des Champions vous attend (prochain lot, M10-E).';
  return '';
}

/** Journal des quêtes (menu). */
export function quetes(e: AventureEtat): Quete[] {
  const out: Quete[] = [{
    id: 'prologue', titre: 'Prologue — Le gris du Quai', type: 'principale', etapes: [
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
  return out;
}
