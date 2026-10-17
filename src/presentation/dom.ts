/** Mini-helper DOM sans framework (cf. ADR 002). */
type Child = Node | string | number | null | undefined | false;

/**
 * Écouteurs posés par `h` / `listen` : un répartiteur partagé par type d’événement lit la table de
 * l’élément. `patchChildren` reporte la table d’un élément neuf sur l’élément réutilisé : un élément
 * gardé se comporte exactement comme celui que le nouveau rendu aurait inséré (passe 13).
 */
const HANDLERS = new WeakMap<EventTarget, Map<string, EventListener[]>>();
function dispatch(this: EventTarget, e: Event): void {
  const list = HANDLERS.get(this)?.get(e.type);
  if (list) for (const fn of [...list]) fn.call(this, e);
}

/** Arbre en construction suivi par `tracked` : éléments à écouteurs et éléments `fresh`. */
let collecting: Node[] | null = null;

/** Écouteur transférable (équivalent d’`addEventListener` pour un élément rendu par `h`). */
export function listen<K extends keyof HTMLElementEventMap>(el: Element, type: K, fn: (e: HTMLElementEventMap[K]) => void): void;
export function listen(el: Element, type: string, fn: EventListener): void;
export function listen(el: Element, type: string, fn: EventListener): void {
  let map = HANDLERS.get(el);
  if (!map) HANDLERS.set(el, (map = new Map()));
  const list = map.get(type);
  if (list) list.push(fn);
  else map.set(type, [fn]);
  el.addEventListener(type, dispatch);
  collecting?.push(el);
}

/** Contenu `html` (SVG d’emblème, icônes) : comparé par sa chaîne. */
const HTML = new WeakMap<Element, string>();
/** Éléments toujours remplacés par leur version neuve (voir `fresh`). */
const FRESH = new WeakSet<Node>();

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> | null = null, ...children: Array<Child | Child[]>): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k.startsWith('on') && typeof v === 'function') listen(el, k.slice(2).toLowerCase(), v as EventListener);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  let kids = 0;
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    kids++;
  }
  // Contenu entièrement décrit par sa chaîne : comparé tel quel par `patchChildren`.
  if (!kids && typeof props?.html === 'string') HTML.set(el, props.html);
  return el;
}

export function cls(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ');
}

/**
 * Marque un élément NEUF pour qu’il remplace toujours l’élément en place lors d’un `patchChildren`,
 * même identique, comme le faisait le re-rendu complet : animation CSS relancée, focus donné par une
 * micro-tâche au nouvel élément, région `aria-live` recréée…
 */
export function fresh<T extends Node>(el: T, on = true): T {
  if (on) {
    FRESH.add(el);
    collecting?.push(el);
  }
  return el;
}

/**
 * Contexte d’un patch. `dirty` : nœuds du nouvel arbre qui contiennent un écouteur ou un élément
 * `fresh`. `animated` : éléments en place animés (voir `animatedIn`), `live` : eux et leurs ancêtres.
 */
interface PatchContext { dirty: Set<Node>; animated: Set<Element>; live: Set<Node> }

/**
 * Construit un arbre neuf en relevant ses éléments à écouteurs et ses éléments `fresh` : `patchChildren`
 * peut alors garder d’un bloc (comparaison native `isEqualNode`) tout sous-arbre identique qui n’en
 * contient aucun.
 */
export function tracked<T extends Node>(build: () => T): { tree: T; ctx: PatchContext } {
  const prev = collecting;
  const seen: Node[] = [];
  collecting = seen;
  let tree: T;
  try {
    tree = build();
  } finally {
    collecting = prev;
  }
  const dirty = new Set<Node>();
  for (const n of seen) for (let p: Node | null = n; p && !dirty.has(p); p = p.parentNode) dirty.add(p);
  return { tree, ctx: { dirty, animated: new Set(), live: new Set() } };
}

/**
 * Éléments de `root` portant une animation en cours (CSS, transition ou Web Animations) : le
 * re-rendu complet les recréait, ce qui arrêtait l’animation (ou la relançait) ; `patchChildren` les
 * remplace donc aussi par leur version neuve plutôt que de les garder.
 */
export function animatedIn(root: Element): Pick<PatchContext, 'animated' | 'live'> {
  const out = { animated: new Set<Element>(), live: new Set<Node>() };
  for (const a of document.getAnimations()) {
    const t = (a.effect as KeyframeEffect | null)?.target ?? null;
    if (!t || !root.contains(t) || t === root) continue;
    out.animated.add(t);
    for (let p: Node | null = t; p && p !== root && !out.live.has(p); p = p.parentNode) out.live.add(p);
  }
  return out;
}

const keyOf = (n: Node): string | null => (n.nodeType === 1 ? (n as Element).getAttribute('data-key') : null);

/** Mêmes noms d’attributs, dans le même ordre, et mêmes valeurs. */
function sameAttributes(a: Element, b: Element): boolean {
  const na = a.getAttributeNames();
  const nb = b.getAttributeNames();
  if (na.length !== nb.length) return false;
  for (let i = 0; i < na.length; i++) {
    if (na[i] !== nb[i] || a.getAttribute(na[i]!) !== b.getAttribute(nb[i]!)) return false;
  }
  return true;
}

/** Un nœud en place peut-il prendre la place de `next` ? (même nature, même balise, mêmes classes) */
function compatible(live: Node, next: Node): boolean {
  if (live.nodeType !== next.nodeType) return false;
  if (live.nodeType !== 1) return true;
  const a = live as Element;
  const b = next as Element;
  return a.localName === b.localName && a.namespaceURI === b.namespaceURI && a.getAttribute('class') === b.getAttribute('class');
}

/**
 * Élément sous un pointeur souris avec des écouteurs de survol : le re-rendu complet le recréait et le
 * navigateur annonçait l’entrée du pointeur sur l’élément neuf (inspection) ; on le remplace donc.
 */
function hovered(el: Element): boolean {
  const map = HANDLERS.get(el);
  return !!map && (map.has('pointerenter') || map.has('pointerover') || map.has('mouseenter') || map.has('mouseover')) && el.matches(':hover');
}

/** Garde `live` (mis à jour) ou renvoie `next` qui doit le remplacer. */
function reconcile(live: Node, next: Node, ctx: PatchContext | null): Node {
  if (live.nodeType === 3 || live.nodeType === 8) {
    if ((live as CharacterData).data !== (next as CharacterData).data) (live as CharacterData).data = (next as CharacterData).data;
    return live;
  }
  if (live.nodeType !== 1) return next;
  const a = live as Element;
  const b = next as Element;
  // Sous-arbre identique, sans écouteur, élément `fresh` ni animation en cours : rien à faire.
  if (ctx && !ctx.dirty.has(b) && !ctx.live.has(a) && a.isEqualNode(b)) return a;
  // Toute différence d’attribut (classe, style, état…) : élément neuf, exactement comme le re-rendu
  // complet, de sorte qu’aucune transition CSS ne démarre là où elle ne démarrait pas avant.
  if (FRESH.has(b) || ctx?.animated.has(a) || !sameAttributes(a, b) || hovered(a)) return next;
  const html = HTML.get(b);
  if (html !== undefined || HTML.has(a)) {
    if (HTML.get(a) !== html) return next;
  } else patchChildren(a, b, ctx);
  const map = HANDLERS.get(b);
  if (map) {
    HANDLERS.set(a, map);
    for (const type of map.keys()) a.addEventListener(type, dispatch);
  } else HANDLERS.delete(a);
  return a;
}

/**
 * Rend les enfants de `live` identiques à ceux de `next` (arbre neuf, hors document) en réutilisant
 * les nœuds en place qui n’ont pas changé. Appariement par `data-key`, sinon par le premier nœud
 * compatible (même balise, mêmes classes) qui suit le dernier apparié. Résultat : le même DOM que
 * `live.replaceChildren(...next.childNodes)`, nœud pour nœud et attribut pour attribut, mais le
 * navigateur ne recalcule que ce qui a changé. Les attributs de `live` lui-même ne sont pas touchés.
 * `ctx` (voir `tracked`) permet de garder d’un bloc les sous-arbres identiques.
 */
export function patchChildren(live: Node, next: Node, ctx: PatchContext | null = null): void {
  const liveKids = Array.from(live.childNodes);
  const nextKids = Array.from(next.childNodes);
  const keyed = new Map<string, Node>();
  const liveKeys = liveKids.map(keyOf);
  liveKids.forEach((n, i) => { const k = liveKeys[i]; if (k !== null && !keyed.has(k!)) keyed.set(k!, n); });
  const used = new Set<Node>();
  const want: Node[] = [];
  let cursor = 0;
  for (const n of nextKids) {
    const k = keyOf(n);
    let old: Node | undefined;
    if (k !== null) {
      old = keyed.get(k);
      if (old) keyed.delete(k);
      if (old && !compatible(old, n)) old = undefined;
    } else {
      for (let j = cursor; j < liveKids.length; j++) {
        const cand = liveKids[j]!;
        if (liveKeys[j] !== null || used.has(cand) || !compatible(cand, n)) continue;
        old = cand;
        cursor = j + 1;
        break;
      }
    }
    if (old) used.add(old);
    want.push(old ? reconcile(old, n, ctx) : n);
  }
  const keep = new Set(want);
  // Un retrait peut déclencher des écouteurs qui modifient le DOM (`blur` d’un élément focalisé) :
  // on ne retire que ce qui est encore là, puis on écarte tout nœud resté en trop.
  for (const n of liveKids) if (!keep.has(n) && n.parentNode === live) live.removeChild(n);
  for (let i = 0; i < want.length; i++) {
    const cur = live.childNodes[i] ?? null;
    if (cur !== want[i]) live.insertBefore(want[i]!, cur);
  }
  while (live.childNodes.length > want.length) live.removeChild(live.lastChild!);
}

const handlerTypes = (n: Node): string => [...(HANDLERS.get(n)?.entries() ?? [])].filter(([, l]) => l.length).map(([t, l]) => `${t}×${l.length}`).sort().join(',');

/**
 * QA : première différence entre les enfants de `live` et ceux de `ref` (structure, attributs dans
 * l’ordre, textes, écouteurs posés par `h`), ou `null` s’ils sont identiques.
 */
export function domDifference(live: Node, ref: Node, path = ''): string | null {
  const a = live.childNodes;
  const b = ref.childNodes;
  const list = (l: NodeListOf<ChildNode>) => Array.from(l, (n) => (n.nodeType === 1 ? `${(n as Element).localName}.${(n as Element).getAttribute('class') ?? ''}` : '#text')).join(' | ');
  if (a.length !== b.length) return `${path || 'racine'} : ${a.length} enfants au lieu de ${b.length} [${list(a)}] au lieu de [${list(b)}]`;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    const here = `${path}/${y.nodeType === 1 ? `${(y as Element).localName}${(y as Element).getAttribute('class') ? `.${(y as Element).getAttribute('class')!.replace(/\s+/g, '.')}` : ''}` : '#text'}[${i}]`;
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) return `${here} : ${x.nodeName} au lieu de ${y.nodeName}`;
    if (x.nodeType !== 1) {
      if ((x as CharacterData).data !== (y as CharacterData).data) return `${here} : texte « ${(x as CharacterData).data} » au lieu de « ${(y as CharacterData).data} »`;
      continue;
    }
    const attrs = (e: Element) => e.getAttributeNames().map((n) => `${n}="${e.getAttribute(n)?.slice(0, 40)}"`).join(' ');
    if (!sameAttributes(x as Element, y as Element)) return `${here} : attributs ${attrs(x as Element)} au lieu de ${attrs(y as Element)}`;
    if (handlerTypes(x) !== handlerTypes(y)) return `${here} : écouteurs [${handlerTypes(x)}] au lieu de [${handlerTypes(y)}]`;
    const d = domDifference(x, y, here);
    if (d) return d;
  }
  return null;
}
