/**
 * M12 (demande du responsable du 2026-10-27 : « apprendre les nouveaux signaux au joueur ») — les conseils du duel dans
 * l'aventure : ceux du jeu standard (`src/shell/tips.ts`, dont les cinq signaux M12), un à la fois, fermés par « Compris »
 * et mémorisés dans la sauvegarde de l'aventure (`conseils`). Affichés par défaut ; le menu de l'aventure les masque
 * (`lqv.conseils`, ce navigateur) ou les réaffiche ; coupés en QA sans `?conseils=1` (parcours automatisés d'avant
 * inchangés), comme les cinématiques. Pur hormis le stockage passé en paramètre.
 */
export const CLE_CONSEILS = 'lqv.conseils';
interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Conseils affichés ? Oui par défaut ; lecture protégée (un stockage refusé ne casse rien). */
export function lireConseils(st: Stockage | null): boolean {
  try { return st?.getItem(CLE_CONSEILS) !== '0'; } catch { return true; }
}

export function ecrireConseils(st: Stockage | null, actifs: boolean): boolean {
  try { st?.setItem(CLE_CONSEILS, actifs ? '1' : '0'); return !!st; } catch { return false; }
}

/** Permis par l'adresse ? `?conseils=0` les coupe ; en QA (`?qa=1`), seulement avec `?conseils=1`. */
export function conseilsPermis(search: string): boolean {
  const q = new URLSearchParams(search);
  if (q.get('conseils') === '0') return false;
  if (q.get('qa') === '1') return q.get('conseils') === '1';
  return true;
}

/** Ajoute un conseil lu (sans doublon) ; la liste d'origine n'est pas modifiée. */
export const conseilLu = (lus: readonly string[] | undefined, id: string): string[] => [...new Set([...(lus ?? []), id])];
