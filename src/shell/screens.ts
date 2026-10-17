/**
 * Écrans de l’enveloppe (M04) : accueil (et création de profil), rencontres, préparation, résultat.
 * Grammaire « Art by Code » : panneaux sombres filetés d’or, emblèmes et illustrations générés par
 * code, portraits composés des couches du rival ; l’arène figée reste visible derrière.
 */
import { EFFECTS, FAMILIES, FAMILY_THEME, SIGNATURES } from '../game/catalog/cards';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import { emblemSvg } from '../art/emblems';
import { portraitUrl } from '../art/portrait';
import { cardEl } from '../presentation/cardView';
import { STARTER_DECK } from '../product/collection';
import { deckSummary, type DeckChoice } from '../product/deck';
import { DIFFICULTY_LABEL, ENCOUNTERS, PLAYER_HP, RIVALS, encounterById, personalityOf, type Encounter } from '../product/encounters';
import { record } from '../product/stats';
import type { DuelSummary } from '../product/save';
import type { Shell } from './shell';
import { btn, chip, cls, confirmDialog, fmtDate, h, screen } from './ui';

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
    items.push(homeItem('Continuer', last ? `Dernier duel : ${OUTCOME[last.outcome].toLowerCase()} contre ${personalityOf(last.rival as never).name}` : 'Choisir une rencontre', () => sh.go({ type: 'continue' }), 'home-continue', true));
    items.push(homeItem('Deck', `Signature ${save.deck.signature} · ${save.deck.techniques.join(' + ')}`, () => sh.go({ type: 'open', screen: 'deck' }), 'home-deck'));
    items.push(homeItem('Collection', 'Cartes et Techniques', () => sh.go({ type: 'open', screen: 'collection' }), 'home-collection'));
    status.push(h('p', null, `Profil « ${save.profile.name} » · ${save.history.length} duel(s) joué(s) · sauvegardé le ${fmtDate(save.updatedAt)}.`));
    if (sh.deckIssues().length) status.push(h('p', { class: 'warn' }, 'Votre deck enregistré n’est plus légal : ouvrez le Deck pour le corriger avant de jouer.'));
  } else {
    items.push(homeItem('Nouvelle partie', 'Créer un duelliste et son deck de départ', () => { sh.homeMode = 'new'; sh.render(); }, 'home-new', load.status !== 'corrupt'));
  }
  items.push(homeItem('Options', 'Rythme, mouvement, texte, sauvegarde', () => sh.go({ type: 'open', screen: 'options' }), 'home-options'));
  items.push(homeItem('Aide et règles', 'Prise en main, Rang et Puissance, raccourcis', () => sh.go({ type: 'open', screen: 'help' }), 'home-help'));
  if (save) items.push(homeItem('Recommencer…', 'Nouveau profil (confirmation demandée)', () => void restart(sh), 'home-restart'));

  if (load.status === 'corrupt') status.push(corruptPanel(sh));
  if (load.status === 'unavailable') status.push(h('p', { class: 'warn' }, load.reason));
  if (load.status === 'ok' && load.migratedFrom !== null) status.push(h('p', null, `Sauvegarde mise à jour depuis le schéma ${load.migratedFrom}.`));
  if (load.status === 'empty' && !save) status.push(h('p', null, 'Aucune partie sauvegardée dans ce navigateur.'));

  return h('section', { class: 'sh-screen sh-home', 'aria-labelledby': 'sh-title-home', 'data-screen': 'home' },
    h('div', { class: 'sh-home-col' },
      h('header', { class: 'sh-brand' },
        h('div', { class: 'sh-emblems', 'aria-hidden': 'true', html: FAMILIES.map((f) => `<span class="em fam-${f}">${emblemSvg(f, 22)}</span>`).join('') }),
        h('h1', { id: 'sh-title-home', class: 'sh-title big', tabindex: '-1' }, 'Les Quatre Voies'),
        h('p', { class: 'sh-sub' }, 'Duels de cartes tactiques — version jouable locale (prototype)')),
      h('nav', { class: 'sh-home-menu', 'aria-label': 'Menu principal' }, ...items),
      h('div', { class: 'sh-save-status', role: 'status' }, ...status)));
}

function homeItem(label: string, sub: string, onclick: () => void, key: string, primary = false): HTMLElement {
  return h('button', { class: cls('sh-home-item', primary && 'primary'), type: 'button', 'data-key': key, 'data-shell-primary': primary ? 'true' : null, onclick },
    h('span', { class: 'lbl' }, label), h('span', { class: 'sub' }, sub));
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
// Rencontres

export function renderBoard(sh: Shell): HTMLElement {
  const save = sh.save!;
  const playable = new Set(sh.playable());
  return screen('board', 'Rencontres', ['Choisissez un rival. ', chip('PV, decks et difficultés : données de prototype, non canoniques', 'proto')],
    h('div', { class: 'sh-enc-grid' }, ENCOUNTERS.map((e) => encounterCard(sh, e, playable.has(e.id), record(save.history, e.rival)))),
    historyList(save.history.slice(-6).reverse()),
    h('div', { class: 'sh-actions' },
      btn('Accueil', () => sh.go({ type: 'home' }), { ghost: true, key: 'board-home' }),
      btn('Collection', () => sh.go({ type: 'open', screen: 'collection' }), { ghost: true, key: 'board-collection' }),
      btn('Deck', () => sh.go({ type: 'open', screen: 'deck' }), { ghost: true, key: 'board-deck' })));
}

function encounterCard(sh: Shell, e: Encounter, open: boolean, rec: { w: number; l: number; a: number }): HTMLElement {
  const p = personalityOf(e.rival);
  const r = RIVALS[e.rival];
  return h('article', { class: cls('sh-enc', `fam-${p.family}`), 'data-encounter': e.id },
    h('img', { class: 'sh-face', src: portraitUrl(p, sh.params.artSeed), alt: `Portrait de ${p.name}` }),
    h('div', { class: 'sh-enc-body' },
      h('h2', null, p.name, h('span', { class: 'fam-icon', html: emblemSvg(p.family, 16), title: `Famille ${p.family}` })),
      h('p', { class: 'sh-enc-title' }, p.title),
      h('div', { class: 'sh-chips' }, chip(DIFFICULTY_LABEL[r.difficulty], r.difficulty === 3 ? 'bad' : r.difficulty === 2 ? 'gold' : 'ok'), chip(`${r.hp} PV`, 'info'), chip(`Signature ${p.family}`, 'info')),
      h('p', { class: 'sh-enc-style' }, r.style),
      h('p', { class: 'sh-enc-rec' }, rec.w + rec.l + rec.a ? `Bilan : ${rec.w} V · ${rec.l} D${rec.a ? ` · ${rec.a} abandon(s)` : ''}` : 'Jamais affronté'),
      btn('Défier', () => sh.go({ type: 'prep', encounterId: e.id }), { key: `enc-${e.id}`, disabled: !open })));
}

function historyList(items: DuelSummary[]): HTMLElement | null {
  if (!items.length) return null;
  return h('section', { class: 'sh-history', 'aria-label': 'Derniers duels' },
    h('h2', null, 'Derniers duels'),
    h('ol', null, items.map((x) => h('li', { class: `out-${x.outcome}` },
      h('b', null, OUTCOME[x.outcome]), ` contre ${personalityOf(x.rival as never).name} — ${x.turns} tours, ${x.dealt} infligés / ${x.taken} subis`, h('small', null, ` · ${fmtDate(x.at)}`)))));
}

// ---------------------------------------------------------------------------
// Préparation (dossier public du rival + votre deck)

export function renderPrep(sh: Shell): HTMLElement {
  const save = sh.save!;
  const enc = encounterById(sh.flow.encounterId!)!;
  const p = personalityOf(enc.rival);
  const r = RIVALS[enc.rival];
  const issues = sh.deckIssues();
  const sum = deckSummary(save.deck);
  return h('section', { class: 'sh-screen sh-side sh-prep', 'aria-labelledby': 'sh-title-prep', 'data-screen': 'prep' },
    h('header', { class: 'sh-head' },
      h('p', { class: 'sh-kicker' }, enc.title),
      h('h1', { id: 'sh-title-prep', class: 'sh-title', tabindex: '-1' }, `${p.name}, ${p.title}`),
      h('p', { class: 'sh-sub' }, r.style)),
    h('div', { class: 'sh-prep-grid' },
      h('div', { class: 'sh-prep-col' },
        h('h2', null, 'Le rival (informations publiques)'),
        h('div', { class: 'sh-chips' }, chip(DIFFICULTY_LABEL[r.difficulty], r.difficulty === 3 ? 'bad' : r.difficulty === 2 ? 'gold' : 'ok'), chip(`${r.hp} PV`, 'info'), chip('prototype', 'proto', 'PV et deck du rival : données de prototype réglables')),
        h('div', { class: 'sh-mini-row' }, cardEl(`sig-${p.family}`, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-mini'] }),
          h('div', { class: 'sh-techs-ro' }, r.techniques.map((t) => h('p', null, h('b', null, `${t} `), h('small', null, `${TECHNIQUES[t].cost} Insight — ${TECHNIQUES[t].text}`))))),
        h('p', { class: 'sh-note' }, 'Son deck exact, sa main et ses intentions restent secrets ; ses réactions ne trahissent aucun choix caché.')),
      h('div', { class: 'sh-prep-col' },
        h('h2', null, 'Votre deck'),
        h('div', { class: 'sh-chips' }, chip(`${PLAYER_HP} PV`, 'info'), chip(issues.length ? `${issues.length} problème(s)` : 'Deck légal · 17 cartes', issues.length ? 'bad' : 'ok')),
        h('div', { class: 'sh-mini-row' }, cardEl(`sig-${save.deck.signature}`, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-mini'] }),
          h('div', { class: 'sh-techs-ro' },
            save.deck.techniques.map((t) => h('p', null, h('b', null, `${t} `), h('small', null, `${TECHNIQUES[t].cost} Insight · ${TECHNIQUES[t].timing}`))),
            h('p', null, h('small', null, `${sum.variants} variante(s) équipée(s) sur 16 identités.`)))),
        issues.length ? h('ul', { class: 'sh-issues' }, issues.map((i) => h('li', null, i.text))) : null)),
    h('p', { class: 'sh-note' }, 'Duel standard : 17 cartes chacun, 2 emplacements de Secondaire, 1 Signature, Insight de départ 1 sur 2. Règles V3.0 + avenant V3.2.'),
    h('div', { class: 'sh-actions' },
      btn('Retour aux rencontres', () => sh.go({ type: 'board' }), { ghost: true, key: 'prep-back' }),
      btn('Modifier le deck', () => sh.go({ type: 'open', screen: 'deck' }), { ghost: true, key: 'prep-deck' }),
      btn('Commencer le duel', () => sh.startDuel(), { key: 'prep-start', primary: true, disabled: issues.length > 0, title: issues[0]?.text })));
}

// ---------------------------------------------------------------------------
// Résultat (le rival reste visible derrière le panneau, avec sa réaction finale)

export function renderResult(sh: Shell): HTMLElement {
  const r = sh.lastResult!;
  const enc = encounterById(r.encounterId)!;
  const p = personalityOf(enc.rival);
  const rec = record(sh.save?.history ?? [], enc.rival);
  const how = r.outcome === 'abandon' ? `Duel abandonné au tour ${r.turns} (ce n’est pas un K.-O.).`
    : r.outcome === 'victory' ? `${p.name} tombe à 0 PV au tour ${r.turns}.` : `Vous tombez à 0 PV au tour ${r.turns}.`;
  return h('section', { class: cls('sh-screen sh-side sh-result', `out-${r.outcome}`), 'aria-labelledby': 'sh-title-result', 'data-screen': 'result' },
    h('header', { class: 'sh-head' },
      h('p', { class: 'sh-kicker' }, enc.title),
      h('h1', { id: 'sh-title-result', class: 'sh-title big', tabindex: '-1' }, OUTCOME[r.outcome]),
      h('p', { class: 'sh-sub' }, how, r.overtime ? ` Après ${r.overtime} prolongation(s) (double K.-O. → 1 PV chacun).` : '')),
    h('dl', { class: 'sh-stats' },
      stat('PV finaux', `Vous ${Math.max(0, r.hp.me)} / ${PLAYER_HP} · ${p.name} ${Math.max(0, r.hp.opp)} / ${RIVALS[enc.rival].hp}`),
      stat('Dégâts', `${r.dealt} infligés · ${r.taken} subis`),
      stat('Tours', String(r.turns)),
      stat(`Bilan contre ${p.name}`, `${rec.w} V · ${rec.l} D${rec.a ? ` · ${rec.a} abandon(s)` : ''}`)),
    h('p', { class: 'sh-note' }, `Seed du duel ${r.seed} · Signature ${r.signature} — le duel est reproductible à l’identique.`),
    h('div', { class: 'sh-actions' },
      btn('Accueil', () => sh.go({ type: 'home' }), { ghost: true, key: 'result-home' }),
      btn('Revanche', () => sh.go({ type: 'prep', encounterId: enc.id }), { ghost: true, key: 'result-rematch' }),
      btn('Retour aux rencontres', () => sh.go({ type: 'board' }), { key: 'result-board', primary: true })));
}

function stat(k: string, v: string): HTMLElement[] {
  return [h('dt', null, k), h('dd', null, v)] as unknown as HTMLElement[];
}

export type { DeckChoice };
export { EFFECTS };
