/**
 * Repli automatique du post-traitement (M07 L3, amendement de l’ADR 019) — module PUR : ni DOM, ni three.js,
 * ni minuterie. L’arène lui donne chaque intervalle requestAnimationFrame de sa boucle (jamais en rendu figé, en
 * mouvement réduit ni pendant la pause des menus) ; il dit quand baisser le rendu d’un cran :
 * `full` (post-traitement complet) → `nobloom` (sans halo lumineux) → `direct` (rendu direct, sans post-traitement).
 *
 * - Tranches d’une seconde d’images observées. Rythme nominal de l’écran : premier quartile des intervalles, le plus
 *   bas vu depuis le début du duel (une image sur quatre au rythme de l’écran suffit à le retrouver ; moins sensible
 *   qu’un centile bas aux intervalles plus courts que la période qui suivent une image en retard, vus sous charge).
 * - Une tranche est MAUVAISE si sa médiane dépasse nettement le nominal (rendu durablement plus lent que l’écran),
 *   ou si au moins 5 % de ses images arrivent en retard (sous 60 images/s, et au moins 1,6 nominal) : quand le GPU
 *   intégré ralentit, la médiane reste au rythme de l’écran et ce sont ces images-là qui décrochent (journal,
 *   passe 18 : médiane 6,1 ms, 5 à 12 % des images au-delà de 16,7 ms).
 * - Un cran après TROIS tranches mauvaises consécutives (un à-coup isolé, une compilation, ne suffit pas) ; la
 *   tranche qui suit un cran n’est pas jugée (le temps d’en voir l’effet) ; les deux premières tranches d’un duel
 *   non plus (mise en place du plateau).
 * - Un seul sens pendant un duel : jamais de remontée, donc aucune oscillation. `reset` (menus, avant le duel
 *   suivant) rend le niveau de départ et remesure le nominal (autre écran, poste reposé).
 */

export type PostLevel = 'full' | 'nobloom' | 'direct';
export const POST_LEVELS: readonly PostLevel[] = ['full', 'nobloom', 'direct'];

export interface FallbackConfig {
  /** Durée d’une tranche, en temps d’images observées (somme des intervalles), ms. */
  sliceMs: number;
  /** Tranches mauvaises consécutives avant un cran. */
  badSlices: number;
  /** Tranches non jugées au début d’un duel (elles servent au nominal). */
  warmupSlices: number;
  /** Tranches non jugées après un cran. */
  settleSlices: number;
  /** Tranche lente : médiane > `medianRatio` × nominal. */
  medianRatio: number;
  /** Image en retard : intervalle > max(`lateRatio` × nominal, `lateFloorMs`). */
  lateRatio: number;
  lateFloorMs: number;
  /** Tranche saccadée : part des images en retard ≥ `lateShare`. */
  lateShare: number;
  /** Au-delà, l’intervalle est un trou (onglet masqué, boucle arrêtée) et non une image : ignoré. */
  gapMs: number;
  /** Centile des intervalles d’une tranche pris pour le rythme de l’écran. */
  nominalQuantile: number;
}

export const DEFAULT_FALLBACK: FallbackConfig = {
  sliceMs: 1000,
  badSlices: 3,
  warmupSlices: 2,
  settleSlices: 1,
  medianRatio: 1.6,
  lateRatio: 1.6,
  // Sous 60 images/s, avec une marge pour la gigue : 16,7 ms (deux images d’un écran à 120 Hz) n’est pas un retard.
  lateFloorMs: 17.3,
  lateShare: 0.05,
  gapMs: 1000,
  nominalQuantile: 0.25,
};

export type FallbackReason = 'median' | 'late';

export interface FallbackSlice {
  frames: number;
  medianMs: number;
  /** Part des images en retard (0..1). */
  lateShare: number;
  bad: FallbackReason | null;
}

export interface FallbackStep {
  /** Temps d’images observées depuis le début du duel, en secondes. */
  atS: number;
  from: PostLevel;
  to: PostLevel;
  reason: FallbackReason;
  medianMs: number;
  lateShare: number;
  nominalMs: number;
}

export interface FallbackState {
  level: PostLevel;
  /** Repli automatique actif (faux : ablation ou niveau imposé par la QA). */
  auto: boolean;
  nominalMs: number | null;
  /** Dernière tranche mesurée. */
  slice: FallbackSlice | null;
  badSlices: number;
  /** Crans franchis pendant ce duel, dans l’ordre. */
  steps: FallbackStep[];
  /** Duels observés depuis la création (remises à zéro + 1). */
  runs: number;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export class PostFallback {
  private readonly cfg: FallbackConfig;
  private level: PostLevel;
  private buf: number[] = [];
  private sum = 0;
  private observedMs = 0;
  private skip = 0;
  private bad = 0;
  private nominal: number | null = null;
  private slice: FallbackSlice | null = null;
  private steps: FallbackStep[] = [];
  private runs = 1;

  /** `start` : niveau de départ (ablation QA du halo : `nobloom`) ; `auto` faux : niveau figé, rien n’est décidé. */
  constructor(private readonly start: PostLevel, private readonly auto: boolean, cfg: Partial<FallbackConfig> = {}) {
    this.cfg = { ...DEFAULT_FALLBACK, ...cfg };
    this.level = start;
    this.skip = this.cfg.warmupSlices;
  }

  get current(): PostLevel {
    return this.level;
  }

  /** Un intervalle entre deux rappels rAF consécutifs de la boucle (ms). Rend le nouveau niveau si un cran vient
   *  d’être franchi, sinon null. */
  frame(intervalMs: number): PostLevel | null {
    if (!this.auto || !(intervalMs > 0) || intervalMs > this.cfg.gapMs) return null;
    this.buf.push(intervalMs);
    this.sum += intervalMs;
    this.observedMs += intervalMs;
    if (this.sum < this.cfg.sliceMs) return null;
    return this.judge();
  }

  /** Nouveau duel : niveau de départ, nominal et tranches remis à zéro (l’historique des crans aussi). */
  reset(): void {
    this.level = this.start;
    this.buf = [];
    this.sum = 0;
    this.observedMs = 0;
    this.skip = this.cfg.warmupSlices;
    this.bad = 0;
    this.nominal = null;
    this.slice = null;
    this.steps = [];
    this.runs++;
  }

  state(): FallbackState {
    return { level: this.level, auto: this.auto, nominalMs: this.nominal === null ? null : r2(this.nominal), slice: this.slice, badSlices: this.bad, steps: this.steps.slice(), runs: this.runs };
  }

  private judge(): PostLevel | null {
    const s = this.buf.sort((a, b) => a - b);
    const n = s.length;
    this.buf = [];
    this.sum = 0;
    const q = (k: number) => s[Math.min(n - 1, Math.floor(k * (n - 1)))]!;
    const low = q(this.cfg.nominalQuantile);
    const nominal = (this.nominal = this.nominal === null ? low : Math.min(this.nominal, low));
    const median = n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
    const lateMs = Math.max(this.cfg.lateRatio * nominal, this.cfg.lateFloorMs);
    let late = 0;
    for (let i = n - 1; i >= 0 && s[i]! > lateMs; i--) late++;
    const share = late / n;
    const bad: FallbackReason | null = median > this.cfg.medianRatio * nominal ? 'median' : share >= this.cfg.lateShare ? 'late' : null;
    this.slice = { frames: n, medianMs: r2(median), lateShare: r2(share), bad };
    if (this.skip > 0) {
      this.skip--;
      this.bad = 0;
      return null;
    }
    this.bad = bad ? this.bad + 1 : 0;
    const next = POST_LEVELS[POST_LEVELS.indexOf(this.level) + 1];
    if (!bad || this.bad < this.cfg.badSlices || !next) return null;
    this.steps.push({ atS: r2(this.observedMs / 1000), from: this.level, to: next, reason: bad, medianMs: r2(median), lateShare: r2(share), nominalMs: r2(nominal) });
    this.level = next;
    this.bad = 0;
    this.skip = this.cfg.settleSlices;
    return next;
  }
}
