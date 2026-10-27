/**
 * M12 (contrat 2, ADR 045) — temps forts des activations : module PUR. Des événements DÉJÀ résolus par le moteur et
 * filtrés pour le spectateur (publics, ou privés à lui) aux « temps forts » mis en avant au premier plan : quelle carte
 * agit, quel effet, ce qu'il fait. Rien n'est recalculé ; rien n'est déduit d'un événement que le spectateur ne voit pas.
 *
 * Secret (ADR 011) : l'effet d'une Secondaire camouflée de l'adversaire reste générique (famille, case, conséquence
 * publique) ; un regard privé (`peek`, `lecture`, `recentrage`) n'existe que chez son propriétaire ; l'identité d'une
 * carte n'est montrée que si un événement visible la porte (ou, pour ses propres cartes, l'effet qu'il nomme).
 */
import { CATALOG, cardDef, EFFECTS, type EffectId, type Family } from '../game/catalog/cards';
import { EFFECT_SUMMARY } from '../game/catalog/cardText';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import type { GameEvent, PlayerId, RevealedTactic, Stance } from '../game/model/types';
import type { TriggerIcon } from './effectIcons';

export type Side = 'me' | 'opp';

export type ActivationKind =
  | 'effet' | 'annule' | 'masque' | 'echec' | 'regard' | 'technique' | 'camouflage' | 'dissipation'
  | 'signature' | 'interference' | 'insight' | 'soin' | 'repousse' | 'revelation';

export interface Activation {
  kind: ActivationKind;
  side: Side;
  /** Carte montrée ; `null` : un dos (carte masquée, ou rien à montrer). */
  defId: string | null;
  /** Famille (couleur des impulsions) ; publique même sous camouflage ; `null` : neutre ou inconnue. */
  family: Family | null;
  title: string;
  /** La conséquence, en grand. */
  consequence: string;
  detail: string;
  trigger: TriggerIcon | null;
  technique: TechniqueId | null;
  tone: 'good' | 'bad' | 'neutral' | 'warn';
  /** Élément du plateau d'où part le temps fort (`data-focus-key`), ou null. */
  from: string | null;
  /** Élément visé (Interférence, camouflage, Repoussement), ou null. */
  to: string | null;
  /** Interférence : la carte visée (null : dos). */
  targetDefId?: string | null;
  /** Regard privé : les cartes vues. */
  seen?: string[];
  /** Vrai : montré au seul spectateur (regard privé, effet de sa carte masquée). */
  private: boolean;
  /** Événements portés (numéros). */
  seqs: number[];
}

export interface ActivationContext {
  viewer: PlayerId;
  /** Primaires révélées (publiques), si connues. */
  primaries?: Record<PlayerId, { defId: string; stance: Stance }> | null;
  /** Choix tactiques révélés du tour (publics), si connus hors du lot. */
  tactics?: Record<PlayerId, Array<RevealedTactic | null>> | null;
}

/** Durée d'un temps fort au rythme normal (ms), contrat 2, §2. */
export const ACTIVATION_MS: Readonly<Record<ActivationKind, number>> = {
  effet: 1250, annule: 1000, masque: 1050, echec: 700, regard: 1500, technique: 1050, camouflage: 950, dissipation: 950,
  signature: 1450, interference: 1050, insight: 750, soin: 750, repousse: 1050, revelation: 600,
};

/** La définition qui porte un effet (une seule par effet au catalogue). */
const DEF_BY_EFFECT: Readonly<Partial<Record<EffectId, string>>> = Object.fromEntries(
  Object.values(CATALOG).filter((d) => d.effect).map((d) => [d.effect!, d.defId]),
);

/** Conséquence d'un effet réussi, en grand. */
const CONSEQUENCE: Readonly<Record<EffectId | 'rupture', string>> = {
  etincelle: '+2 DÉGÂTS', braise: '+2 DÉGÂTS', ferveur: '+1 INSIGHT', contrecoup: '3 DÉGÂTS EN RETOUR',
  eclaireur: 'REGARD SUR LA MAIN', detour: 'REGARD SUR LA MAIN', dissimulation: 'SECONDAIRE MASQUÉE', silence: 'EFFET ÉTEINT',
  racine: 'CARTE REPOUSSÉE VUE', ecaille: 'SOIN +2 PV', entrave: 'SOUS LA PIOCHE ADVERSE', tenacite: 'SOUS VOTRE PIOCHE',
  repere: 'SOMMET DE LA PIOCHE', prisme: 'AFFINITÉ +1', relance: 'AU SOMMET DE LA PIOCHE', convergence: '×6',
  flamme: 'REPOUSSE UNE SECONDAIRE', clairvoyance: 'REGARD SUR LA MAIN', emprise: 'REPOUSSE UNE SECONDAIRE', cycle: 'SOUTIEN AU SOMMET',
  rupture: 'RENVOYÉE EN MAIN',
  // avenant 09
  tison: '2 DÉGÂTS POUR LUI', escarbille: 'UNE CARTE PIOCHÉE', percee: 'ABSORPTION −2', bravade: 'NI REPOUSSEMENT NI INSIGHT',
  surenchere: '3 DÉGÂTS POUR LUI', brulure: '+2 DÉGÂTS', fournaise: 'ABSORPTION AU QUART', phenix: 'RETOUR EN MAIN',
  leurre: 'INTERFÉRENCE DÉJOUÉE', murmure: 'SOMMET DE LA PIOCHE ADVERSE', echo: 'REGARD SUR LA MAIN', filombre: 'REGARD SUR LA MAIN',
  ombre: 'SECONDAIRE CACHÉE VUE', contrejour: 'INTERFÈRE PLUS HAUT', eclipse: '−1 INSIGHT ADVERSE', miroirbrise: 'SECONDAIRES CACHÉES VUES',
  epine: '+1 DÉGÂT', bouture: 'SOIN +2 PV', seve: 'SOIN +2 PV', lierre: 'RESTE EN JEU',
  mur: 'RANG +2', profondes: 'RETOUR EN MAIN', rempart: 'ABSORBE LES TROIS QUARTS', herse: '+3 DÉGÂTS',
  boussole: 'AFFINITÉ +1', comete: 'AU SOMMET DE LA PIOCHE', constellation: 'COEFFICIENT +1', sextant: 'SOMMET DE VOTRE PIOCHE',
  equinoxe: 'GAGNE L’ÉGALITÉ', harmonie: 'RANG +2', zenith: 'AU SOMMET DE LA PIOCHE', solstice: '+1 INSIGHT',
};

const TECHNIQUE_CONSEQUENCE: Readonly<Record<TechniqueId, string>> = {
  Sondage: 'OBSERVE UNE CARTE', Recentrage: 'RECENTRE SA MAIN', Lecture: 'LIT LE MODE ADVERSE',
  Ancrage: 'SECONDAIRE ANCRÉE', Rupture: 'RUPTURE ARMÉE', Dissipation: 'CAMOUFLAGE LEVÉ',
};

const REPEL_TITLE: Readonly<Record<string, string>> = { basic: 'Repoussement', emprise: 'Emprise', flamme: 'Flamme conquérante', rupture: 'Rupture' };
const STANCE: Readonly<Record<Stance, string>> = { assault: 'ASSAUT', guard: 'GARDE' };
const MASK_PHRASE: Readonly<Record<string, string>> = { heal: 'SOIN', insight: '+1 INSIGHT', peek: 'REGARD', neutralize: 'EFFET ÉTEINT' };

const upper = (s: string): string => s.toLocaleUpperCase('fr-FR');
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Les temps forts d'un lot d'événements, dans l'ordre du lot (la résolution les découpe par temps, `beats.ts`). */
export function buildActivations(events: readonly GameEvent[], ctx: ActivationContext): Activation[] {
  const me = ctx.viewer;
  const sideOf = (p: unknown): Side => (p === me ? 'me' : 'opp');
  const vis = events.filter((e) => e.vis === 'public' || e.vis === me);
  const tactics = (vis.find((e) => e.kind === 'tacticsRevealed')?.data as Record<PlayerId, Array<RevealedTactic | null>> | undefined) ?? ctx.tactics ?? null;
  const primaries = (vis.find((e) => e.kind === 'primariesRevealed')?.data as Record<PlayerId, { defId: string; stance: Stance }> | undefined) ?? ctx.primaries ?? null;
  const familyOf = (defId: string | null | undefined): Family | null => (defId ? cardDef(defId).family : null);
  const slotOfEffect = (p: PlayerId, effect: EffectId): number | null => {
    const t = tactics?.[p]?.find((x) => x && !x.masked && x.defId && cardDef(x.defId).effect === effect);
    return t ? t.slot : null;
  };
  const tacticDef = (p: PlayerId, slot: number): RevealedTactic | null => tactics?.[p]?.find((x) => x?.slot === slot) ?? null;
  const out: Activation[] = [];
  const base = (kind: ActivationKind, p: unknown, e: GameEvent, o: Partial<Activation>): Activation => ({
    kind, side: sideOf(p), defId: null, family: null, title: '', consequence: '', detail: '', trigger: null, technique: null,
    tone: 'neutral', from: null, to: null, private: e.vis !== 'public', seqs: [e.seq], ...o,
  });
  // L'effet d'une carte masquée : la forme privée (son propriétaire) remplace la forme publique générique.
  const ownSlots = new Set(vis.filter((e) => e.kind === 'effect' && e.data.own).map((e) => `${e.data.player}|${e.data.slot}`));
  // Une révélation volontaire suivie de l'effet de la carte révélée n'a qu'un temps fort : celui de l'effet.
  const effectsInBatch = new Set(vis.filter((e) => e.kind === 'effect' && !e.data.masked).map((e) => `${e.data.player}|${e.data.effect}`));
  const failed: GameEvent[] = [];
  // Insight : la forme privée (propriétaire d'une carte masquée) remplace la forme publique, comme dans `beats.ts`.
  const insightOwn = new Set(vis.filter((e) => e.kind === 'insight' && e.data.own).map((e) => e.data.player));

  for (const e of vis) {
    const d = e.data as Record<string, any>;
    switch (e.kind) {
      case 'secondaryRevealed': {
        if (d.own) break; // forme privée de la même révélation : la publique suffit (et la carte reste masquée chez l'adversaire)
        const def = d.defId ? cardDef(d.defId) : null;
        if (def?.effect && effectsInBatch.has(`${d.player}|${def.effect}`)) break;
        out.push(base('revelation', d.player, e, {
          defId: d.masked ? null : d.defId, family: d.family ?? familyOf(d.defId), title: 'Secondaire révélée',
          consequence: d.masked ? 'MASQUÉE' : 'ACTIVE', detail: d.masked ? 'Identité, Rang et Puissance masqués par un effet.' : 'Elle est prête à servir ce tour.',
          from: `${sideOf(d.player)}-slot-${d.slot}`, tone: 'neutral',
        }));
        break;
      }
      case 'technique': {
        const t = d.technique as TechniqueId;
        out.push(base('technique', d.player, e, {
          title: t, consequence: TECHNIQUE_CONSEQUENCE[t] ?? upper(t), detail: `${TECHNIQUES[t]?.text ?? ''} (−${d.cost} Insight)`,
          technique: t, tone: d.player === me ? 'good' : 'warn',
        }));
        break;
      }
      case 'peek': {
        const hiddenSlots = (d.hiddenSlots as Array<{ defId: string }> | undefined) ?? [];
        const seen = [...((d.defIds as string[]) ?? []), ...(d.hiddenSlot?.defId ? [d.hiddenSlot.defId as string] : []), ...hiddenSlots.map((h) => h.defId)];
        // l'origine du regard : une Technique (son sceau) ou un effet (l'icône de son déclenchement)
        const tech = (d.source in TECHNIQUES ? d.source : null) as TechniqueId | null;
        const eff = tech ? null : (Object.values(EFFECTS).find((x) => x.name === d.source)?.id ?? null);
        out.push(base('regard', d.player, e, {
          defId: seen[0] ?? null, family: familyOf(seen[0]), title: String(d.source), seen, technique: tech,
          trigger: eff ? (DEF_BY_EFFECT[eff] && cardDef(DEF_BY_EFFECT[eff]!).signature ? 'signature' : EFFECTS[eff].trigger) : null,
          consequence: seen.length ? (d.source === 'Repère' || d.source === 'Sextant' ? 'SOMMET DE VOTRE PIOCHE' : d.deckTop ? 'SOMMET DE LA PIOCHE ADVERSE' : 'VOUS VOYEZ') : 'RIEN À OBSERVER',
          detail: 'Privé : vous seul voyez cette carte.', private: true, tone: 'good',
        }));
        break;
      }
      case 'lecture':
        out.push(base('regard', d.player, e, { title: 'Lecture', consequence: `MODE ADVERSE : ${STANCE[d.opponentInitialStance as Stance] ?? '?'}`, detail: 'Privé : vous pouvez maintenant changer le mode de votre Primaire.', technique: 'Lecture', private: true, tone: 'good' }));
        break;
      case 'recentrage':
        out.push(base('regard', d.player, e, { defId: d.defId, family: familyOf(d.defId), seen: d.defId ? [d.defId] : [], title: 'Recentrage', consequence: 'SOUS VOTRE PIOCHE', detail: 'Privé : cette carte passe sous votre pioche ; vous piochez une carte.', technique: 'Recentrage', private: true, tone: 'good' }));
        break;
      case 'masking':
        out.push(base('camouflage', d.player, e, {
          title: 'Dissimulation', consequence: 'MASQUÉE JUSQU’À LA FIN DU TOUR', detail: `${d.player === me ? 'Votre' : 'Une'} Secondaire${d.player === me ? '' : ' du rival'} en case ${Number(d.target) + 1} : identité, Rang et Puissance cachés.`,
          family: 'Voile', from: `${sideOf(d.player)}-slot-${d.source}`, to: `${sideOf(d.player)}-slot-${d.target}`, trigger: 'secondary-reveal', tone: d.player === me ? 'good' : 'warn',
        }));
        break;
      case 'dissipation':
        out.push(base('dissipation', d.player, e, {
          defId: d.defId ?? null, family: familyOf(d.defId), title: 'Dissipation', consequence: 'CAMOUFLAGE LEVÉ', technique: 'Dissipation',
          detail: 'La Secondaire masquée redevient visible ; ce qui a déjà été observé reste acquis.', to: `${sideOf(d.target)}-slot-${d.slot}`, tone: d.player === me ? 'good' : 'warn',
        }));
        break;
      case 'signatureAnnounced': {
        const c = cardDef(d.defId as string);
        out.push(base('signature', d.player, e, {
          defId: c.defId, family: c.family, title: c.name, consequence: '∞ SIGNATURE ANNONCÉE', trigger: 'signature',
          detail: d.player === me ? 'Le rival la voit ; votre mode reste secret.' : 'Son mode reste secret.', from: `${sideOf(d.player)}-primary`, tone: d.player === me ? 'good' : 'warn',
        }));
        break;
      }
      case 'interference': {
        const src = tacticDef(d.player as PlayerId, Number(d.slot));
        const ok = !!d.success;
        out.push(base('interference', d.player, e, {
          defId: src && !src.masked ? src.defId : null, family: src?.family ?? null, targetDefId: d.targetDefId ?? null,
          title: 'Interférence', consequence: ok ? (d.cancelled ? 'ANNULÉES TOUTES DEUX' : 'SOUTIEN ANNULÉ') : 'ÉCHEC',
          detail: ok ? `Le soutien visé (case ${Number(d.target) + 1}) ne compte pas.` : `Sans effet : ${d.reason}.`, trigger: 'use-interfere',
          from: `${sideOf(d.player)}-slot-${d.slot}`, to: `${sideOf(d.player === 'p1' ? 'p2' : 'p1')}-slot-${d.target}`,
          tone: ok ? (d.player === me ? 'good' : 'bad') : 'neutral',
        }));
        break;
      }
      case 'tacticsRevealed': {
        // Prisme et Convergence (et, avenant 09, Tison, Boussole, Surenchère, Mur de ronces, Zénith) agissent dès leur
        // engagement : leur effet se lit sur la valeur publique du soutien (coefficient ou apport au score).
        const stanceOf = (p: PlayerId) => primaries?.[p]?.stance ?? null;
        for (const p of ['p1', 'p2'] as PlayerId[]) {
          for (const t of (tactics?.[p] ?? []).filter(Boolean) as RevealedTactic[]) {
            if (t.masked || !t.defId) continue;
            const c = cardDef(t.defId);
            const eff = c.effect;
            if (!eff) continue;
            const primFam = primaries?.[p] ? cardDef(primaries[p]!.defId).family : undefined;
            const applies = t.mode === 'damage'
              ? eff === 'prisme' || eff === 'convergence' || (eff === 'tison' && stanceOf(p) === 'assault')
              : t.mode === 'rank' && (eff === 'surenchere' || (eff === 'mur' && stanceOf(p) === 'guard') || ((eff === 'boussole' || eff === 'zenith') && primFam !== undefined && primFam !== c.family));
            if (!applies) continue;
            const consequence = eff === 'convergence' ? `×${t.value ?? 6}` : eff === 'prisme' ? `AFFINITÉ +1 · ×${t.value ?? '?'}` : t.mode === 'damage' ? `COEFFICIENT +1 · ×${t.value ?? '?'}` : `RANG +${t.value ?? '?'}`;
            out.push(base('effet', p, e, {
              defId: t.defId, family: t.family, title: EFFECTS[eff].name, consequence,
              detail: EFFECT_SUMMARY[eff], trigger: t.mode === 'damage' ? 'use-damage' : 'use-rank', from: `${sideOf(p)}-slot-${t.slot}`, tone: p === me ? 'good' : 'bad', private: false,
            }));
          }
        }
        break;
      }
      case 'effect': {
        if (d.masked && ownSlots.has(`${d.player}|${d.slot}`)) break; // le propriétaire lit la forme privée
        if (d.status === 'failed') { failed.push(e); break; }
        const cancelled = d.status === 'cancelled';
        if (d.masked) {
          out.push(base('masque', d.player, e, {
            family: d.family ?? null, title: 'Effet masqué', consequence: cancelled ? 'ANNULÉ' : upper(String(d.detail ?? '')),
            detail: `Effet d’une Secondaire ${d.family ?? 'neutre'} masquée${d.player === me ? '' : ' du rival'} (case ${Number(d.slot) + 1}).`,
            from: `${sideOf(d.player)}-slot-${d.slot}`, tone: cancelled ? 'neutral' : d.player === me ? 'good' : 'bad',
          }));
          break;
        }
        if (d.technique) {
          out.push(base(cancelled ? 'annule' : 'effet', d.player, e, {
            title: 'Rupture', consequence: cancelled ? 'ANNULÉE' : CONSEQUENCE.rupture, detail: String(d.detail ?? ''), technique: 'Rupture',
            tone: d.player === me ? 'good' : 'bad',
          }));
          break;
        }
        const eff = d.effect as EffectId;
        const def = DEF_BY_EFFECT[eff] ? cardDef(DEF_BY_EFFECT[eff]!) : null;
        const primaryEffect = !!def && (def.signature || EFFECTS[eff].trigger === 'primary-reveal');
        const slot = d.own ? (d.slot as number | null) : slotOfEffect(d.player as PlayerId, eff);
        const by = d.by ? ` (neutralisé par une Secondaire ${d.by.family ?? 'neutre'} masquée)` : '';
        out.push(base(cancelled ? 'annule' : 'effet', d.player, e, {
          defId: def?.defId ?? null, family: def?.family ?? null, title: EFFECTS[eff]?.name ?? String(eff),
          consequence: cancelled ? (String(d.detail).includes('Silence') ? 'ÉTEINT PAR SILENCE' : 'ANNULÉ') : CONSEQUENCE[eff] ?? 'RÉUSSI',
          detail: cancelled ? `${cap(String(d.detail ?? ''))}${by}.` : EFFECT_SUMMARY[eff] ?? '',
          trigger: def ? (def.signature ? 'signature' : EFFECTS[eff].trigger) : null,
          from: primaryEffect ? `${sideOf(d.player)}-primary` : slot !== null && slot !== undefined ? `${sideOf(d.player)}-slot-${slot}` : null,
          // avenant 09 : le prix d'une défaite (Tison, Surenchère) frappe son propre camp
          tone: cancelled ? (d.player === me ? 'bad' : 'good') : (d.player === me) !== (eff === 'tison' || eff === 'surenchere') ? 'good' : 'bad',
          private: !!d.own,
        }));
        break;
      }
      case 'insight':
        if (d.drain) {
          out.push(base('insight', d.player, e, { title: 'Insight', consequence: `−${d.drain} INSIGHT`, detail: (d.reasons as string[] | undefined)?.join(', ') ?? '', to: `${sideOf(d.player)}-insight`, tone: d.player === me ? 'bad' : 'good' }));
          break;
        }
        if (!d.gain || (!d.own && insightOwn.has(d.player))) break;
        out.push(base('insight', d.player, e, { title: 'Insight', consequence: '+1 INSIGHT', detail: (d.reasons as string[] | undefined)?.join(', ') ?? '', to: `${sideOf(d.player)}-insight`, tone: d.player === me ? 'good' : 'warn' }));
        break;
      case 'heal':
        out.push(base('soin', d.player, e, { title: 'Soin', consequence: `+${d.amount} PV`, detail: `${d.hp} PV`, to: `${sideOf(d.player)}-hp`, tone: d.player === me ? 'good' : 'warn', private: !!d.own }));
        break;
      case 'repel': {
        const owner = d.player === 'p1' ? 'p2' : 'p1';
        out.push(base('repousse', d.player, e, {
          defId: d.defId ?? null, family: familyOf(d.defId), title: REPEL_TITLE[d.kind] ?? 'Repoussement',
          consequence: d.dest === 'bottom' ? 'SOUS LA PIOCHE' : 'RENVOYÉE EN MAIN',
          detail: `${d.defId ? cardDef(d.defId).name : 'Une Secondaire cachée'} retourne ${owner === me ? (d.dest === 'bottom' ? 'sous votre pioche' : 'dans votre main') : d.dest === 'bottom' ? 'sous la pioche du rival' : 'dans la main du rival'}.`,
          from: `${sideOf(owner)}-slot-${d.slot}`, tone: d.player === me ? 'good' : 'bad',
        }));
        break;
      }
      default:
        break;
    }
  }
  if (failed.length) {
    const lines = failed.map((e) => {
      const d = e.data as Record<string, any>;
      const name = d.masked ? `Effet masqué (${d.family ?? 'neutre'})` : d.technique ? 'Rupture' : EFFECTS[d.effect as EffectId]?.name ?? String(d.effect);
      return `${name} (${d.player === me ? 'vous' : 'rival'}) : ${d.detail}`;
    });
    out.push({
      kind: 'echec', side: 'me', defId: null, family: null, title: failed.length > 1 ? 'Conditions non remplies' : 'Condition non remplie',
      consequence: '', detail: lines.join(' · '), trigger: null, technique: null, tone: 'neutral', from: null, to: null, private: false, seqs: failed.map((e) => e.seq),
    });
  }
  return out;
}

/** Durée totale (rythme normal) d'une suite de temps forts. */
export function activationsDuration(list: readonly Activation[]): number {
  return list.reduce((s, a) => s + ACTIVATION_MS[a.kind], 0);
}
