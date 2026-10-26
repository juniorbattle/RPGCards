/**
 * Finalisation de la ville (M09, passe 137 ; décision du responsable : heure de ville « Tout préparer ») — **points de
 * départ par chapitre**, pour juger une heure de ville à un chapitre avancé sans rejouer tout ce qui précède. Un point de
 * départ n'est qu'une suite de FAITS appliqués par la machine de l'aventure (`appliquer`, mêmes règles que le jeu : un
 * fait refusé arrête tout) : le prologue gagné, l'affiliation, puis les chefs vaincus jusqu'au chapitre voulu, chaque
 * défi gagné au premier essai, chaque duel compté comme un combat mené à son terme (les PV en suivent, AV-08). Rien
 * d'autre n'est inventé : directeur neuf, historique vide. Pur.
 */
import { FAMILIES, type Family } from '../game/catalog/cards';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from './aventure';
import { figureDe, ROLES } from './modele';

export const DEPARTS = ['I', 'II', 'III', 'IV', 'V'] as const;
export type Depart = (typeof DEPARTS)[number];

export const estDepart = (x: string | null): x is Depart => !!x && (DEPARTS as readonly string[]).includes(x);
export const estFamille = (x: string | null): x is Family => !!x && (FAMILIES as readonly string[]).includes(x);

/** Les faits qui mènent au début du chapitre `d`, la famille `f` rejointe (les autres engagées dans l'ordre du jeu). */
export function faitsDepart(d: Depart, f: Family): Evenement[] {
  const conquerir = (x: Family): Evenement[] => ROLES.flatMap((r): Evenement[] => {
    const id = figureDe(x, r).id;
    return [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue: 'victoire', duel: `depart-${x}-${r}` }, { type: 'combat', issue: 'victoire' }];
  });
  const evs: Evenement[] = [
    { type: 'scene', id: 'P2' },
    { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 2, gardesGagnees: 2, interferencesReussies: 0 } },
    { type: 'combat', issue: 'victoire' },
    { type: 'confirmer', famille: f },
  ];
  const n = DEPARTS.indexOf(d);
  if (n >= 1) evs.push(...conquerir(f));
  for (const x of FAMILIES.filter((y) => y !== f).slice(0, Math.max(0, n - 1))) evs.push({ type: 'engager', famille: x }, ...conquerir(x));
  return evs;
}

/** L'état de l'aventure au début du chapitre `d` (depuis l'état neuf `e0`, la scène P1 jouée) ; lève si un fait est refusé. */
export function etatDepart(e0: AventureEtat, d: Depart, f: Family, at: string): AventureEtat {
  let e = e0;
  for (const ev of faitsDepart(d, f)) {
    const r = appliquer(e, ev, at);
    if (r.refus) throw new Error(`Point de départ ${d} (${f}) : fait refusé (${ev.type}) : ${r.refus}`);
    e = r.etat;
  }
  return e;
}

/** Raccourci : une aventure neuve (P1 jouée) menée au début du chapitre `d`. */
export const aventureAuDepart = (d: Depart, f: Family, at: string): AventureEtat =>
  etatDepart(appliquer(nouvelleAventure(at), { type: 'scene', id: 'P1' }, at).etat, d, f, at);
