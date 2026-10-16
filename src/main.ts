import './styles.css';
import { CATALOG, FAMILIES, SIGNATURES, type Family } from './game/catalog/cards';
import { TECHNIQUE_IDS, TECHNIQUES, type TechniqueId } from './game/catalog/techniques';
import type { GameConfig } from './game/model/types';
import { artCacheSize } from './art/cardArt';
import { Controller } from './app/controller';
import { readParams, type AppParams } from './app/params';
import { SCENARIOS } from './app/scenarios';
import { renderApp } from './presentation/board';
import { backEl, cardEl } from './presentation/cardView';
import { cls, h } from './presentation/dom';
import { DragManager } from './presentation/drag';
import { createArena, type ArenaHandle, type Rect } from './scene/arena';
import { viewFor } from './game/visibility/view';
import { PERSONALITIES, personalityFor, type RivalPersonality } from './presentation/personalities';

const params = readParams();
const app = document.getElementById('app')!;
const arenaHost = document.getElementById('arena')!;
document.documentElement.style.setProperty('--ui-scale', String(params.scale));
document.documentElement.classList.toggle('reduced', params.reducedMotion);
document.documentElement.classList.toggle('freeze', params.freeze);

let arena: ArenaHandle | null = null;
let arenaFor: string | null = null;

/** Crée (ou recrée) l’arène pour une personnalité de rival donnée. */
function ensureArena(p: RivalPersonality): ArenaHandle | null {
  if (arena && arenaFor === p.id) return arena;
  arena?.dispose();
  try {
    arena = createArena(arenaHost, { artSeed: params.artSeed, view: params.view === 'B' ? 'B' : 'A', reducedMotion: params.reducedMotion, freeze: params.freeze, personality: p });
  } catch (err) {
    console.warn('Three.js indisponible, repli CSS', err);
    arena = null;
  }
  arenaFor = p.id;
  arenaHost.classList.toggle('no-webgl', !arena);
  return arena;
}

/** Rival dérivé de la seed gameplay (déterministe) : personnalité, Signature et Techniques cohérentes. */
function rivalFor(seed: number): RivalPersonality {
  return personalityFor(seed, params.rival);
}

function makeConfig(p: AppParams, sig: Family, techs: TechniqueId[]): GameConfig {
  const rival = rivalFor(p.seed);
  return {
    seed: p.seed,
    players: {
      p1: { name: 'Vous', hp: p.hp, signature: sig, variants: 'all', techniques: techs },
      p2: { name: rival.name, hp: p.hp, signature: rival.family, variants: 'all', techniques: rival.techniques },
    },
  };
}

function start(config: GameConfig, scenarioId: string | null): void {
  const scenario = scenarioId ? SCENARIOS[scenarioId] ?? null : null;
  const cfg = scenario ? scenario.config : config;
  // Démonstration : apparence cohérente avec la Signature scriptée du rival.
  const personality = scenario
    ? PERSONALITIES.find((x) => x.family === cfg.players.p2.signature) ?? rivalFor(params.seed)
    : rivalFor(params.seed);
  if (scenario) cfg.players.p2.name = personality.name;
  ensureArena(personality);
  const c = new Controller(cfg, params, arena, scenario, personality);
  let drag: DragManager | null = null;
  // Aucun re-rendu pendant qu’un pointeur est enfoncé (glisser OU clic en cours) : un rendu
  // asynchrone (verrouillage de l’IA) ne doit jamais avaler une interaction humaine.
  let pointerHeld = false;
  let pendingRender = false;
  const render = () => {
    if (drag?.dragging || pointerHeld) { pendingRender = true; return; }
    pendingRender = false;
    renderApp(app, c, { onToggleTool: tool });
    syncRects();
  };
  /** Rectangles DOM → arène : bande où cadrer le rival (vue A) et portrait vivant (vue B). */
  const rectOf = (sel: string): Rect | null => {
    const el = app.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null;
  };
  const syncRects = () => {
    arena?.setStage(rectOf('.stage-window'));
    arena?.setBoard(rectOf('.board'));
    arena?.setPortrait(c.viewMode === 'B' ? rectOf('.rival-portrait .portrait-window') : null);
  };
  window.addEventListener('resize', () => syncRects());
  app.addEventListener('pointerdown', () => { pointerHeld = true; }, true);
  const release = () => { pointerHeld = false; if (pendingRender) window.setTimeout(render, 0); };
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  const tool = (t: string) => {
    if (t === 'smaller' || t === 'bigger') {
      params.scale = Math.min(1.5, Math.max(0.8, params.scale + (t === 'bigger' ? 0.1 : -0.1)));
      document.documentElement.style.setProperty('--ui-scale', params.scale.toFixed(2));
    }
    if (t === 'motion') {
      params.reducedMotion = !params.reducedMotion;
      document.documentElement.classList.toggle('reduced', params.reducedMotion);
      arena?.setReducedMotion(params.reducedMotion);
    }
    if (t === 'cam') return c.toggleView();
    if (t === 'pace') params.pace = params.pace === 'normal' ? 'fast' : params.pace === 'fast' ? 'instant' : 'normal';
    if (t === 'journal') c.ui.journalOpen = !c.ui.journalOpen;
    if (t === 'help') return showHelp();
    render();
  };
  c.onRender(render);
  drag = new DragManager(app, c, render);
  // Clavier sur cartes de main (Entrée/Espace déclenchent un clic natif sans pointeur).
  app.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.hand [data-drag-card]');
    if (el && e.detail === 0) c.clickHandCard(el.dataset.dragCard!);
  });
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { c.cancel(); return; }
    if (k === 'v' && !e.ctrlKey && !e.metaKey) { c.toggleView(); return; }
    if (k === 'a' && !e.ctrlKey && !e.metaKey) c.setStance('assault');
    else if (k === 'g' && !e.ctrlKey && !e.metaKey) c.setStance('guard');
    else if (/^[1-6]$/.test(k)) {
      const id = c.handIds()[Number(k) - 1];
      if (id) { c.clickHandCard(id); (app.querySelector(`[data-key="hand-${CSS.escape(id)}"]`) as HTMLElement | null)?.focus(); }
    } else if (k === 'n' || (k === 'enter' && !(document.activeElement instanceof HTMLButtonElement) && !(document.activeElement as HTMLElement | null)?.getAttribute('role'))) {
      (app.querySelector('[data-primary-action]:not(:disabled)') as HTMLButtonElement | null)?.click();
    }
  });
  render();
  if (params.qa) {
    // Crochet QA explicite (?qa=1) : pilotage déterministe des captures. Jamais actif par défaut.
    (window as unknown as Record<string, unknown>).__lqv = {
      controller: c,
      view: () => viewFor(c.match.state, 'p1'),
      state: () => c.match.state,
      apply: (cmd: Parameters<Controller['apply']>[0]) => c.apply(cmd),
      hash: () => c.match.hash(),
      record: () => c.match.record(),
      arenaStats: () => arena?.stats() ?? null,
      presentation: () => ({ view: c.viewMode, switches: c.director.switches, manual: c.director.manual, rival: c.rivalExpression, personality: c.rival.id }),
      artCache: () => artCacheSize(),
    };
  }
}

function showHelp(): void {
  const o = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', onclick: (e: Event) => { if (e.target === o) o.remove(); } },
    h('div', { class: 'dialog' },
      h('h2', null, 'Comment jouer'),
      h('p', null, '1. Début de tour : la main se complète à 4. 2. Préparation : cliquez vos Secondaires cachées pour les révéler (elles deviennent ACTIVES). 3. Engagement : glissez (ou cliquez puis cliquez la case) une carte sur la Primaire et choisissez ASSAUT ou GARDE ; une nouvelle Secondaire facultative se pose face cachée en CHARGEMENT. 4. Les Primaires sont révélées simultanément. 5. Cliquez vos Secondaires ACTIVES pour choisir en secret : Conserver, Rang, Dégâts (Assaut) ou Interférer (puis cible). 6. Résolution : Rang = priorité ; Puissance = dégâts et absorption.'),
      h('p', null, 'Clavier : Tab pour naviguer, Entrée/Espace pour sélectionner et poser, 1-4 cartes de main, A/G mode, Échap annuler, N action principale. Tactile : glisser, ou toucher puis toucher la case ; appui long = inspection.'),
      h('p', null, 'Règlement : V3.0 + avenant mandaté V3.2 (+1 d’affinité de famille en Amplifier le Rang). Mise en scène, caméra et palette sont PROVISOIRES.'),
      h('button', { class: 'btn', type: 'button', onclick: () => o.remove() }, 'Fermer'),
    ));
  document.body.append(o);
}

function setupScreen(): void {
  ensureArena(rivalFor(params.seed));
  let sig: Family = params.sig ?? 'Cendre';
  let techs: TechniqueId[] = params.techs ?? ['Lecture', 'Ancrage'];
  const rival = rivalFor(params.seed);
  const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Préparer le duel' });
  const draw = () => {
    overlay.replaceChildren(h('div', { class: 'dialog' },
      h('h1', null, 'Les Quatre Voies — Duel'),
      h('p', null, `Deck standard : 16 identités (une variante par identité, catalogue initial) + 1 Signature ∞. PV ${params.hp} chacun · seed gameplay ${params.seed} · seed art ${params.artSeed}. Rival : ${rival.name}, ${rival.title} — Signature ${rival.family}, Techniques ${rival.techniques.join(' + ')}.`),
      h('h2', { style: 'font-size:1rem' }, 'Votre Signature'),
      h('div', { class: 'pick-row', role: 'group' }, FAMILIES.map((f) => h('button', { class: 'pick', type: 'button', 'aria-pressed': String(sig === f), 'data-key': `sig-${f}`, onclick: () => { sig = f; draw(); } },
        cardEl(`sig-${f}`, { artSeed: params.artSeed, tag: 'div' }), `${SIGNATURES[f].name} · P${SIGNATURES[f].power}`))),
      h('h2', { style: 'font-size:1rem' }, 'Deux Techniques équipées'),
      h('div', { class: 'pick-row', role: 'group' }, TECHNIQUE_IDS.map((t) => h('button', {
        class: cls('tech-pick'), type: 'button', 'aria-pressed': String(techs.includes(t)), 'data-key': `tech-${t}`,
        onclick: () => { techs = techs.includes(t) ? techs.filter((x) => x !== t) : [...techs, t].slice(-2); draw(); },
      }, h('b', null, `${t} · ${TECHNIQUES[t].cost} Insight`), h('small', null, `${TECHNIQUES[t].timing}. ${TECHNIQUES[t].text}`)))),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', 'data-key': 'start-duel', disabled: techs.length !== 2, onclick: () => { overlay.remove(); start(makeConfig(params, sig, techs), null); } }, 'Commencer le duel'),
        ...Object.values(SCENARIOS).map((s) => h('button', { class: 'btn ghost', type: 'button', title: s.description, onclick: () => { overlay.remove(); start(makeConfig(params, sig, techs), s.id); } }, `Démo : ${s.title}`)),
      ),
    ));
  };
  draw();
  document.body.append(overlay);
}

/** Galerie de revue art (?gallery=1) : toutes les définitions + verso, générées par code. */
function gallery(): void {
  arenaHost.style.display = 'none';
  document.body.style.overflow = 'auto';
  app.style.position = 'static';
  app.style.display = 'block';
  const ids = Object.keys(CATALOG);
  const t0 = performance.now();
  app.replaceChildren(h('div', { style: 'padding:16px' },
    h('h1', { class: 'serif', style: 'color:#ffe7b0;margin:0 0 8px' }, `Galerie procédurale — artSeed ${params.artSeed}`),
    h('p', { style: 'color:#b9ae9c;margin:0 0 12px;font-size:13px' }, `${ids.length} définitions (16 Basic, 16 variantes, 4 Signatures) + verso commun. 100 % Canvas 2D / SVG générés, aucune image téléchargée.`),
    h('div', { style: 'display:flex;flex-wrap:wrap;gap:10px;--card-w:112px' },
      ...ids.map((id) => cardEl(id, { artSeed: params.artSeed, tag: 'div' })),
      backEl(params.artSeed),
    )));
  // Mesure de génération (perf) : 36 illustrations + verso, Canvas 2D → PNG.
  (window as unknown as Record<string, unknown>).__artGenMs = Math.round((performance.now() - t0) * 10) / 10;
}

if (params.gallery) gallery();
else if (params.autostart) start(makeConfig(params, params.sig ?? 'Cendre', params.techs ?? ['Lecture', 'Ancrage']), params.scenario);
else setupScreen();
