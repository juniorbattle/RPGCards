/**
 * M11-E — réglages du son (`docs/m11/06_SON.md`, PROPOSÉ ; ADR 042) : volume général et coupure, mémorisés dans le
 * navigateur à part des sauvegardes (`lqv.son`), lecture et écriture protégées (un stockage refusé ne casse rien) ; son
 * coupé en QA (`?qa=1`, sauf `?son=1`) et partout avec `?son=0`. Pur hormis l'accès au stockage passé en paramètre.
 */
/** M13 : `musique`, le volume de la musique (0 à 1 ; à 0, aucune note n'est calculée ni jouée ; contrat 1, §5). */
export interface ReglagesSon { volume: number; coupe: boolean; musique: number }
export const CLE_SON = 'lqv.son';
export const REGLAGES_DEFAUT: ReglagesSon = { volume: 0.7, coupe: false, musique: 0.6 };

interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

export const bornerVolume = (v: number, defaut = REGLAGES_DEFAUT.volume): number => (Number.isFinite(v) ? Math.round(Math.max(0, Math.min(1, v)) * 100) / 100 : defaut);

export function lireReglages(st: Stockage | null): ReglagesSon {
  try {
    const t = st?.getItem(CLE_SON);
    if (!t) return { ...REGLAGES_DEFAUT };
    const x = JSON.parse(t) as Partial<ReglagesSon>;
    return { volume: bornerVolume(Number(x.volume ?? REGLAGES_DEFAUT.volume)), coupe: x.coupe === true, musique: bornerVolume(Number(x.musique ?? REGLAGES_DEFAUT.musique), REGLAGES_DEFAUT.musique) };
  } catch { return { ...REGLAGES_DEFAUT }; }
}

export function ecrireReglages(st: Stockage | null, r: ReglagesSon): boolean {
  try { st?.setItem(CLE_SON, JSON.stringify({ volume: bornerVolume(r.volume), coupe: !!r.coupe, musique: bornerVolume(r.musique, REGLAGES_DEFAUT.musique) })); return !!st; } catch { return false; }
}

/** Le son est-il permis par l'adresse ? `?son=0` coupe partout ; en QA (`?qa=1`), seulement avec `?son=1`. */
export function sonPermis(search: string): boolean {
  const q = new URLSearchParams(search);
  if (q.get('son') === '0') return false;
  if (q.get('qa') === '1') return q.get('son') === '1';
  return true;
}

/** Gain effectif du bus général (0 si coupé ou non permis). */
export const gainGeneral = (r: Pick<ReglagesSon, 'volume' | 'coupe'>, permis: boolean): number => (permis && !r.coupe ? r.volume : 0);
