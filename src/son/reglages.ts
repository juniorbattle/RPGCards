/**
 * M11-E — réglages du son (`docs/m11/06_SON.md`, PROPOSÉ ; ADR 042) : volume général et coupure, mémorisés dans le
 * navigateur à part des sauvegardes (`lqv.son`), lecture et écriture protégées (un stockage refusé ne casse rien) ; son
 * coupé en QA (`?qa=1`, sauf `?son=1`) et partout avec `?son=0`. Pur hormis l'accès au stockage passé en paramètre.
 */
export interface ReglagesSon { volume: number; coupe: boolean }
export const CLE_SON = 'lqv.son';
export const REGLAGES_DEFAUT: ReglagesSon = { volume: 0.7, coupe: false };

interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

export const bornerVolume = (v: number): number => (Number.isFinite(v) ? Math.round(Math.max(0, Math.min(1, v)) * 100) / 100 : REGLAGES_DEFAUT.volume);

export function lireReglages(st: Stockage | null): ReglagesSon {
  try {
    const t = st?.getItem(CLE_SON);
    if (!t) return { ...REGLAGES_DEFAUT };
    const x = JSON.parse(t) as Partial<ReglagesSon>;
    return { volume: bornerVolume(Number(x.volume ?? REGLAGES_DEFAUT.volume)), coupe: x.coupe === true };
  } catch { return { ...REGLAGES_DEFAUT }; }
}

export function ecrireReglages(st: Stockage | null, r: ReglagesSon): boolean {
  try { st?.setItem(CLE_SON, JSON.stringify({ volume: bornerVolume(r.volume), coupe: !!r.coupe })); return !!st; } catch { return false; }
}

/** Le son est-il permis par l'adresse ? `?son=0` coupe partout ; en QA (`?qa=1`), seulement avec `?son=1`. */
export function sonPermis(search: string): boolean {
  const q = new URLSearchParams(search);
  if (q.get('son') === '0') return false;
  if (q.get('qa') === '1') return q.get('son') === '1';
  return true;
}

/** Gain effectif du bus général (0 si coupé ou non permis). */
export const gainGeneral = (r: ReglagesSon, permis: boolean): number => (permis && !r.coupe ? r.volume : 0);
