// Avenant V3.3 (la Garde réduit sans annuler) — statistiques d'un duel joué, lues dans le journal PUBLIC des Clashes :
// Primaires engagées en Garde, Clashes Assaut contre Garde, issue (Garde victorieuse, Assaut qui blesse, absorption
// totale), dégâts de base. Sert aux mesures d'équilibre avant / après (`tools/v33-equilibre.ts`, `tools/m10a-paliers.ts`).
import type { ClashReport } from '../src/game/model/types';
import type { Match } from '../src/game/match';

export interface StatsClash {
  duels: number;
  tours: number;
  prolongations: number;
  /** Primaires engagées (deux par Clash) et, parmi elles, en Garde. */
  primaires: number;
  gardes: number;
  clashes: number;
  ag: number;
  agGardeGagne: number;
  agAssautBlesse: number;
  agAbsorptionTotale: number;
  /** Dégâts de base infligés par les Assauts vainqueurs contre une Garde (somme). */
  agDegatsBase: number;
  /** Avenant 08, amendement 1 : fenêtres de révision ouvertes et, parmi elles, engagements révisés (non gardés). */
  fenetres?: number;
  revisees?: number;
}

export const statsVides = (): StatsClash => ({ duels: 0, tours: 0, prolongations: 0, primaires: 0, gardes: 0, clashes: 0, ag: 0, agGardeGagne: 0, agAssautBlesse: 0, agAbsorptionTotale: 0, agDegatsBase: 0, fenetres: 0, revisees: 0 });

export function ajouter(s: StatsClash, m: Match): StatsClash {
  s.duels += 1;
  s.tours += m.state.turn;
  s.prolongations += m.state.overtime ? 1 : 0;
  for (const e of m.events) {
    if (e.vis === 'public' && e.kind === 'revisionOpened') s.fenetres = (s.fenetres ?? 0) + 1;
    if (e.vis === 'public' && e.kind === 'revised' && !(e.data as { kept?: boolean }).kept) s.revisees = (s.revisees ?? 0) + 1;
    if (e.kind !== 'clash' || e.vis !== 'public') continue;
    const r = e.data as unknown as ClashReport;
    s.clashes += 1;
    s.primaires += 2;
    s.gardes += (r.stances.p1 === 'guard' ? 1 : 0) + (r.stances.p2 === 'guard' ? 1 : 0);
    if (r.stances.p1 === r.stances.p2) continue;
    s.ag += 1;
    if (r.guardWin) { s.agGardeGagne += 1; continue; }
    const def = r.stances.p1 === 'guard' ? 'p1' : 'p2';
    s.agDegatsBase += r.baseDamage[def];
    if (r.zeroDamageRankWin) s.agAbsorptionTotale += 1; else s.agAssautBlesse += 1;
  }
  return s;
}

const pc = (a: number, b: number) => (b ? `${(100 * a / b).toFixed(1)} %` : '—');
/** Résumé lisible (pourcentages et moyennes). */
export function resume(s: StatsClash): Record<string, string | number> {
  return {
    duels: s.duels,
    toursMoyens: +(s.tours / Math.max(1, s.duels)).toFixed(2),
    prolongations: s.prolongations,
    partGardes: pc(s.gardes, s.primaires),
    partAG: pc(s.ag, s.clashes),
    agGardeGagne: pc(s.agGardeGagne, s.ag),
    agAssautBlesse: pc(s.agAssautBlesse, s.ag),
    agAbsorptionTotale: pc(s.agAbsorptionTotale, s.ag),
    degatsBaseParAssautVainqueur: +(s.agDegatsBase / Math.max(1, s.agAssautBlesse + s.agAbsorptionTotale)).toFixed(2),
    fenetresParDuel: +((s.fenetres ?? 0) / Math.max(1, s.duels)).toFixed(2),
    partRevisees: pc(s.revisees ?? 0, s.fenetres ?? 0),
  };
}
