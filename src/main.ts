import './styles.css';
import { CATALOG, FAMILIES, SIGNATURES, type Family } from './game/catalog/cards';
import { TECHNIQUE_IDS, TECHNIQUES, type TechniqueId } from './game/catalog/techniques';
import type { GameConfig } from './game/model/types';
import { readParams, type AppParams } from './app/params';
import { SCENARIOS } from './app/scenarios';
import { backEl, cardEl } from './presentation/cardView';
import { cls, h } from './presentation/dom';
import { createArena, type ArenaHandle } from './scene/arena';
import { DuelSession } from './app/duelSession';
import { Shell } from './shell/shell';
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
  // Une seule scène pour toute la session : le rival change, le contexte WebGL reste (M04).
  if (arena) { arena.setRival(p); arenaFor = p.id; return arena; }
  if (arenaFor !== null) return null; // WebGL déjà refusé : repli CSS conservé
  try {
    arena = createArena(arenaHost, { artSeed: params.artSeed, view: params.view === 'B' ? 'B' : 'A', reducedMotion: params.reducedMotion, freeze: params.freeze, personality: p, ablate: params.ablate });
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
  // Entrée directe historique (QA, `?autostart=1` / `?scenario=`) : écran de fin historique.
  new DuelSession({ app, arena, config: cfg, params, scenario, personality, onTool: (t) => (t === 'help' ? (showHelp(), true) : false) });
}

function showHelp(): void {
  const o = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', onclick: (e: Event) => { if (e.target === o) o.remove(); } },
    h('div', { class: 'dialog' },
      h('h2', null, 'Comment jouer'),
      h('p', null, '1. Début de tour : la main se complète à 4. 2. Préparation : cliquez vos Secondaires cachées pour les révéler (elles deviennent ACTIVES). 3. Engagement : glissez (ou cliquez puis cliquez la case) une carte sur la Primaire et choisissez ASSAUT ou GARDE ; une nouvelle Secondaire facultative se pose face cachée en CHARGEMENT. 4. Les Primaires sont révélées simultanément. 5. Cliquez vos Secondaires ACTIVES pour choisir en secret : Conserver, Rang, Dégâts (Assaut) ou Interférer (puis cible). 6. Résolution : Rang = priorité ; Puissance = dégâts et absorption.'),
      h('p', null, 'Vues : le duel se joue face au rival (vue Rival). Quand vous composez (préparation, engagement), la caméra s’incline vers la table (vue Plateau) ; le rival reste visible en haut. V ou le bouton de vue bascule à tout moment ; la vue suit ensuite les phases. Les réactions et répliques du rival ne réagissent qu’à ce qui est public : ce ne sont pas des indices sur ses choix secrets.'),
      h('p', null, 'Résolution : le Clash est présenté par étapes (Interférences, Rang, issue, blessures, conséquences). Les deux Primaires se font face (bandeau rouge ASSAUT, bleu GARDE), s’affrontent selon le résultat du moteur, puis partent toutes deux à la défausse. « Passer » saute la mise en scène ; « Tour suivant » reste toujours disponible ; « Rythme » accélère sans rien changer aux règles ; « Mvt réduit » supprime les déplacements.'),
      h('p', null, 'Clavier : Tab pour naviguer, Entrée/Espace pour sélectionner et poser, 1-4 cartes de main, A/G mode, V vue, Échap annuler, N action principale. Tactile : glisser, ou toucher puis toucher la case ; appui long = inspection.'),
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

function resetArena(): void {
  arena?.dispose();
  arena = null;
  arenaFor = null;
}

// Entrées : galerie de revue (`?gallery=1`), duel direct QA (`?autostart=1`, `?scenario=`), ancien
// écran de configuration (`?setup=1`) ; sinon le JEU (accueil, deck, rencontres, sauvegarde — M04).
if (params.gallery) gallery();
else if (params.autostart) start(makeConfig(params, params.sig ?? 'Cendre', params.techs ?? ['Lecture', 'Ancrage']), params.scenario);
else if (new URLSearchParams(window.location.search).get('setup') === '1') setupScreen();
else {
  const shell = new Shell({ shellHost: document.getElementById('shell')!, app, params, ensureArena, resetArena, arena: () => arena });
  if (params.qa) (window as unknown as Record<string, unknown>).__lqvShell = shell;
}
