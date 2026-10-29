/**
 * Apparence du protagoniste (demande du responsable du 2026-10-29 : un personnage personnalisable ; décisions de la session
 * « protagoniste », passe 164 : deux silhouettes nommées « Silhouette » sans mot genré, peau, cheveux et yeux au choix
 * par code ; une coupe et un visage par silhouette pour l'instant). Pur.
 *
 * L'apparence voyage dans l'identifiant du personnage : `player-<Famille>` pour la silhouette A aux couleurs d'origine
 * (identifiant historique, rendu inchangé), sinon `player-<Famille>@<code>` (`b300` : silhouette, peau, cheveux, yeux ;
 * `a1300` : silhouette, coupe, peau, cheveux, yeux, quand la coupe n'est pas la première ; `a12300` : silhouette, coupe,
 * visage, peau, cheveux, yeux, quand le visage n'est pas celui d'origine). Passe 167 : une coupe de plus par silhouette,
 * chacune sa feuille. Passe 170 : trois visages de plus, chacun redessiné sur chaque feuille (`<feuille>-v<visage>`).
 */
import { NPC_HAIRS, NPC_SKINS, type Tone } from '../presentation/npcs';

export type Silhouette = 'a' | 'b';
export interface Apparence {
  silhouette: Silhouette; peau: number; cheveux: number; yeux: number;
  /** Coupe (`COUPES`) ; absente : la première. */
  coupe?: number;
  /** Visage (`VISAGES`) ; absent : celui de la feuille. */
  visage?: number;
}
/** Visages : celui de chaque feuille, puis trois redessinés sur chaque feuille (`<feuille>-v<k>`, passe 170). */
export const VISAGES: readonly string[] = ['d’origine', 'yeux en amande', 'rond', 'anguleux'];
/** Coupe d'une silhouette : sa feuille (clé du manifeste), son nom, la coupe du portrait du duel et celle de l'atlas par code. */
export interface Coupe { feuille: string; nom: string; portrait: 'carre' | 'court'; atlas: 'carre-argent' | 'courte' | 'queue' | 'milongs' }
export interface Yeux { iris: string; deep: string; light: string }

const T = (base: string, shade: string, deep: string, hi: string): Tone => ({ base, shade, deep, hi });

/** Six carnations, de la plus claire à la plus foncée (celles des PNJ). */
export const PEAUX: readonly Tone[] = NPC_SKINS;
/** Cheveux : l'argent du protagoniste d'abord, puis les couleurs naturelles des PNJ et deux de fantaisie. */
export const CHEVEUX: readonly Tone[] = [
  T('#dfe2ef', '#b4b8c8', '#8a8ea0', '#ffffff'), // argent
  ...NPC_HAIRS,
  T('#b8462c', '#8c2e1a', '#5a1a0c', '#e0764e'), // roux vif
  T('#2c3a66', '#1e2848', '#10172c', '#4c5e94'), // bleu nuit
];
export const YEUX: readonly Yeux[] = [
  { iris: '#4a6fd6', deep: '#16224e', light: '#a9c6ff' }, // bleu
  { iris: '#4f9a5a', deep: '#173a1e', light: '#a6dcae' }, // vert
  { iris: '#7a4a22', deep: '#2e1606', light: '#c08a52' }, // brun
  { iris: '#c08a2a', deep: '#4a2e08', light: '#f0c870' }, // ambre
  { iris: '#7c8494', deep: '#2a2e38', light: '#c4cad6' }, // gris
  { iris: '#8a5ac8', deep: '#2e1a4a', light: '#c8a8f0' }, // violet
];

/** Coupes de chaque silhouette, la première d'origine. */
export const COUPES: Readonly<Record<Silhouette, readonly Coupe[]>> = {
  a: [{ feuille: 'player', nom: 'carré', portrait: 'carre', atlas: 'carre-argent' }, { feuille: 'player-a2', nom: 'queue de cheval', portrait: 'court', atlas: 'queue' }],
  b: [{ feuille: 'player-b', nom: 'courte', portrait: 'court', atlas: 'courte' }, { feuille: 'player-b2', nom: 'mi-longue', portrait: 'carre', atlas: 'milongs' }],
};
export const coupeDe = (a: Apparence): Coupe => COUPES[a.silhouette][a.coupe ?? 0]!;

/** Couleurs d'origine de chaque silhouette : A, la feuille approuvée ; B, peau mate (demande du responsable). */
export const APPARENCE_DEFAUT: Readonly<Record<Silhouette, Apparence>> = {
  a: { silhouette: 'a', peau: 0, cheveux: 0, yeux: 0 },
  b: { silhouette: 'b', peau: 2, cheveux: 0, yeux: 0 },
};

export const memeApparence = (x: Apparence, y: Apparence) => x.silhouette === y.silhouette && (x.coupe ?? 0) === (y.coupe ?? 0) && (x.visage ?? 0) === (y.visage ?? 0) && x.peau === y.peau && x.cheveux === y.cheveux && x.yeux === y.yeux;
/** Apparence d'origine (silhouette A aux couleurs de la feuille approuvée) : rendu historique, rien n'est repeint. */
export const estOrigine = (x: Apparence) => memeApparence(x, APPARENCE_DEFAUT.a);

export function apparenceValable(x: unknown): x is Apparence {
  const a = x as Partial<Apparence> | null;
  const idx = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
  return !!a && (a.silhouette === 'a' || a.silhouette === 'b') && idx(a.peau, PEAUX.length) && idx(a.cheveux, CHEVEUX.length) && idx(a.yeux, YEUX.length)
    && (a.coupe === undefined || idx(a.coupe, COUPES[a.silhouette].length)) && (a.visage === undefined || idx(a.visage, VISAGES.length));
}

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
export const codeApparence = (a: Apparence) =>
  `${a.silhouette}${a.visage ? `${B36[a.coupe ?? 0]}${B36[a.visage]}` : a.coupe ? B36[a.coupe] : ''}${B36[a.peau]}${B36[a.cheveux]}${B36[a.yeux]}`;
export function lireCode(code: string): Apparence | null {
  if (!/^[ab][0-9a-z]{3,5}$/.test(code)) return null;
  const c = code.length >= 5 ? B36.indexOf(code[1]!) : 0;
  const v = code.length === 6 ? B36.indexOf(code[2]!) : 0;
  const r = code.slice(code.length - 3);
  const a: Apparence = { silhouette: code[0] as Silhouette, peau: B36.indexOf(r[0]!), cheveux: B36.indexOf(r[1]!), yeux: B36.indexOf(r[2]!), ...(c ? { coupe: c } : {}), ...(v ? { visage: v } : {}) };
  // une seule écriture par apparence : cinq signes pour une coupe sans visage, six pour un visage
  return apparenceValable(a) && (code.length === 4 || (code.length === 5 && c > 0) || (code.length === 6 && v > 0)) ? a : null;
}

/** Identifiant du personnage joueur : `player-<tenue>` (apparence d'origine) ou `player-<tenue>@<code>`. */
export function idJoueur(tenue: string, a?: Apparence | null): string {
  return !a || estOrigine(a) ? `player-${tenue}` : `player-${tenue}@${codeApparence(a)}`;
}

/** Tenue et apparence d'un identifiant de joueur (`player-<tenue>[@code]`) ; null pour un autre personnage. */
export function lireIdJoueur(id: string): { tenue: string; apparence: Apparence } | null {
  const m = /^player-([A-Za-z]+)(?:@([0-9a-z]{4,6}))?$/.exec(id);
  if (!m) return null;
  const a = m[2] ? lireCode(m[2]) : APPARENCE_DEFAUT.a;
  return a ? { tenue: m[1]!, apparence: a } : null;
}

/** Feuille commune d'une silhouette, à sa première coupe (clé du manifeste). */
export const feuilleSilhouette = (s: Silhouette) => COUPES[s][0]!.feuille;
/** Feuille d'une apparence : celle de sa silhouette et de sa coupe, redessinée avec son visage. */
export const feuilleApparence = (a: Apparence) => (a.visage ? `${coupeDe(a).feuille}-v${a.visage}` : coupeDe(a).feuille);
