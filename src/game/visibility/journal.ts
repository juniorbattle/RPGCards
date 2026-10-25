/**
 * Journal humain (français) construit à partir d’événements DÉJÀ filtrés par visibilité.
 * Ne consulte jamais l’état brut : impossible d’y faire fuiter un secret absent de l’événement.
 */
import { cardDef, cardTitle, EFFECTS, type EffectId } from '../catalog/cards';
import { guardHalf } from '../engine/clash';
import type { ClashReport, GameEvent, PlayerId, RevealedTactic, SlotIndex, Stance } from '../model/types';

export interface JournalLine {
  seq: number;
  turn: number;
  text: string;
  tone: 'info' | 'private' | 'clash' | 'damage' | 'effect' | 'system' | 'victory';
  private: boolean;
}

const MODE: Record<string, string> = { keep: 'CONSERVER', rank: 'AMPLIFIER LE RANG', damage: 'AMPLIFIER LES DÉGÂTS', interfere: 'INTERFÉRER' };
const STANCE: Record<Stance, string> = { assault: 'ASSAUT', guard: 'GARDE' };

function t(defId: string | null | undefined): string {
  return defId ? cardTitle(cardDef(defId)) : 'carte masquée';
}

function slotName(i: unknown): string {
  return `case ${(Number(i) || 0) + 1}`;
}

export function describeEvent(ev: GameEvent, viewer: PlayerId): JournalLine | null {
  const d = ev.data as Record<string, any>;
  const me = (pid: unknown) => pid === viewer;
  const subj = (pid: unknown) => (me(pid) ? 'Vous' : 'Le rival');
  const verb = (pid: unknown, mine: string, theirs: string) => `${subj(pid)} ${me(pid) ? mine : theirs}`;
  const priv = ev.vis !== 'public';
  const line = (text: string, tone: JournalLine['tone'] = 'info'): JournalLine => ({ seq: ev.seq, turn: ev.turn, text, tone: priv ? 'private' : tone, private: priv });

  switch (ev.kind) {
    case 'turnStart':
      return line(`— TOUR ${d.turn} —`, 'system');
    case 'draw':
      if (priv) return null; // détail privé des pioches : visible dans la main
      return line(`${verb(d.player, `piochez ${d.count} carte(s)`, `pioche ${d.count} carte(s)`)}.`);
    case 'shuffle':
      return line(`${verb(d.player, 'mélangez votre défausse', 'mélange sa défausse')} pour reformer la pioche (${d.count}).`);
    case 'trim':
      return line(`${verb(d.player, 'défaussez', 'défausse')} l’excédent de main : ${(d.defIds as string[]).map(t).join(', ')}.`);
    case 'technique':
      return line(`${verb(d.player, 'utilisez', 'utilise')} la Technique ${d.technique} (−${d.cost} Insight).`, 'effect');
    case 'peek': {
      const ids = (d.defIds as string[]) ?? [];
      const parts = [ids.length ? ids.map(t).join(', ') : 'rien à observer'];
      if (d.hiddenSlot) parts.push(`Secondaire cachée la plus ancienne (${slotName(d.hiddenSlot.slot)}) : ${t(d.hiddenSlot.defId)}`);
      return line(`[Privé] ${d.source} : ${parts.join(' · ')}.`);
    }
    case 'recentrage':
      return line(`[Privé] Recentrage : ${t(d.defId)} placée sous votre pioche.`);
    case 'secondaryRevealed':
      if (d.own) return line(`[Privé] Votre Secondaire masquée (${slotName(d.slot)}) : ${t(d.defId)}.`);
      return line(d.masked
        ? `${verb(d.player, 'révélez', 'révèle')} une Secondaire ${d.family ?? ''} en ${slotName(d.slot)} — identité, Rang et Puissance masqués par un effet.`
        : `${verb(d.player, 'révélez et activez', 'révèle et active')} ${t(d.defId)} (${slotName(d.slot)}).`);
    case 'masking':
      return line(`Dissimulation : la Secondaire ${me(d.player) ? 'de votre' : 'du rival en'} ${slotName(d.target)} est masquée jusqu’à la fin du tour.`, 'effect');
    case 'dissipation':
      return line(`Dissipation neutralise le camouflage : ${t(d.defId)} (${slotName(d.slot)}) redevient visible ; ce qui a déjà été observé reste acquis.`, 'effect');
    case 'locked':
      return null;
    case 'committed':
      if (d.own) return line(`[Privé] Engagement : ${t(d.primaryDefId)} en ${STANCE[d.stance as Stance]}${d.secondaryDefId ? ` + ${t(d.secondaryDefId)} en Secondaire (${slotName(d.placedSlot)}, CHARGEMENT)` : ''}.`);
      return line(`${verb(d.player, 'engagez', 'engage')} une Primaire face cachée${d.placedSlot !== null ? ` et ${me(d.player) ? 'préparez' : 'prépare'} une Secondaire en ${slotName(d.placedSlot)} (chargement)` : ''}.`);
    case 'replaced':
      if (d.own) return line(`[Privé] Votre Secondaire masquée remplacée (${slotName(d.slot)}) : ${t(d.defId)}.`);
      if (d.masked) return line(`${verb(d.player, 'remplacez', 'remplace')} la Secondaire en ${slotName(d.slot)} : une Secondaire ${d.family ?? 'neutre'} masquée rejoint la défausse (nommée en fin de tour).`);
      return line(`${verb(d.player, 'remplacez', 'remplace')} la Secondaire en ${slotName(d.slot)} : ${t(d.defId)} rejoint la défausse.`);
    case 'lecture':
      return line(`[Privé] Lecture : mode initial adverse ${STANCE[d.opponentInitialStance as Stance]}.`);
    case 'primariesRevealed': {
      const a = d[viewer] as { defId: string; stance: Stance };
      const b = d[viewer === 'p1' ? 'p2' : 'p1'] as { defId: string; stance: Stance };
      const fmt = (x: { defId: string; stance: Stance }) => {
        const c = cardDef(x.defId);
        return `${cardTitle(c)} · ${STANCE[x.stance]} · Rang ${c.rank ?? '∞'} · Puissance ${c.power}`;
      };
      return line(`Révélation simultanée des Primaires — Vous : ${fmt(a)} / Rival : ${fmt(b)}.`, 'clash');
    }
    case 'effectArmed':
      return line(`${EFFECTS[d.effect as EffectId].name} (${me(d.player) ? 'vous' : 'rival'}) : effet ARMÉ, condition en attente.`, 'effect');
    case 'tacticsRevealed': {
      const parts: string[] = [];
      for (const pid of [viewer, viewer === 'p1' ? 'p2' : 'p1'] as PlayerId[]) {
        const list = (d[pid] as Array<RevealedTactic | null>).filter(Boolean) as RevealedTactic[];
        if (!list.length) continue;
        const items = list.map((x) => {
          const who = x.masked ? `Secondaire ${x.family ?? 'neutre'} masquée (${slotName(x.slot)})` : t(x.defId);
          let extra = '';
          if (x.mode === 'rank') extra = x.value === null ? ' · bonus masqué' : ` · +${x.value} au Rang${x.affinity ? ' (affinité +1)' : ''}`;
          if (x.mode === 'damage') extra = x.value === null ? ' · coefficient masqué' : ` · ×${x.value}${x.affinity ? ' (même famille)' : ''}`;
          if (x.mode === 'interfere') extra = ` → ${slotName(x.target)} adverse`;
          return `${who} → ${MODE[x.mode]}${extra}`;
        });
        parts.push(`${pid === viewer ? 'Vous' : 'Rival'} : ${items.join(' ; ')}`);
      }
      return line(parts.length ? `Choix tactiques verrouillés et révélés — ${parts.join(' / ')}.` : 'Choix tactiques : aucune Secondaire engagée.', 'clash');
    }
    case 'interference':
      return line(`${verb(d.player, 'Interférez', 'Interfère')} sur ${slotName(d.target)} (${d.targetDefId ? t(d.targetDefId) : d.targetFamily ? `${d.targetFamily} masquée` : 'carte masquée'}) : ${d.success ? 'RÉUSSIE — usage annulé' : `ÉCHEC — ${d.reason}`}${d.cancelled ? ' (cette Interférence est elle-même annulée)' : ''}.`, 'effect');
    case 'clash': {
      if (d.own) return line(`[Privé] Votre score réel : ${Number.isFinite(d.score) ? d.score : '∞'} ; multiplicateur ×${d.multiplier}.`);
      const sc = d.publicScores as Record<PlayerId, string>;
      const o = viewer === 'p1' ? 'p2' : 'p1';
      return line(`CLASH — Scores : Vous ${sc[viewer]} / Rival ${sc[o]}. ${verdictText(d as unknown as ClashReport, viewer)} PV perdus : Vous ${d.damage[viewer]} / Rival ${d.damage[o]}.`, 'clash');
    }
    case 'effect': {
      const status = d.status === 'success' ? 'RÉUSSI' : d.status === 'cancelled' ? 'ANNULÉ' : 'CONDITION NON REMPLIE';
      // Origine camouflée (ADR 011) : famille et case seulement, jamais de nom d’effet.
      if (d.masked) return line(`Effet de ${me(d.player) ? 'votre' : 'la'} Secondaire ${d.family ?? 'neutre'} masquée${me(d.player) ? '' : ' du rival'} (${slotName(d.slot)}) : ${status} — ${d.detail}.`, 'effect');
      const name = d.technique ? String(d.effect).replace(/^./, (c: string) => c.toUpperCase()) : EFFECTS[d.effect as EffectId]?.name ?? String(d.effect);
      if (d.own) return line(`[Privé] ${name} (votre Secondaire masquée, ${slotName(d.slot)}) : ${status} — ${d.detail}.`);
      const detail = d.by ? `neutralisation par l’effet de ${me(d.by.player) ? 'votre' : 'la'} Secondaire ${d.by.family ?? 'neutre'} masquée${me(d.by.player) ? '' : ' du rival'} (${slotName(d.by.slot)})` : d.detail;
      return line(`${name} (${me(d.player) ? 'vous' : 'rival'}) : ${status} — ${detail}.`, 'effect');
    }
    case 'damage':
      return line(`${verb(d.player, 'perdez', 'perd')} ${d.amount} PV${d.fixed ? ` (dont ${d.fixed} fixes)` : ''} → ${d.hp} PV.`, 'damage');
    case 'heal':
      if (d.own) return line(`[Privé] Soin de votre Secondaire masquée : ${d.amount} PV → ${d.hp} PV (non annoncé au rival).`);
      return line(`${verb(d.player, 'récupérez', 'récupère')} ${d.amount} PV → ${d.hp} PV.`, 'effect');
    case 'insight':
      if (d.own) return line(`[Privé] Motifs réels de l’Insight : ${(d.reasons as string[]).join(', ')}${d.gain ? '' : ' (gain plafonné)'} — l’effet de votre carte masquée n’est pas nommé au rival.`);
      return d.gain
        ? line(`${verb(d.player, 'gagnez', 'gagne')} 1 Insight (${(d.reasons as string[]).join(', ')}) → ${d.insight}/2.`, 'effect')
        : line(`${subj(d.player)} : gain d’Insight plafonné (${(d.reasons as string[]).join(', ')}).`);
    case 'destination': {
      if (d.dest === 'stay') return line(`Ancrage préserve la Secondaire ${me(d.player) ? 'votre' : 'adverse'} en ${slotName(d.slot)} (action annulée, carte active).`, 'effect');
      const where = d.dest === 'top' ? 'au sommet de la pioche' : d.dest === 'bottom' ? 'sous la pioche' : 'en défausse';
      return line(`${t(d.defId)} (${me(d.player) ? 'vous' : 'rival'}) est consommée → ${where}.`);
    }
    case 'repel': {
      const kinds: Record<string, string> = { basic: 'Repoussement', emprise: 'Emprise', flamme: 'Flamme conquérante', rupture: 'Rupture' };
      const what = d.defId ? t(d.defId) : 'une Secondaire cachée';
      return line(`${kinds[d.kind] ?? d.kind} : ${verb(d.player, 'renvoyez', 'renvoie')} ${what} (${slotName(d.slot as SlotIndex)}) ${d.dest === 'bottom' ? 'sous la pioche de son propriétaire' : 'dans la main de son propriétaire'}.`, 'effect');
    }
    case 'repelSkipped':
      return line(`${verb(d.player, 'renoncez', 'renonce')} au Repoussement.`);
    case 'overtime':
      return line(`DOUBLE K.-O. — PROLONGATION ${d.overtime} : 1 PV chacun, cartes et ressources conservées.`, 'victory');
    case 'victory':
      return line(me(d.winner) ? 'FIN DU DUEL — Vous gagnez !' : 'FIN DU DUEL — Le rival gagne.', 'victory');
    case 'turnEnd':
      return line(`Fin du tour ${d.turn}.`, 'system');
    default:
      return null;
  }
}

export function buildJournal(events: readonly GameEvent[], viewer: PlayerId): JournalLine[] {
  const out: JournalLine[] = [];
  for (const e of events) {
    if (e.vis !== 'public' && e.vis !== viewer) continue; // double garde
    const l = describeEvent(e, viewer);
    if (l) out.push(l);
  }
  return out;
}

/** Verdict grammatical selon le point de vue (D-04) ; distingue les trois cas exigés. */
/** Avenant 07 (V3.3, G-02) : « la Garde absorbe a », la moitié de sa Puissance ou, si le plancher d’un dégât la plafonne,
 *  ce qu’il en reste. `absorbed` vient du rapport du moteur (`guardAbsorption`), jamais recalculé ici. */
export function guardAbsorbedText(absorbed: number, guardPower: number): string {
  return absorbed < guardHalf(guardPower)
    ? `la Garde absorbe ${absorbed} (plafonnée : au moins 1 dégât passe)`
    : `la Garde absorbe ${absorbed} (moitié de sa Puissance ${guardPower})`;
}

export function verdictText(r: ClashReport, viewer: PlayerId): string {
  const o: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
  const sc = r.publicScores;
  if (r.outcome === 'double-guard') return 'Deux Gardes : aucun vainqueur, aucune blessure.';
  if (r.outcome === 'tie-assault') return `Assauts à égalité de priorité (${sc[viewer]} = ${sc[o]}) : impacts simultanés, aucun vainqueur.`;
  const w = r.winner!;
  const l: PlayerId = w === 'p1' ? 'p2' : 'p1';
  const W = w === viewer;
  if (r.guardWin) return `${W ? 'Vous gagnez' : 'Le rival gagne'} en GARDE (priorité ${sc[w]} ≥ ${sc[l]}) : Assaut bloqué, 0 blessure.`;
  const dom = W ? 'Vous dominez' : 'Le rival domine';
  const m = r.publicMultipliers[w];
  if (r.stances[l] === 'guard') {
    // Avenant 07 (V3.3) : plus de victoire au Rang sans blessure ; cas gardé par prudence (invariant testé).
    if (r.zeroDamageRankWin) return `${dom} au Rang (${sc[w]} contre ${sc[l]}), mais 0 blessure : la Garde absorbe tout (Puissance ${r.powers[w]} − ${r.absorbed} = 0).`;
    return `${dom} au Rang (${sc[w]} contre ${sc[l]}) ; ${guardAbsorbedText(r.absorbed, r.powers[l])} : (${r.powers[w]} − ${r.absorbed}) × ${m} = ${r.baseDamage[l]}.`;
  }
  return `${W ? 'Vous remportez' : 'Le rival remporte'} la confrontation des Assauts au Rang (${sc[w]} contre ${sc[l]}) : ${r.powers[w]} × ${m} = ${r.baseDamage[l]}.`;
}
