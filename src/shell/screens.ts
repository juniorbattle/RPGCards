/**
 * Écrans de l’enveloppe (M04) : accueil (et création de profil), rencontres, préparation, résultat.
 * Grammaire « Art by Code » : panneaux sombres filetés d’or, emblèmes et illustrations générés par
 * code, portraits composés des couches du rival ; l’arène figée reste visible derrière.
 */
import { CATALOG, EFFECTS, FAMILIES, FAMILY_THEME, SIGNATURES } from '../game/catalog/cards';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import { emblemSvg } from '../art/emblems';
import { portraitUrl } from '../art/portrait';
import { cardEl } from '../presentation/cardView';
import { STARTER_DECK } from '../product/collection';
import { ALL_VARIANTS, deckSummary, type DeckChoice } from '../product/deck';
import { DIFFICULTY_LABEL, ENCOUNTERS, PLAYER_HP, SERIES, encounterById, personalityOf, sheetOf, type Encounter } from '../product/encounters';
import { isSignatureRival, personalityById } from '../presentation/personalities';
import { FIRST_WIN_REWARDS, encounterStatus, replaySeries, unlockLabel, type EncounterStatus } from '../product/progression';
import { nextSeriesEncounter } from '../product/upcoming';
import { record } from '../product/stats';
import type { DuelSummary } from '../product/save';
import type { Shell } from './shell';
import { btn, chip, cls, confirmDialog, fmtDate, h, screen } from './ui';
import { iconSvg, type IconName } from './icons';

const OUTCOME: Record<DuelSummary['outcome'], string> = { victory: 'Victoire', defeat: 'Défaite', abandon: 'Abandon' };

// ---------------------------------------------------------------------------
// Accueil

export function renderHome(sh: Shell): HTMLElement {
  if (sh.homeMode === 'new') return newGamePanel(sh);
  const save = sh.save;
  const load = sh.load;
  const items: HTMLElement[] = [];
  const status: HTMLElement[] = [];
  if (save) {
    const last = save.history.at(-1);
    const active = save.activeDuel ? encounterById(save.activeDuel.encounterId) : null;
    const sub = active ? `Reprendre le duel contre ${personalityOf(active.rival).name} (tour ${save.activeDuel!.turn})`
      : last ? `Dernier duel : ${OUTCOME[last.outcome].toLowerCase()} contre ${personalityOf(last.rival as never).name} · ${SERIES.title} ${save.progress.series.step}/${SERIES.steps.length}` : 'Choisir une rencontre';
    items.push(homeItem('Continuer', 'play', () => sh.go({ type: 'continue' }), 'home-continue', { primary: true, sub }));
    const small: HTMLElement[] = [
      homeItem('Deck', 'deck', () => sh.go({ type: 'open', screen: 'deck' }), 'home-deck', { hint: `Signature ${save.deck.signature} · ${save.deck.techniques.join(' + ')}` }),
      homeItem('Collection', 'collection', () => sh.go({ type: 'open', screen: 'collection' }), 'home-collection', { hint: 'Cartes et Techniques' }),
    ];
    items.push(h('div', { class: 'sh-home-pair' }, ...small));
    const owned = save.collection.variants.length;
    status.push(h('p', { class: 'sh-profile' },
      h('b', { class: 'sh-profile-name' }, save.profile.name),
      h('span', { class: 'sh-pstats' },
        pstat('swords', String(save.history.length), `${save.history.length} duel(s) joué(s)`),
        pstat('crown', String(save.progress.defeated.length), `${save.progress.defeated.length} rival(aux) vaincu(s)`),
        pstat('cards', `${owned}/${ALL_VARIANTS.length}`, `${owned} variantes sur ${ALL_VARIANTS.length}`),
        pstat('gem', `${save.collection.techniques.length}/6`, `${save.collection.techniques.length} Techniques sur 6`)),
      h('small', null, `sauvegardé le ${fmtDate(save.updatedAt)}`)));
    if (sh.deckIssues().length) status.push(h('p', { class: 'warn' }, 'Votre deck enregistré n’est plus légal : ouvrez le Deck pour le corriger avant de jouer.'));
  } else {
    items.push(homeItem('Nouvelle partie', 'plus', () => { sh.homeMode = 'new'; sh.render(); }, 'home-new', { primary: load.status !== 'corrupt', sub: 'Créer un duelliste et son deck' }));
  }
  const tail: HTMLElement[] = [
    homeItem('Options', 'options', () => sh.go({ type: 'open', screen: 'options' }), 'home-options', { hint: 'Rythme, mouvement, texte, sauvegarde', compact: true }),
    homeItem('Aide', 'help', () => sh.go({ type: 'open', screen: 'help' }), 'home-help', { hint: 'Aide et règles : prise en main, Rang et Puissance, raccourcis', compact: true }),
  ];
  if (save) tail.push(homeItem('Recommencer', 'restart', () => void restart(sh), 'home-restart', { hint: 'Nouveau profil (confirmation demandée)', compact: true }));
  items.push(h('div', { class: 'sh-home-tail' }, ...tail));

  if (load.status === 'corrupt') status.push(corruptPanel(sh));
  if (load.status === 'unavailable') status.push(h('p', { class: 'warn' }, load.reason));
  if (load.status === 'ok' && load.migratedFrom !== null) status.push(h('p', null, `Sauvegarde mise à jour depuis le schéma ${load.migratedFrom}.`));
  if (load.status === 'empty' && !save) status.push(h('p', null, 'Aucune partie sauvegardée dans ce navigateur.'));

  return h('section', { class: 'sh-screen sh-home', 'aria-labelledby': 'sh-title-home', 'data-screen': 'home' },
    h('div', { class: 'sh-home-col' },
      h('header', { class: 'sh-brand' },
        h('div', { class: 'sh-emblems', 'aria-hidden': 'true', html: FAMILIES.map((f, i) => `<span class="em fam-${f}" style="--i:${i}">${emblemSvg(f, 26)}</span>`).join('') }),
        h('h1', { id: 'sh-title-home', class: 'sh-title big sh-logo', tabindex: '-1' }, 'Les Quatre Voies'),
        h('p', { class: 'sh-tagline' }, 'Duels de cartes tactiques · prototype')),
      h('nav', { class: 'sh-home-menu', 'aria-label': 'Menu principal' }, ...items),
      h('div', { class: 'sh-save-status', role: 'status' }, ...status)));
}

/** Entrée du menu principal : pictogramme + mot ; une ligne d’état seulement pour l’action principale. */
function homeItem(label: string, icon: IconName, onclick: () => void, key: string, o: { primary?: boolean; sub?: string; hint?: string; compact?: boolean } = {}): HTMLElement {
  return h('button', {
    class: cls('sh-home-item', o.primary && 'primary', o.compact && 'compact'), type: 'button', 'data-key': key, 'data-shell-primary': o.primary ? 'true' : null,
    title: o.hint ?? null, 'aria-label': o.hint ? `${label} — ${o.hint}` : null, onclick,
  },
  h('span', { class: 'ico', html: iconSvg(icon, o.primary ? 26 : 20) }),
  h('span', { class: 'lbl' }, label),
  o.sub ? h('span', { class: 'sub' }, o.sub) : null);
}

function pstat(icon: IconName, value: string, label: string): HTMLElement {
  return h('span', { class: 'sh-pstat', title: label, 'aria-label': label }, h('span', { class: 'ico', html: iconSvg(icon, 16) }), h('span', { 'aria-hidden': 'true' }, value));
}

async function restart(sh: Shell): Promise<void> {
  const r = await confirmDialog({ title: 'Recommencer une partie ?', text: 'Un nouveau profil remplacera la progression actuelle (deck, historique). La version précédente reste disponible une fois comme copie de secours. Les options sont conservées.', confirm: 'Recommencer', danger: true });
  if (r !== 'confirm') return;
  sh.homeMode = 'new';
  sh.render();
}

function corruptPanel(sh: Shell): HTMLElement {
  const load = sh.load;
  if (load.status !== 'corrupt') return h('span');
  const backup = load.backup;
  return h('div', { class: 'sh-corrupt', role: 'alert' },
    h('b', null, load.kind === 'future' ? 'Sauvegarde d’une version plus récente' : 'Sauvegarde illisible'),
    h('p', null, load.reason),
    h('p', null, 'Rien n’a été effacé. Vous pouvez exporter le fichier pour diagnostic, restaurer la copie de secours, ou repartir de zéro (le fichier illisible est alors conservé à part).'),
    h('div', { class: 'btn-row' },
      backup ? btn(`Restaurer la copie du ${fmtDate(backup.updatedAt)}`, () => {
        const s = sh.store.restoreBackup();
        if (!s) { sh.toast('Restauration impossible.', 'error'); return; }
        sh.save = s;
        sh.load = { status: 'ok', save: s, migratedFrom: null };
        sh.applyOptions();
        sh.toast('Copie de secours restaurée.', 'ok');
        sh.render();
      }, { key: 'corrupt-restore', primary: true }) : null,
      btn('Exporter le fichier illisible', () => downloadText(`les-quatre-voies-illisible-${Date.now()}.json`, sh.store.rawMain() ?? ''), { ghost: true, key: 'corrupt-export' }),
      btn('Nouvelle partie', () => { sh.homeMode = 'new'; sh.render(); }, { ghost: true, key: 'corrupt-new' })));
}

export function downloadText(name: string, text: string): void {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.append(a);
  a.click();
  window.setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/** Création de profil : nom, Signature (voie de départ), deux Techniques. */
function newGamePanel(sh: Shell): HTMLElement {
  const d = sh.newDraft ?? (sh.newDraft = { name: 'Duelliste', deck: structuredClone(STARTER_DECK) });
  const owned = sh.collection();
  const redraw = () => sh.render();
  const name = h('input', { id: 'sh-name', class: 'sh-input', type: 'text', maxlength: '24', value: d.name, autocomplete: 'off', 'data-key': 'new-name', oninput: (e: Event) => { d.name = (e.target as HTMLInputElement).value; } }) as HTMLInputElement;
  const techOk = d.deck.techniques.length === 2;
  return screen('new', 'Nouveau duelliste', 'Choisissez votre voie et deux Techniques. Le deck de départ (16 cartes de base + 4 variantes de Rang I + votre Signature) est légal tel quel ; vous pourrez l’ajuster ensuite.',
    h('div', { class: 'sh-new-grid' },
      h('label', { class: 'sh-field', for: 'sh-name' }, h('span', null, 'Nom du profil'), name),
      h('div', { class: 'sh-field' }, h('span', null, 'Signature (votre voie)'),
        h('div', { class: 'sh-pick-row', role: 'radiogroup', 'aria-label': 'Signature' }, FAMILIES.filter((f) => owned.signatures.includes(f)).map((f) => h('button', {
          class: 'sh-pick', type: 'button', role: 'radio', 'aria-checked': String(d.deck.signature === f), 'data-key': `new-sig-${f}`,
          onclick: () => { d.deck = { ...d.deck, signature: f }; redraw(); },
        }, cardEl(`sig-${f}`, { artSeed: sh.params.artSeed, tag: 'div' }), h('b', null, SIGNATURES[f].name), h('small', null, FAMILY_THEME[f]))))),
      h('div', { class: 'sh-field' }, h('span', null, `Deux Techniques (${d.deck.techniques.length}/2)`),
        techGrid(owned.techniques, d.deck.techniques, (t) => { d.deck = { ...d.deck, techniques: d.deck.techniques.includes(t) ? d.deck.techniques.filter((x) => x !== t) : [...d.deck.techniques, t].slice(-2) }; redraw(); }, 'new-tech'))),
    h('div', { class: 'sh-actions' },
      btn('Retour', () => { sh.homeMode = 'menu'; sh.newDraft = null; redraw(); }, { ghost: true, key: 'new-cancel' }),
      btn('Créer le duelliste', () => { void sh.newGame(name.value, d.deck); sh.homeMode = 'menu'; sh.newDraft = null; }, { key: 'new-create', primary: true, disabled: !techOk, title: techOk ? undefined : 'Équipez exactement deux Techniques' })));
}

export function techGrid(owned: readonly TechniqueId[], chosen: readonly TechniqueId[], toggle: (t: TechniqueId) => void, keyPrefix: string, all: readonly TechniqueId[] = owned, lockReason?: (t: TechniqueId) => string): HTMLElement {
  return h('div', { class: 'sh-tech-grid', role: 'group' }, all.map((t) => {
    const has = owned.includes(t);
    const on = chosen.includes(t);
    const T = TECHNIQUES[t];
    return h('button', {
      class: cls('sh-tech', on && 'on', !has && 'locked'), type: 'button', 'aria-pressed': String(on), 'data-key': `${keyPrefix}-${t}`, disabled: has ? null : true,
      title: has ? null : lockReason?.(t) ?? 'Technique non apprise', onclick: () => toggle(t),
    },
    h('span', { class: 'sh-tech-head' }, h('b', null, t), h('span', { class: 'cost', 'aria-label': `coût ${T.cost} Insight` }, '◆'.repeat(T.cost))),
    h('small', { class: 'timing' }, T.timing),
    h('small', null, has ? T.text : lockReason?.(t) ?? 'Non apprise.'));
  }));
}

// ---------------------------------------------------------------------------
// Rencontres (M07 L4 : affiches de rivaux ; le détail au survol / focus et dans le nom accessible)

export function renderBoard(sh: Shell): HTMLElement {
  const save = sh.save!;
  const prog = save.progress;
  const active = save.activeDuel ? encounterById(save.activeDuel.encounterId) : null;
  const series = ENCOUNTERS.filter((e) => e.kind === 'series');
  const free = ENCOUNTERS.filter((e) => e.kind === 'free');
  const town = ENCOUNTERS.filter((e) => e.kind === 'town');
  const banner = active ? h('div', { class: 'sh-active', role: 'status' },
    h('div', null, h('b', null, `Duel en cours contre ${personalityOf(active.rival).name}`), h('span', null, ` — ${active.title}, tour ${save.activeDuel!.turn}. Il sera repris exactement où vous l’avez laissé.`)),
    h('div', { class: 'btn-row' },
      btn('Abandonner…', () => void sh.abandonActive(), { ghost: true, danger: true, key: 'board-abandon' }),
      btn('Reprendre le duel', () => sh.go({ type: 'resumeDuel' }), { key: 'board-resume', primary: true }))) : null;
  const done = Math.min(prog.series.step, SERIES.steps.length);
  let i = 0;
  return screen('board', 'Rencontres', [chip('données de prototype', 'proto', 'PV, decks, difficultés et déblocages : données de prototype, non canoniques')],
    banner,
    h('section', { class: 'sh-series', 'aria-label': SERIES.title },
      h('div', { class: 'sh-series-head' },
        h('h2', null, SERIES.title),
        h('span', { class: 'sh-steps', role: 'img', 'aria-label': `Manche ${Math.min(prog.series.step + 1, SERIES.steps.length)} sur ${SERIES.steps.length}${prog.series.step >= SERIES.steps.length ? ', série terminée' : ''}${prog.series.completed ? `, remportée ${prog.series.completed} fois` : ''}` },
          SERIES.steps.map((_, k) => h('span', { class: cls('pip', k < done && 'done', k === prog.series.step && 'cur') })),
          prog.series.completed ? h('span', { class: 'sh-wins', 'aria-hidden': 'true', html: `${iconSvg('crown', 15)}×${prog.series.completed}` }) : null),
        prog.series.step >= SERIES.steps.length ? btn('Rejouer la série', () => { save.progress = replaySeries(prog); sh.persist(); sh.render(); }, { ghost: true, key: 'series-replay' }) : null),
      h('div', { class: 'sh-path' }, series.map((e) => encounterCard(sh, e, encounterStatus(e, prog), !!active, i++)))),
    h('section', { class: 'sh-free', 'aria-label': 'Duels libres' },
      h('h2', null, 'Duels libres'),
      h('div', { class: 'sh-enc-grid' }, free.map((e) => encounterCard(sh, e, encounterStatus(e, prog), !!active, i++)))),
    // M08 C3 : duellistes PNJ de la ville (entraînement ouvert d’emblée, sans récompense).
    h('section', { class: 'sh-free sh-town', 'aria-label': 'Duels de la ville' },
      h('h2', null, 'Duels de la ville'),
      h('div', { class: 'sh-enc-grid' }, town.map((e) => encounterCard(sh, e, encounterStatus(e, prog), !!active, i++)))),
    h('div', { class: 'sh-logs' }, progressLog(sh), historyList(save.history.slice(-6).reverse())),
    h('div', { class: 'sh-actions' },
      btn('Accueil', () => sh.go({ type: 'home' }), { ghost: true, key: 'board-home' }),
      btn('Collection', () => sh.go({ type: 'open', screen: 'collection' }), { ghost: true, key: 'board-collection' }),
      btn('Deck', () => sh.go({ type: 'open', screen: 'deck' }), { ghost: true, key: 'board-deck' }),
      // M09 V2 (`?demo=1`) : le tableau classique, ouvert depuis le menu de la ville, y ramène.
      sh.d.hub ? btn('Retour au Quai', () => { sh.hubBoard = false; sh.render(); }, { key: 'board-ville', primary: true }) : null));
}

/** Difficulté en étoiles (1 à 3), nommée pour les lecteurs d’écran. */
function stars(n: 1 | 2 | 3, label: string): HTMLElement {
  return h('span', { class: cls('sh-stars', `d${n}`), role: 'img', 'aria-label': `Difficulté : ${label}`, title: label, html: [1, 2, 3].map((k) => `<span class="${k <= n ? 'on' : ''}">${iconSvg('star', 13)}</span>`).join('') });
}

function encounterCard(sh: Shell, e: Encounter, st: EncounterStatus, busy: boolean, index: number): HTMLElement {
  const p = personalityOf(e.rival);
  const r = sheetOf(e.rival);
  const rec = record(sh.save!.history, e.rival);
  // Récompense de première victoire : rivaux signatures seulement (un PNJ de la ville n’en donne aucune).
  const reward = isSignatureRival(e.rival) ? FIRST_WIN_REWARDS[e.rival] : null;
  const firstWin = !!reward && isSignatureRival(e.rival) && !sh.save!.progress.defeated.includes(e.rival);
  const played = rec.w + rec.l + rec.a;
  const rewardText = reward ? `${reward.variants.length} variantes ${p.family}${reward.techniques.length ? ` + ${reward.techniques.join(', ')}` : ''}` : '';
  const prefer = () => sh.preferOpponent(e.rival);
  return h('article', { class: cls('sh-enc', 'sh-in', `fam-${p.family}`, `st-${st.state}`), 'data-encounter': e.id, style: `--i:${index}`, onpointerenter: prefer, onfocusin: prefer, 'aria-label': `${e.kind === 'series' ? `Manche ${e.step} : ` : ''}${p.name}, ${p.title}` },
    h('div', { class: 'sh-enc-art' },
      h('img', { class: 'sh-face', src: portraitUrl(p, sh.params.artSeed), alt: `Portrait de ${p.name}` }),
      e.kind === 'series' ? h('span', { class: 'sh-step', 'aria-hidden': 'true' }, st.state === 'done' ? '✓' : String(e.step)) : null,
      h('span', { class: 'fam-icon', html: emblemSvg(p.family, 18), title: `Famille ${p.family}` }),
      st.open || st.state === 'done' ? null : h('span', { class: 'sh-enc-lock', 'aria-hidden': 'true', html: iconSvg('lock', 30) }),
      h('div', { class: 'sh-enc-name' }, h('h2', null, p.name), h('p', { class: 'sh-enc-title' }, p.title)),
      h('p', { class: 'sh-enc-style' }, r.style)),
    h('div', { class: 'sh-enc-body' },
      h('div', { class: 'sh-enc-facts' },
        stars(r.difficulty, DIFFICULTY_LABEL[r.difficulty]),
        h('span', { class: 'sh-hp', title: `${r.hp} points de vie`, 'aria-label': `${r.hp} PV`, html: `${iconSvg('heart', 15)}<b aria-hidden="true">${r.hp}</b>` })),
      firstWin ? h('p', { class: 'sh-enc-reward', title: `Première victoire : ${rewardText} (prototype)`, 'aria-label': `Première victoire : ${rewardText} (prototype)`, html: `${iconSvg('gift', 15)}<span aria-hidden="true">${rewardText}</span>` })
        : e.kind === 'town' ? h('p', { class: 'sh-enc-reward', title: 'Duel d’entraînement : aucune récompense (prototype)' }, 'Entraînement') : null,
      h('p', { class: cls('sh-enc-rec', !played && 'new') }, played ? `${rec.w} V · ${rec.l} D${rec.a ? ` · ${rec.a} ab.` : ''}` : 'Jamais affronté'),
      st.open
        ? btn(e.kind === 'series' ? 'Jouer' : 'Défier', () => sh.go({ type: 'prep', encounterId: e.id }), { key: `enc-${e.id}`, disabled: busy, title: busy ? 'Un duel est en cours' : undefined })
        : h('p', { class: 'sh-lock' }, st.state === 'done' ? '✓ Remportée' : st.reason)));
}

function progressLog(sh: Shell): HTMLElement | null {
  const log = sh.save!.progress.unlockLog;
  if (!log.length) return null;
  return h('section', { class: 'sh-history', 'aria-label': 'Journal de progression' },
    h('h2', null, 'Journal de progression'),
    h('ol', null, log.slice(-6).reverse().map((u) => h('li', null, h('b', null, `Victoire sur ${personalityOf(u.rival).name}`), ` — débloqué : ${u.items.map(unlockLabel).join(', ')}`, h('small', null, ` · ${fmtDate(u.at)}`)))));
}

function historyList(items: DuelSummary[]): HTMLElement | null {
  if (!items.length) return null;
  return h('section', { class: 'sh-history', 'aria-label': 'Derniers duels' },
    h('h2', null, 'Derniers duels'),
    h('ol', null, items.map((x) => h('li', { class: `out-${x.outcome}` },
      h('b', null, OUTCOME[x.outcome]), ` contre ${personalityById(x.rival)?.name ?? x.rival} — ${x.turns} tours, ${x.dealt} infligés / ${x.taken} subis`, h('small', null, ` · ${fmtDate(x.at)}`)))));
}

// ---------------------------------------------------------------------------
// Préparation : face-à-face « Vous / rival » (informations publiques), une seule grande action

function techChips(ts: readonly TechniqueId[]): HTMLElement {
  return h('div', { class: 'sh-techchips' }, ts.map((t) => h('span', { class: 'sh-techchip', title: `${TECHNIQUES[t].timing} — ${TECHNIQUES[t].text}`, 'aria-label': `${t}, ${TECHNIQUES[t].cost} Insight : ${TECHNIQUES[t].text}` },
    h('b', { 'aria-hidden': 'true' }, t), h('span', { class: 'cost', 'aria-hidden': 'true' }, '◆'.repeat(TECHNIQUES[t].cost)))));
}

export function renderPrep(sh: Shell): HTMLElement {
  const save = sh.save!;
  const enc = encounterById(sh.flow.encounterId!)!;
  const p = personalityOf(enc.rival);
  const r = sheetOf(enc.rival);
  const issues = sh.deckIssues();
  const sum = deckSummary(save.deck);
  const side = (who: 'me' | 'opp', name: string, family: string, hp: number, techs: readonly TechniqueId[], extra: HTMLElement | null) =>
    h('div', { class: cls('sh-vs-side', who, `fam-${family}`) },
      h('p', { class: 'sh-vs-who' }, name),
      cardEl(`sig-${family}`, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-vs-card'] }),
      h('span', { class: 'sh-hp big', 'aria-label': `${hp} PV`, html: `${iconSvg('heart', 18)}<b aria-hidden="true">${hp}</b>` }),
      techChips(techs),
      extra);
  return h('section', { class: 'sh-screen sh-side sh-prep', 'aria-labelledby': 'sh-title-prep', 'data-screen': 'prep' },
    h('header', { class: 'sh-head' },
      h('p', { class: 'sh-kicker' }, enc.title),
      h('h1', { id: 'sh-title-prep', class: 'sh-title big', tabindex: '-1' }, p.name),
      h('p', { class: 'sh-enc-title' }, p.title),
      h('div', { class: 'sh-chips' }, stars(r.difficulty, DIFFICULTY_LABEL[r.difficulty]), chip('prototype', 'proto', 'PV et deck du rival : données de prototype réglables'))),
    h('div', { class: 'sh-vs' },
      side('me', 'Vous', save.deck.signature, PLAYER_HP, save.deck.techniques,
        h('span', { class: cls('sh-chip', issues.length ? 'tone-bad' : 'tone-ok'), title: `${sum.variants} variante(s) équipée(s) sur 16 identités` }, issues.length ? `${issues.length} problème(s)` : 'Deck légal · 17 cartes')),
      h('div', { class: 'sh-vs-mark', 'aria-hidden': 'true' }, 'VS'),
      side('opp', p.name, p.family, r.hp, r.techniques, null)),
    h('p', { class: 'sh-quote' }, `« ${r.style} »`),
    issues.length ? h('ul', { class: 'sh-issues' }, issues.map((x) => h('li', null, x.text))) : null,
    h('p', { class: 'sh-note sh-secret', html: `${iconSvg('lock', 14)}<span>Son deck, sa main et ses intentions restent secrets.</span>` }),
    h('div', { class: 'sh-actions' },
      btn('Retour', () => sh.go({ type: 'board' }), { ghost: true, key: 'prep-back' }),
      btn('Deck', () => sh.go({ type: 'open', screen: 'deck' }), { ghost: true, key: 'prep-deck' }),
      (() => {
        const b = btn('Duel !', () => sh.startDuel(), { key: 'prep-start', primary: true, disabled: issues.length > 0, title: issues[0]?.text });
        b.classList.add('sh-go');
        b.setAttribute('aria-label', 'Commencer le duel');
        return b;
      })()));
}

// ---------------------------------------------------------------------------
// Résultat : titre, PV qui se vident, chiffres, puis récompenses qui se retournent (le rival reste visible)

export function renderResult(sh: Shell): HTMLElement {
  const r = sh.lastResult!;
  const enc = encounterById(r.encounterId)!;
  const p = personalityOf(enc.rival);
  const rec = record(sh.save?.history ?? [], enc.rival);
  const next = nextSeriesEncounter(sh.lastEffect);
  const how = r.outcome === 'abandon' ? `Duel abandonné au tour ${r.turns} (ce n’est pas un K.-O.).`
    : r.outcome === 'victory' ? `${p.name} tombe à 0 PV au tour ${r.turns}.` : `Vous tombez à 0 PV au tour ${r.turns}.`;
  const bar = (who: string, hp: number, max: number, cls2: string, k: number) => {
    const v = Math.max(0, hp);
    return h('div', { class: cls('sh-hpbar', cls2), role: 'img', 'aria-label': `${who} : ${v} PV sur ${max}` },
      h('span', { class: 'who', 'aria-hidden': 'true' }, who),
      h('span', { class: 'track', 'aria-hidden': 'true' }, h('span', { class: 'fill', style: `--k:${(v / max).toFixed(3)};--d:${k}` })),
      h('b', { 'aria-hidden': 'true' }, `${v}`), h('small', { 'aria-hidden': 'true' }, `/ ${max}`));
  };
  return h('section', { class: cls('sh-screen sh-side sh-result', `out-${r.outcome}`), 'aria-labelledby': 'sh-title-result', 'data-screen': 'result' },
    h('header', { class: 'sh-head' },
      h('p', { class: 'sh-kicker', title: `Seed ${r.seed} · Signature ${r.signature} — duel reproductible à l’identique` }, enc.title),
      h('h1', { id: 'sh-title-result', class: 'sh-title big sh-verdict', tabindex: '-1' }, OUTCOME[r.outcome]),
      // K.-O. : les barres de PV le montrent ; la phrase ne reste que pour l’abandon et les prolongations.
      r.outcome === 'abandon' || r.overtime ? h('p', { class: 'sh-sub' }, r.outcome === 'abandon' ? how : '', r.overtime ? ` Après ${r.overtime} prolongation(s) (double K.-O. → 1 PV chacun).` : '') : h('p', { class: 'sh-visually-hidden' }, how)),
    h('div', { class: 'sh-hpbars' },
      bar('Vous', r.hp.me, PLAYER_HP, 'me', 0),
      bar(p.name, r.hp.opp, sheetOf(enc.rival).hp, 'opp', 1)),
    h('dl', { class: 'sh-bigstats' },
      bigStat('Infligés', String(r.dealt)), bigStat('Subis', String(r.taken)), bigStat('Tours', String(r.turns)),
      bigStat('Bilan', `${rec.w} V · ${rec.l} D${rec.a ? ` · ${rec.a} ab.` : ''}`)),
    effectPanel(sh),
    h('div', { class: 'sh-actions' },
      btn('Accueil', () => sh.go({ type: 'home' }), { ghost: true, key: 'result-home' }),
      sh.playable().includes(enc.id) ? btn(enc.kind === 'series' ? 'Rejouer la manche' : 'Revanche', () => sh.go({ type: 'prep', encounterId: enc.id }), { ghost: true, key: 'result-rematch' }) : null,
      next ? btn(`Manche suivante : ${personalityOf(next.rival).name}`, () => sh.go({ type: 'prep', encounterId: next.id }), { key: 'result-next', primary: true }) : null,
      btn(sh.d.hub ? 'Retour au Quai' : 'Rencontres', () => sh.go({ type: 'board' }), { key: 'result-board', primary: !next, ghost: !!next })));
}

function bigStat(k: string, v: string): HTMLElement {
  return h('div', { class: 'sh-bigstat' }, h('dt', null, k), h('dd', null, v));
}

/** Effets de progression du duel (prototype) : cartes débloquées retournées une à une, série remportée. */
function effectPanel(sh: Shell): HTMLElement | null {
  const eff = sh.lastEffect;
  const r = sh.lastResult!;
  if (!eff) return null;
  const rows: HTMLElement[] = [];
  if (eff.series?.completed) {
    const recap = SERIES.steps.map((rv, i) => {
      const win = [...(sh.save?.history ?? [])].reverse().find((x) => x.encounterId === `quai-${i + 1}` && x.outcome === 'victory');
      return h('li', null, `Manche ${i + 1} — ${personalityOf(rv).name} : `, win ? `victoire en ${win.turns} tours (${win.dealt} infligés / ${win.taken} subis)` : '—');
    });
    rows.push(h('div', { class: 'sh-recap', role: 'status' }, h('b', null, `${SERIES.title} remporté !`), h('ol', null, recap), h('p', null, 'Défi débloqué : Orin, l’arpenteur des Astres (duel libre).')));
  } else if (eff.series) rows.push(h('p', { class: 'ok' }, `${SERIES.title} : manche ${eff.series.step} sur ${SERIES.steps.length} remportée.`));
  if (eff.unlocked.length) {
    rows.push(h('div', { class: 'sh-unlocks' },
      h('p', { class: 'sh-unlocks-head' }, h('b', null, 'Nouveautés équipables '), chip('prototype', 'proto')),
      h('ul', { class: 'sh-reward-row' }, eff.unlocked.map((u, k) => h('li', { class: 'sh-reward', style: `--i:${k}`, title: unlockLabel(u) },
        CATALOG[u] ? cardEl(u, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-reward-card'] })
          : h('span', { class: 'sh-reward-tech', html: `${iconSvg('gem', 30)}<b>${u}</b>` }),
        h('span', { class: 'sh-visually-hidden' }, unlockLabel(u)))))));
  } else if (r.outcome === 'victory') rows.push(h('p', { class: 'sh-note' }, 'Ce rival a déjà été vaincu : pas de nouveau déblocage.'));
  else rows.push(h('p', { class: 'sh-note' }, 'Aucune progression sur une défaite ou un abandon ; la revanche reste possible.'));
  return rows.length ? h('section', { class: 'sh-effects', 'aria-label': 'Progression' }, ...rows) : null;
}

export type { DeckChoice };
export { EFFECTS };
