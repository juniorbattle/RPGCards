/**
 * ExpressionDirector — traduit le déroulé PUBLIC du duel en intentions expressives du rival.
 *
 * Garanties (mission M02 §3, test `expression.test.ts`) :
 *  - n’accepte que des événements `vis === 'public'` (les autres sont ignorés, même passés par erreur) ;
 *  - ne reçoit ni état brut, ni main, ni engagement secret, ni décision de l’IA ;
 *  - pseudo-aléa seedé par (seed, numéro d’événement) : mêmes faits publics → mêmes réactions ;
 *  - aucune réaction ne dépend d’une intention cachée : ce n’est PAS un système de tells.
 */
import { cardDef } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import type { GameEvent, Phase, PlayerId } from '../game/model/types';
import type { Mood, RivalPersonality } from './personalities';

export type Gaze = 'player' | 'table' | 'own-cards' | 'player-cards' | 'away';
export type Gesture = 'nod' | 'recoil' | 'lean-in' | 'slump' | 'laugh' | 'place-card' | 'flip-card' | 'shake-head' | 'tilt';

export interface Expression {
  mood: Mood;
  intensity: number;
  gaze: Gaze;
  gesture: Gesture | null;
  /** Durée de tenue (s) avant retour à l’expression de base. */
  hold: number;
  /** Raison lisible (QA / captures). */
  cause: string;
}

export interface BaselineContext {
  phase: Phase;
  rivalDeciding: boolean;
  playerDeciding: boolean;
  rivalHpRatio: number;
  playerHpRatio: number;
}

export class ExpressionDirector {
  constructor(private rival: PlayerId, private p: RivalPersonality, private seed: number) {}

  private rng(ev: GameEvent): () => number {
    return makeRng(hashString(`${this.seed}|${this.p.id}|${ev.seq}|${ev.kind}`));
  }

  private x(mood: Mood, intensity: number, gaze: Gaze, gesture: Gesture | null, hold: number, cause: string): Expression {
    return { mood, intensity: Math.max(0, Math.min(1, intensity * (0.45 + 0.55 * this.p.expressiveness))), gaze, gesture, hold, cause };
  }

  /** Réactions déclenchées par un lot d’événements (seuls les publics sont lus). */
  observe(events: readonly GameEvent[]): Expression[] {
    const out: Expression[] = [];
    const R = this.rival;
    const P: PlayerId = R === 'p1' ? 'p2' : 'p1';
    for (const ev of events) {
      if (ev.vis !== 'public') continue;
      const d = ev.data as Record<string, any>;
      const r = this.rng(ev);
      const id = this.p.id;
      switch (ev.kind) {
        case 'locked':
          if (d.player === R && d.phase === 'COMMIT') out.push(this.x('focused', 0.5, 'table', 'place-card', 1.2, 'engage une carte'));
          else if (d.player === P) out.push(this.x(id === 'voile' ? 'smug' : id === 'braise' ? 'confident' : 'focused', 0.4, 'player', r() < 0.5 ? 'tilt' : null, 1.4, 'vous avez verrouillé'));
          break;
        case 'primariesRevealed': {
          const mine = cardDef(d[R].defId);
          const theirs = cardDef(d[P].defId);
          if (theirs.signature) out.push(this.x('surprised', 0.85, 'player-cards', 'flip-card', 1.6, 'Signature adverse révélée'));
          else if (mine.signature) out.push(this.x(id === 'ronce' ? 'confident' : 'smug', 0.8, 'player', 'flip-card', 1.6, 'révèle sa Signature'));
          else out.push(this.x('focused', 0.6, 'player-cards', 'flip-card', 1.2, 'Primaires révélées'));
          break;
        }
        case 'interference':
          if (d.player === R && d.success) out.push(this.x(id === 'voile' ? 'smug' : 'pleased', 0.8, 'player', 'tilt', 1.3, 'son Interférence réussit'));
          else if (d.player === P && d.success) out.push(this.x('annoyed', 0.7, 'own-cards', 'shake-head', 1.3, 'son soutien est annulé'));
          break;
        case 'clash': {
          if (d.own) break;
          const w = d.winner as PlayerId | null;
          const dmg = d.damage as Record<PlayerId, number>;
          if (d.outcome === 'tie-assault') out.push(this.x('shocked', 0.8, 'player', 'recoil', 1.5, 'impacts simultanés'));
          else if (d.outcome === 'double-guard') out.push(this.x('thinking', 0.4, 'player', 'tilt', 1.2, 'deux Gardes'));
          else if (w === R && d.guardWin) out.push(this.x('pleased', 0.8, 'player', 'nod', 1.6, 'sa Garde tient'));
          else if (w === R && dmg[P] === 0) out.push(this.x('annoyed', 0.6, 'player-cards', 'shake-head', 1.5, 'domine au Rang, mais votre Garde absorbe'));
          else if (w === R) out.push(this.x(id === 'braise' ? 'triumphant' : 'pleased', 0.9, 'player', id === 'braise' ? 'laugh' : 'nod', 1.6, 'remporte le Clash'));
          else if (w === P && d.guardWin) out.push(this.x(id === 'braise' ? 'angry' : 'annoyed', 0.75, 'player', 'shake-head', 1.6, 'votre Garde le bloque'));
          else if (w === P && dmg[R] === 0) out.push(this.x('relieved', 0.8, 'player', null, 1.6, 'perd au Rang mais absorbe tout'));
          break;
        }
        case 'damage':
          if (d.player === R) {
            const k = Math.min(1, 0.35 + d.amount / 40);
            out.push(this.x(k > 0.8 ? 'shocked' : 'pained', k, 'table', 'recoil', 1.7, `perd ${d.amount} PV`));
          } else if (d.player === P) out.push(this.x(id === 'braise' ? 'triumphant' : 'confident', Math.min(1, 0.4 + d.amount / 50), 'player', id === 'braise' ? 'laugh' : null, 1.4, `vous perdez ${d.amount} PV`));
          break;
        case 'heal':
          if (d.player === R) out.push(this.x('relieved', 0.6, 'own-cards', null, 1.2, 'se soigne'));
          break;
        case 'repel':
          if (d.player === R) out.push(this.x('smug', 0.7, 'player', 'tilt', 1.3, 'vous repousse une carte'));
          else out.push(this.x('annoyed', 0.6, 'own-cards', 'shake-head', 1.3, 'une de ses cartes est repoussée'));
          break;
        case 'overtime':
          out.push(this.x('shocked', 1, 'player', 'recoil', 2, 'double K.-O.'));
          break;
        case 'victory':
          out.push(d.winner === R ? this.x('triumphant', 1, 'player', 'laugh', 4, 'remporte le duel') : this.x('defeated', 1, 'table', 'slump', 4, 'perd le duel'));
          break;
      }
    }
    return out;
  }

  /** Expression de repos selon la situation publique. */
  baseline(c: BaselineContext): Expression {
    if (c.phase === 'ENDED') return this.x(c.rivalHpRatio > 0 ? 'triumphant' : 'defeated', 0.7, c.rivalHpRatio > 0 ? 'player' : 'table', null, 0, 'fin du duel');
    if (c.rivalDeciding) return this.x('thinking', 0.6, 'own-cards', null, 0, 'réfléchit');
    if (c.rivalHpRatio < 0.3) return this.x(this.p.id === 'braise' ? 'angry' : 'focused', 0.5, 'player', null, 0, 'PV bas');
    if (c.playerDeciding) return this.x(this.p.restMood, 0.45, 'player', null, 0, 'vous observe');
    return this.x(this.p.restMood, 0.35, 'player', null, 0, 'attend');
  }
}
