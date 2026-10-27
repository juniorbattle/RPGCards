/**
 * Rendu du plateau de duel à partir de la PlayerView (p1) et de l’état d’UI local.
 * Aucune lecture de l’état brut : les cartes adverses cachées sont des versos sans identifiant.
 *
 * Composition M03 (preview validée `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`) :
 * scène plein cadre ; HUD rival haut-gauche, bulle du rival haut-droite ; emplacements posés sur
 * la table au centre ; main centrée en bas ; HUD joueur compact bas-gauche (portrait) ;
 * commandes + Techniques bas-droite ; journal en tiroir rétractable ; inspection flottante.
 */
import { cardDef, cardTitle, EFFECTS, FAMILY_THEME, rankLabel, type Family } from '../game/catalog/cards';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import type { SlotIndex, Stance } from '../game/model/types';
import { guardHalf } from '../game/engine/clash';
import { verdictText } from '../game/visibility/journal';
import type { SideView, SlotView } from '../game/visibility/view';
import { emblemSvg } from '../art/emblems';
import { RARITY_FRAME } from '../art/palette';
import { playerFigure, portraitUrl } from '../art/portrait';
import type { Controller } from '../app/controller';
import { backEl, cardEl, triggerOf } from './cardView';
import { cardArtVersion } from '../art/cardArt';
import { EFFECT_SUMMARY, keywordsIn, TRIGGER_LABEL } from '../game/catalog/cardText';
import { techniqueSeal, triggerIcon } from './effectIcons';
import { animatedIn, cls, domDifference, fresh, h, listen, patchChildren, tracked } from './dom';
import { moodLabel, rivalLine } from './rivalLines';
import { STANCE_ICON, stanceBanner } from './stance';

export { STANCE_ICON, stanceBanner };

const PHASES: Array<{ id: string; label: string; match: string[] }> = [
  { id: 'start', label: 'Début', match: ['START'] },
  { id: 'prep', label: 'Préparation', match: ['PREPARE', 'DISSIPATION'] },
  { id: 'commit', label: 'Engagement', match: ['COMMIT', 'REVISION'] },
  { id: 'lecture', label: 'Lecture', match: ['LECTURE', 'LECTURE_CHANGE'] },
  { id: 'tactics', label: 'Révélation · Tactique', match: ['TACTICS'] },
  { id: 'resolve', label: 'Résolution', match: ['REPEL', 'RESOLVED', 'ENDED'] },
];

const MODE_LABEL: Record<string, string> = { keep: 'CONSERVER', rank: 'RANG', damage: 'DÉGÂTS', interfere: 'INTERFÈRE' };

export interface BoardHooks {
  onToggleTool(tool: string): void;
  /**
   * Mode produit (M04) : bouton « Menu » dans la barre d’outils (pause, options, abandon) et pas
   * d’écran de fin historique — l’enveloppe présente le résultat. Absent : comportement QA historique.
   */
  product?: { menu: true };
  /** Conseil contextuel non intrusif (M04), au-dessus des commandes ; « Compris » → outil `tip:<id>`. */
  tip?: () => { id: string; title: string; text: string } | null;
}

/** Éléments qui glissent de leur ancienne place lors d’un passage de vue A ↔ B. */
const FLIP_TARGETS = ['.side.opp .row', '.side.me .row', '.hand'];

/** Contenu complet de #app pour l’état courant (arbre neuf, hors document). */
function buildApp(c: Controller, hooks: BoardHooks): DocumentFragment {
  const f = document.createDocumentFragment();
  f.append(
    phasebar(c),
    tools(c, hooks),
    hud(c, c.view.opp, 'opp'),
    rivalBubble(c),
    board(c),
    hand(c),
    hud(c, c.view.me, 'me'),
    command(c),
    inspector(c),
    drawer(c, hooks),
  );
  const tip = tipBox(c, hooks);
  if (tip) f.append(tip);
  if (c.ui.toast) f.append(fresh(h('div', { class: cls('toast', c.ui.toast.kind === 'info' && 'info'), role: 'status', 'aria-live': 'polite' }, c.ui.toast.text)));
  if (c.view.phase === 'ENDED' && !c.sequencing && !hooks.product) f.append(endOverlay(c));
  return f;
}

/** QA (`?qa=1&renderCheck=1`) : chaque rendu ciblé est comparé à un rendu complet du même état. */
const renderCheck = { renders: 0, mismatches: [] as string[] };
export const renderCheckStats = () => ({ renders: renderCheck.renders, mismatches: [...renderCheck.mismatches] });

/**
 * Rendu du plateau (passe 13) : l’arbre complet est construit comme avant, puis `patchChildren` ne
 * touche dans #app que les nœuds qui diffèrent. Le DOM obtenu est nœud pour nœud celui de l’ancien
 * `replaceChildren` (vérifié par `renderCheck`), et le comportement aussi : un élément dont un
 * attribut change, qui porte une animation en cours, qui est marqué `fresh` ou qui est sous la souris
 * avec des écouteurs de survol est remplacé par sa version neuve ; l’élément focalisé reçoit `blur` puis
 * le focus comme avant ; aucune transition CSS ne démarre sur un élément gardé.
 */
export function renderApp(root: HTMLElement, c: Controller, hooks: BoardHooks): void {
  const check = c.params.qa && c.params.renderCheck;
  const animsBefore = check ? new Set(document.getAnimations()) : null;
  const moving = animatedIn(root);
  const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.key ?? null;
  const viewChanged = !!root.dataset.view && root.dataset.view !== c.viewMode;
  const animate = viewChanged && !c.params.reducedMotion && !c.params.freeze;
  const before = animate ? FLIP_TARGETS.map((sel) => root.querySelector(sel)?.getBoundingClientRect() ?? null) : null;
  const journalEl = root.querySelector('.journal');
  const stick = journalEl ? journalEl.scrollTop + journalEl.clientHeight >= journalEl.scrollHeight - 20 : true;
  const prevScroll = journalEl?.scrollTop ?? 0;

  const { tree: next, ctx } = tracked(() => buildApp(c, hooks));
  Object.assign(ctx, moving);
  const ref = check ? buildApp(c, hooks) : null;
  // `replaceChildren` retirait l’élément focalisé : Chrome lui envoie alors `blur` (encore attaché,
  // avant le retrait), et ses écouteurs agissent sur l’état et le DOM en place. Même chose ici, au même
  // moment (après la construction du nouvel arbre) ; le focus est rendu plus bas, comme avant.
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== root && root.contains(active)) active.blur();
  // Passage A ↔ B : les variables CSS de la vue changent l’inclinaison et la taille des cartes posées.
  // Cartes et cases sont gardées, mais sans transition CSS pendant ce rendu (`view-switch`, retiré plus
  // bas après le calcul du style), exactement comme lorsqu’elles étaient recréées.
  if (viewChanged) root.classList.add('view-switch');
  root.classList.toggle('view-a', c.viewMode === 'A');
  root.classList.toggle('view-b', c.viewMode === 'B');
  root.classList.toggle('sequencing', c.sequencing);
  root.classList.toggle('drawer-open', c.ui.journalOpen);
  root.dataset.boardKey = boardKey(c);
  patchChildren(root, next, ctx);
  if (ref) {
    (window as unknown as Record<string, unknown>).__lqvRenderCheck = renderCheckStats;
    renderCheck.renders++;
    const d = domDifference(root, ref);
    if (d) {
      renderCheck.mismatches.push(`tour ${c.view.turn} ${c.view.phase} : ${d}`);
      console.error(`renderCheck : ${d}`);
    }
  }

  const j = root.querySelector('.journal');
  if (j) j.scrollTop = stick ? j.scrollHeight : prevScroll;
  if (viewChanged) {
    void root.offsetWidth; // style calculé ici, transitions coupées
    root.classList.remove('view-switch');
  }
  if (focusKey) (root.querySelector(`[data-key="${CSS.escape(focusKey)}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
  c.ui.flipPrimaries = false;
  root.dataset.view = c.viewMode;
  // FLIP : chaque rangée / la main part de son ancienne boîte et rejoint la nouvelle (0,45 s).
  if (before) {
    FLIP_TARGETS.forEach((sel, i) => {
      const old = before[i];
      const el = root.querySelector<HTMLElement>(sel);
      if (!old || !el) return;
      const now = el.getBoundingClientRect();
      if (now.width < 1 || now.height < 1) return;
      const k = old.height / now.height;
      el.animate([
        { transform: `translate(${old.left - now.left}px, ${old.top - now.top}px) scale(${k})`, transformOrigin: 'top left' },
        { transform: 'none', transformOrigin: 'top left' },
      ], { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
  }
  // QA : aucune transition CSS ne doit démarrer sur un élément gardé (le re-rendu complet n’en démarrait pas).
  if (animsBefore) {
    for (const a of document.getAnimations()) {
      const target = (a.effect as KeyframeEffect | null)?.target ?? null;
      if (animsBefore.has(a) || !(a instanceof CSSTransition) || !target || !root.contains(target)) continue;
      const d = `transition CSS ${a.transitionProperty} sur ${target.localName}.${target.getAttribute('class') ?? ''}`;
      renderCheck.mismatches.push(`tour ${c.view.turn} ${c.view.phase} : ${d}`);
      console.error(`renderCheck : ${d}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Bandeau de phase (haut-centre) et outils (haut-droite)

/** Frise compacte : numéro de tour, losanges d’étapes, nom de la phase courante (lisible, discret). */
function phasebar(c: Controller): HTMLElement {
  const phase = c.view.phase;
  const nowIdx = PHASES.findIndex((p) => p.match.includes(phase));
  return h('nav', { class: 'phasebar', 'aria-label': `Tour ${c.view.turn} — phase ${PHASES[nowIdx]?.label ?? phase}` },
    h('span', { class: 'turn-no' }, `Tour ${c.view.turn}`),
    PHASES.map((p, i) => h('span', { class: cls('step', i < nowIdx && 'done', i === nowIdx && 'now'), title: p.label, 'aria-current': i === nowIdx ? 'step' : null }, i === nowIdx ? p.label : '')),
  );
}

function tools(c: Controller, hooks: BoardHooks): HTMLElement {
  const pace = c.params.pace === 'normal' ? 'normal' : c.params.pace === 'fast' ? 'rapide' : 'instantané';
  return h('div', { class: 'tools', role: 'toolbar', 'aria-label': 'Outils' },
    hooks.product ? h('button', { class: 'tool tool-menu', 'data-key': 'tool-menu', title: 'Menu du duel : reprendre, options, aide, quitter (Échap pour fermer)', 'aria-haspopup': 'dialog', onclick: () => hooks.onToggleTool('menu') }, 'Menu') : null,
    h('button', { class: 'tool tool-view', 'data-key': 'tool-cam', 'aria-pressed': String(c.director.manual), title: 'Basculer entre la vue Rival (face au rival) et la vue Plateau (table inclinée) — touche V. La vue revient face au rival à la phase suivante.', onclick: () => hooks.onToggleTool('cam') }, c.viewMode === 'A' ? 'Vue plateau ⤓' : 'Voir le rival ⤒'),
    h('button', { class: 'tool', 'data-key': 'tool-journal', 'aria-pressed': String(c.ui.journalOpen), title: 'Journal du duel (texte intégral, public + vos informations privées)', onclick: () => hooks.onToggleTool('journal') }, 'Journal'),
    h('button', { class: 'tool', 'data-key': 'tool-pace', title: 'Rythme des animations (n’affecte pas les règles)', onclick: () => hooks.onToggleTool('pace') }, `Rythme : ${pace}`),
    h('button', { class: 'tool', 'data-key': 'tool-motion', 'aria-pressed': String(c.params.reducedMotion), title: 'Mouvement réduit', onclick: () => hooks.onToggleTool('motion') }, 'Mvt réduit'),
    h('button', { class: 'tool sq', 'data-key': 'tool-smaller', title: 'Réduire le texte', 'aria-label': 'Réduire le texte', onclick: () => hooks.onToggleTool('smaller') }, 'A−'),
    h('button', { class: 'tool sq', 'data-key': 'tool-bigger', title: 'Agrandir le texte', 'aria-label': 'Agrandir le texte', onclick: () => hooks.onToggleTool('bigger') }, 'A+'),
    h('button', { class: 'tool sq', 'data-key': 'tool-help', title: 'Aide', 'aria-label': 'Aide', onclick: () => hooks.onToggleTool('help') }, '?'),
  );
}

// ---------------------------------------------------------------------------
// Rival : bulle (humeur + réplique) — faits publics uniquement

function rivalBubble(c: Controller): HTMLElement {
  const e = c.rivalExpression;
  return fresh(h('aside', { class: 'rival-bubble', 'aria-live': 'polite', 'aria-label': `${c.rival.name}, ${c.rival.title}`, title: e ? `Réagit à : ${e.cause} (fait public)` : '' },
    h('div', { class: 'rb-name' }, h('b', null, c.rival.name), h('span', { class: 'rb-emblem', html: emblemSvg(c.rival.family, 16) }), h('span', { class: 'rb-title' }, c.rival.title)),
    h('div', { class: 'rb-mood', 'data-rival-caption': '' }, e ? moodLabel(e, c.rival) : ''),
    h('div', { class: 'rb-line', 'data-rival-line': '' }, e ? `« ${rivalLine(e, c.rival, c.config.seed)} »` : ''),
  ));
}

/** Mise à jour ciblée de la bulle (sans re-rendu global). */
export function patchRivalBubble(root: ParentNode, c: Controller): void {
  const e = c.rivalExpression;
  if (!e) return;
  const mood = root.querySelector('[data-rival-caption]');
  const line = root.querySelector('[data-rival-line]');
  if (mood) mood.textContent = moodLabel(e, c.rival);
  if (line) line.textContent = `« ${rivalLine(e, c.rival, c.config.seed)} »`;
  root.querySelector('.rival-bubble')?.setAttribute('title', `Réagit à : ${e.cause} (fait public)`);
}

// ---------------------------------------------------------------------------
// HUD compacts (même famille visuelle : rival haut-gauche, joueur bas-gauche)

/** Défausse listée au survol : celle du plateau MIS EN SCÈNE (comme les compteurs), carte camouflée non nommée. */
function discardTitle(c: Controller, who: 'me' | 'opp'): string {
  const s = who === 'me' ? c.boardView().me : c.boardView().opp;
  return s.discard.map((d) => (d ? cardTitle(cardDef(d)) : 'carte masquée (nommée en fin de tour)')).join(', ') || 'vide';
}

function hud(c: Controller, s: SideView, who: 'me' | 'opp'): HTMLElement {
  const v = c.view;
  const awaiting = who === 'me' ? v.awaitingMe : v.awaitingOpponent;
  const focus = c.currentBeat()?.focus ?? [];
  const counts = c.displayCounts(who);
  // sans Signature (deck d'aventure avant le premier chef, avenant M10-A) : ni emblème ni couleur de famille
  const fam: Family | null = s.signatureFamily;
  const status = who === 'opp'
    ? fresh(h('span', { class: cls('lockchip', s.locked && 'locked', awaiting && !s.locked && c.aiThinking && 'thinking') }, s.locked ? (v.phase === 'COMMIT' && v.reveal.signatures.opp ? 'Verrouillé · Signature annoncée' : 'Verrouillé (secret)') : awaiting ? (c.aiThinking ? 'Réfléchit' : 'En attente') : 'Rival'), awaiting && !s.locked && c.aiThinking)
    : null;
  const body = h('div', { class: 'hud-body' },
    h('div', { class: 'who' }, h('span', { class: 'name' }, who === 'me' ? 'Vous' : s.name), h('span', { class: 'fam-icon', html: fam ? emblemSvg(fam, 15) : '', title: fam ? `Signature ${fam}` : 'Sans Signature' })),
    hpEl(c, s, who),
    h('div', { class: 'insight', title: 'Insight (0 à 2)', 'aria-label': `Insight ${s.insight} sur 2` }, h('span', { class: 'lbl' }, 'Insight'), h('span', { class: cls('pip', s.insight >= 1 && 'on') }), h('span', { class: cls('pip', s.insight >= 2 && 'on') })),
    h('div', { class: 'counts' },
      h('span', null, 'Main ', h('b', null, String(counts.hand))),
      h('span', { class: 'sep', 'aria-hidden': 'true' }, '|'),
      h('span', null, 'Pioche ', h('b', null, String(counts.deck))),
      h('span', { class: 'sep', 'aria-hidden': 'true' }, '|'),
      h('span', { 'data-discard-list': who, title: discardTitle(c, who) }, 'Déf. ', h('b', { 'data-discard': who }, String(counts.discard))),
    ),
    who === 'opp' ? h('div', { class: 'hud-chips' }, status, oppTechChips(c, s)) : null,
  );
  return fresh(h('section', {
    class: cls('hud', who, `fam-${fam ?? 'neutre'}`, focus.includes(`${who}-hp`) && 'beat-hit', focus.includes(`${who}-insight`) && 'beat-insight'),
    'aria-label': who === 'me' ? 'Votre duelliste' : `Duelliste rival : ${s.name}`,
  },
  who === 'me' ? h('div', { class: 'portrait' }, h('img', { src: portraitUrl(playerFigure(c.mySignature), c.artSeed), alt: 'Votre portrait', draggable: 'false' })) : null,
  who === 'opp' ? h('div', { class: 'portrait mini' }, h('img', { src: portraitUrl(c.rival, c.artSeed), alt: `Portrait de ${s.name}`, draggable: 'false' })) : null,
  body,
  ), focus.includes(`${who}-hp`) || focus.includes(`${who}-insight`));
}

function hpEl(c: Controller, s: SideView, who: 'me' | 'opp'): HTMLElement {
  const hpShown = c.displayHp(who);
  const pct = Math.max(0, Math.min(100, (hpShown / s.maxHp) * 100));
  const floaters = c.ui.floaters.filter((f) => f.side === who).map((f) => h('span', { class: cls('floater', f.heal && 'heal'), 'data-floater': String(f.id), 'aria-hidden': 'true' }, f.text));
  return fresh(h('div', { class: 'hp' },
    h('div', { class: 'bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(s.maxHp), 'aria-valuenow': String(hpShown), 'aria-label': 'Points de vie' }, h('div', { class: 'fill', style: `width:${pct}%` })),
    h('div', { class: 'label' }, h('b', null, `${hpShown}`), ` / ${s.maxHp} PV`),
    ...floaters,
  ));
}

function oppTechChips(c: Controller, s: SideView): HTMLElement {
  return h('span', { class: 'opp-techs', title: 'Techniques équipées du rival (profil public)' },
    s.techniques.map((t) => h('span', { class: cls('tech', 'mini', s.techniqueUsed === t && 'used') }, `${t} (${TECHNIQUES[t].cost})`)));
}

/** Techniques du joueur : périphérie basse, sous les commandes (preview validée). */
function techChips(c: Controller): HTMLElement {
  const v = c.view;
  const s = v.me;
  return h('div', { class: 'techs', 'aria-label': 'Vos Techniques équipées' }, s.techniques.map((t) => {
    const def = TECHNIQUES[t];
    const used = s.techniqueUsed === t;
    let usable = false;
    let armed = false;
    let onclick: (() => void) | null = null;
    if (v.awaitingMe && c.canUseTech(t)) {
      if (v.phase === 'START' && (t === 'Sondage' || t === 'Recentrage')) { usable = true; armed = c.ui.startTech?.id === t || (t === 'Recentrage' && c.ui.recentrageArmed); onclick = () => c.toggleStartTech(t); }
      if (v.phase === 'TACTICS' && (t === 'Ancrage' || t === 'Rupture')) { usable = true; armed = c.ui.tacticsTech?.id === t || c.ui.techTargeting === t; onclick = () => c.toggleTacticsTech(t); }
    }
    return h('button', {
      class: cls('tech', usable && 'usable', armed && 'armed', used && 'used'), type: 'button', 'data-key': `tech-me-${t}`,
      title: `${t} — coût ${def.cost} Insight · ${def.timing}\n${def.text}`, 'aria-pressed': usable ? String(armed) : null, disabled: !usable,
      onclick,
    }, cardArtVersion() === 'v2' ? h('span', { class: 'seal', html: techniqueSeal(t, 16) }) : null, `${t} (${def.cost})`);
  }));
}

// ---------------------------------------------------------------------------
// Plateau : emplacements posés sur la table

/** État mis en scène du plateau : change quand les cartes quittent la table pendant la résolution. */
export function boardKey(c: Controller): string {
  return [c.primaryOnBoard(), c.reached('tactics'), c.cancelShown(), c.reached('destination')].join('|');
}

function board(c: Controller): HTMLElement {
  // M07 : nom de la phase en filigrane sur la ligne médiane de la table (repère « où en est le tour », à la
  // manière de Duel Links) ; décoratif, la frise de phase et les commandes portent l’information accessible.
  const phase = PHASES.find((p) => p.match.includes(c.view.phase))?.label ?? '';
  return h('main', { class: 'board', 'aria-label': 'Plateau de duel' },
    h('div', { class: 'phase-mark', 'aria-hidden': 'true' }, phase),
    sideRow(c, 'opp'), sideRow(c, 'me'));
}

function sideRow(c: Controller, who: 'me' | 'opp'): HTMLElement {
  const bv = c.boardView();
  const s = who === 'me' ? bv.me : bv.opp;
  const z0 = slotZone(c, who, 0, s.slots[0] ?? null);
  const z1 = slotZone(c, who, 1, s.slots[1] ?? null);
  return h('section', { class: cls('side', who), 'aria-label': who === 'me' ? 'Votre terrain' : 'Terrain adverse' },
    h('div', { class: 'row' }, z0, primaryZone(c, who), z1));
}

/** Coquille d’emplacement : sol en perspective (décor) + libellé ; la carte se pose dessus. Le libellé
 *  court (« S1 », comme la preview mobile) sert au petit écran paysage ; la case porte son propre nom
 *  accessible (aria-label). */
function zoneShell(classes: Array<string | false | null | undefined>, label: string, attrs: Record<string, unknown>): HTMLElement {
  return h('div', { class: cls('zone', ...classes), ...attrs },
    h('span', { class: 'zone-label', 'data-short': label.replace(/^Secondaire /, 'S') }, label),
    h('span', { class: 'zone-floor', 'aria-hidden': 'true' }),
  );
}

/** Avenant 08 : annonces déjà montrées (« tour:camp ») ; la lueur d’annonce ne joue qu’une fois par annonce. */
const announcedSeen = new Set<string>();

/** Avenant 08 : Signature annoncée dès son verrouillage, face visible, mode « ? » (secret jusqu’à la révélation). */
function announcedSignature(c: Controller, who: 'me' | 'opp', defId: string): HTMLElement[] {
  const key = `${c.view.seed}:${c.view.turn}:${who}`;
  const first = !announcedSeen.has(key);
  announcedSeen.add(key);
  const label = who === 'opp' ? 'Signature adverse annoncée, mode secret' : 'Votre Signature, annoncée au rival ; votre mode reste secret';
  return [
    cardEl(defId, { artSeed: c.artSeed, tag: 'div', banner: who === 'opp' ? 'SIGNATURE ANNONCÉE' : 'ANNONCÉE AU RIVAL', classes: ['on-board', 'sig-announced', first && 'sig-announce-in'], attrs: { tabindex: '0', 'data-key': `prim-${who}-annoncee`, 'aria-label': label, ...inspectHooks(c, defId, true) } }),
    h('span', { class: 'secret-stance', title: who === 'opp' ? 'Mode secret jusqu’à la révélation' : 'Votre mode, encore secret pour le rival' }, who === 'opp' ? 'Mode : ?' : 'Mode secret'),
  ];
}

function primaryZone(c: Controller, who: 'me' | 'opp'): HTMLElement {
  const v = c.view;
  const s = who === 'me' ? v.me : v.opp;
  const zone = zoneShell(['primary', c.currentBeat()?.focus.includes(`${who}-primary`) && 'beat-focus'], 'Primaire', { 'data-drop': who === 'me' ? 'primary' : null, 'data-focus-key': `${who}-primary` });
  const revealed = v.reveal.primaries?.[who];
  if (revealed) {
    // Après le Clash, les deux Primaires rejoignent la défausse (même la gagnante) : l’emplacement
    // se vide dès que la mise en scène les a nettoyées (ou si la séquence est terminée).
    const shown = c.primaryOnBoard();
    if (shown === 'card') {
      zone.append(fresh(cardEl(revealed.defId, { artSeed: c.artSeed, classes: [c.ui.flipPrimaries && 'flip-in', 'on-board'], tag: 'div', attrs: { tabindex: '0', 'data-key': `prim-${who}`, ...inspectHooks(c, revealed.defId, true) } }), c.ui.flipPrimaries));
      zone.append(stanceBanner(revealed.stance));
      // M12 (contrat 2, §4) : un effet de révélation en attente de sa condition (public : la Primaire est révélée)
      const def = cardDef(revealed.defId);
      if (def.effect && def.effect !== 'clairvoyance' && EFFECTS[def.effect].trigger === 'primary-reveal') {
        zone.classList.add('armed');
        zone.append(h('span', { class: 'armed-badge', 'data-key': `armed-${who}`, title: `${EFFECTS[def.effect].name} : ${EFFECT_SUMMARY[def.effect]}` }, h('span', { class: 'ab-ico', html: triggerIcon(triggerOf(def)!, 12) }), 'ARMÉ'));
      }
    } else if (shown === 'stage') {
      zone.classList.add('lifted');
      zone.append(h('span', { class: 'empty-hint' }, 'En Clash…'));
    } else {
      zone.classList.add('spent');
      zone.append(h('span', { class: 'empty-hint' }, 'Défaussée'));
    }
    return zone;
  }
  if (who === 'opp') {
    const annoncee = v.reveal.signatures.opp;
    if (annoncee) zone.append(...announcedSignature(c, 'opp', annoncee));
    else if (s.primary) zone.append(backEl(c.artSeed, { banner: 'SECRÈTE', label: 'Primaire adverse engagée, face cachée', classes: ['on-board'] }));
    else if (v.phase === 'COMMIT') zone.append(h('span', { class: 'empty-hint' }, 'Le rival engage…'));
    else if (v.phase === 'REVISION' && v.revision?.player === 'opp') zone.append(h('span', { class: 'empty-hint' }, 'Le rival réagit…'));
    return zone;
  }
  // Moi : brouillon (non verrouillé) ou engagement verrouillé (mon mode reste SECRET pour le rival).
  if (v.reveal.signatures.me && !v.me.primary?.card && !c.editingCommit()) {
    // Avenant 08 : verrouillée, annoncée au rival ; l’engagement ne s’applique qu’au verrouillage du rival.
    zone.append(...announcedSignature(c, 'me', v.reveal.signatures.me));
    return zone;
  }
  if (v.me.primary?.card) {
    const st = v.me.primary.stance!;
    zone.append(cardEl(v.me.primary.card.defId, { artSeed: c.artSeed, tag: 'div', banner: v.reveal.signatures.me ? 'ANNONCÉE AU RIVAL' : 'VERROUILLÉE', classes: ['on-board'], attrs: { tabindex: '0', 'data-key': 'prim-me-locked' } }));
    zone.append(h('span', { class: cls('secret-stance', st), title: 'Votre mode, encore secret pour le rival' }, h('span', { class: 'sb-icon', html: STANCE_ICON[st] }), st === 'assault' ? 'Assaut (secret)' : 'Garde (secret)'));
    if (v.phase === 'LECTURE_CHANGE' && v.awaitingMe) zone.append(stanceChips(c, c.ui.lectureStance));
    return zone;
  }
  const dr = c.ui.draft;
  const committing = c.editingCommit();
  if (committing) {
    zone.classList.toggle('legal', !!c.ui.selected);
    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');
    zone.dataset.key = 'zone-primary';
    zone.setAttribute('aria-label', dr.primaryId ? 'Primaire posée (cliquer pour la reprendre en main)' : 'Emplacement Primaire : poser une carte (obligatoire)');
    listen(zone, 'click', () => c.clickZone('primary'));
    listen(zone, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.clickZone('primary'); } });
  }
  if (dr.primaryId && committing) {
    const defId = c.defIdOf(dr.primaryId);
    zone.append(cardEl(defId, { artSeed: c.artSeed, state: 'draft', tag: 'div', banner: false, classes: ['on-board'], attrs: { 'data-drag-card': dr.primaryId, ...inspectHooks(c, defId, false) } }));
    // M07 : le mode se lit sur les puces ASSAUT / GARDE ; elles pulsent tant qu’il reste à choisir.
    zone.append(stanceChips(c, dr.stance, !dr.stance));
  } else if (committing) {
    // Pendant de « Facultative » sur les Secondaires ; une ligne, sous le libellé PRIMAIRE.
    zone.classList.add('next');
    zone.append(h('span', { class: 'empty-hint' }, 'Obligatoire'));
  }
  return zone;
}

function stanceChips(c: Controller, current: Stance | null, next = false): HTMLElement {
  const chip = (st: Stance, key: string, title: string) =>
    h('button', { class: cls('chip', st), type: 'button', 'data-key': key, 'aria-pressed': String(current === st), title, onclick: (e: Event) => { e.stopPropagation(); c.setStance(st); } },
      h('span', { class: 'sb-icon', html: STANCE_ICON[st] }), st === 'assault' ? 'ASSAUT' : 'GARDE');
  return h('div', { class: cls('stance', next && 'next'), role: 'group', 'aria-label': 'Mode de la Primaire' },
    chip('assault', 'stance-assault', 'Assaut (touche A) : inflige des dégâts si vous dominez'),
    chip('guard', 'stance-guard', 'Garde (touche G) : gagne les égalités ; dominée, absorbe la moitié de sa Puissance'),
  );
}

/** Inspection flottante (survol souris / focus clavier / appui long tactile) : mise à jour CIBLÉE. */
function inspect(c: Controller, defId: string | null): void {
  if (c.ui.inspect === defId) return;
  c.ui.inspect = defId;
  const el = document.querySelector('.inspector');
  if (el) el.replaceWith(inspector(c));
}

/** Rafraîchit l’inspection sans re-rendu global (fermeture au toucher suivant, main.ts). */
export function patchInspector(root: ParentNode, c: Controller): void {
  root.querySelector('.inspector')?.replaceWith(inspector(c));
}

/**
 * Déclencheurs d’inspection : survol par une VRAIE souris (pas les événements souris émulés après un
 * toucher) et focus CLAVIER (`:focus-visible`). Au tactile, seul l’appui long inspecte (drag.ts) :
 * un simple toucher ne fait jamais apparaître un panneau par-dessus les cibles.
 */
function inspectHooks(c: Controller, defId: string, focusable: boolean): Record<string, unknown> {
  const hooks: Record<string, unknown> = {
    onpointerenter: (e: PointerEvent) => { if (e.pointerType === 'mouse') inspect(c, defId); },
    onpointerleave: (e: PointerEvent) => { if (e.pointerType === 'mouse') inspect(c, null); },
  };
  if (focusable) {
    hooks.onfocus = (e: FocusEvent) => { if ((e.target as HTMLElement).matches(':focus-visible')) inspect(c, defId); };
    hooks.onblur = () => inspect(c, null);
  }
  return hooks;
}

function slotZone(c: Controller, who: 'me' | 'opp', slot: SlotIndex, s: SlotView | null): HTMLElement {
  const v = c.view;
  const key = who === 'me' ? (`slot${slot}` as const) : (`opp${slot}` as const);
  const bf = c.currentBeat()?.focus ?? [];
  const zone = zoneShell([(bf.includes(`${who}-slot-${slot}`) || bf.includes(`${who}-slots`)) && 'beat-focus'], `Secondaire ${slot + 1}`, { 'data-drop': who === 'me' ? key : null, 'data-focus-key': `${who}-slot-${slot}` });
  let interactive = false;

  // Brouillon de pose (moi, phase Engagement)
  const dr = c.ui.draft;
  const committing = who === 'me' && c.editingCommit();
  if (committing) {
    interactive = true;
    if (c.ui.selected) zone.classList.add(c.dropCheck(c.ui.selected, key as 'slot0') ? 'illegal' : 'legal');
  }
  const draftHere = committing && dr.secondaryId && dr.slot === slot;

  if (draftHere) {
    const defId = c.defIdOf(dr.secondaryId!);
    zone.append(cardEl(defId, { artSeed: c.artSeed, state: 'draft', tag: 'div', banner: s ? 'REMPLACE' : 'CACHÉE', classes: ['on-board'], attrs: { 'data-drag-card': dr.secondaryId, ...inspectHooks(c, defId, false) } }));
  } else if (s) {
    if (who === 'me' || s.card) {
      const defId = s.card!.defId;
      const state = s.masked && who === 'opp' ? 'masked' : s.state;
      const willReveal = who === 'me' && v.phase === 'PREPARE' && c.ui.reveal.includes(slot);
      const banner = who === 'me' && s.masked ? 'MASQUÉE' : willReveal ? 'À RÉVÉLER' : null;
      zone.append(cardEl(defId, { artSeed: c.artSeed, state, banner, tag: 'div', classes: ['on-board', willReveal && 'will-reveal', s.maskSource && 'mask-source'], attrs: { ...inspectHooks(c, defId, false) } }));
    } else {
      zone.append(backEl(c.artSeed, { state: s.masked ? 'masked' : s.state === 'active' ? 'masked' : s.state, classes: ['on-board'] }));
    }
  } else if (committing) zone.append(h('span', { class: 'empty-hint' }, 'Facultative'));

  // Interactions selon la phase
  if (who === 'me') {
    if (v.phase === 'PREPARE' && v.awaitingMe && s && s.state !== 'active') {
      interactive = true;
      // M07 : choix possible signalé (révéler une réserve cachée), sans obligation.
      if (s.state === 'hidden' && !c.ui.reveal.includes(slot)) {
        zone.classList.add('option');
        // M12 (contrat 2, §4) : une réserve dont l'effet joue à la révélation volontaire pulse et le dit
        const def = s.card ? cardDef(s.card.defId) : null;
        if (def?.effect && EFFECTS[def.effect].trigger === 'secondary-reveal') {
          zone.classList.add('reveal-effect');
          zone.append(h('span', { class: 'plan-badge reveal-hint', 'data-key': `reveal-hint-${slot}`, title: `${EFFECTS[def.effect].name} : ${EFFECT_SUMMARY[def.effect]}` }, h('span', { class: 'ab-ico', html: triggerIcon('secondary-reveal', 11) }), `RÉVÉLER : ${EFFECTS[def.effect].name}`));
        }
      }
    }
    if (v.phase === 'TACTICS' && v.awaitingMe && s) interactive = true;
    if (v.phase === 'TACTICS' && s?.state === 'active') {
      const plan = c.ui.plans[slot];
      if (v.awaitingMe && !plan && c.ui.menuSlot !== slot) zone.classList.add('option');
      if (v.awaitingMe && plan) zone.append(planBadge(plan.mode, plan.mode === 'interfere' ? `→ case ${plan.target! + 1}` : plan.mode === 'keep' ? '' : c.supportLabel(slot, plan.mode as 'rank' | 'damage'), false));
      // M12 : la pastille de déclenchement s'illumine quand le mode choisi est celui de son effet
      if (plan && s.card && triggerOf(cardDef(s.card.defId)) === MODE_TRIGGER[plan.mode]) zone.classList.add('trig-lit');
      if (c.ui.tacticsTech?.id === 'Ancrage' && c.ui.tacticsTech.slot === slot) zone.append(h('span', { class: 'plan-badge anchor' }, 'ANCRAGE'));
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
    if (v.phase === 'REPEL' && v.repel?.mine && s && !c.sequencing) { zone.classList.add(v.repel.choices.includes(slot) ? 'targetable' : 'illegal'); interactive = true; }
    if (v.phase === 'REPEL' && v.repel?.mine && c.sequencing && v.opp.slots[slot]) { zone.classList.add(v.repel.choices.includes(slot) ? 'targetable' : 'illegal'); interactive = true; }
  }

  // Tactiques révélées (publiques) après verrouillage commun ; ANNULÉ seulement une fois l’Interférence jouée.
  const revealed = v.reveal.tactics?.[who]?.[slot];
  if (revealed && (v.phase !== 'TACTICS' || !v.awaitingMe) && c.tacticShown(who, slot)) {
    const extra = revealed.mode === 'rank' ? (revealed.value !== null ? `+${revealed.value}` : '?') : revealed.mode === 'damage' ? (revealed.value !== null ? `×${revealed.value}` : '×?') : revealed.mode === 'interfere' ? `→ case ${(revealed.target ?? 0) + 1}` : '';
    const cancelled = c.cancelShown() && !!v.lastClash?.cancelled[who === 'me' ? v.viewer : (v.viewer === 'p1' ? 'p2' : 'p1')]?.includes(slot);
    zone.append(planBadge(revealed.mode, cancelled ? `${extra} · ANNULÉ` : extra, cancelled));
    if (cancelled) zone.classList.add('cancelled');
  }

  if (interactive) {
    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');
    zone.dataset.key = `zone-${who}-${slot}`;
    zone.setAttribute('aria-label', zoneAria(c, who, slot, s));
    listen(zone, 'click', (e) => { if ((e.target as HTMLElement).closest('.menu')) return; c.clickZone(key); });
    listen(zone, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !(e.target as HTMLElement).closest('.menu')) { e.preventDefault(); c.clickZone(key); } });
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

/** M12 : le mode tactique qui déclenche l'effet d'une Secondaire. */
const MODE_TRIGGER: Readonly<Record<string, string>> = { rank: 'use-rank', damage: 'use-damage', interfere: 'use-interfere' };

function tacticsMenu(c: Controller, slot: SlotIndex): HTMLElement {
  const cur = c.ui.plans[slot]?.mode ?? null;
  const card = c.view.me.slots[slot]?.card;
  const def = card ? cardDef(card.defId) : null;
  const trig = def ? triggerOf(def) : null;
  const item = (mode: 'keep' | 'rank' | 'damage' | 'interfere', label: string, hint: string) => {
    const blocked = c.modeBlocked(slot, mode);
    // M12 : le mode qui déclenche l'effet de la carte porte son icône et le nom de l'effet
    const fires = !!def?.effect && trig === MODE_TRIGGER[mode];
    return h('button', { type: 'button', class: fires ? 'fires' : null, 'data-key': `menu-${slot}-${mode}`, 'aria-pressed': String(cur === mode), disabled: !!blocked, title: blocked ?? (fires ? `${EFFECTS[def!.effect!].name} : ${EFFECT_SUMMARY[def!.effect!]}` : ''), onclick: (e: Event) => { e.stopPropagation(); c.choosePlan(slot, mode); } },
      h('span', null, label, fires ? h('em', { class: 'fires-tag' }, h('span', { class: 'ab-ico', html: triggerIcon(trig!, 11) }), EFFECTS[def!.effect!].name) : null), h('small', null, blocked ?? hint));
  };
  const menu = fresh(h('div', { class: cls('menu', slot === 0 ? 'left' : 'right'), role: 'menu', 'aria-label': `Action de la Secondaire ${slot + 1}` },
    h('div', { class: 'menu-title' }, 'Choix secret (révélé après verrouillage commun)'),
    item('keep', 'Conserver', 'reste active, non dépensée'),
    item('rank', 'Amplifier le Rang', c.supportLabel(slot, 'rank') + ' au score'),
    item('damage', 'Amplifier les dégâts', c.supportLabel(slot, 'damage') + ' au multiplicateur'),
    item('interfere', 'Interférer', 'puis choisir la cible adverse'),
  ));
  queueMicrotask(() => (menu.querySelector('button:not(:disabled)') as HTMLElement | null)?.focus());
  return menu;
}

// ---------------------------------------------------------------------------
// Commandes du tour (bas-droite) : phase, consigne, actions, Techniques

function command(c: Controller): HTMLElement {
  const v = c.view;
  const msg = fresh(h('div', { class: 'msg', role: 'status', 'aria-live': 'polite' }));
  const actions = h('div', { class: 'btn-row' });
  const title = (t: string) => h('span', { class: 'title' }, t);
  const sub = (t: string) => h('span', { class: 'sub' }, t);
  // M07 : `next` = l’action attendue maintenant (pulsation douce, coupée en mouvement réduit).
  const btn = (label: string, onclick: () => void, opts: { disabled?: boolean; ghost?: boolean; next?: boolean; key: string } = { key: '' }) =>
    h('button', { class: cls('btn', opts.ghost && 'ghost', opts.next && !opts.disabled && 'next'), type: 'button', 'data-key': opts.key, 'data-primary-action': opts.ghost ? null : 'true', disabled: !!opts.disabled, onclick }, label);
  let steps: HTMLElement | null = null;
  const nowIdx = PHASES.findIndex((p) => p.match.includes(v.phase));
  const head = (who: string) => h('div', { class: 'cmd-phase' }, h('span', { class: 'ph' }, PHASES[nowIdx]?.label ?? v.phase), h('span', { class: 'who' }, who));
  const waitOpp = () => { msg.append(title(c.aiThinking ? 'Le rival réfléchit…' : 'En attente du rival'), sub('Ses choix restent secrets jusqu’à la révélation simultanée.')); };

  const beat = c.currentBeat();
  if (beat && c.seq) {
    actions.append(btn('Passer ⏭', () => c.skipSequence(), { key: 'act-skip', ghost: true }));
    if (v.phase === 'RESOLVED') actions.append(btn('Tour suivant', () => c.nextTurn(), { key: 'act-next' }));
    if (v.phase === 'REPEL' && v.repel?.mine) actions.append(btn('Renoncer au Repoussement', () => c.skipRepel(), { key: 'act-repel-skip', ghost: true }));
    return h('section', { class: 'command seq', 'aria-label': 'Résolution du Clash' }, h('div', { class: 'cmd-phase' }, h('span', { class: 'ph' }, 'Résolution'), h('span', { class: 'who', 'data-beat-step': '' }, `${c.seq.index + 1} / ${c.seq.beats.length}`)), beatMsg(c), actions, techChips(c));
  }
  let who = v.awaitingMe ? '◆ À vous de jouer' : '';
  switch (v.phase) {
    case 'START':
      if (v.awaitingMe) {
        const excess = Math.max(0, v.me.handCount - 4);
        msg.append(title('Début du tour'), sub(excess ? `Main de ${v.me.handCount} cartes : cliquez ${excess} carte(s) à défausser pour revenir à 4.` : 'Techniques précoces (Sondage / Recentrage) facultatives, ci-dessous.'));
        if (c.ui.startTech) msg.append(sub(` · Technique armée : ${c.ui.startTech.id}`));
        actions.append(btn('Valider', () => c.lockStart(), { key: 'act-start', disabled: c.ui.trim.length !== excess, next: true }));
      } else waitOpp();
      break;
    case 'PREPARE':
      if (v.awaitingMe) {
        msg.append(title('Préparation'), sub('Cliquez vos réserves cachées à révéler (elles deviennent ACTIVES), ou gardez-les cachées.'));
        actions.append(btn(c.ui.reveal.length ? `Révéler (${c.ui.reveal.length}) et valider` : 'Garder cachées et valider', () => c.lockPrepare(), { key: 'act-prepare', next: true }));
      } else waitOpp();
      break;
    case 'DISSIPATION':
      if (v.awaitingMe) {
        msg.append(title('Dissipation (1 Insight)'), sub('Cliquez la Dissimulation adverse pour neutraliser son camouflage, ou passez.'));
        actions.append(btn('Dissiper', () => c.lockDissipation(true), { key: 'act-dissip', disabled: c.ui.dissipTarget === null, next: true }), btn('Passer', () => c.lockDissipation(false), { key: 'act-dissip-pass', ghost: true }));
      } else waitOpp();
      break;
    case 'COMMIT':
      if (v.awaitingMe) {
        const dr = c.ui.draft;
        const prim = dr.primaryId ? cardDef(c.defIdOf(dr.primaryId)) : null;
        msg.append(title('Engagement secret'));
        // M07 : une consigne, celle de l’étape en cours ; les étapes du tour sont listées dessous.
        if (!prim) msg.append(sub('Glissez une carte de votre main sur la case PRIMAIRE (ou cliquez la carte, puis la case).'));
        else if (!dr.stance) msg.append(sub(`${cardTitle(prim)} · choisissez ASSAUT (dégâts si vous dominez) ou GARDE (gagne les égalités ; dominée, réduit les dégâts).`));
        else msg.append(sub(`${cardTitle(prim)} en ${dr.stance === 'assault' ? `ASSAUT : ${prim.power} dégâts de base si vous dominez` : `GARDE : gagne les égalités ; dominée, absorbe jusqu’à ${guardHalf(prim.power)} (au moins 1 dégât passe)`}. Secondaire facultative, puis verrouillez.`));
        steps = stepList([
          { label: 'Primaire', icon: STEP_ICON.primary, done: !!prim },
          { label: 'Mode', icon: STEP_ICON.mode, done: !!dr.stance },
          { label: 'Secondaire', icon: STEP_ICON.secondary, done: !!dr.secondaryId, optional: true },
          { label: 'Verrouiller', icon: STEP_ICON.lock, done: false },
        ]);
        actions.append(btn('Verrouiller l’engagement', () => c.lockCommit(), { key: 'act-commit', disabled: !dr.primaryId || !dr.stance, next: true }));
      } else waitOpp();
      break;
    case 'REVISION':
      // Avenant 08, amendement 1 : une seule révision, définitive, après la Signature annoncée de l’adversaire.
      if (v.awaitingMe) {
        msg.append(title('Le rival a engagé sa Signature'), sub('Vous pouvez réviser votre engagement une fois : gardez-le, ou modifiez-le puis verrouillez. Ce choix est définitif.'));
        actions.append(
          btn('Garder mon engagement', () => c.keepRevision(), { key: 'act-revision-keep', next: true }),
          btn('Verrouiller la révision', () => c.lockCommit(), { key: 'act-revision', disabled: !c.ui.draft.primaryId || !c.ui.draft.stance, ghost: true }),
        );
      } else msg.append(title('Le rival réagit à votre Signature…'), sub('Il peut garder ou réviser son engagement, une seule fois ; son choix reste secret jusqu’à la révélation.'));
      break;
    case 'LECTURE':
      if (v.awaitingMe) {
        msg.append(title('Lecture (2 Insight)'), sub('Observer le mode initial adverse, puis éventuellement changer le vôtre.'));
        actions.append(btn('Utiliser Lecture', () => c.lecture(true), { key: 'act-lecture' }), btn('Passer', () => c.lecture(false), { key: 'act-lecture-pass', ghost: true }));
      } else waitOpp();
      break;
    case 'LECTURE_CHANGE':
      if (v.awaitingMe) {
        msg.append(title(`Lecture : le rival a engagé en ${v.lectureSeen === 'assault' ? 'ASSAUT' : 'GARDE'}`), sub('Mode initial (information autorisée). Changez éventuellement le vôtre, puis validez.'));
        actions.append(btn('Valider le mode', () => c.lockLectureStance(), { key: 'act-lecture-stance', next: true }));
      } else waitOpp();
      break;
    case 'TACTICS':
      if (v.awaitingMe) {
        const p = c.preview();
        msg.append(title('Choix tactiques secrets'));
        if (!p) msg.append(sub('Cliquez une Secondaire active pour choisir son action (Rang, Dégâts, Interférer). Sans choix : Conserver.'));
        if (p) msg.append(h('span', { class: 'result' }, `Provisoire : ${p.myScore} contre ${p.oppScore} · ×${p.myMult} · ${p.outcome}${p.dealt || p.taken ? ` · ${p.dealt} / ${p.taken}` : ''}`), sub(' (hypothèse : le rival conserve).'));
        if (c.ui.targetingFor !== null) msg.append(sub(' · Ciblage d’Interférence (Échap pour annuler).'));
        actions.append(btn('Verrouiller les choix', () => c.lockTactics(), { key: 'act-tactics', disabled: c.ui.techTargeting !== null, next: c.ui.targetingFor === null && c.ui.menuSlot === null }));
      } else waitOpp();
      break;
    case 'REPEL':
      if (v.repel?.mine) {
        msg.append(title(`Repoussement (${v.repel.kind === 'emprise' ? 'Emprise' : v.repel.kind === 'flamme' ? 'Flamme conquérante' : v.repel.kind === 'rupture' ? 'Rupture' : 'Garde victorieuse'})`), sub('Cliquez une Secondaire adverse surlignée pour la renvoyer.'));
        actions.append(btn('Renoncer', () => c.skipRepel(), { key: 'act-repel-skip', ghost: true }));
      } else { msg.append(title('Le rival choisit un Repoussement'), sub('Aucune réaction possible.')); who = ''; }
      break;
    case 'RESOLVED':
    case 'ENDED': {
      const r = v.lastClash;
      who = '';
      if (r) {
        msg.append(title(`Clash du tour ${r.turn}`), h('span', { class: cls('result', r.zeroDamageRankWin && 'zero') }, verdictText(r, 'p1')),
          sub(` PV perdus : vous ${r.damage.p1}, rival ${r.damage.p2}. Primaires défaussées.`));
      } else msg.append(title('Tour résolu'));
      if (v.overtime && v.phase === 'RESOLVED' && v.me.hp === 1 && v.opp.hp === 1) msg.append(sub(` · PROLONGATION ${v.overtime} : 1 PV chacun.`));
      if (v.phase === 'RESOLVED') actions.append(btn('Tour suivant', () => c.nextTurn(), { key: 'act-next', next: true }));
      break;
    }
  }
  return h('section', { class: cls('command', steps && 'has-steps'), 'aria-label': 'Commandes du tour' }, head(who), msg, steps, actions, techChips(c));
}

/**
 * M07 — étapes du tour en pastilles : faite (✓), en cours (dorée), facultative (atténuée). L’étape en cours
 * est la première étape obligatoire non faite ; une fois les obligatoires faites, c’est la dernière (valider).
 */
function stepList(steps: Array<{ label: string; icon: string; done: boolean; optional?: boolean }>): HTMLElement {
  const required = steps.filter((s) => !s.optional);
  const current = required.find((s) => !s.done) ?? required[required.length - 1];
  return h('ol', { class: 'steps', 'aria-label': 'Étapes de l’engagement' }, steps.map((s) =>
    h('li', { class: cls('step', s.done && 'done', s === current && 'current', s.optional && 'optional'), 'aria-current': s === current ? 'step' : null, title: s.optional ? `${s.label} (facultatif)` : s.label },
      h('span', { class: 'step-icon', 'aria-hidden': 'true', html: s.done ? STEP_ICON.done : s.icon }), h('span', { class: 'step-label' }, s.label))));
}

/** Pictogrammes des étapes (SVG par code, `currentColor`). */
const STEP_ICON = {
  primary: '<svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7l3 5-3 5-3-5z" fill="currentColor"/></svg>',
  mode: '<svg viewBox="0 0 24 24"><path d="M3 4.5l7.5 7.5-2 2L1 6.5zM10.5 12l2 2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M15.5 9l6 2.2v4.2c0 3.6-2.5 6.3-6 7.6-3.5-1.3-6-4-6-7.6v-4.2z" fill="currentColor"/></svg>',
  secondary: '<svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="11" rx="2" fill="currentColor"/><path d="M8 10.5V7.5a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  done: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function beatMsg(c: Controller): HTMLElement {
  const beat = c.currentBeat()!;
  return fresh(h('div', { class: cls('msg', 'beat', `tone-${beat.tone}`), role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'beat-title' }, beat.title),
    h('span', { class: 'beat-detail' }, beat.detail),
  ));
}

/**
 * Mise à jour CIBLÉE d’un temps de résolution : message, PV, compteurs, surbrillances, journal.
 * Les boutons (Passer, Tour suivant, cibles) ne sont PAS recréés : aucun clic ne peut être perdu.
 */
export function patchBeat(root: HTMLElement, c: Controller): void {
  const beat = c.currentBeat();
  const msg = root.querySelector('.command .msg');
  if (!beat || !msg || !msg.classList.contains('beat')) { return; }
  msg.replaceWith(beatMsg(c));
  const step = root.querySelector('[data-beat-step]');
  if (step && c.seq) step.textContent = `${c.seq.index + 1} / ${c.seq.beats.length}`;
  for (const who of ['me', 'opp'] as const) {
    const side = who === 'me' ? c.view.me : c.view.opp;
    root.querySelector(`.hud.${who} .hp`)?.replaceWith(hpEl(c, side, who));
    const d = root.querySelector(`[data-discard="${who}"]`);
    if (d) d.textContent = String(c.displayCounts(who).discard);
    root.querySelector(`[data-discard-list="${who}"]`)?.setAttribute('title', discardTitle(c, who));
    const hudEl = root.querySelector(`.hud.${who}`);
    hudEl?.classList.toggle('beat-hit', beat.focus.includes(`${who}-hp`));
    hudEl?.classList.toggle('beat-insight', beat.focus.includes(`${who}-insight`));
  }
  // Plateau re-rendu seulement quand son état mis en scène change (Primaires → scène → défausse,
  // Secondaires engagées → destinations) ; jamais sous un pointeur enfoncé (différé par main.ts).
  const key = boardKey(c);
  if (root.dataset.boardKey !== key) {
    root.querySelector('.board')?.replaceWith(board(c));
    root.dataset.boardKey = key;
  }
  root.querySelectorAll<HTMLElement>('[data-focus-key]').forEach((z) => {
    const k = z.dataset.focusKey!;
    const group = k.replace(/-slot-\d$/, '-slots');
    z.classList.toggle('beat-focus', beat.focus.includes(k) || (group !== k && beat.focus.includes(group)));
  });
  const j = root.querySelector('.journal');
  if (j) {
    const next = journal(c);
    j.replaceWith(next);
    next.scrollTop = next.scrollHeight;
  }
}

// ---------------------------------------------------------------------------
// Main (bas-centre)

function hand(c: Controller): HTMLElement {
  const v = c.view;
  const dr = c.ui.draft;
  // Engagement verrouillé en attente du rival (avenant 08 : la Signature annoncée est déjà sur le plateau) : les cartes engagées
  // ne reviennent pas dans la main.
  const cards = (v.me.hand ?? []).filter((x) => !((v.phase === 'COMMIT' || v.phase === 'REVISION') && (v.awaitingMe || v.me.locked || v.revision?.player === 'opp') && (x.cardId === dr.primaryId || x.cardId === dr.secondaryId)));
  const wrap = h('section', { class: 'hand', 'aria-label': 'Votre main', 'data-drop': 'hand', style: `--n:${Math.max(4, cards.length)}` });
  if (!cards.length) wrap.append(h('span', { class: 'hand-empty' }, (v.me.hand ?? []).length ? 'Cartes posées (non verrouillées)' : 'Main vide'));
  cards.forEach((x, i) => {
    const el = cardEl(x.defId, {
      artSeed: c.artSeed,
      classes: ['hand-card', c.ui.selected === x.cardId && 'selected', c.ui.trim.includes(x.cardId) && 'trim-mark'],
      attrs: { 'data-drag-card': x.cardId, 'data-key': `hand-${x.cardId}`, 'aria-pressed': String(c.ui.selected === x.cardId), 'aria-keyshortcuts': String(i + 1), ...inspectHooks(c, x.defId, true) },
    });
    if (c.ui.startTech?.id === 'Recentrage' && c.ui.startTech.cardId === x.cardId) el.append(h('span', { class: 'state-banner' }, 'RECENTRAGE'));
    wrap.append(el);
  });
  if (c.editingCommit() && c.ui.selected && cards.some((x) => x.cardId === c.ui.selected)) wrap.append(placeBar(c, c.ui.selected));
  return wrap;
}

/**
 * M07 — actions de la carte choisie, posées SUR elle (comme « Invoquer / Poser » de Duel Links) : Primaire en
 * ASSAUT ou en GARDE, ou Secondaire (face cachée). Une colonne sur le haut de la carte, qui laisse voir son Rang
 * et sa Puissance et ne recouvre jamais les cases du plateau ; un pictogramme et un mot par bouton, le détail
 * dans l’infobulle et le nom accessible.
 */
function placeBar(c: Controller, cardId: string): HTMLElement {
  const sig = cardDef(c.defIdOf(cardId)).signature;
  const b = (key: string, cl: string, icon: string, label: string, title: string, onclick: () => void, disabled = false) =>
    h('button', { class: cls('place', cl), type: 'button', 'data-key': key, title, 'aria-label': title, disabled, onclick: (e: Event) => { e.stopPropagation(); onclick(); } },
      h('span', { class: 'place-icon', 'aria-hidden': 'true', html: icon }), h('span', { class: 'place-label', 'aria-hidden': 'true' }, label));
  return h('div', { class: 'place-bar', role: 'group', 'aria-label': 'Poser la carte choisie' },
    b('place-assault', 'assault', STANCE_ICON.assault, 'ASSAUT', 'Primaire en ASSAUT : inflige sa Puissance si vous dominez au Rang', () => c.placeSelected('assault')),
    b('place-guard', 'guard', STANCE_ICON.guard, 'GARDE', 'Primaire en GARDE : gagne les égalités ; dominée, absorbe la moitié de sa Puissance', () => c.placeSelected('guard')),
    b('place-secondary', 'hidden', STEP_ICON.secondary, 'SECONDAIRE', sig ? 'Une Signature ne peut être que Primaire' : 'Secondaire, posée face cachée (en chargement ce tour)', () => c.placeSelected('secondary'), sig),
  );
}

// ---------------------------------------------------------------------------
// Inspection flottante et tiroir du journal

function inspector(c: Controller): HTMLElement {
  const id = c.ui.inspect;
  if (!id) return h('section', { class: 'inspector', 'aria-hidden': 'true' });
  const def = cardDef(id);
  const fr = RARITY_FRAME[def.rarity];
  return h('section', { class: 'inspector show', style: `--fb:${fr.b}`, 'aria-label': `Inspection : ${cardTitle(def)}` },
    cardEl(id, { artSeed: c.artSeed, tag: 'div' }),
    h('div', { class: 'insp-text' },
      h('h3', null, cardTitle(def)),
      h('div', { class: 'meta' }, def.family ? `${def.family} ${emblemText(def.family)} · ${fr.label} · ${FAMILY_THEME[def.family]}` : 'Neutre · sans famille, sans effet, jamais d’affinité (carte grise de la populace)'),
      h('div', { class: 'stats-line' }, 'Rang ', h('b', null, def.signature ? '∞ (priorité absolue)' : `${rankLabel(def)} (${def.rank})`), ' · Puissance ', h('b', null, String(def.power))),
      // M12 (contrat 1) : quand l'effet joue (icône), son résumé, puis le texte canonique et les mots-clés expliqués
      def.effect && cardArtVersion() === 'v2' ? h('div', { class: 'insp-trig' }, h('span', { class: 'trig-ico', html: triggerIcon(triggerOf(def)!, 16) }), TRIGGER_LABEL[EFFECTS[def.effect].trigger]) : null,
      def.effect && cardArtVersion() === 'v2' ? h('div', { class: 'insp-sum' }, EFFECT_SUMMARY[def.effect]) : null,
      def.effect ? h('div', { class: 'eff' }, h('em', null, EFFECTS[def.effect].name), ` — ${EFFECTS[def.effect].role}. ${EFFECTS[def.effect].text}`) : h('div', { class: 'eff' }, 'Basic : aucun effet individuel. Primaire Assaut/Garde ; Secondaire Rang, Dégâts, Interférer, Conserver.'),
      def.effect && cardArtVersion() === 'v2' ? h('dl', { class: 'insp-kw' }, ...keywordsIn(EFFECTS[def.effect].text).flatMap((k) => [h('dt', null, k.mot), h('dd', null, k.texte)])) : null,
      def.signature ? h('div', { class: 'eff' }, 'Signature : uniquement Primaire. ∞ domine tout score ordinaire ; Puissance finie, réduite par une Garde dominée.') : null,
    ),
  );
}

function emblemText(f: string): string {
  return { Cendre: '◆', Voile: '◈', Ronce: '✿', Astre: '✦' }[f] ?? '';
}

function drawer(c: Controller, hooks: BoardHooks): HTMLElement {
  return h('aside', { class: cls('drawer', c.ui.journalOpen && 'open'), 'aria-label': 'Journal du duel', 'aria-hidden': c.ui.journalOpen ? null : 'true' },
    h('div', { class: 'drawer-head' }, h('b', null, 'Journal'), h('span', { class: 'sub' }, 'public + vos informations privées'),
      h('button', { class: 'tool sq', type: 'button', 'data-key': 'drawer-close', 'aria-label': 'Fermer le journal', onclick: () => hooks.onToggleTool('journal') }, '✕')),
    journal(c));
}

function journal(c: Controller): HTMLElement {
  // Regroupement par tour : tour courant ouvert, tours précédents repliés (résumé = verdict du Clash).
  const byTurn = new Map<number, typeof c.journal>();
  for (const l of c.journal) {
    if (!byTurn.has(l.turn)) byTurn.set(l.turn, []);
    byTurn.get(l.turn)!.push(l);
  }
  const turns = [...byTurn.keys()].sort((a, b) => a - b);
  const last = turns[turns.length - 1];
  return h('section', { class: 'journal', 'aria-label': 'Journal du duel', 'aria-live': 'off', tabindex: '0' },
    turns.map((t) => {
      const lines = byTurn.get(t)!.filter((l) => l.tone !== 'system' || !/^— TOUR/.test(l.text));
      const clash = lines.find((l) => l.tone === 'clash' && /^CLASH/.test(l.text));
      const summary = clash ? clash.text.replace(/^CLASH — Scores : /, '').slice(0, 90) : `${lines.length} évènement(s)`;
      return h('details', { class: 'turn', open: t === last ? true : null },
        h('summary', null, h('b', null, `Tour ${t}`), h('span', { class: 'turn-sum' }, ` — ${summary}`)),
        lines.map((l) => h('div', { class: cls('line', l.tone) }, l.text)));
    }));
}

function tipBox(c: Controller, hooks: BoardHooks): HTMLElement | null {
  const t = c.sequencing ? null : hooks.tip?.();
  if (!t) return null;
  return h('aside', { class: 'tip', role: 'note', 'aria-label': `Conseil : ${t.title}`, 'data-tip': t.id },
    h('b', { class: 'tip-title' }, t.title),
    h('span', { class: 'tip-text' }, t.text),
    h('button', { class: 'tool tip-ok', type: 'button', 'data-key': 'tip-ok', onclick: () => hooks.onToggleTool(`tip:${t.id}`) }, 'Compris'));
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
