/**
 * M13 — worker de la banque : calcule les échantillons demandés hors du fil principal et les renvoie un par un
 * (tampons transférés), pour que la page reste fluide pendant le calcul (ADR 047).
 */
import type { InstrId } from './generateurs';
import { calculer, plan, srDe } from './banque';

self.onmessage = (e: MessageEvent<{ sr: number; instrs: InstrId[] }>) => {
  const { sr, instrs } = e.data;
  const p = plan(instrs);
  for (const x of p) {
    const data = calculer(sr, x);
    (self as unknown as Worker).postMessage({ ...x, sr: srDe(x.instr, sr), data }, [data.buffer]);
  }
  (self as unknown as Worker).postMessage({ fini: true, total: p.length });
};
