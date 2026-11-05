/**
 * M16 — logique pure des points de collecte (contrat `docs/m16/01_CHASSE_ET_TECHNIQUES.md` §2, fiche C1 à C5) :
 * quels points sont allumés, ce qu'un point donne, s'il est gardé, quelle piste une rumeur peut donner. Promenade libre
 * seulement (C5) : l'appelant ne les montre pas en Récit guidé.
 */
import { CATALOG, FAMILIES, type Family } from '../game/catalog/cards';
import { hashString } from '../game/engine/rng';
import { chapitreDetaille, collecteDe, type AventureEtat } from './aventure';
import { POINTS_COLLECTE, pointCollecte, type ChapitreTrame, type PointCollecte } from './collecteDonnees';
import { aGain, variantesIdentite } from './registre';
import { RANGS } from './modele';

const ORDRE: Record<ReturnType<typeof chapitreDetaille>, number> = { prologue: 0, I: 1, II: 2, III: 3, IV: 4, V: 5, titre: 6 };
const ORDRE_POINT: Record<ChapitreTrame, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

/** Le point est-il allumé (son chapitre est atteint) et pas encore ramassé ? */
export function pointActif(e: AventureEtat, p: PointCollecte): boolean {
  return ORDRE[chapitreDetaille(e)] >= ORDRE_POINT[p.chapitre] && !collecteDe(e).trouves.includes(p.id);
}

/** Points allumés et pas encore ramassés, dans un îlot (ou partout). */
export function pointsActifs(e: AventureEtat, ilot?: string): PointCollecte[] {
  return POINTS_COLLECTE.filter((p) => (!ilot || p.ilot === ilot) && pointActif(e, p));
}

/** Le gardien d'un point se tient-il encore devant sa carte (point gardé, gardien pas encore battu) ? */
export const gardienPresent = (e: AventureEtat, p: PointCollecte): boolean => p.garde === 'gardien' && !collecteDe(e).gardiens.includes(p.id);

/** Familles dont un point peut donner une variante (fiche C1) : rejointes ou engagées, cartes de base possédées. */
export const famillesCollecte = (e: AventureEtat): Family[] =>
  FAMILIES.filter((f) => ['affilie', 'defiee', 'chef'].includes(e.familles[f]) && aGain(e.registre, `basics:${f}`));

/** Les variantes qu'un point peut encore donner : celles qui manquent, des familles rejointes ou engagées. */
export function variantesATrouver(e: AventureEtat): string[] {
  return famillesCollecte(e).flatMap((f) => RANGS.flatMap((r) => variantesIdentite(`${f}-${r}`))).filter((v) => !aGain(e.registre, `variante:${v}`));
}

/** Une variante est-elle une récompense valable pour un point (fiche C1) ? */
export const varianteValable = (e: AventureEtat, v: string): boolean => variantesATrouver(e).includes(v);

/**
 * Ce que donne un point : une variante qui manque, tirée à graine fixe (la même aventure retrouve la même carte au même
 * point) ; null s'il ne reste rien à trouver dans les familles du joueur.
 */
export function recompensePoint(e: AventureEtat, pointId: string, graine: number): string | null {
  const v = variantesATrouver(e);
  if (!v.length) return null;
  return v[hashString(`collecte:${graine >>> 0}:${pointId}`) % v.length]!;
}

/** Une piste à donner par une rumeur : un point allumé, pas ramassé, dont on n'a pas encore entendu parler (les recoins
 *  annoncés par rumeur d'abord, puis les plus proches du chapitre). */
export function pisteAEntendre(e: AventureEtat): PointCollecte | null {
  const c = collecteDe(e);
  const cand = pointsActifs(e).filter((p) => !c.pistes.includes(p.id));
  cand.sort((a, b) => (a.garde === 'rumeur' ? 0 : 1) - (b.garde === 'rumeur' ? 0 : 1) || ORDRE_POINT[a.chapitre] - ORDRE_POINT[b.chapitre]);
  return cand[0] ?? null;
}

/** Bilan de la chasse (Journal) : trouvés sur le total, et les points allumés restant à trouver. */
export function bilanCollecte(e: AventureEtat): { trouves: number; total: number; restants: PointCollecte[] } {
  return { trouves: collecteDe(e).trouves.filter((id) => !!pointCollecte(id)).length, total: POINTS_COLLECTE.length, restants: pointsActifs(e) };
}

/** Nom lisible d'une variante trouvée (carton de la découverte). */
export const nomCarte = (defId: string): string => CATALOG[defId]?.name ?? defId;
