/**
 * M14 — le Récit guidé (`docs/m14/01_RECIT_GUIDE.md`, ADR 048). Pour le mode où le joueur va d'événement en événement
 * par des écrans noirs, ce module répond à la question de `objectif` (`quetes.ts`), en personne et non en phrase : qui
 * retrouver maintenant, ou quel choix lui demander. Le mode n'est jamais un fait de l'aventure : il ne change que le
 * chemin du joueur. Aucun DOM ; l'application fait la transition et ouvre la scène. Pur.
 */
import { FAMILIES } from '../game/catalog/cards';
import type { IlotId } from '../ville/ilots';
import { chapitre, statutDefi, type AventureEtat } from './aventure';
import { figureDe, KAI_PROLOGUE, ROLES } from './modele';
import { evenementRival, type EvenementRival } from './rival';

/** Promenade libre (défaut, champ absent de la sauvegarde) ou Récit guidé. */
export type ModeRecit = 'libre' | 'guide';

export const NOM_RECIT: Readonly<Record<ModeRecit, string>> = { libre: 'Promenade libre', guide: 'Récit guidé' };

export const TEXTE_RECIT: Readonly<Record<ModeRecit, string>> = {
  libre: 'Parcourez la ville à pied et affrontez tous les joueurs de rue en menant votre quête.',
  guide: 'Allez d’événement en événement, sans vous déplacer : la trame principale, ses scènes et ses combats.',
};

/**
 * Prochain événement de la trame : une personne à retrouver, une personne à choisir (le joueur décide, jamais le mode),
 * la Salle des Bannières, ou le Championnat.
 */
export type EtapeRecit =
  | { kind: 'personne'; id: string }
  | { kind: 'choix'; titre: string; texte: string; ids: readonly string[] }
  | { kind: 'bannieres' }
  | { kind: 'championnat' };

/** Le pendant de `objectif` : null quand la trame n'a plus rien à proposer (après le titre). */
export function etapeRecit(e: AventureEtat): EtapeRecit | null {
  if (!e.scenes.includes('P2') || e.prologue === null) return { kind: 'personne', id: KAI_PROLOGUE.id };
  if (e.affiliation === null) {
    if (e.premier && !e.scenes.includes('P6')) return { kind: 'personne', id: `emissaire-${e.premier}` };
    return { kind: 'choix', titre: 'Choisir sa voie', texte: 'Les quatre familles vous invitent. Qui allez-vous écouter ?', ids: FAMILIES.map((f) => `emissaire-${f}`) };
  }
  const f = e.affiliation;
  const ch = chapitre(e);
  if (ch === 'maison') {
    const fig = ROLES.map((r) => figureDe(f, r)).find((x) => !e.vaincues.includes(x.id));
    return fig ? { kind: 'personne', id: fig.id } : null;
  }
  if (ch === 'voies') {
    const ouvertes = FAMILIES.filter((x) => e.familles[x] === 'defiee');
    const defis = ouvertes.flatMap((x) => ROLES.map((r) => figureDe(x, r)).filter((fig) => !e.vaincues.includes(fig.id) && statutDefi(e, fig).ouvert).slice(0, 1));
    if (defis.length === 1) return { kind: 'personne', id: defis[0]!.id };
    if (defis.length > 1) return { kind: 'choix', titre: 'Le prochain défi', texte: 'Plusieurs familles attendent votre défi. Qui affronter ?', ids: defis.map((x) => x.id) };
    return { kind: 'bannieres' };
  }
  return ch === 'championnat' ? { kind: 'championnat' } : null;
}

/** Quartiers de l'aventure, dans l'ordre où le Récit guidé les essaie. */
export const ILOTS_RECIT: readonly IlotId[] = ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute'];

/**
 * L'événement de Kaï dû maintenant et un quartier où il peut surgir (l'îlot courant d'abord). Il ne se rattrape pas après
 * son chapitre (`rival.ts`) : le Récit guidé le passe avant l'objectif.
 */
export function rivalDu(e: AventureEtat, ilots: readonly IlotId[], ici: IlotId, quaiRangs = true): { k: EvenementRival; ilot: IlotId } | null {
  for (const ilot of [ici, ...ilots.filter((x) => x !== ici)]) {
    const k = evenementRival(e, ilot, quaiRangs);
    if (k) return { k, ilot };
  }
  return null;
}

/** Le dernier duel était-il contre Kaï ? Jamais deux duels de suite contre lui (contrat 2 de M11). */
export const kaiVientDeJouer = (rencontre: string | undefined): boolean => !!rencontre && (rencontre.startsWith('rival:') || rencontre === 'brasDroit-Cendre' || rencontre === 'rival-kai');

/** La suite du récit : Kaï s'il est dû, sinon l'étape de la trame ; null quand il ne reste rien. */
export function suiteRecit(e: AventureEtat, o: { ilots: readonly IlotId[]; ici: IlotId; quaiRangs?: boolean; dernier?: string | undefined }): { rival: { k: EvenementRival; ilot: IlotId } } | { etape: EtapeRecit } | null {
  const rival = rivalDu(e, o.ilots, o.ici, o.quaiRangs ?? true);
  const etape = etapeRecit(e);
  if (rival && (!etape || !kaiVientDeJouer(o.dernier))) return { rival };
  return etape ? { etape } : null;
}

/** Le quartier où se trouve un personnage, d'après les personnages posés de chaque quartier. */
export function quartierDe(id: string, ilots: readonly IlotId[], posesDe: (ilot: IlotId) => ReadonlyArray<{ id: string }>): IlotId | null {
  return ilots.find((ilot) => posesDe(ilot).some((p) => p.id === id)) ?? null;
}
