// T1 (fiche de l'avenant 08, M10-F) : mesure, sur le moteur pur, du pilote de QA contre les trois manches du Tournoi du
// Quai (deck de départ, PV 90 ; l'adversaire verrouille en premier, comme le rival du jeu avec `aiDelay=0`). Le joueur
// suit les règles de `duel-driver.mjs` : début de tour, préparation, Lecture un duel sur deux, Repoussement ; pour
// l'engagement, la révision et les choix tactiques, l'IA « équilibré » sur sa vue (`pilote-qa.mjs`) ou, en `naif`,
// l'ancien pilote (la plus forte carte, Signature comprise ; Garde un tour sur trois ; toutes les Secondaires actives en
// Dégâts ou en Rang ; Ancrage ou Rupture dès que possible). Outil seulement.
// Sortie : taux de victoire par manche et chance de gagner la série en 16 duels au plus (`qa:product`, parcours E).
// Usage : npx tsx tools/t1-pilote.ts [duels par manche] [naif]
import { PROFILES, decide } from '../src/game/ai/policy';
import { buildMemory } from '../src/game/ai/memory';
import { TECHNIQUES } from '../src/game/catalog/techniques';
import { Match } from '../src/game/match';
import type { PlayerCommand, SlotIndex, TacticPlan, TacticsTechnique } from '../src/game/model/types';
import { visibleEvents, type PlayerView } from '../src/game/visibility/view';
import { ENCOUNTERS, encounterConfig, personalityOf } from '../src/product/encounters';
import { STARTER_DECK } from '../src/product/collection';
import { aDefausser, aRecentrer, graineIa, rankOf } from './pilote-qa.mjs';

const N = Number(process.argv[2] ?? 200);
const NAIF = process.argv[3] === 'naif';
const MANCHES = ['braise', 'ronce', 'voile'];

const peut = (v: PlayerView, t: keyof typeof TECHNIQUES) => v.me.techniques.includes(t) && v.me.techniqueUsed === null && v.me.insight >= TECHNIQUES[t].cost;

/** L'ancien pilote, pour l'engagement et les choix tactiques. */
function naif(v: PlayerView, tours: number): PlayerCommand {
  const p = v.viewer;
  if (v.phase === 'COMMIT') {
    const order = [...v.me.hand!].sort((a, b) => rankOf(b.defId) - rankOf(a.defId));
    const sec = order.find((c) => c.cardId !== order[0]!.cardId && !c.defId.startsWith('sig-'));
    const free = v.me.slots.findIndex((s) => s === null);
    return { type: 'commit', player: p, primaryId: order[0]!.cardId, stance: tours % 3 === 2 ? 'guard' : 'assault', secondaryId: sec && free >= 0 ? sec.cardId : null, replaceSlot: null, ...(sec && free >= 0 ? { slot: free as SlotIndex } : {}) };
  }
  if (v.phase === 'REVISION') return { type: 'revise', player: p, commit: null };
  const plans: [TacticPlan | null, TacticPlan | null] = [null, null];
  const engaged: SlotIndex[] = [];
  for (const s of v.me.slots) {
    if (!s || s.state !== 'active') continue;
    plans[s.slot] = { mode: v.reveal.primaries!.me.stance === 'assault' && s.slot === 0 ? 'damage' : 'rank' };
    engaged.push(s.slot);
  }
  const oppActive = v.opp.slots.filter((s) => s?.state === 'active');
  let technique: TacticsTechnique | null = null;
  if (engaged.length && oppActive.length && peut(v, 'Ancrage')) technique = { id: 'Ancrage', slot: engaged[0]! };
  else if (oppActive.length && v.reveal.primaries!.me.stance === 'guard' && peut(v, 'Rupture')) technique = { id: 'Rupture', targetSlot: oppActive[0]!.slot };
  return { type: 'tactics', player: p, plans, technique };
}

function pilote(m: Match, v: PlayerView, useLecture: boolean, tours: number): PlayerCommand | null {
  const p = v.viewer;
  switch (v.phase) {
    case 'START': {
      const discard = aDefausser(v);
      const r = aRecentrer(v);
      const technique = discard.length ? null : peut(v, 'Sondage') ? { id: 'Sondage' as const } : peut(v, 'Recentrage') && r ? { id: 'Recentrage' as const, cardId: r } : null;
      return { type: 'start', player: p, discard, technique };
    }
    case 'PREPARE':
      return { type: 'prepare', player: p, reveal: v.me.slots.filter((s) => s?.state === 'hidden').map((s) => s!.slot) };
    case 'DISSIPATION': {
      const src = v.opp.slots.find((s) => s?.maskSource);
      return { type: 'dissipate', player: p, targetSlot: src && peut(v, 'Dissipation') ? src.slot : null };
    }
    case 'COMMIT':
    case 'REVISION':
    case 'TACTICS':
      return NAIF ? naif(v, tours) : decide(v, PROFILES.equilibre!, graineIa(v), buildMemory(visibleEvents(m.events, 'p1'), 'p1'));
    case 'LECTURE':
      return { type: 'lecture', player: p, use: useLecture && peut(v, 'Lecture') };
    case 'LECTURE_CHANGE':
      return { type: 'lectureStance', player: p, stance: v.lectureSeen === 'guard' ? 'assault' : v.me.primary!.stance! };
    case 'REPEL':
      return v.repel?.mine ? { type: 'repel', player: p, targetSlot: v.repel.choices[0] ?? null } : null;
    default:
      return null;
  }
}

function duel(rival: string, seed: number, n: number): boolean {
  const enc = ENCOUNTERS.find((e) => e.kind === 'series' && e.rival === rival)!;
  const m = new Match(encounterConfig(enc, STARTER_DECK, seed), { p2: { profile: PROFILES[personalityOf(rival).aiProfile]!, seed: seed ^ 0xa7 } });
  m.order = ['p2', 'p1'];
  let tours = 0;
  for (let guard = 0; guard < 5000 && m.state.phase !== 'ENDED'; guard++) {
    m.stepAi();
    const phase: string = m.state.phase;
    if (phase === 'ENDED') break;
    if (m.state.phase === 'RESOLVED') { m.nextTurn(); tours++; continue; }
    const v = m.view('p1');
    const cmd = v.awaitingMe ? pilote(m, v, n % 2 === 0, tours) : null;
    if (!cmd) throw new Error(`pilote bloqué en ${v.phase}`);
    m.submit(cmd);
  }
  return m.state.winner === 'p1';
}

const taux: Record<string, number> = {};
for (const rival of MANCHES) {
  let w = 0;
  for (let k = 0; k < N; k++) if (duel(rival, 70001 + 31 * k, k)) w++;
  taux[rival] = w / N;
}
// Chance de gagner les trois manches en 16 duels au plus (dans l'ordre ; une défaite rejoue la manche).
let dist = new Map<number, number>([[0, 1]]);
for (const rival of MANCHES) {
  const p = taux[rival]!;
  const next = new Map<number, number>();
  for (const [joues, q] of dist) for (let k = 1; joues + k <= 16; k++) next.set(joues + k, (next.get(joues + k) ?? 0) + q * (1 - p) ** (k - 1) * p);
  dist = next;
}
const serie = [...dist.values()].reduce((a, b) => a + b, 0);
console.log(`${NAIF ? 'ancien pilote (naïf)' : 'pilote T1 (IA « équilibré » du joueur)'} ; ${N} duels par manche`);
for (const [r, t] of Object.entries(taux)) console.log(`  ${personalityOf(r).name} : ${(100 * t).toFixed(1)} %`);
console.log(`  série gagnée en 16 duels au plus : ${(100 * serie).toFixed(2)} %`);
