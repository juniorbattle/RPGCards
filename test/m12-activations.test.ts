/**
 * M12 (contrat 2, ADR 045) — les temps forts des activations : construits depuis les seuls événements visibles du
 * spectateur, sans recalcul ; effet masqué adverse générique ; forme privée de son propre effet masqué ; regard privé
 * chez son seul propriétaire ; échecs regroupés ; Prisme et Convergence lus sur le coefficient public. Propriété sur des
 * duels entiers (IA contre IA, variantes et Techniques) : aucun temps fort ne naît d'un événement privé adverse, et toute
 * carte adverse montrée est nommée par le journal du spectateur (surface déjà éprouvée pour le secret, M03.1B).
 */
import { describe, expect, it } from 'vitest';
import { cardDef, EFFECTS, FAMILIES, VARIANTS } from '../src/game/catalog/cards';
import { TECHNIQUE_IDS } from '../src/game/catalog/techniques';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';
import type { GameConfig, GameEvent, PlayerId } from '../src/game/model/types';
import { buildJournal } from '../src/game/visibility/journal';
import { visibleEvents } from '../src/game/visibility/view';
import { ACTIVATION_MS, activationsDuration, buildActivations, type Activation } from '../src/presentation/activations';
import { buildResolutionBeats } from '../src/presentation/beats';
import { sonDuTempsFort } from '../src/son/evenements';

let seq = 0;
const ev = (kind: GameEvent['kind'], vis: GameEvent['vis'], data: Record<string, unknown>): GameEvent => ({ seq: ++seq, turn: 3, phase: 'RESOLVED', vis, kind, data });
const ctx = { viewer: 'p1' as PlayerId };

describe('M12 — temps forts : les formes', () => {
  it('effet public réussi : la carte, le nom, la conséquence ; la Primaire en source', () => {
    const a = buildActivations([ev('primariesRevealed', 'public', { p1: { defId: 'Cendre-2-braise', stance: 'assault' }, p2: { defId: 'Voile-1-basic', stance: 'assault' } }), ev('effect', 'public', { player: 'p1', effect: 'braise', status: 'success', detail: '+2 dégâts fixes' })], ctx);
    const e = a.find((x) => x.kind === 'effet')!;
    expect(e).toMatchObject({ side: 'me', defId: 'Cendre-2-braise', title: 'Braise', consequence: '+2 DÉGÂTS', trigger: 'primary-reveal', from: 'me-primary', tone: 'good', private: false });
  });

  it('effet annulé (Silence) et effet de Secondaire : la case lue dans les choix révélés', () => {
    const a = buildActivations([
      ev('tacticsRevealed', 'public', { p1: [null, null], p2: [{ slot: 1, mode: 'rank', target: null, defId: 'Ronce-2-ecaille', family: 'Ronce', masked: false, value: 2, affinity: true }, null] }),
      ev('effect', 'public', { player: 'p2', effect: 'ecaille', status: 'success', detail: 'soin 2 PV' }),
      ev('effect', 'public', { player: 'p2', effect: 'contrecoup', status: 'cancelled', detail: 'neutralisé par Silence' }),
    ], ctx);
    expect(a[0]).toMatchObject({ kind: 'effet', side: 'opp', defId: 'Ronce-2-ecaille', from: 'opp-slot-1', consequence: 'SOIN +2 PV', tone: 'bad' });
    expect(a[1]).toMatchObject({ kind: 'annule', side: 'opp', consequence: 'ÉTEINT PAR SILENCE', tone: 'good' });
  });

  it('effet masqué de l’adversaire : un dos, sa famille, sa seule conséquence publique ; aucun nom d’effet', () => {
    const a = buildActivations([ev('effect', 'public', { player: 'p2', effect: null, status: 'success', detail: 'soin observé', masked: true, family: 'Ronce', slot: 0 })], ctx);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ kind: 'masque', side: 'opp', defId: null, family: 'Ronce', from: 'opp-slot-0' });
    const txt = `${a[0]!.title} ${a[0]!.consequence} ${a[0]!.detail}`;
    for (const e of Object.values(EFFECTS)) expect(txt).not.toContain(e.name);
  });

  it('son propre effet masqué : la forme privée remplace la publique (un seul temps fort, privé, nommé)', () => {
    const a = buildActivations([
      ev('effect', 'public', { player: 'p1', effect: null, status: 'success', detail: 'soin observé', masked: true, family: 'Ronce', slot: 0 }),
      ev('effect', 'p1', { player: 'p1', effect: 'ecaille', status: 'success', detail: 'soin 2 PV', own: true, slot: 0 }),
    ], ctx);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ kind: 'effet', title: 'Écaille', private: true, from: 'me-slot-0', defId: 'Ronce-2-ecaille' });
  });

  it('regard privé : chez son propriétaire seulement ; celui de l’adversaire n’existe pas pour le spectateur', () => {
    const mine = buildActivations([ev('peek', 'p1', { player: 'p1', source: 'Sondage', defIds: ['Astre-3-basic'] })], ctx);
    expect(mine[0]).toMatchObject({ kind: 'regard', seen: ['Astre-3-basic'], consequence: 'VOUS VOYEZ', private: true });
    expect(buildActivations([ev('peek', 'p2', { player: 'p2', source: 'Sondage', defIds: ['Cendre-1-basic'] })], ctx)).toEqual([]);
  });

  it('révélation volontaire suivie de l’effet de la carte : un seul temps fort, celui de l’effet', () => {
    const a = buildActivations([
      ev('secondaryRevealed', 'public', { player: 'p2', slot: 0, defId: 'Voile-1-eclaireur', masked: false, family: 'Voile' }),
      ev('effect', 'public', { player: 'p2', effect: 'eclaireur', status: 'success', detail: 'observe une carte de main adverse' }),
    ], ctx);
    expect(a.map((x) => x.kind)).toEqual(['effet']);
    expect(a[0]!.consequence).toBe('REGARD SUR LA MAIN');
  });

  it('conditions non remplies : regroupées en un seul bandeau discret, à la fin', () => {
    const a = buildActivations([
      ev('effect', 'public', { player: 'p1', effect: 'braise', status: 'failed', detail: 'pas de victoire contre un Assaut' }),
      ev('effect', 'public', { player: 'p2', effect: 'contrecoup', status: 'failed', detail: 'pas de défaite contre un Assaut' }),
      ev('heal', 'public', { player: 'p1', amount: 2, hp: 50 }),
    ], ctx);
    expect(a.map((x) => x.kind)).toEqual(['soin', 'echec']);
    expect(a[1]!.detail).toContain('Braise (vous)');
    expect(a[1]!.detail).toContain('Contrecoup (rival)');
  });

  it('Technique, Interférence, Signature annoncée, Repoussement, Prisme et Convergence', () => {
    const a = buildActivations([
      ev('technique', 'public', { player: 'p2', technique: 'Sondage', cost: 1 }),
      ev('signatureAnnounced', 'public', { player: 'p2', defId: 'sig-Astre' }),
      ev('tacticsRevealed', 'public', { p1: [{ slot: 0, mode: 'damage', target: null, defId: 'Astre-4-convergence', family: 'Astre', masked: false, value: 6, affinity: false }, { slot: 1, mode: 'interfere', target: 0, defId: 'Voile-2-detour', family: 'Voile', masked: false, value: null, affinity: null }], p2: [null, null] }),
      ev('interference', 'public', { player: 'p1', slot: 1, target: 0, targetDefId: 'Ronce-1-basic', success: true }),
      ev('repel', 'public', { player: 'p1', kind: 'emprise', slot: 1, defId: null, dest: 'hand' }),
    ], ctx);
    expect(a.map((x) => x.kind)).toEqual(['technique', 'signature', 'effet', 'interference', 'repousse']);
    expect(a[0]).toMatchObject({ technique: 'Sondage', side: 'opp' });
    expect(a[1]).toMatchObject({ defId: 'sig-Astre', consequence: '∞ SIGNATURE ANNONCÉE' });
    expect(a[2]).toMatchObject({ title: 'Convergence', consequence: '×6', from: 'me-slot-0' });
    expect(a[3]).toMatchObject({ from: 'me-slot-1', to: 'opp-slot-0', defId: 'Voile-2-detour', targetDefId: 'Ronce-1-basic', consequence: 'SOUTIEN ANNULÉ' });
    expect(a[4]).toMatchObject({ title: 'Emprise', defId: null, from: 'opp-slot-1', consequence: 'RENVOYÉE EN MAIN' });
  });

  it('durées : chaque forme en a une ; la somme sert au rythme de la résolution', () => {
    const list = buildActivations([ev('technique', 'public', { player: 'p1', technique: 'Lecture', cost: 2 }), ev('heal', 'public', { player: 'p1', amount: 2, hp: 50 })], ctx);
    expect(activationsDuration(list)).toBe(ACTIVATION_MS.technique + ACTIVATION_MS.soin);
  });
});

describe('M12 — temps forts : la résolution, un temps par effet', () => {
  it('les effets réussis ou annulés ont chacun leur temps ; les échecs, un seul temps', () => {
    const beats = buildResolutionBeats([
      ev('tacticsRevealed', 'public', { p1: [null, null], p2: [null, null] }),
      ev('effect', 'public', { player: 'p1', effect: 'braise', status: 'success', detail: '+2 dégâts fixes' }),
      ev('effect', 'public', { player: 'p2', effect: 'ecaille', status: 'success', detail: 'soin 2 PV' }),
      ev('effect', 'public', { player: 'p1', effect: 'etincelle', status: 'failed', detail: 'avance exacte de 1 requise' }),
      ev('effect', 'public', { player: 'p2', effect: 'contrecoup', status: 'failed', detail: 'pas de défaite contre un Assaut' }),
    ], { viewer: 'p1', primaries: null });
    const eff = beats.filter((b) => b.kind === 'effect');
    expect(eff).toHaveLength(3);
    expect(eff[0]!.title).toContain('Braise');
    expect(eff[1]!.title).toContain('Écaille');
    expect(eff[2]!.events).toHaveLength(2);
  });
});

describe('M12 — temps forts : propriété sur des duels entiers', () => {
  const configs: GameConfig[] = [];
  const pairs = [['Sondage', 'Rupture'], ['Lecture', 'Dissipation'], ['Ancrage', 'Recentrage'], ['Rupture', 'Lecture'], ['Dissipation', 'Sondage']] as const;
  // avenant 09 : un duel sur deux joue les variantes B ou C (Dissimulation gardée pour camoufler leurs effets)
  const mix = (k: number): GameConfig['players']['p1']['variants'] => k === 0 ? 'all'
    : FAMILIES.flatMap((f) => ([1, 2, 3, 4] as const).map((r) => (f === 'Voile' && r === 3 ? 'Voile-3' : `${f}-${r}-${VARIANTS[f][r][k]![0]}`)));
  for (let i = 0; i < 60; i++) {
    const [a, b] = pairs[i % pairs.length]!;
    const fams = ['Cendre', 'Voile', 'Ronce', 'Astre'] as const;
    configs.push({
      seed: 9000 + i * 37,
      players: {
        p1: { ...DEFAULT_CONFIG.players.p1, signature: fams[i % 4]!, variants: mix(i % 3), techniques: [a, b] },
        p2: { ...DEFAULT_CONFIG.players.p2, signature: fams[(i + 1) % 4]!, variants: mix((i + 1) % 3), techniques: [b, a] },
      },
    });
  }

  it('aucun événement privé adverse, aucun nom d’effet masqué ; toute carte adverse montrée est nommée par le journal', () => {
    const kinds = new Set<string>();
    for (const cfg of configs) {
      const m = autoplay(cfg, 60);
      const byTurn = new Map<number, GameEvent[]>();
      for (const e of m.events) byTurn.set(e.turn, [...(byTurn.get(e.turn) ?? []), e]);
      const seen: GameEvent[] = [];
      for (const [, evs] of byTurn) {
        const vis = visibleEvents(evs, 'p1');
        seen.push(...vis);
        const visSeq = new Set(vis.map((e) => e.seq));
        const acts: Activation[] = buildActivations(evs, { viewer: 'p1' });
        const journal = buildJournal(seen, 'p1').map((l) => l.text).join('\n');
        for (const a of acts) {
          kinds.add(a.kind);
          for (const s of a.seqs) expect(visSeq.has(s), `${cfg.seed} ${a.kind}`).toBe(true);
          if (a.side === 'opp') {
            expect(a.private, `${cfg.seed} ${a.kind}`).toBe(false);
            expect(a.kind).not.toBe('regard');
            if (a.kind === 'masque') for (const e of Object.values(EFFECTS)) expect(`${a.title} ${a.consequence} ${a.detail}`, `${cfg.seed}`).not.toContain(e.name);
            for (const id of [a.defId, a.targetDefId].filter(Boolean) as string[]) {
              const def = cardDef(id);
              const named = journal.includes(def.name) || (def.effect ? journal.includes(EFFECTS[def.effect].name) : false);
              expect(named, `${cfg.seed} ${a.kind} ${id}`).toBe(true);
            }
          }
        }
      }
    }
    // la propriété a bien couvert les formes principales
    for (const k of ['effet', 'echec', 'technique', 'regard', 'insight', 'interference']) expect(kinds.has(k), k).toBe(true);
  }, 240000);

  it('toutes les Techniques du catalogue ont un temps fort', () => {
    for (const t of TECHNIQUE_IDS) {
      const a = buildActivations([ev('technique', 'public', { player: 'p1', technique: t, cost: 1 })], ctx);
      expect(a[0]!.consequence.length, t).toBeGreaterThan(3);
    }
  });

  it('sons des temps forts (contrat 2, §5) : activation, annulé, sceau, regard ; Signature et Interférence ont déjà le leur', () => {
    expect(sonDuTempsFort('effet')).toBe('activation');
    expect(sonDuTempsFort('annule')).toBe('annule');
    expect(sonDuTempsFort('masque', 'ANNULÉ')).toBe('annule');
    expect(sonDuTempsFort('masque', 'SOIN')).toBe('activation');
    expect(sonDuTempsFort('technique')).toBe('sceau');
    expect(sonDuTempsFort('regard')).toBe('regard');
    for (const k of ['signature', 'interference', 'echec', 'insight', 'soin', 'revelation']) expect(sonDuTempsFort(k), k).toBeNull();
    // un son ne naît que d'un temps fort, et un temps fort que d'un événement visible : le regard adverse est muet
    expect(buildActivations([ev('peek', 'p2', { player: 'p2', source: 'Sondage', defIds: ['Cendre-1-basic'] })], ctx).map((a) => sonDuTempsFort(a.kind))).toEqual([]);
  });

  it('regard : le sceau de la Technique ou l’icône de l’effet qui l’a donné', () => {
    const [s] = buildActivations([ev('peek', 'p1', { player: 'p1', source: 'Sondage', defIds: ['Astre-3-basic'] })], ctx);
    expect(s).toMatchObject({ technique: 'Sondage', trigger: null });
    const [e] = buildActivations([ev('peek', 'p1', { player: 'p1', source: 'Éclaireur', defIds: ['Astre-3-basic'] })], ctx);
    expect(e).toMatchObject({ technique: null, trigger: 'secondary-reveal' });
    const [c] = buildActivations([ev('peek', 'p1', { player: 'p1', source: 'Clairvoyance voilée', defIds: [], hiddenSlot: null })], ctx);
    expect(c).toMatchObject({ trigger: 'signature', consequence: 'RIEN À OBSERVER' });
  });
});
