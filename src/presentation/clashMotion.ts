/**
 * ClashMotionDirector (mission M03 §4) — module PUR.
 *
 * Transforme le résultat DÉJÀ RÉSOLU par le moteur (rapport PUBLIC du Clash + événements visibles
 * du spectateur) en une chorégraphie : présentation face à face, charge, impact, issue, blessures,
 * nettoyage. Aucune règle n’est recalculée : le vainqueur, la Garde victorieuse, l’absorption
 * (victoire au Rang sans blessure) et les blessures viennent du moteur (`ClashReport`, `damage`).
 * Ne modifie ni PV, ni RNG, ni cartes, ni le temps d’un vrai tour.
 */
import { cardDef } from '../game/catalog/cards';
import { guardAbsorption, guardHalf } from '../game/engine/clash';
import type { ClashReport, GameEvent, PlayerId, SlotIndex, Stance } from '../game/model/types';
import type { BeatKind } from './beats';

export type Side = 'me' | 'opp';

/** Les six chorégraphies du contrat M03 (§4 A–C). */
export type ClashOutcome =
  | 'aa-win' // Assaut contre Assaut, priorité différente
  | 'aa-tie' // Assaut contre Assaut, égalité : impacts simultanés, aucun vainqueur
  | 'guard-holds' // Assaut contre Garde, la Garde gagne au Rang (égalité incluse) : Assaut repoussé
  | 'guard-breaks' // Assaut contre Garde, l’Assaut gagne ET blesse : la défense cède
  | 'guard-absorbs' // Assaut contre Garde, l’Assaut gagne au Rang MAIS 0 blessure : sans cas depuis l’avenant 07 (V3.3), gardé par prudence
  | 'gg-neutral'; // Garde contre Garde : neutralité

export interface ClashActor {
  side: Side;
  defId: string;
  stance: Stance;
  signature: boolean;
  /** Score public du Rang (« ? » si masqué par Dissimulation, « ∞ » pour une Signature). */
  score: string;
  power: number;
  /** Blessures reçues (moteur), 0 si aucune. */
  damageTaken: number;
  role: 'winner' | 'loser' | 'equal';
}

export interface ClashScript {
  turn: number;
  outcome: ClashOutcome;
  winner: Side | null;
  /** Côté en ASSAUT face à une GARDE (AG), sinon null. */
  attacker: Side | null;
  actors: Record<Side, ClashActor>;
  /** Grand libellé de l’issue (et sous-titre explicatif), sans information cachée. */
  verdict: string;
  detail: string;
  /** Conséquences en liste (preview M03, panneau « Résolution ») : Rang, absorption, blessures, défausse. */
  bullets: string[];
  tone: 'good' | 'bad' | 'warn' | 'neutral';
  /** Absorption de la Garde (AG, Assaut vainqueur) : Puissance d’Assaut contre Puissance de Garde. */
  absorption: { assault: number; guard: number; absorbed: number } | null;
  /** Double K.-O. → prolongation à 1 PV chacun (pas de faux écran de victoire). */
  overtime: boolean;
  /** Fin du duel sur ce Clash (victoire d’un camp). */
  finalBlow: Side | null;
  cancelled: Record<Side, SlotIndex[]>;
}

/** Étape de mise en scène associée à un temps de résolution (M02 `beats.ts`). */
export type MotionStep = 'present' | 'impact' | 'damage' | 'cleanup' | null;

export function stepForBeat(kind: BeatKind): MotionStep {
  switch (kind) {
    case 'rank': return 'present';
    case 'outcome': return 'impact';
    case 'damage': return 'damage';
    case 'destination': case 'repel': case 'overtime': case 'victory': return 'cleanup';
    default: return null;
  }
}

const sideOf = (viewer: PlayerId, p: PlayerId): Side => (p === viewer ? 'me' : 'opp');

/**
 * Construit le script depuis les événements VISIBLES du spectateur (seuls les publics sont lus) et
 * les Primaires révélées (publiques depuis la révélation simultanée ; sinon cherchées dans le lot).
 * Renvoie null s’il n’y a pas de Clash public dans le lot.
 */
export function buildClashScript(
  events: readonly GameEvent[],
  viewer: PlayerId,
  primaries: Record<PlayerId, { defId: string; stance: Stance }> | null = null,
): ClashScript | null {
  const pub = events.filter((e) => e.vis === 'public');
  const clash = pub.find((e) => e.kind === 'clash' && !(e.data as Record<string, unknown>).own);
  if (!clash) return null;
  const r = clash.data as unknown as ClashReport;
  let prim = primaries;
  if (!prim) {
    const revealed = pub.find((e) => e.kind === 'primariesRevealed');
    if (!revealed) return null;
    prim = revealed.data as Record<PlayerId, { defId: string; stance: Stance }>;
  }
  return scriptFromReport(r, prim, viewer, pub);
}

/** Variante directe (rapport + Primaires révélées déjà connues du spectateur). */
export function scriptFromReport(
  r: ClashReport,
  primaries: Record<PlayerId, { defId: string; stance: Stance }>,
  viewer: PlayerId,
  publicEvents: readonly GameEvent[] = [],
): ClashScript {
  const opp: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
  const s = (p: PlayerId) => sideOf(viewer, p);
  const st = r.stances;
  const winner = r.winner ? s(r.winner) : null;
  let outcome: ClashOutcome;
  let attacker: Side | null = null;
  if (st.p1 === 'guard' && st.p2 === 'guard') outcome = 'gg-neutral';
  else if (st.p1 === 'assault' && st.p2 === 'assault') outcome = r.outcome === 'tie-assault' ? 'aa-tie' : 'aa-win';
  else {
    attacker = s(st.p1 === 'assault' ? 'p1' : 'p2');
    outcome = r.guardWin ? 'guard-holds' : r.zeroDamageRankWin ? 'guard-absorbs' : 'guard-breaks';
  }
  const actor = (p: PlayerId): ClashActor => {
    const def = cardDef(primaries[p].defId);
    const role: ClashActor['role'] = r.winner === null ? 'equal' : r.winner === p ? 'winner' : 'loser';
    return {
      side: s(p), defId: primaries[p].defId, stance: primaries[p].stance, signature: !!def.signature,
      score: r.publicScores[p] ?? '?', power: r.powers?.[p] ?? def.power, damageTaken: r.damage[p] ?? 0, role,
    };
  };
  const actors: Record<Side, ClashActor> = { me: actor(viewer), opp: actor(opp) };
  const overtime = publicEvents.some((e) => e.kind === 'overtime');
  const victory = publicEvents.find((e) => e.kind === 'victory');
  const finalBlow = victory ? s(victory.data.winner as PlayerId) : null;
  const you = (side: Side | null) => (side === 'me' ? 'Vous' : 'Le rival');
  let verdict: string;
  let detail: string;
  let tone: ClashScript['tone'];
  let absorption: ClashScript['absorption'] = null;
  switch (outcome) {
    case 'aa-win': {
      const loser: Side = winner === 'me' ? 'opp' : 'me';
      const w = actors[winner!];
      const l = actors[loser];
      verdict = winner === 'me' ? 'VOUS DOMINEZ AU RANG' : 'LE RIVAL DOMINE AU RANG';
      detail = `Rang ${w.score} contre ${l.score} : ${l.damageTaken > 0 ? `${l.damageTaken} blessure(s) pour ${loser === 'me' ? 'vous' : 'le rival'}` : 'aucune blessure'}${w.damageTaken > 0 ? ` ; ${w.damageTaken} en retour (effet fixe)` : ''}.`;
      tone = winner === 'me' ? 'good' : 'bad';
      break;
    }
    case 'aa-tie':
      verdict = 'ÉGALITÉ — IMPACTS SIMULTANÉS';
      detail = `Rang ${actors.me.score} contre ${actors.opp.score} : aucun vainqueur, chacun blesse l’autre (vous ${actors.me.damageTaken}, rival ${actors.opp.damageTaken}).`;
      tone = 'warn';
      break;
    case 'guard-holds': {
      verdict = 'GARDE VICTORIEUSE';
      detail = `${you(winner)} ${winner === 'me' ? 'tenez' : 'tient'} : Rang ${actors[winner!].score} contre ${actors[attacker!].score} (égalité gagnée par la Garde). Assaut repoussé, 0 dégât.`;
      tone = winner === 'me' ? 'good' : 'bad';
      break;
    }
    case 'guard-breaks': {
      const g = actors[attacker === 'me' ? 'opp' : 'me'];
      verdict = 'LA GARDE CÈDE';
      detail = `${you(attacker)} ${attacker === 'me' ? 'gagnez' : 'gagne'} au Rang (${actors[attacker!].score} contre ${g.score}) : Puissance ${actors[attacker!].power} contre Garde ${g.power} → ${g.damageTaken} blessure${g.damageTaken > 1 ? 's' : ''}.`;
      tone = attacker === 'me' ? 'good' : 'bad';
      absorption = { assault: actors[attacker!].power, guard: g.power, absorbed: r.absorbed ?? guardAbsorption(actors[attacker!].power, g.power) };
      break;
    }
    case 'guard-absorbs': {
      const g = actors[attacker === 'me' ? 'opp' : 'me'];
      verdict = 'VICTOIRE AU RANG · 0 BLESSURE · ABSORPTION';
      detail = `${you(attacker)} ${attacker === 'me' ? 'gagnez' : 'gagne'} au Rang (${actors[attacker!].score} contre ${g.score}), mais la Garde absorbe tout : Puissance ${actors[attacker!].power} − ${r.absorbed} = 0.`;
      tone = 'warn';
      absorption = { assault: actors[attacker!].power, guard: g.power, absorbed: r.absorbed ?? actors[attacker!].power };
      break;
    }
    default:
      verdict = 'DEUX GARDES — AUCUN CLASH';
      detail = 'Neutralité : aucun vainqueur, aucune blessure, aucun Repoussement.';
      tone = 'neutral';
  }
  if (overtime) detail += ' Double K.-O. : prolongation, 1 PV chacun.';
  // Conséquences ESSENTIELLES (M03.2 : trois au plus, lisibles sans le journal), dans l’ordre de
  // lecture et toutes issues du rapport public du moteur ; le détail reste dans le tiroir. Le départ
  // des deux Primaires en défausse est montré sur les cartes elles-mêmes (scène, temps « nettoyage »).
  const bullets: string[] = [];
  if (outcome === 'gg-neutral') bullets.push('Deux Gardes : aucun Clash offensif.');
  else if (outcome === 'aa-tie') bullets.push(`Égalité de Rang (${actors.me.score} contre ${actors.opp.score}) : aucun vainqueur.`);
  else if (outcome === 'guard-holds') bullets.push(`${winner === 'me' ? 'Votre Garde gagne' : 'La Garde du rival gagne'} au Rang (${actors[winner!].score} contre ${actors[attacker!].score}${actors[winner!].score === actors[attacker!].score ? ', égalité pour la Garde' : ''}).`);
  else bullets.push(`${winner === 'me' ? 'Vous gagnez' : 'Le rival gagne'} au Rang (${actors[winner!].score} contre ${actors[winner === 'me' ? 'opp' : 'me'].score}).`);
  if (absorption && outcome === 'guard-absorbs') bullets.push(`La Garde absorbe toute la Puissance (${absorption.assault}).`);
  if (absorption && outcome === 'guard-breaks') bullets.push(`La Garde absorbe ${absorption.absorbed} sur ${absorption.assault} : ${absorption.assault - absorption.absorbed} de Puissance passe${absorption.absorbed < guardHalf(absorption.guard) ? ' (au moins 1)' : ''}.`);
  if (outcome === 'guard-holds') bullets.push('Assaut repoussé : aucune blessure.');
  const hurt = (side: Side) => actors[side].damageTaken;
  if (outcome !== 'guard-holds') {
    if (hurt('me') === 0 && hurt('opp') === 0) bullets.push('Aucune blessure infligée.');
    else if (hurt('opp') > 0 && hurt('me') > 0) bullets.push(`Blessures simultanées : vous −${hurt('me')} PV, rival −${hurt('opp')} PV.`);
    else bullets.push(hurt('opp') > 0 ? `Le rival perd ${hurt('opp')} PV.` : `Vous perdez ${hurt('me')} PV.`);
  }
  if (overtime) bullets.push('Double K.-O. : prolongation à 1 PV chacun.');
  return {
    turn: r.turn, outcome, winner, attacker, actors, verdict, detail, bullets, tone, absorption, overtime, finalBlow,
    cancelled: { me: r.cancelled?.[viewer] ?? [], opp: r.cancelled?.[opp] ?? [] },
  };
}
