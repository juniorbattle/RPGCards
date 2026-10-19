/**
 * M08 C1 — travail découpé en étapes, exécuté aux temps morts du fil principal (`requestIdleCallback`) : une étape à
 * la fois, tant qu’il reste du temps dans la tranche d’inactivité. Suspendu pendant un duel (`hold`) : aucune étape ne
 * s’exécute alors, donc jamais pendant une commande. Chaque tâche a une clé ; l’annuler appelle `return()` sur son
 * itérateur (ses blocs `finally` libèrent ce qu’elle avait commencé) ; `finish` l’achève sur place quand son résultat est
 * demandé avant la fin (jamais plus lent que sans préparation).
 */

export interface IdleStats {
  /** Étapes exécutées aux temps morts / achevées sur place (`finish`). */
  steps: number;
  finishedSteps: number;
  /** Tâches achevées sur place parce que leur résultat était demandé avant la fin. */
  finished: number;
  /** Durée de la plus longue étape et durée totale des étapes aux temps morts (ms). */
  maxStepMs: number;
  totalMs: number;
  /** Tâches en attente. */
  pending: number;
  held: boolean;
}

interface Job { key: string; it: Iterator<void, void, void> }

type Deadline = { timeRemaining(): number; didTimeout: boolean };

/**
 * Temps minimal restant dans la tranche pour lancer une étape (ms). Une étape coûte ≤ 2 ms (mesuré) ; à 165 Hz, une
 * scène animée (écran Résultat) ne laisse que 3 à 4 ms d’inactivité par image : un seuil plus haut affamerait la file.
 */
const MIN_SLICE = 2;

export class IdleWork {
  /** `perSlice` : au plus tant d’étapes par tranche d’inactivité (défaut : tant qu’il reste du temps). */
  constructor(private readonly perSlice = Infinity) {}
  private jobs: Job[] = [];
  private held = false;
  private scheduled = false;
  private readonly s = { steps: 0, finishedSteps: 0, finished: 0, maxStepMs: 0, totalMs: 0 };

  add(key: string, it: Iterator<void, void, void>): void {
    this.cancel(key);
    this.jobs.push({ key, it });
    this.kick();
  }

  has(key: string): boolean {
    return this.jobs.some((j) => j.key === key);
  }

  keys(): string[] {
    return this.jobs.map((j) => j.key);
  }

  cancel(key: string): void {
    const i = this.jobs.findIndex((j) => j.key === key);
    if (i < 0) return;
    const [job] = this.jobs.splice(i, 1);
    job!.it.return?.();
  }

  /** Achève sur place la tâche `key` (son résultat est demandé maintenant). */
  finish(key: string): void {
    const i = this.jobs.findIndex((j) => j.key === key);
    if (i < 0) return;
    const [job] = this.jobs.splice(i, 1);
    this.s.finished++;
    while (!job!.it.next().done) this.s.finishedSteps++;
  }

  /** Suspend (duel) ou reprend le travail aux temps morts. */
  hold(on: boolean): void {
    this.held = on;
    if (!on) this.kick();
  }

  stats(): IdleStats {
    const r = (x: number) => Math.round(x * 100) / 100;
    return { ...this.s, maxStepMs: r(this.s.maxStepMs), totalMs: r(this.s.totalMs), pending: this.jobs.length, held: this.held };
  }

  private kick(): void {
    if (this.scheduled || this.held || !this.jobs.length) return;
    this.scheduled = true;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) window.requestIdleCallback((d) => this.run(d));
    else setTimeout(() => { const end = performance.now() + 8; this.run({ timeRemaining: () => end - performance.now(), didTimeout: false }); }, 16);
  }

  private run(deadline: Deadline): void {
    this.scheduled = false;
    let n = 0;
    while (!this.held && this.jobs.length && n++ < this.perSlice && deadline.timeRemaining() > MIN_SLICE) {
      const job = this.jobs[0]!;
      const t0 = performance.now();
      const done = job.it.next().done;
      const ms = performance.now() - t0;
      this.s.steps++;
      this.s.totalMs += ms;
      this.s.maxStepMs = Math.max(this.s.maxStepMs, ms);
      if (done) this.jobs.shift();
    }
    this.kick();
  }
}
