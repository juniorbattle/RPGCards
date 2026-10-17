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
import { DIFFICULTY_LABEL, ENCOUNTERS, PLAYER_HP, RIVALS, SERIES, encounterById, personalityOf, type Encounter } from '../product/encounters';
import { FIRST_WIN_REWARDS, encounterStatus, replaySeries, unlockLabel, type EncounterStatus } from '../product/progression';
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
    const active = save.activeDuel ? encounterById(save.activeDuel.encounterId) : null;
    const sub = active ? `Reprendre le duel contre ${personalityOf(active.rival).name} (tour ${save.activeDuel!.turn})`
      : last ? `Dernier duel : ${OUTCOME[last.outcome].toLowerCase()} contre ${personalityOf(last.rival as never).name} · ${SERIES.title} ${save.progress.series.step}/${SERIES.steps.length}` : 'Choisir une rencontre';
    items.push(homeItem('Continuer', sub, () => sh.go({ type: 'continue' }), 'home-continue', true));
    items.push(homeItem('Deck', `Signature ${save.deck.signature} · ${save.deck.techniques.join(' + ')}`, () => sh.go({ type: 'open', screen: 'deck' }), 'home-deck'));
    items.push(homeItem('Collection', 'Cartes et Techniques', () => sh.go({ type: 'open', screen: 'collection' }), 'home-collection'));
    const owned = save.collection.variants.length;
    status.push(h('p', null, `Profil « ${save.profile.name} » · ${save.history.length} duel(s) · ${save.progress.defeated.length} rival(aux) vaincu(s) · ${owned}/16 variantes · ${save.collection.techniques.length}/6 Techniques · sauvegardé le ${fmtDate(save.updatedAt)}.`));
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
  const prog = save.progress;
  const active = save.activeDuel ? encounterById(save.activeDuel.encounterId) : null;
  const series = ENCOUNTERS.filter((e) => e.kind === 'series');
  const free = ENCOUNTERS.filter((e) => e.kind === 'free');
  const banner = active ? h('div', { class: 'sh-active', role: 'status' },
    h('div', null, h('b', null, `Duel en cours contre ${personalityOf(active.rival).name}`), h('span', null, ` — ${active.title}, tour ${save.activeDuel!.turn}. Il sera repris exactement où vous l’avez laissé.`)),
    h('div', { class: 'btn-row' },
      btn('Abandonner…', () => void sh.abandonActive(), { ghost: true, danger: true, key: 'board-abandon' }),
      btn('Reprendre le duel', () => sh.go({ type: 'resumeDuel' }), { key: 'board-resume', primary: true }))) : null;
  return screen('board', 'Rencontres', ['Une série de trois manches et des duels libres. ', chip('PV, decks, difficultés et déblocages : données de prototype, non canoniques', 'proto')],
    banner,
    h('section', { class: 'sh-series', 'aria-label': SERIES.title },
      h('div', { class: 'sh-series-head' },
        h('h2', null, SERIES.title),
        h('span', { class: 'sh-sub' }, prog.series.completed ? `Remportée ${prog.series.completed} fois · ` : '', `Manche ${Math.min(prog.series.step + 1, SERIES.steps.length)} sur ${SERIES.steps.length}${prog.series.step >= SERIES.steps.length ? ' — série terminée' : ''}`),
        prog.series.step >= SERIES.steps.length ? btn('Rejouer la série', () => { save.progress = replaySeries(prog); sh.persist(); sh.render(); }, { ghost: true, key: 'series-replay' }) : null),
      h('div', { class: 'sh-enc-grid series' }, series.map((e) => encounterCard(sh, e, encounterStatus(e, prog), !!active)))),
    h('section', { 'aria-label': 'Duels libres' },
      h('h2', null, 'Duels libres'),
      h('div', { class: 'sh-enc-grid' }, free.map((e) => encounterCard(sh, e, encounterStatus(e, prog), !!active)))),
    progressLog(sh),
    historyList(save.history.slice(-6).reverse()),
    h('div', { class: 'sh-actions' },
      btn('Accueil', () => sh.go({ type: 'home' }), { ghost: true, key: 'board-home' }),
      btn('Collection', () => sh.go({ type: 'open', screen: 'collection' }), { ghost: true, key: 'board-collection' }),
      btn('Deck', () => sh.go({ type: 'open', screen: 'deck' }), { ghost: true, key: 'board-deck' })));
}

function encounterCard(sh: Shell, e: Encounter, st: EncounterStatus, busy: boolean): HTMLElement {
  const p = personalityOf(e.rival);
  const r = RIVALS[e.rival];
  const rec = record(sh.save!.history, e.rival);
  const firstWin = !sh.save!.progress.defeated.includes(e.rival);
  const reward = FIRST_WIN_REWARDS[e.rival];
  return h('article', { class: cls('sh-enc', `fam-${p.family}`, `st-${st.state}`), 'data-encounter': e.id },
    h('img', { class: 'sh-face', src: portraitUrl(p, sh.params.artSeed), alt: `Portrait de ${p.name}` }),
    h('div', { class: 'sh-enc-body' },
      e.kind === 'series' ? h('p', { class: 'sh-kicker' }, `Manche ${e.step}`, st.state === 'done' ? ' · remportée ✓' : '') : null,
      h('h2', null, p.name, h('span', { class: 'fam-icon', html: emblemSvg(p.family, 16), title: `Famille ${p.family}` })),
      h('p', { class: 'sh-enc-title' }, p.title),
      h('div', { class: 'sh-chips' }, chip(DIFFICULTY_LABEL[r.difficulty], r.difficulty === 3 ? 'bad' : r.difficulty === 2 ? 'gold' : 'ok'), chip(`${r.hp} PV`, 'info'), chip(`Signature ${p.family}`, 'info')),
      h('p', { class: 'sh-enc-style' }, r.style),
      firstWin ? h('p', { class: 'sh-enc-reward' }, `Première victoire : ${reward.variants.length} variantes ${p.family}${reward.techniques.length ? ` + Technique ${reward.techniques.join(', ')}` : ''} (prototype)`) : null,
      h('p', { class: 'sh-enc-rec' }, rec.w + rec.l + rec.a ? `Bilan : ${rec.w} V · ${rec.l} D${rec.a ? ` · ${rec.a} abandon(s)` : ''}` : 'Jamais affronté'),
      st.open
        ? btn(e.kind === 'series' ? 'Jouer la manche' : 'Défier', () => sh.go({ type: 'prep', encounterId: e.id }), { key: `enc-${e.id}`, disabled: busy, title: busy ? 'Un duel est en cours' : undefined })
        : h('p', { class: 'sh-lock' }, st.state === 'done' ? '✓ Manche remportée' : `🔒 ${st.reason}`)));
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
  const next = sh.lastEffect?.series && !sh.lastEffect.series.completed ? ENCOUNTERS.find((x) => x.kind === 'series' && x.step === sh.lastEffect!.series!.step + 1) ?? null : null;
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
    effectPanel(sh),
    h('p', { class: 'sh-note' }, `Seed du duel ${r.seed} · Signature ${r.signature} — le duel est reproductible à l’identique.`),
    h('div', { class: 'sh-actions' },
      btn('Accueil', () => sh.go({ type: 'home' }), { ghost: true, key: 'result-home' }),
      sh.playable().includes(enc.id) ? btn(enc.kind === 'series' ? 'Rejouer la manche' : 'Revanche', () => sh.go({ type: 'prep', encounterId: enc.id }), { ghost: true, key: 'result-rematch' }) : null,
      next ? btn(`Manche suivante : ${personalityOf(next.rival).name}`, () => sh.go({ type: 'prep', encounterId: next.id }), { key: 'result-next', primary: true }) : null,
      btn('Retour aux rencontres', () => sh.go({ type: 'board' }), { key: 'result-board', primary: !next, ghost: !!next })));
}

/** Effets de progression du duel (prototype) : déblocages, manche franchie, série remportée + récapitulatif. */
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
  if (eff.unlocked.length) rows.push(h('div', { class: 'sh-unlocks' }, h('b', null, 'Nouveautés équipables '), chip('prototype', 'proto'), h('ul', null, eff.unlocked.map((u) => h('li', null, unlockLabel(u))))));
  else if (r.outcome === 'victory') rows.push(h('p', { class: 'sh-note' }, 'Ce rival a déjà été vaincu : pas de nouveau déblocage.'));
  else rows.push(h('p', { class: 'sh-note' }, 'Aucune progression sur une défaite ou un abandon ; la revanche reste possible.'));
  return rows.length ? h('section', { class: 'sh-effects', 'aria-label': 'Progression' }, ...rows) : null;
}

function stat(k: string, v: string): HTMLElement[] {
  return [h('dt', null, k), h('dd', null, v)] as unknown as HTMLElement[];
}

export type { DeckChoice };
export { EFFECTS };
