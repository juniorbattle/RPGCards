/**
 * Rendu du plateau de duel à partir de la PlayerView (p1) et de l’état d’UI local.
 * Aucune lecture de l’état brut : les cartes adverses cachées sont des versos sans identifiant.
 */
import { cardDef, cardTitle, EFFECTS, FAMILY_THEME, rankLabel } from '../game/catalog/cards';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import type { SlotIndex } from '../game/model/types';
import { verdictText } from '../game/visibility/journal';
import type { SideView, SlotView } from '../game/visibility/view';
import { emblemSvg } from '../art/emblems';
import { RARITY_FRAME } from '../art/palette';
import type { Controller } from '../app/controller';
import { backEl, cardEl } from './cardView';
import { cls, h } from './dom';

const PHASES: Array<{ id: string; label: string; match: string[] }> = [
  { id: 'start', label: 'Début', match: ['START'] },
  { id: 'prep', label: 'Préparation', match: ['PREPARE', 'DISSIPATION'] },
  { id: 'commit', label: 'Engagement', match: ['COMMIT'] },
  { id: 'lecture', label: 'Lecture', match: ['LECTURE', 'LECTURE_CHANGE'] },
  { id: 'tactics', label: 'Révélation · Tactique', match: ['TACTICS'] },
  { id: 'resolve', label: 'Résolution', match: ['REPEL', 'RESOLVED', 'ENDED'] },
];

const MODE_LABEL: Record<string, string> = { keep: 'CONSERVER', rank: 'RANG', damage: 'DÉGÂTS', interfere: 'INTERFÈRE' };

export interface BoardHooks {
  onToggleTool(tool: string): void;
}

export function renderApp(root: HTMLElement, c: Controller, hooks: BoardHooks): void {
  const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.key ?? null;
  const journalEl = root.querySelector('.journal');
  const stick = journalEl ? journalEl.scrollTop + journalEl.clientHeight >= journalEl.scrollHeight - 20 : true;
  const prevScroll = journalEl?.scrollTop ?? 0;

  root.replaceChildren(topbar(c, hooks), board(c), sidebar(c));
  if (c.ui.toast) root.append(h('div', { class: cls('toast', c.ui.toast.kind === 'info' && 'info'), role: 'status', 'aria-live': 'polite' }, c.ui.toast.text));
  if (c.view.phase === 'ENDED') root.append(endOverlay(c));

  const j = root.querySelector('.journal');
  if (j) j.scrollTop = stick ? j.scrollHeight : prevScroll;
  if (focusKey) (root.querySelector(`[data-key="${CSS.escape(focusKey)}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
  c.ui.flipPrimaries = false;
}

// ---------------------------------------------------------------------------

function topbar(c: Controller, hooks: BoardHooks): HTMLElement {
  const phase = c.view.phase;
  const nowIdx = PHASES.findIndex((p) => p.match.includes(phase));
  return h('header', { class: 'topbar' },
    h('div', { class: 'brand' }, 'Les Quatre Voies', h('small', null, `Tour ${c.view.turn} · seed ${c.view.seed}${c.scenario ? ` · démo « ${c.scenario.title} »` : ''}`)),
    h('nav', { class: 'timeline', 'aria-label': 'Phases du tour' },
      PHASES.map((p, i) => h('span', { class: cls('step', i < nowIdx && 'done', i === nowIdx && 'now'), 'aria-current': i === nowIdx ? 'step' : null }, p.label))),
    h('div', { class: 'tools' },
      h('button', { class: 'tool journal-toggle', 'data-key': 'tool-journal', 'aria-pressed': String(c.ui.journalOpen), onclick: () => hooks.onToggleTool('journal') }, 'Journal'),
      h('button', { class: 'tool', 'data-key': 'tool-smaller', title: 'Réduire le texte', onclick: () => hooks.onToggleTool('smaller') }, 'A−'),
      h('button', { class: 'tool', 'data-key': 'tool-bigger', title: 'Agrandir le texte', onclick: () => hooks.onToggleTool('bigger') }, 'A+'),
      h('button', { class: 'tool', 'data-key': 'tool-motion', 'aria-pressed': String(c.params.reducedMotion), title: 'Mouvement réduit', onclick: () => hooks.onToggleTool('motion') }, 'Mvt réduit'),
      h('button', { class: 'tool', 'data-key': 'tool-cam', title: 'Caméra exploratoire (provisoire)', onclick: () => hooks.onToggleTool('cam') }, c.params.cam === 'tilted' ? 'Vue inclinée' : 'Vue frontale'),
      h('button', { class: 'tool', 'data-key': 'tool-help', onclick: () => hooks.onToggleTool('help') }, '?'),
    ),
  );
}

function board(c: Controller): HTMLElement {
  const v = c.view;
  return h('main', { class: 'board', 'aria-label': 'Plateau de duel' },
    hud(c, v.opp, 'opp'),
    sideRow(c, 'opp'),
    strip(c),
    sideRow(c, 'me'),
    hud(c, v.me, 'me'),
    hand(c),
  );
}

// --- HUD -------------------------------------------------------------------

function hud(c: Controller, s: SideView, who: 'me' | 'opp'): HTMLElement {
  const v = c.view;
  const pct = Math.max(0, Math.min(100, (s.hp / s.maxHp) * 100));
  const awaiting = who === 'me' ? v.awaitingMe : v.awaitingOpponent;
  const lockText = who === 'me'
    ? (s.locked ? 'Décision verrouillée' : awaiting ? 'À vous de décider' : 'Rien à décider')
    : (s.locked ? 'Rival : verrouillé (secret)' : awaiting ? (c.aiThinking ? 'Le rival réfléchit' : 'Rival : en attente') : 'Rival');
  const floaters = c.ui.floaters.filter((f) => f.side === who).map((f) => h('span', { class: cls('floater', f.heal && 'heal'), 'data-floater': String(f.id), 'aria-hidden': 'true' }, f.text));
  return h('section', { class: cls('hud', who), 'aria-label': who === 'me' ? 'Votre duelliste' : 'Duelliste rival' },
    h('span', { class: 'who' }, who === 'me' ? 'Vous' : s.name, ' ', h('span', { html: emblemSvg(s.signatureFamily, 14), title: `Signature ${s.signatureFamily}` })),
    h('div', { class: 'hp' },
      h('div', { class: 'bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(s.maxHp), 'aria-valuenow': String(s.hp), 'aria-label': 'Points de vie' }, h('div', { class: 'fill', style: `width:${pct}%` })),
      h('div', { class: 'label' }, h('b', null, `${s.hp}`), ` / ${s.maxHp} PV`),
      ...floaters,
    ),
    h('div', { class: 'insight', title: 'Insight (0 à 2)', 'aria-label': `Insight ${s.insight} sur 2` }, 'Insight', h('span', { class: cls('pip', s.insight >= 1 && 'on') }), h('span', { class: cls('pip', s.insight >= 2 && 'on') })),
    h('div', { class: 'counts' },
      who === 'opp' ? h('span', { class: 'opp-hand', 'aria-label': `Main adverse : ${s.handCount} cartes cachées` }, Array.from({ length: s.handCount }, () => h('span', { class: 'mini-back' }))) : null,
      h('span', null, 'Main ', h('b', null, String(s.handCount))),
      h('span', null, 'Pioche ', h('b', null, String(s.deckCount))),
      h('span', { title: s.discard.map((d) => cardTitle(cardDef(d))).join(', ') || 'vide' }, 'Défausse ', h('b', null, String(s.discard.length))),
    ),
    techChips(c, s, who),
    h('span', { class: cls('lockchip', s.locked && 'locked', who === 'opp' && awaiting && !s.locked && c.aiThinking && 'thinking') }, lockText),
  );
}

function techChips(c: Controller, s: SideView, who: 'me' | 'opp'): HTMLElement {
  const v = c.view;
  return h('div', { class: 'techs', 'aria-label': 'Techniques équipées' }, s.techniques.map((t) => {
    const def = TECHNIQUES[t];
    const used = s.techniqueUsed === t;
    let usable = false;
    let armed = false;
    let onclick: (() => void) | null = null;
    if (who === 'me' && v.awaitingMe && c.canUseTech(t)) {
      if (v.phase === 'START' && (t === 'Sondage' || t === 'Recentrage')) { usable = true; armed = c.ui.startTech?.id === t || (t === 'Recentrage' && c.ui.recentrageArmed); onclick = () => c.toggleStartTech(t); }
      if (v.phase === 'TACTICS' && (t === 'Ancrage' || t === 'Rupture')) { usable = true; armed = c.ui.tacticsTech?.id === t || c.ui.techTargeting === t; onclick = () => c.toggleTacticsTech(t); }
    }
    return h('button', {
      class: cls('tech', usable && 'usable', armed && 'armed', used && 'used'), type: 'button', 'data-key': `tech-${who}-${t}`,
      title: `${t} — coût ${def.cost} Insight · ${def.timing}\n${def.text}`, 'aria-pressed': usable ? String(armed) : null, disabled: !usable,
      onclick,
    }, `${t} (${def.cost})`);
  }));
}

// --- Rangées de cartes ------------------------------------------------------

function sideRow(c: Controller, who: 'me' | 'opp'): HTMLElement {
  const v = c.view;
  const s = who === 'me' ? v.me : v.opp;
  const z0 = slotZone(c, who, 0, s.slots[0] ?? null);
  const z1 = slotZone(c, who, 1, s.slots[1] ?? null);
  return h('section', { class: cls('side', who), 'aria-label': who === 'me' ? 'Votre terrain' : 'Terrain adverse' },
    h('div', { class: 'row' }, z0, primaryZone(c, who), z1));
}

function primaryZone(c: Controller, who: 'me' | 'opp'): HTMLElement {
  const v = c.view;
  const s = who === 'me' ? v.me : v.opp;
  const label = h('span', { class: 'zone-label' }, 'Primaire');
  const zone = h('div', { class: cls('zone', 'primary'), 'data-drop': who === 'me' ? 'primary' : null }, label);
  const revealed = v.reveal.primaries?.[who];
  if (revealed) {
    const st = revealed.stance;
    zone.append(h('span', { class: cls('stance-tag', st) }, st === 'assault' ? 'ASSAUT' : 'GARDE'));
    const el = cardEl(revealed.defId, { artSeed: c.artSeed, classes: [c.ui.flipPrimaries && 'flip-in'], tag: 'div', banner: v.phase === 'RESOLVED' || v.phase === 'ENDED' || v.phase === 'REPEL' ? 'RÉSOLUE' : null, attrs: { tabindex: '0', 'data-key': `prim-${who}`, onmouseenter: () => inspect(c, revealed.defId), onfocus: () => inspect(c, revealed.defId) } });
    zone.append(el);
    return zone;
  }
  if (who === 'opp') {
    if (s.primary) zone.append(backEl(c.artSeed, { banner: 'ENGAGÉE · SECRÈTE', label: 'Primaire adverse engagée, face cachée' }));
    else zone.append(h('span', { class: 'empty-hint' }, v.phase === 'COMMIT' ? 'Le rival engage…' : ''));
    return zone;
  }
  // Moi : brouillon (non verrouillé) ou engagement verrouillé
  if (v.me.primary?.card) {
    const st = v.me.primary.stance!;
    zone.append(h('span', { class: cls('stance-tag', st) }, st === 'assault' ? 'ASSAUT' : 'GARDE'));
    zone.append(cardEl(v.me.primary.card.defId, { artSeed: c.artSeed, tag: 'div', banner: 'VERROUILLÉE · SECRÈTE', attrs: { tabindex: '0', 'data-key': 'prim-me-locked' } }));
    if (v.phase === 'LECTURE_CHANGE' && v.awaitingMe) zone.append(stanceChips(c, c.ui.lectureStance));
    return zone;
  }
  const dr = c.ui.draft;
  const committing = v.phase === 'COMMIT' && v.awaitingMe;
  if (committing) {
    zone.classList.toggle('legal', !!c.ui.selected);
    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');
    zone.dataset.key = 'zone-primary';
    zone.setAttribute('aria-label', dr.primaryId ? 'Primaire posée (cliquer pour la reprendre en main)' : 'Emplacement Primaire : poser une carte (obligatoire)');
    zone.addEventListener('click', () => c.clickZone('primary'));
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.clickZone('primary'); } });
  }
  if (dr.primaryId && committing) {
    const defId = c.defIdOf(dr.primaryId);
    zone.append(cardEl(defId, { artSeed: c.artSeed, state: 'draft', tag: 'div', banner: dr.stance ? `${dr.stance === 'assault' ? 'ASSAUT' : 'GARDE'} · NON VERROUILLÉE` : 'CHOISIR ASSAUT / GARDE', attrs: { 'data-drag-card': dr.primaryId, onmouseenter: () => inspect(c, defId) } }));
    zone.append(stanceChips(c, dr.stance));
  } else if (committing) zone.append(h('span', { class: 'empty-hint' }, 'Glissez ou cliquez une carte ici'));
  return zone;
}

function stanceChips(c: Controller, current: 'assault' | 'guard' | null): HTMLElement {
  return h('div', { class: 'stance', role: 'group', 'aria-label': 'Mode de la Primaire' },
    h('button', { class: 'chip assault', type: 'button', 'data-key': 'stance-assault', 'aria-pressed': String(current === 'assault'), title: 'Assaut (touche A)', onclick: (e: Event) => { e.stopPropagation(); c.setStance('assault'); } }, 'ASSAUT'),
    h('button', { class: 'chip guard', type: 'button', 'data-key': 'stance-guard', 'aria-pressed': String(current === 'guard'), title: 'Garde (touche G)', onclick: (e: Event) => { e.stopPropagation(); c.setStance('guard'); } }, 'GARDE'),
  );
}

function inspect(c: Controller, defId: string): void {
  if (c.ui.inspect === defId) return;
  c.ui.inspect = defId;
  const side = document.querySelector('.inspector');
  if (side) side.replaceWith(inspector(c));
}

function slotZone(c: Controller, who: 'me' | 'opp', slot: SlotIndex, s: SlotView | null): HTMLElement {
  const v = c.view;
  const key = who === 'me' ? (`slot${slot}` as const) : (`opp${slot}` as const);
  const zone = h('div', { class: 'zone', 'data-drop': who === 'me' ? key : null }, h('span', { class: 'zone-label' }, `Secondaire ${slot + 1}`));
  let interactive = false;

  // Brouillon de pose (moi, phase Engagement)
  const dr = c.ui.draft;
  const committing = who === 'me' && v.phase === 'COMMIT' && v.awaitingMe;
  if (committing) {
    interactive = true;
    if (c.ui.selected) zone.classList.add(c.dropCheck(c.ui.selected, key as 'slot0') ? 'illegal' : 'legal');
  }
  const draftHere = committing && dr.secondaryId && dr.slot === slot;

  if (draftHere) {
    const defId = c.defIdOf(dr.secondaryId!);
    zone.append(cardEl(defId, { artSeed: c.artSeed, state: 'draft', tag: 'div', banner: s ? 'REMPLACE · NON VERROUILLÉE' : 'POSE CACHÉE · NON VERROUILLÉE', attrs: { 'data-drag-card': dr.secondaryId, onmouseenter: () => inspect(c, defId) } }));
  } else if (s) {
    if (who === 'me' || s.card) {
      const defId = s.card!.defId;
      const state = s.masked && who === 'opp' ? 'masked' : s.state;
      const willReveal = who === 'me' && v.phase === 'PREPARE' && c.ui.reveal.includes(slot);
      const banner = who === 'me' && s.masked ? 'ACTIVE · MASQUÉE (rival)' : willReveal ? 'SERA RÉVÉLÉE' : null;
      zone.append(cardEl(defId, { artSeed: c.artSeed, state, banner, tag: 'div', classes: [willReveal && 'will-reveal', s.maskSource && 'mask-source'], attrs: { onmouseenter: () => inspect(c, defId) } }));
    } else {
      zone.append(backEl(c.artSeed, { state: s.masked ? 'masked' : s.state === 'active' ? 'masked' : s.state }));
    }
  } else zone.append(h('span', { class: 'empty-hint' }, committing ? 'Nouvelle Secondaire (facultative)' : 'Vide'));

  // Interactions selon la phase
  if (who === 'me') {
    if (v.phase === 'PREPARE' && v.awaitingMe && s && s.state !== 'active') interactive = true;
    if (v.phase === 'TACTICS' && v.awaitingMe && s) interactive = true;
    if (v.phase === 'TACTICS' && s?.state === 'active') {
      const plan = c.ui.plans[slot];
      if (v.awaitingMe && plan) zone.append(planBadge(plan.mode, plan.mode === 'interfere' ? `→ case ${plan.target! + 1}` : plan.mode === 'keep' ? '' : c.supportLabel(slot, plan.mode as 'rank' | 'damage'), false));
      if (c.ui.tacticsTech?.id === 'Ancrage' && c.ui.tacticsTech.slot === slot) zone.append(h('span', { class: 'plan-badge', style: 'top:auto;bottom:calc(100% + 4px)' }, 'ANCRAGE'));
      if (c.ui.menuSlot === slot) zone.append(tacticsMenu(c, slot));
      if (c.ui.targetingFor === slot) zone.classList.add('targeted');
    }
  } else {
    if (v.phase === 'TACTICS' && v.awaitingMe && c.ui.targetingFor !== null && s?.state === 'active') {
      zone.classList.add(c.legalTargets(c.ui.targetingFor).includes(slot) ? 'targetable' : 'illegal');
      interactive = true;
    }
    if (v.phase === 'TACTICS' && v.awaitingMe && c.ui.techTargeting === 'Rupture' && s?.state === 'active') { zone.classList.add('targetable'); interactive = true; }
    const targetedBy = c.ui.plans.findIndex((p) => p?.mode === 'interfere' && p.target === slot);
    if (v.phase === 'TACTICS' && targetedBy >= 0) zone.append(h('span', { class: 'plan-badge' }, `CIBLE de votre case ${targetedBy + 1}`));
    if (c.ui.tacticsTech?.id === 'Rupture' && c.ui.tacticsTech.targetSlot === slot) zone.classList.add('targeted');
    if (v.phase === 'DISSIPATION' && v.awaitingMe && s?.maskSource) { zone.classList.add(c.ui.dissipTarget === slot ? 'targeted' : 'targetable'); interactive = true; }
    if (v.phase === 'REPEL' && v.repel?.mine && s) { zone.classList.add(v.repel.choices.includes(slot) ? 'targetable' : 'illegal'); interactive = true; }
  }

  // Tactiques révélées (publiques) après verrouillage commun
  const revealed = v.reveal.tactics?.[who]?.[slot];
  if (revealed && (v.phase !== 'TACTICS' || !v.awaitingMe)) {
    const extra = revealed.mode === 'rank' ? (revealed.value !== null ? `+${revealed.value}` : '?') : revealed.mode === 'damage' ? (revealed.value !== null ? `×${revealed.value}` : '×?') : revealed.mode === 'interfere' ? `→ case ${(revealed.target ?? 0) + 1}` : '';
    const cancelled = !!v.lastClash?.cancelled[who === 'me' ? v.viewer : (v.viewer === 'p1' ? 'p2' : 'p1')]?.includes(slot);
    zone.append(planBadge(revealed.mode, cancelled ? `${extra} · ANNULÉ` : extra, cancelled));
  }

  if (interactive) {
    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');
    zone.dataset.key = `zone-${who}-${slot}`;
    zone.setAttribute('aria-label', zoneAria(c, who, slot, s));
    zone.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('.menu')) return; c.clickZone(key); });
    zone.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !(e.target as HTMLElement).closest('.menu')) { e.preventDefault(); c.clickZone(key); } });
  }
  return zone;
}

function zoneAria(c: Controller, who: 'me' | 'opp', slot: SlotIndex, s: SlotView | null): string {
  const base = `${who === 'me' ? 'Votre' : 'Adverse'} Secondaire ${slot + 1}`;
  if (!s) return `${base}, vide`;
  const st = { charging: 'en chargement, inutilisable', hidden: 'réserve cachée, inactive', active: 'active, prête' }[s.state];
  const id = s.card ? cardTitle(cardDef(s.card.defId)) : 'face cachée';
  return `${base} : ${id}, ${st}${s.masked ? ', masquée' : ''}`;
}

function planBadge(mode: string, extra: string, cancelled: boolean): HTMLElement {
  return h('span', { class: cls('plan-badge', mode, cancelled && 'cancelled') }, `${MODE_LABEL[mode] ?? mode}${extra ? ' ' + extra : ''}`);
}

function tacticsMenu(c: Controller, slot: SlotIndex): HTMLElement {
  const cur = c.ui.plans[slot]?.mode ?? null;
  const item = (mode: 'keep' | 'rank' | 'damage' | 'interfere', label: string, hint: string) => {
    const blocked = c.modeBlocked(slot, mode);
    return h('button', { type: 'button', 'data-key': `menu-${slot}-${mode}`, 'aria-pressed': String(cur === mode), disabled: !!blocked, title: blocked ?? '', onclick: (e: Event) => { e.stopPropagation(); c.choosePlan(slot, mode); } },
      h('span', null, label), h('small', null, blocked ?? hint));
  };
  const menu = h('div', { class: cls('menu', slot === 0 ? 'left' : 'right'), role: 'menu', 'aria-label': `Action de la Secondaire ${slot + 1}` },
    h('div', { class: 'menu-title' }, 'Choix secret (révélé après verrouillage commun)'),
    item('keep', 'Conserver', 'reste active, non dépensée'),
    item('rank', 'Amplifier le Rang', c.supportLabel(slot, 'rank') + ' au score'),
    item('damage', 'Amplifier les dégâts', c.supportLabel(slot, 'damage') + ' au multiplicateur'),
    item('interfere', 'Interférer', 'puis choisir la cible adverse'),
  );
  queueMicrotask(() => (menu.querySelector('button:not(:disabled)') as HTMLElement | null)?.focus());
  return menu;
}

// --- Bande centrale -----------------------------------------------------------

function strip(c: Controller): HTMLElement {
  const v = c.view;
  const msg = h('div', { class: 'msg', role: 'status', 'aria-live': 'polite' });
  const actions = h('div', { class: 'btn-row' });
  const title = (t: string) => h('span', { class: 'title' }, t);
  const sub = (t: string) => h('span', { class: 'sub' }, t);
  const btn = (label: string, onclick: () => void, opts: { disabled?: boolean; ghost?: boolean; key: string } = { key: '' }) =>
    h('button', { class: cls('btn', opts.ghost && 'ghost'), type: 'button', 'data-key': opts.key, 'data-primary-action': opts.ghost ? null : 'true', disabled: !!opts.disabled, onclick }, label);

  const waitOpp = () => { msg.append(title(c.aiThinking ? 'Le rival réfléchit…' : 'En attente du rival'), sub('Ses choix restent secrets jusqu’à la révélation simultanée.')); };

  switch (v.phase) {
    case 'START':
      if (v.awaitingMe) {
        const excess = Math.max(0, v.me.handCount - 4);
        msg.append(title('Début du tour'), sub(excess ? `Main de ${v.me.handCount} cartes : cliquez ${excess} carte(s) à défausser pour revenir à 4.` : 'Techniques précoces disponibles (Sondage / Recentrage), facultatives.'));
        if (c.ui.startTech) msg.append(sub(` · Technique armée : ${c.ui.startTech.id}`));
        actions.append(btn('Valider', () => c.lockStart(), { key: 'act-start', disabled: c.ui.trim.length !== excess }));
      } else waitOpp();
      break;
    case 'PREPARE':
      if (v.awaitingMe) {
        msg.append(title('Préparation — révélation volontaire'), sub('Cliquez vos réserves cachées à révéler (elles deviennent ACTIVES). Ou gardez-les cachées (inactives). Choix secret, appliqué simultanément.'));
        actions.append(btn(c.ui.reveal.length ? `Révéler (${c.ui.reveal.length}) et valider` : 'Garder cachées et valider', () => c.lockPrepare(), { key: 'act-prepare' }));
      } else waitOpp();
      break;
    case 'DISSIPATION':
      if (v.awaitingMe) {
        msg.append(title('Dissipation possible (1 Insight)'), sub('Cliquez la Dissimulation adverse pour neutraliser son camouflage, ou passez.'));
        actions.append(btn('Dissiper', () => c.lockDissipation(true), { key: 'act-dissip', disabled: c.ui.dissipTarget === null }), btn('Passer', () => c.lockDissipation(false), { key: 'act-dissip-pass', ghost: true }));
      } else waitOpp();
      break;
    case 'COMMIT':
      if (v.awaitingMe) {
        const dr = c.ui.draft;
        const prim = dr.primaryId ? cardDef(c.defIdOf(dr.primaryId)) : null;
        msg.append(title('Engagement secret'));
        if (prim) msg.append(sub(`${cardTitle(prim)} · Rang ${rankLabel(prim)} · Puissance ${prim.power}${dr.stance ? ` · ${dr.stance === 'assault' ? 'ASSAUT : dégâts de base ' + prim.power + ' contre un Assaut dominé' : 'GARDE : absorbe jusqu’à ' + prim.power + ', gagne les égalités'}` : ' · choisissez ASSAUT ou GARDE'}`));
        else msg.append(sub('Glissez (ou cliquez puis cliquez la case) une carte sur la Primaire — obligatoire. Une nouvelle Secondaire facultative se pose face cachée en CHARGEMENT.'));
        actions.append(btn('Verrouiller l’engagement', () => c.lockCommit(), { key: 'act-commit', disabled: !dr.primaryId || !dr.stance }));
      } else waitOpp();
      break;
    case 'LECTURE':
      if (v.awaitingMe) {
        msg.append(title('Lecture (2 Insight)'), sub('Observer le mode initial adverse, puis éventuellement changer le mode de votre Primaire.'));
        actions.append(btn('Utiliser Lecture', () => c.lecture(true), { key: 'act-lecture' }), btn('Passer', () => c.lecture(false), { key: 'act-lecture-pass', ghost: true }));
      } else waitOpp();
      break;
    case 'LECTURE_CHANGE':
      if (v.awaitingMe) {
        msg.append(title(`Lecture : le rival a engagé en ${v.lectureSeen === 'assault' ? 'ASSAUT' : 'GARDE'} (mode initial)`), sub('Changez éventuellement votre mode (boutons sous votre Primaire), puis validez.'));
        actions.append(btn('Valider le mode', () => c.lockLectureStance(), { key: 'act-lecture-stance' }));
      } else waitOpp();
      break;
    case 'TACTICS':
      if (v.awaitingMe) {
        const p = c.preview();
        msg.append(title('Choix tactiques secrets'));
        if (p) msg.append(h('span', { class: 'result' }, `Provisoire : score ${p.myScore} contre ${p.oppScore} · M ×${p.myMult} · ${p.outcome}${p.dealt || p.taken ? ` · infligés ${p.dealt} / subis ${p.taken}` : ''}`), sub(' — sous réserve des actions secrètes adverses (hypothèse : le rival conserve).'));
        if (c.ui.targetingFor !== null) msg.append(sub(' · Ciblage d’Interférence en cours (Échap pour annuler).'));
        actions.append(btn('Verrouiller les choix', () => c.lockTactics(), { key: 'act-tactics', disabled: c.ui.techTargeting !== null }));
      } else waitOpp();
      break;
    case 'REPEL':
      if (v.repel?.mine) {
        msg.append(title(`Repoussement (${v.repel.kind === 'emprise' ? 'Emprise' : v.repel.kind === 'flamme' ? 'Flamme conquérante' : v.repel.kind === 'rupture' ? 'Rupture' : 'Garde victorieuse'})`), sub('Cliquez une Secondaire adverse surlignée pour la renvoyer à son propriétaire.'));
        actions.append(btn('Renoncer', () => c.skipRepel(), { key: 'act-repel-skip', ghost: true }));
      } else { msg.append(title('Le rival choisit un Repoussement'), sub('Aucune réaction possible.')); }
      break;
    case 'RESOLVED':
    case 'ENDED': {
      const r = v.lastClash;
      if (r) {
        msg.append(title(`Clash du tour ${r.turn}`), h('span', { class: cls('result', r.zeroDamageRankWin && 'zero') }, verdictText(r, 'p1')),
          sub(` PV perdus : vous ${r.damage.p1}${r.fixedDamage.p1 ? ` (dont ${r.fixedDamage.p1} fixes)` : ''}, rival ${r.damage.p2}${r.fixedDamage.p2 ? ` (dont ${r.fixedDamage.p2} fixes)` : ''}.`));
      } else msg.append(title('Tour résolu'));
      if (v.overtime && v.phase === 'RESOLVED' && v.me.hp === 1 && v.opp.hp === 1) msg.append(sub(` · PROLONGATION ${v.overtime} : 1 PV chacun.`));
      if (v.phase === 'RESOLVED') actions.append(btn('Tour suivant', () => c.nextTurn(), { key: 'act-next' }));
      break;
    }
  }
  return h('section', { class: 'strip', 'aria-label': 'Phase et résultat' }, msg, actions);
}

// --- Main ---------------------------------------------------------------------

function hand(c: Controller): HTMLElement {
  const v = c.view;
  const dr = c.ui.draft;
  const cards = (v.me.hand ?? []).filter((x) => !(v.phase === 'COMMIT' && v.awaitingMe && (x.cardId === dr.primaryId || x.cardId === dr.secondaryId)));
  const wrap = h('section', { class: 'hand', 'aria-label': 'Votre main', 'data-drop': 'hand' });
  if (!cards.length) wrap.append(h('span', { class: 'hand-empty' }, (v.me.hand ?? []).length ? 'Cartes posées (non verrouillées)' : 'Main vide'));
  cards.forEach((x, i) => {
    const el = cardEl(x.defId, {
      artSeed: c.artSeed,
      classes: ['hand-card', c.ui.selected === x.cardId && 'selected', c.ui.trim.includes(x.cardId) && 'trim-mark'],
      attrs: { 'data-drag-card': x.cardId, 'data-key': `hand-${x.cardId}`, 'aria-pressed': String(c.ui.selected === x.cardId), 'aria-keyshortcuts': String(i + 1), onfocus: () => inspect(c, x.defId), onmouseenter: () => inspect(c, x.defId) },
    });
    if (c.ui.startTech?.id === 'Recentrage' && c.ui.startTech.cardId === x.cardId) el.append(h('span', { class: 'state-banner' }, 'RECENTRAGE'));
    wrap.append(el);
  });
  return wrap;
}

// --- Barre latérale -------------------------------------------------------------

function sidebar(c: Controller): HTMLElement {
  return h('aside', { class: cls('sidebar', c.ui.journalOpen && 'open'), 'aria-label': 'Inspection et journal' }, inspector(c), journal(c));
}

function inspector(c: Controller): HTMLElement {
  const id = c.ui.inspect;
  if (!id) {
    return h('section', { class: 'inspector' }, h('div', { class: 'placeholder' },
      h('b', null, 'Inspection'), ' — survolez, focalisez ou appuyez longuement sur une carte visible pour lire ses détails. ',
      'Rang = priorité du Clash ; Puissance = dégâts / absorption. Raccourcis : 1-4 main, A/G mode, Échap annuler, Entrée/N action principale.'));
  }
  const def = cardDef(id);
  const fr = RARITY_FRAME[def.rarity];
  return h('section', { class: 'inspector', style: `--fb:${fr.b}` },
    cardEl(id, { artSeed: c.artSeed, tag: 'div' }),
    h('div', null,
      h('h3', null, cardTitle(def)),
      h('div', { class: 'meta' }, `${def.family} ${emblemText(def.family)} · ${fr.label} · ${FAMILY_THEME[def.family]}`),
      h('div', { class: 'stats-line' }, 'Rang ', h('b', null, def.signature ? '∞ (priorité absolue)' : `${rankLabel(def)} (${def.rank})`), ' · Puissance ', h('b', null, String(def.power))),
      def.effect ? h('div', { class: 'eff' }, h('em', null, EFFECTS[def.effect].name), ` — ${EFFECTS[def.effect].role}. ${EFFECTS[def.effect].text}`) : h('div', { class: 'eff' }, 'Basic : aucun effet individuel. Fonctions Basic : Primaire Assaut/Garde ; Secondaire Rang, Dégâts, Interférer, Conserver.'),
      def.signature ? h('div', { class: 'eff' }, 'Signature : uniquement Primaire. ∞ domine tout score ordinaire ; Puissance finie, absorbable par une Garde.') : null,
    ),
  );
}

function emblemText(f: string): string {
  return { Cendre: '◆', Voile: '◈', Ronce: '✿', Astre: '✦' }[f] ?? '';
}

function journal(c: Controller): HTMLElement {
  return h('section', { class: 'journal', 'aria-label': 'Journal du duel', 'aria-live': 'off', tabindex: '0' },
    h('h4', null, 'Journal (public + vos informations privées)'),
    c.journal.map((l) => h('div', { class: cls('line', l.tone) }, l.text)));
}

function endOverlay(c: Controller): HTMLElement {
  const win = c.view.winner === 'me';
  return h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fin du duel' },
    h('div', { class: 'dialog', style: 'max-width:30rem;text-align:center' },
      h('h1', { class: 'end-title' }, win ? 'Victoire' : 'Défaite'),
      h('p', null, win ? 'Le rival tombe à 0 PV.' : 'Vous tombez à 0 PV.', ` Duel terminé au tour ${c.view.turn}${c.view.overtime ? ` après ${c.view.overtime} prolongation(s)` : ''}.`),
      c.view.lastClash ? h('p', null, verdictText(c.view.lastClash, 'p1')) : null,
      h('div', { class: 'btn-row', style: 'justify-content:center' },
        h('button', { class: 'btn', type: 'button', 'data-key': 'end-new', 'data-primary-action': 'true', onclick: () => { const u = new URL(window.location.href); u.searchParams.set('seed', String((c.view.seed + 1) >>> 0)); u.searchParams.delete('scenario'); window.location.href = u.toString(); } }, 'Nouveau duel (seed suivante)'),
        h('button', { class: 'btn ghost', type: 'button', 'data-key': 'end-close', onclick: () => document.querySelector('.overlay')?.remove() }, 'Voir le plateau'),
      ),
    ));
}

export type { TechniqueId };
