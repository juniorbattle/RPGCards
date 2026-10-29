/**
 * Marche de profil du protagoniste (retour du responsable du 2026-10-29 : sa marche de côté « demande encore du
 * peaufinage »). Sur la feuille du joueur (J1), les quatre temps de profil sont quatre foulées ouvertes, la même jambe
 * devant ; les bras, eux, alternent (besace en arrière aux temps 1 et 3, en avant aux temps 2 et 4). La pose de passage
 * empruntée au repos (passe 162) changeait toute la silhouette à chaque pas : bras, besace et manteau sautaient.
 *
 * Ici, par code et sans toucher à l'image approuvée : deux foulées de bras opposés restent les contacts, et les deux
 * autres temps deviennent des passages, le haut du corps gardé tel quel et les jambes ramenées sous le corps par un
 * cisaillement depuis la hanche (jambe arrière vers l'avant, jambe avant vers l'arrière, cachées derrière le manteau).
 * Cycle : contact, passage (mêmes bras), contact (bras opposés), passage. Fonctions pures, sur des pixels RGBA d'une case
 * en pixels d'art, lignes de haut en bas.
 */

/** Plan de la marche de profil d'une feuille (manifeste, champ `profil`) : colonnes des deux contacts et des deux passages. */
export interface PlanProfil {
  contacts: readonly [number, number];
  passages: readonly [number, number];
}

/** Contrôle d'un plan : quatre colonnes de marche (1 à 4) distinctes. */
export function planValable(p: unknown): p is PlanProfil {
  const x = p as Partial<PlanProfil> | null;
  const cols = [...(Array.isArray(x?.contacts) ? x!.contacts : []), ...(Array.isArray(x?.passages) ? x!.passages : [])];
  return cols.length === 4 && x!.contacts!.length === 2 && cols.every((c) => Number.isInteger(c) && c >= 1 && c <= 4) && new Set(cols).size === 4;
}

/** Cycle de profil d'un plan : contact, passage aux mêmes bras, contact opposé, passage. */
export function cyclePlan(p: PlanProfil): readonly [number, number, number, number] {
  return [p.contacts[0], p.passages[0], p.contacts[1], p.passages[1]];
}

/**
 * Manteau (feuille encore en tons clés, avant recoloration) : tenue en magenta clé (rouge et bleu égaux, sans vert) ou
 * clair chaud (liseré doré, mains). Les jambes sont ce qui reste sous le manteau, colonne par colonne.
 */
export function estManteau(r: number, g: number, b: number): boolean {
  return (g < 20 && r > 15 && b > 15 && Math.abs(r - b) < 20) || (r > 130 && g > 95 && r > b + 40);
}

interface Case { px: Uint8ClampedArray | Uint8Array; w: number; h: number }

const opaque = (c: Case, x: number, y: number) => c.px[(y * c.w + x) * 4 + 3]! > 128;
const manteau = (c: Case, x: number, y: number) => {
  const i = (y * c.w + x) * 4;
  return opaque(c, x, y) && estManteau(c.px[i]!, c.px[i + 1]!, c.px[i + 2]!);
};

/** Pieds au sol (`sol` : dernière ligne des pieds) : bords et centres des deux groupes, arrière et avant (profil droit). */
export function piedsAuSol(c: Case, sol: number): { x0: number; x1: number; arriere: number; avant: number } | null {
  const xs: number[] = [];
  for (let x = 0; x < c.w; x++) for (let y = Math.max(0, sol - 3); y <= sol; y++) if (opaque(c, x, y)) { xs.push(x); break; }
  if (!xs.length) return null;
  const x0 = xs[0]!;
  const x1 = xs.at(-1)!;
  const mid = (x0 + x1) / 2;
  const moy = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const arr = xs.filter((x) => x < mid);
  const av = xs.filter((x) => x >= mid);
  return { x0, x1, arriere: arr.length ? moy(arr) : mid, avant: av.length ? moy(av) : mid };
}

/** Écart des pieds d'une foulée (px d'art, du centre du pied arrière au centre du pied avant). */
export function ecartPieds(c: Case, sol: number): number {
  const p = piedsAuSol(c, sol);
  return p ? p.avant - p.arriere : 0;
}

/**
 * Pose de passage tirée d'une foulée, en place : le haut du corps (et tout le manteau) inchangé ; les pixels des jambes
 * (sous le pixel de manteau le plus bas de leur colonne, à partir de la hanche) glissent vers le milieu des pieds, de 0 à
 * la hanche jusqu'à `amp` au sol, la jambe arrière vers l'avant, la jambe avant vers l'arrière ; un pixel déplacé ne
 * recouvre jamais le manteau (la jambe passe derrière lui) ; la jambe avant (la plus proche) est posée en dernier.
 * `sol` : dernière ligne des pieds ; `hanche` : ligne où le cisaillement commence ; `amp` par défaut : les deux pieds
 * ramenés à 6 px d'art l'un de l'autre.
 */
export function posePassage(c: Case, sol: number, hanche: number, amp?: number): void {
  const pieds = piedsAuSol(c, sol);
  if (!pieds) return;
  const a = amp ?? Math.max(0, Math.round((pieds.avant - pieds.arriere - 6) / 2));
  const bas = Array.from({ length: c.w }, (_, x) => { let l = -1; for (let y = 0; y <= sol; y++) if (manteau(c, x, y)) l = y; return l; });
  const mid = (pieds.x0 + pieds.x1) / 2;
  const jambes: { x: number; y: number; rgba: number[] }[] = [];
  for (let y = Math.max(0, hanche - 4); y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!opaque(c, x, y) || y <= bas[x]!) continue;
    const i = (y * c.w + x) * 4;
    // le trait sombre juste sous l'ourlet reste au manteau
    if (bas[x]! >= 0 && y - bas[x]! <= 1 && c.px[i]! + c.px[i + 1]! + c.px[i + 2]! < 80) continue;
    jambes.push({ x, y, rgba: [c.px[i]!, c.px[i + 1]!, c.px[i + 2]!, c.px[i + 3]!] });
  }
  for (const j of jambes) c.px.fill(0, (j.y * c.w + j.x) * 4, (j.y * c.w + j.x) * 4 + 4);
  const poser = (dir: 1 | -1) => {
    for (const j of jambes) {
      if ((j.x < mid) !== (dir > 0)) continue;
      const t = Math.max(0, Math.min(1, (j.y - hanche) / Math.max(1, sol - hanche)));
      const nx = Math.round(j.x + dir * a * t);
      if (nx < 0 || nx >= c.w || manteau(c, nx, j.y)) continue;
      c.px.set(j.rgba, (j.y * c.w + nx) * 4);
    }
  };
  poser(1);
  poser(-1);
}
