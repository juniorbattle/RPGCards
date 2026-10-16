/** Rendu DOM d’une carte : illustration procédurale + typographie de règle (Rang ≠ Puissance). */
import { cardDef, cardTitle, EFFECTS, rankLabel, type CardDef } from '../game/catalog/cards';
import { cardArtUrl, cardBackUrl } from '../art/cardArt';
import { emblemSvg } from '../art/emblems';
import { cls, h } from './dom';

export type CardVisualState = 'charging' | 'hidden' | 'active' | 'draft' | 'masked' | null;

const BANNER: Record<Exclude<CardVisualState, null>, string> = {
  charging: 'CHARGEMENT · INUTILISABLE',
  hidden: 'RÉSERVE CACHÉE · INACTIVE',
  active: 'ACTIVE · PRÊTE',
  draft: 'NON VERROUILLÉE',
  masked: 'ACTIVE · MASQUÉE',
};

export function cardAria(def: CardDef, state: CardVisualState = null): string {
  const parts = [cardTitle(def), `famille ${def.family}`, def.signature ? 'Signature, priorité infinie' : `Rang ${def.rank}`, `Puissance ${def.power}`, `rareté ${def.rarity}`];
  if (def.effect) parts.push(`effet ${EFFECTS[def.effect].name} : ${EFFECTS[def.effect].text}`);
  if (state) parts.push(`état ${BANNER[state]}`);
  return parts.join(', ');
}

export interface CardOpts {
  artSeed: number;
  classes?: Array<string | false | null | undefined>;
  state?: CardVisualState;
  banner?: string | null;
  tag?: 'button' | 'div';
  attrs?: Record<string, unknown>;
}

export function cardEl(defId: string, o: CardOpts): HTMLElement {
  const def = cardDef(defId);
  const state = o.state ?? null;
  const tag = o.tag ?? 'button';
  const el = h(tag as 'button', {
    class: cls('card', `fam-${def.family}`, `rar-${def.rarity}`, state && `st-${state}`, ...(o.classes ?? [])),
    'aria-label': cardAria(def, state),
    type: tag === 'button' ? 'button' : null,
    'data-def': defId,
    ...(o.attrs ?? {}),
  },
  h('img', { class: 'art', src: cardArtUrl(defId, o.artSeed), alt: '', draggable: 'false' }),
  h('span', { class: 'frame' }),
  h('span', { class: 'rank', 'aria-hidden': 'true' }, rankLabel(def)),
  h('span', { class: 'fam', html: emblemSvg(def.family, 24) }),
  h('span', { class: 'plate' },
    h('span', { class: 'name' }, def.signature ? def.name : def.name),
    h('span', { class: 'variant' }, def.signature ? `Signature · ${def.effect ? EFFECTS[def.effect].name : ''}` : def.effect ? EFFECTS[def.effect].name : 'Basic'),
    h('span', { class: 'stats' }, h('span', { class: 'r', title: 'Rang : priorité du Clash' }, `R ${def.rank ?? '∞'}`), h('span', { class: 'p', title: 'Puissance : dégâts / absorption' }, `P ${def.power}`)),
  ),
  state || o.banner ? h('span', { class: 'state-banner' }, o.banner ?? (state ? BANNER[state] : '')) : null,
  );
  return el;
}

/** Verso commun : aucune information d’identité (ni defId, ni instance) dans le DOM. */
export function backEl(artSeed: number, o: { state?: 'charging' | 'hidden' | 'masked' | null; banner?: string | null; classes?: string[]; label?: string } = {}): HTMLElement {
  const st = o.state ?? null;
  const banner = o.banner ?? (st === 'charging' ? 'CHARGEMENT' : st === 'hidden' ? 'CACHÉE · INACTIVE' : st === 'masked' ? 'ACTIVE · MASQUÉE' : null);
  return h('div', { class: cls('card', 'back', st && `st-${st}`, ...(o.classes ?? [])), 'aria-label': o.label ?? 'Carte face cachée' },
    h('img', { class: 'art', src: cardBackUrl(artSeed), alt: '', draggable: 'false' }),
    h('span', { class: 'frame' }),
    banner ? h('span', { class: 'state-banner' }, banner) : null,
  );
}
