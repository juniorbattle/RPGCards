/**
 * Éditeur de deck (M04) et collection (consultation) — 16 identités × (Basic | variante possédée),
 * 1 Signature, 2 Techniques ; validation en direct par `validateDeck` (catalogue canonique).
 * Rien n’est enregistré tant que le deck n’est pas légal ; un deck illégal ne lance aucun duel.
 */
import { CATALOG, EFFECTS, FAMILIES, FAMILY_THEME, cardDef, rankLabel, SIGNATURES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS } from '../game/catalog/techniques';
import { emblemSvg } from '../art/emblems';
import { cardEl } from '../presentation/cardView';
import { deckDefs, deckSummary, equippedFor, setVersion, toggleTechnique, validateDeck, variantsOf } from '../product/deck';
import { unlockHint } from './unlockText';
import type { Shell } from './shell';
import { techGrid } from './screens';
import { btn, chip, cls, h, screen } from './ui';
import { iconSvg } from './icons';

const RANKS = [1, 2, 3, 4] as const;

/** Carte inspectée dans l’éditeur / la collection (état local d’affichage). */
let inspected: string | null = null;
let familyFilter: Family | 'all' = 'all';
/** Carte qui vient d’être choisie : animée une fois au rendu suivant (M07 L4). */
let picked: string | null = null;

export function renderDeck(sh: Shell, collectionMode = false): HTMLElement {
  const el = collectionMode ? renderCollection(sh) : renderEditor(sh);
  picked = null;
  return el;
}

function renderEditor(sh: Shell): HTMLElement {
  const save = sh.save!;
  const draft = sh.deckDraft ?? (sh.deckDraft = structuredClone(save.deck));
  const owned = sh.collection();
  const issues = validateDeck(draft, owned);
  const dirty = JSON.stringify(draft) !== JSON.stringify(save.deck);
  const sum = deckSummary(draft);
  const set = (next: typeof draft) => { sh.deckDraft = next; sh.render(); };
  const grid = h('div', { class: 'sh-deck-grid', role: 'grid', 'aria-label': '16 identités ordinaires : famille × Rang' },
    FAMILIES.map((f) => h('div', { class: cls('sh-fam-col', `fam-${f}`), role: 'rowgroup' },
      h('h3', { class: 'sh-fam-head' }, h('span', { class: 'fam-icon', html: emblemSvg(f, 16) }), f, h('small', null, FAMILY_THEME[f])),
      RANKS.map((r) => {
        const identity = `${f}-${r}`;
        const cur = equippedFor(draft, identity);
        const variant = variantsOf(identity)[0]!;
        const has = owned.variants.includes(variant);
        const vd = cardDef(variant);
        // M07 L4 : les deux versions sont deux cartes côte à côte ; on choisit en cliquant la carte (radio).
        const basic = `${identity}-basic`;
        const pick = (id: string, v: string | null) => { inspected = id; picked = id; set(setVersion(draft, identity, v)); };
        return h('div', { class: 'sh-ident', role: 'row', 'data-identity': identity },
          h('div', { class: 'sh-ident-opts', role: 'radiogroup', 'aria-label': `Version de ${f} ${rankLabel(vd)}` },
            h('button', { class: cls('sh-ver', cur === basic && 'on', picked === basic && 'just'), type: 'button', role: 'radio', 'aria-checked': String(cur === basic), 'data-key': `ver-${identity}-basic`, 'aria-label': `${cardDef(basic).name} Basic`, title: 'Basic', onclick: () => pick(basic, null) },
              cardEl(basic, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-mini'] })),
            h('button', {
              class: cls('sh-ver', cur === variant && 'on', !has && 'locked', picked === variant && 'just'), type: 'button', role: 'radio', 'aria-checked': String(cur === variant), 'data-key': `ver-${identity}-variant`,
              disabled: has ? null : true, 'aria-label': `${vd.name} — ${EFFECTS[vd.effect!].name}${has ? '' : ' (verrouillée)'}`,
              title: has ? `${EFFECTS[vd.effect!].name} (${vd.rarity}) : ${EFFECTS[vd.effect!].text}` : unlockHint(variant),
              onclick: () => pick(variant, variant),
            }, cardEl(variant, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-mini'] }), has ? null : h('span', { class: 'sh-lock-badge', html: iconSvg('lock', 18) }))),
          h('button', { class: 'sh-ident-card', type: 'button', 'data-key': `inspect-${identity}`, 'aria-label': `Inspecter ${cardDef(cur).name}`, title: 'Inspecter', onclick: () => { inspected = cur; sh.render(); }, html: iconSvg('help', 16) }));
      }))));
  return screen('deck', 'Votre deck', [chip(issues.length ? `${issues.length} problème(s)` : 'Deck légal', issues.length ? 'bad' : 'ok'), dirty ? chip('modifications non enregistrées', 'gold') : null],
    h('div', { class: 'sh-deck-layout' },
      h('div', { class: 'sh-deck-main' },
        h('section', { 'aria-label': 'Signature' },
          h('h2', null, 'Signature ∞ (Primaire uniquement)'),
          h('div', { class: 'sh-sig-row', role: 'radiogroup', 'aria-label': 'Signature' }, FAMILIES.map((f) => {
            const has = owned.signatures.includes(f);
            return h('button', { class: cls('sh-sig', draft.signature === f && 'on', !has && 'locked', picked === `sig-${f}` && 'just'), type: 'button', role: 'radio', 'aria-checked': String(draft.signature === f), 'data-key': `deck-sig-${f}`, disabled: has ? null : true, title: `${SIGNATURES[f].name} · Puissance ${SIGNATURES[f].power}`, onclick: () => { inspected = `sig-${f}`; picked = `sig-${f}`; set({ ...draft, signature: f }); } },
              cardEl(`sig-${f}`, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-mini'] }));
          }))),
        h('section', { 'aria-label': 'Identités ordinaires' }, h('h2', null, `Identités ordinaires — ${sum.variants} variante(s), ${16 - sum.variants} Basic`), grid),
        h('section', { 'aria-label': 'Techniques' },
          h('h2', null, `Techniques équipées (${draft.techniques.length}/2)`),
          techGrid(owned.techniques, draft.techniques, (t) => set(toggleTechnique(draft, t)), 'deck-tech', TECHNIQUE_IDS, (t) => unlockHint(t)))),
      h('aside', { class: 'sh-deck-side' },
        inspectPanel(sh, inspected ?? `sig-${draft.signature}`),
        h('div', { class: 'sh-deck-status', role: 'status' },
          h('h2', null, 'État du deck'),
          h('p', null, `${deckDefs(draft).length} cartes · 16 identités uniques · Signature ${draft.signature} · ${draft.techniques.join(' + ') || 'aucune Technique'}`),
          issues.length ? h('ul', { class: 'sh-issues' }, issues.map((i) => h('li', null, i.text))) : h('p', { class: 'ok' }, 'Légal : prêt pour le duel.'),
          h('p', { class: 'sh-note' }, 'Une variante remplace la version Basic de son identité : jamais une carte de plus, jamais un bonus de Puissance.')))),
    h('div', { class: 'sh-actions' },
      btn('Retour', () => void sh.leaveConsult(), { ghost: true, key: 'deck-back' }),
      btn('Annuler les modifications', () => set(structuredClone(save.deck)), { ghost: true, key: 'deck-reset', disabled: !dirty }),
      btn('Enregistrer le deck', () => {
        if (validateDeck(draft, owned).length) { sh.toast('Deck illégal : corrigez les problèmes listés.', 'error'); return; }
        save.deck = structuredClone(draft);
        if (sh.persist()) sh.toast('Deck enregistré.', 'ok');
        sh.render();
      }, { key: 'deck-save', primary: true, disabled: !dirty || issues.length > 0 })));
}

function inspectPanel(sh: Shell, defId: string): HTMLElement {
  const d = CATALOG[defId] ?? cardDef('sig-Cendre');
  const eff = d.effect ? EFFECTS[d.effect] : null;
  return h('section', { class: 'sh-inspect', 'aria-label': 'Inspection de carte', 'aria-live': 'polite' },
    cardEl(d.defId, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-big'] }),
    h('div', null,
      h('h3', null, d.signature ? d.name : `${d.name}${eff ? ` — ${eff.name}` : ''}`),
      h('p', { class: 'sh-rp' }, h('span', { class: 'r' }, `Rang ${rankLabel(d)}`), ' = priorité du Clash · ', h('span', { class: 'p' }, `Puissance ${d.power}`), ' = dégâts et absorption'),
      h('p', null, `${d.family} · ${d.rarity}`),
      eff ? h('p', null, h('b', null, `${eff.role}. `), eff.text) : h('p', null, 'Basic : aucun effet individuel ; Rang et Puissance de référence (3 / 6 / 9 / 12).')));
}

/** Collection : les 36 définitions du catalogue initial et les 6 Techniques, possédées ou non. */
function renderCollection(sh: Shell): HTMLElement {
  const owned = sh.collection();
  const deck = sh.save?.deck;
  const inDeck = new Set(deck ? deckDefs(deck) : []);
  const fams = familyFilter === 'all' ? FAMILIES : [familyFilter];
  const ownedCount = owned.variants.length + 16 + owned.signatures.length;
  let k = 0;
  const filters = h('div', { class: 'sh-filters', role: 'radiogroup', 'aria-label': 'Filtrer par famille' },
    (['all', ...FAMILIES] as const).map((f) => h('button', { class: cls('sh-filter', familyFilter === f && 'on'), type: 'button', role: 'radio', 'aria-checked': String(familyFilter === f), 'data-key': `filter-${f}`, onclick: () => { familyFilter = f; sh.render(); } }, f === 'all' ? 'Toutes' : f)));
  return screen('collection', 'Collection', [`${ownedCount} cartes équipables sur 36 · ${owned.techniques.length} Techniques sur 6. `, sh.save?.options.fullCollection ? chip('mode démo : collection complète', 'proto') : chip('déblocages de prototype', 'proto')],
    h('div', { class: 'sh-deck-layout' },
      h('div', { class: 'sh-deck-main' },
        filters,
        fams.map((f) => {
          const ids = [...RANKS.flatMap((r) => [`${f}-${r}-basic`, ...variantsOf(`${f}-${r}`)]), `sig-${f}`];
          const hasId = (id: string) => { const d = cardDef(id); return d.rarity === 'Basic' || (d.signature ? owned.signatures.includes(f) : owned.variants.includes(id)); };
          const n = ids.filter(hasId).length;
          return h('section', { class: cls('sh-coll-fam', `fam-${f}`), 'aria-label': `Famille ${f}` },
          h('h2', null, h('span', { class: 'fam-icon', html: emblemSvg(f, 16) }), ` ${f} `, h('span', { class: 'sh-count', 'aria-label': `${n} cartes possédées sur ${ids.length}` }, h('span', { class: 'bar', style: `--k:${(n / ids.length).toFixed(3)}`, 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }, `${n}/${ids.length}`)), h('small', null, FAMILY_THEME[f])),
          h('div', { class: 'sh-coll-row' },
            ids.map((id) => {
              const d = cardDef(id);
              const has = hasId(id);
              // M07 L4 : l’état se lit à l’image (coche verte = dans le deck, silhouette + cadenas = à débloquer).
              return h('button', { class: cls('sh-coll-card', 'sh-in', !has && 'locked', inDeck.has(id) && 'in-deck'), style: `--i:${k++}`, type: 'button', 'data-key': `coll-${id}`, title: inDeck.has(id) ? 'Dans le deck' : has ? 'Possédée' : unlockHint(id), 'aria-label': `${d.name}${d.effect ? ` — ${EFFECTS[d.effect].name}` : ''}${has ? '' : ` (non possédée : ${unlockHint(id)})`}${inDeck.has(id) ? ', dans votre deck' : ''}`, onclick: () => { inspected = id; sh.render(); } },
                cardEl(id, { artSeed: sh.params.artSeed, tag: 'div', classes: ['sh-mini'] }),
                inDeck.has(id) ? h('span', { class: 'sh-badge ok', html: iconSvg('check', 14) }) : null,
                has ? null : h('span', { class: 'sh-lock-badge', html: iconSvg('lock', 20) }));
            })));
        }),
        h('section', { 'aria-label': 'Techniques' }, h('h2', null, 'Techniques'), techGrid(owned.techniques, deck?.techniques ?? [], () => {}, 'coll-tech', TECHNIQUE_IDS, (t) => unlockHint(t)))),
      h('aside', { class: 'sh-deck-side' }, inspectPanel(sh, inspected ?? 'sig-Cendre'))),
    h('div', { class: 'sh-actions' },
      btn('Retour', () => void sh.leaveConsult(), { ghost: true, key: 'coll-back' }),
      sh.save ? btn('Modifier le deck', () => sh.go({ type: 'open', screen: 'deck' }), { key: 'coll-deck', primary: true }) : null));
}
