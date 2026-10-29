/**
 * Éditeur de l'apparence du protagoniste (passe 165 ; décisions du responsable : « Silhouette » avec deux vignettes,
 * jamais un mot genré ; peau, cheveux et yeux au choix ; à la « Nouvelle aventure » et dans le menu). La vignette montre
 * la case de face au repos de la feuille de la silhouette, repeinte par les mêmes fonctions que le jeu (`teintes.ts`) et
 * aux couleurs de la tenue. Passe 167 : une coupe de plus par silhouette (« Coupe », vignettes). Une silhouette ou une coupe
 * n'est proposée que si sa feuille est admise (approuvée, ou en QA).
 */
import { h } from '../shell/ui';
import { APPARENCE_DEFAUT, CHEVEUX, COUPES, PEAUX, YEUX, estOrigine, feuilleApparence, idJoueur, type Apparence, type Silhouette } from '../ville/apparence';
import { recolorTargets } from '../ville/sprites';
import { RAMP_STEPS, RECOLOR_KEYS, RECOLOR_LEVELS, admit, spritePolicy, type SpriteManifest } from '../ville/spritesExternes';
import { classerTeintes, repeindre } from '../ville/teintes';

const NOMS_PEAU = ['très claire', 'claire', 'mate', 'dorée', 'brune', 'foncée'];
const NOMS_CHEVEUX = ['argent', 'noir', 'brun foncé', 'châtain', 'auburn', 'blond foncé', 'brun cendré', 'gris', 'roux vif', 'bleu nuit'];
const NOMS_YEUX = ['bleus', 'verts', 'bruns', 'ambre', 'gris', 'violets'];

interface FeuilleLue { im: HTMLImageElement; cell: [number, number]; scale: number }
let manifeste: Promise<SpriteManifest | null> | null = null;
const images = new Map<string, Promise<FeuilleLue | null>>();

function lireManifeste(): Promise<SpriteManifest | null> {
  manifeste ??= fetch('sprites/manifest.json', { cache: 'no-store' }).then((r) => (r.ok ? (r.json() as Promise<SpriteManifest>) : null)).catch(() => null);
  return manifeste;
}

/** Coupes proposées de chaque silhouette (indices de `COUPES`) : celles dont la feuille est admise par la politique du jeu
 *  (approuvée, ou QA) ; la coupe d'origine de la silhouette A toujours. */
export type Disponibles = Record<Silhouette, number[]>;
export async function coupesDisponibles(qa: boolean, sprites: string | null): Promise<Disponibles> {
  const m = await lireManifeste();
  const pol = spritePolicy(qa, sprites);
  const ok = (s: Silhouette, i: number) => (s === 'a' && i === 0) || (!!m?.sprites[COUPES[s][i]!.feuille] && admit(pol, m.sprites[COUPES[s][i]!.feuille]!.approved).ok);
  return { a: COUPES.a.map((_, i) => i).filter((i) => ok('a', i)), b: COUPES.b.map((_, i) => i).filter((i) => ok('b', i)) };
}

function feuille(cle: string): Promise<FeuilleLue | null> {
  let p = images.get(cle);
  if (!p) {
    p = lireManifeste().then(async (m) => {
      const e = m?.sprites[cle] as { file: string; cell?: [number, number]; scale: number } | undefined;
      if (!e?.cell) return null;
      const im = new Image();
      im.src = `sprites/${e.file}`;
      await im.decode();
      return { im, cell: e.cell, scale: e.scale };
    }).catch(() => null);
    images.set(cle, p);
  }
  return p;
}

/** Vignette : case de face au repos, repeinte (peau, cheveux, yeux) et aux couleurs de la tenue, agrandie `z` fois. */
export function vignette(a: Apparence, tenue: string, z = 3): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.className = 'av-vignette';
  void feuille(feuilleApparence(a)).then((f) => {
    if (!f) return;
    const [cw, ch] = f.cell;
    const art = document.createElement('canvas');
    art.width = cw * 5;
    art.height = ch * 3;
    const g = art.getContext('2d', { willReadFrequently: true })!;
    g.imageSmoothingEnabled = false;
    g.drawImage(f.im, 0, 0, art.width, art.height);
    const tout = g.getImageData(0, 0, art.width, art.height);
    const px = { px: tout.data, w: art.width, h: art.height };
    if (!estOrigine(a)) repeindre(px, classerTeintes(px, cw, ch), { peau: PEAUX[a.peau], cheveux: CHEVEUX[a.cheveux], yeux: YEUX[a.yeux] });
    // tons clés de la tenue et de l'accent, comme le nuanceur
    const cibles = recolorTargets(idJoueur(tenue, a));
    for (let p = 0; p < tout.data.length; p += 4) {
      for (const slot of ['tenue', 'accent'] as const) {
        const m = RECOLOR_KEYS[slot];
        const n = RECOLOR_LEVELS.findIndex((l) => tout.data[p] === m[0] * l && tout.data[p + 1] === m[1] * l && tout.data[p + 2] === m[2] * l);
        const t = cibles[slot];
        if (n < 0 || !t) continue;
        const hex = t[RAMP_STEPS[n]!];
        tout.data.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)], p);
      }
    }
    g.putImageData(tout, 0, 0);
    c.width = cw * z;
    c.height = ch * z;
    const v = c.getContext('2d')!;
    v.imageSmoothingEnabled = false;
    v.drawImage(art, 0, 0, cw, ch, 0, 0, c.width, c.height);
  });
  return c;
}

/**
 * Éditeur : vignette de l'apparence en cours, choix de la silhouette et de la coupe (vignettes), de la peau, des cheveux et
 * des yeux (pastilles). `change` reçoit chaque nouvelle apparence ; changer de silhouette reprend ses couleurs d'origine.
 */
export function editeurApparence(o: { valeur: Apparence; tenue: string; coupes: Disponibles; change: (a: Apparence) => void }): HTMLElement {
  const silhouettes = (['a', 'b'] as const).filter((s) => o.coupes[s].length > 0);
  let a: Apparence = o.coupes[o.valeur.silhouette].includes(o.valeur.coupe ?? 0) ? { ...o.valeur } : { ...APPARENCE_DEFAUT.a };
  const racine = h('div', { class: 'av-apparence', 'data-key': 'av-apparence' });
  const rendre = () => {
    racine.replaceChildren(
      h('div', { class: 'av-ap-apercu' }, vignette(a, o.tenue, 2)),
      h('div', { class: 'av-ap-choix' },
        silhouettes.length > 1 ? ligne('Silhouette', silhouettes.map((s) => {
          const c0 = o.coupes[s][0]!;
          const b = h('button', { type: 'button', class: `av-ap-sil${a.silhouette === s ? ' choisi' : ''}`, 'data-key': `av-ap-sil-${s}`, 'aria-pressed': a.silhouette === s ? 'true' : 'false', 'aria-label': `Silhouette ${s.toUpperCase()}`, onclick: () => choisir({ ...APPARENCE_DEFAUT[s], ...(c0 ? { coupe: c0 } : {}) }) },
            vignette({ silhouette: s, peau: a.peau, cheveux: a.cheveux, yeux: a.yeux, ...(c0 ? { coupe: c0 } : {}) }, o.tenue, 1), h('span', null, s.toUpperCase()));
          return b;
        })) : null,
        o.coupes[a.silhouette].length > 1 ? ligne('Coupe', o.coupes[a.silhouette].map((i) => {
          const nom = COUPES[a.silhouette][i]!.nom;
          const choisie = (a.coupe ?? 0) === i;
          return h('button', { type: 'button', class: `av-ap-sil${choisie ? ' choisi' : ''}`, 'data-key': `av-ap-coupe-${i}`, 'aria-pressed': choisie ? 'true' : 'false', 'aria-label': `Coupe ${nom}`, title: nom, onclick: () => { const { coupe: _, ...reste } = a; choisir({ ...reste, ...(i ? { coupe: i } : {}) }); } },
            vignette({ ...a, ...(i ? { coupe: i } : { coupe: undefined }) }, o.tenue, 1), h('span', null, nom));
        })) : null,
        ligne('Peau', PEAUX.map((t, i) => pastille(t.base, `Peau ${NOMS_PEAU[i] ?? i + 1}`, a.peau === i, `av-ap-peau-${i}`, () => choisir({ ...a, peau: i })))),
        ligne('Cheveux', CHEVEUX.map((t, i) => pastille(t.base, `Cheveux ${NOMS_CHEVEUX[i] ?? i + 1}`, a.cheveux === i, `av-ap-cheveux-${i}`, () => choisir({ ...a, cheveux: i })))),
        ligne('Yeux', YEUX.map((y, i) => pastille(y.iris, `Yeux ${NOMS_YEUX[i] ?? i + 1}`, a.yeux === i, `av-ap-yeux-${i}`, () => choisir({ ...a, yeux: i })))),
      ),
    );
  };
  const choisir = (n: Apparence) => { a = n; o.change(a); rendre(); };
  rendre();
  return racine;
}

const ligne = (titre: string, items: HTMLElement[]) => h('div', { class: 'av-ap-ligne' }, h('span', { class: 'av-ap-titre' }, titre), h('div', { class: 'av-ap-items' }, ...items));
const pastille = (couleur: string, nom: string, choisi: boolean, key: string, run: () => void) =>
  h('button', { type: 'button', class: `av-ap-pastille${choisi ? ' choisi' : ''}`, style: `background:${couleur}`, title: nom, 'aria-label': nom, 'aria-pressed': choisi ? 'true' : 'false', 'data-key': key, onclick: run });
