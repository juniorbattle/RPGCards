/**
 * M14 — le Récit guidé (`docs/m14/01_RECIT_GUIDE.md`, ADR 048). Pour le mode où le joueur va d'événement en événement
 * par des écrans noirs, ce module répond à la question de `objectif` (`quetes.ts`), en personne et non en phrase : qui
 * retrouver maintenant, ou quel choix lui demander. Le mode n'est jamais un fait de l'aventure : il ne change que le
 * chemin du joueur. Aucun DOM ; l'application fait la transition et ouvre la scène. Pur.
 */
import { FAMILIES } from '../game/catalog/cards';
import type { IlotId } from '../ville/ilots';
import { chapitre, chapitreDetaille, statutDefi, type AventureEtat } from './aventure';
import { rencontreDef, type EtatDirecteur } from './directeur';
import { figureDe, KAI_PROLOGUE, ROLES } from './modele';
import { evenementRival, type EvenementRival } from './rival';
import { GUETTEURS } from './vue';

/** Promenade libre (défaut, champ absent de la sauvegarde) ou Récit guidé. */
export type ModeRecit = 'libre' | 'guide';

export const NOM_RECIT: Readonly<Record<ModeRecit, string>> = { libre: 'Promenade libre', guide: 'Récit guidé' };

/** Passe 209 : l'accroche visible sur la carte du choix ; le texte entier au survol. */
export const ACCROCHE_RECIT: Readonly<Record<ModeRecit, string>> = { libre: 'La ville à pied, à votre rythme.', guide: 'La trame, scène après scène.' };

export const TEXTE_RECIT: Readonly<Record<ModeRecit, string>> = {
  libre: 'Parcourez la ville à pied et affrontez tous les joueurs de rue en menant votre quête.',
  guide: 'Vivez la trame comme un film, d’événement en événement : ses scènes s’enchaînent, avec une Préparation avant chaque duel.',
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
 * L'événement de Kaï dû maintenant et un quartier où il peut surgir (l'îlot courant d'abord). Sans duel, il ne se rattrape
 * pas après son chapitre (`rival.ts`) : le Récit guidé le passe avant l'objectif.
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

/** La suite du récit : Kaï s'il est dû, ou tout de suite s'il vient de gagner (K3), sinon l'étape ; null quand il ne reste rien. */
export function suiteRecit(e: AventureEtat, o: { ilots: readonly IlotId[]; ici: IlotId; quaiRangs?: boolean; dernier?: string | undefined }): { rival: { k: EvenementRival; ilot: IlotId } } | { etape: EtapeRecit } | null {
  const rival = rivalDu(e, o.ilots, o.ici, o.quaiRangs ?? true);
  const etape = etapeRecit(e);
  const aRejouer = !!rival && !!e.rival?.perdus?.includes(rival.k.id);
  if (rival && (!etape || aRejouer || !kaiVientDeJouer(o.dernier))) return { rival };
  return etape ? { etape } : null;
}

type SuiteRecit = NonNullable<ReturnType<typeof suiteRecit>>;

/**
 * Révision 3 du contrat, §4 : les scènes s'enchaînent seules ; la Préparation ne s'ouvre qu'avant un duel de la trame ou un
 * choix. Le prologue (Kaï, l'émissaire) se joue d'un seul tenant ; Kaï qui défie surgit au début de la séquence suivante.
 */
export function enchainement(s: SuiteRecit): 'scene' | 'preparation' {
  if ('rival' in s) return s.rival.k.duel ? 'preparation' : 'scene';
  const e = s.etape;
  if (e.kind === 'bannieres') return 'scene';
  return e.kind === 'personne' && (e.id === KAI_PROLOGUE.id || e.id.startsWith('emissaire-')) ? 'scene' : 'preparation';
}

/** L'identité d'une suite : une scène enchaînée seule ne s'enchaîne qu'une fois (un refus ramène à la Préparation). */
export const cleSuite = (s: SuiteRecit): string => ('rival' in s ? `rival:${s.rival.k.id}` : s.etape.kind === 'personne' ? s.etape.id : s.etape.kind);

/** Le quartier où se trouve un personnage, d'après les personnages posés de chaque quartier. */
export function quartierDe(id: string, ilots: readonly IlotId[], posesDe: (ilot: IlotId) => ReadonlyArray<{ id: string }>): IlotId | null {
  return ilots.find((ilot) => posesDe(ilot).some((p) => p.id === id)) ?? null;
}

/** Un joueur de rue proposé par la Halte, et où il se tient. */
export interface JoueurRue { id: string; ilot: IlotId; place: number }

/**
 * Les joueurs de rue de la Halte (contrat, §4 bis) : ceux de la Promenade libre, une fois votre famille rejointe ; un joueur
 * déjà affronté quitte la liste jusqu'au chapitre suivant. Un joueur déjà posé reste où il se tient.
 */
export function joueursDeRue(d: EtatDirecteur, e: AventureEtat, ilots: readonly IlotId[], quaiRangs = true): JoueurRue[] {
  if (e.affiliation === null) return [];
  const ch = chapitreDetaille(e);
  return [...GUETTEURS].flatMap((id) => {
    const r = rencontreDef(id);
    if (!r?.dispo(e) || d.vus?.[id]?.chapitre === ch) return [];
    for (const ilot of ilots) {
      const a = d.actives[ilot]?.find((x) => x.id === id);
      if (a) return [{ id, ilot, place: a.place }];
    }
    const place = r.lieux.findIndex((l) => ilots.includes(l.ilot) && (quaiRangs || !l.rangs));
    return place < 0 ? [] : [{ id, ilot: r.lieux[place]!.ilot, place }];
  });
}
