/**
 * M08 C3 — duellistes PNJ de la ville : quelques GABARITS génériques (silhouette, coiffure, tenue) et des variations
 * subtiles déterministes par graine (peau, couleur et coupe de cheveux, couleurs des vêtements, un accessoire), à la
 * manière des dresseurs PNJ de Pokémon : même structure, petites différences. Données pures (aucun dessin, aucun DOM) :
 * l’apparence « vectoriel V2 » est tracée par `scene/v2/pnj.ts` à partir de `npcLook`.
 *
 * Identifiant : `pnj-<gabarit>-<graine>`. Tout en est dérivé (apparence, prénom, famille, Techniques, profil de jeu) :
 * un PNJ se reconnaît, se redessine et se rejoue à l’identique depuis son seul identifiant. Les PNJ restent nettement
 * moins singuliers que les quatre rivaux signatures : palettes sourdes, aucune marque ni emblème, tenues ordinaires.
 * DONNÉES DE PROTOTYPE, NON CANONIQUES.
 */
import { FAMILIES, type Family } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import { hashString, makeRng } from '../game/engine/rng';

export const NPC_TEMPLATE_IDS = ['docker', 'marchande', 'commis', 'joueuse'] as const;
export type NpcTemplateId = (typeof NPC_TEMPLATE_IDS)[number];
/** Identifiant d’un PNJ : `pnj-<gabarit>-<graine>`. */
export type NpcId = `pnj-${string}`;

export type FaceShape = 'carre' | 'ovale' | 'doux';
export type HairCut =
  | 'rase' | 'courte' | 'plaquee' // docker
  | 'chignon' | 'queue' | 'milongs' // marchande (mi-longs lâchés)
  | 'raie' | 'frange' | 'boucles' // commis
  | 'carre' | 'ondulee' | 'garconne'; // joueuse
export type Accessory = 'aucun' | 'bonnet' | 'boucle' | 'barbe' | 'fichu' | 'fleur' | 'lunettes' | 'casquette' | 'cravate' | 'bandeau' | 'broche';
export type NpcAiProfile = 'novice' | 'timide';

export interface NpcTemplate {
  id: NpcTemplateId;
  /** Classe affichée (« Docker ») et titre (« docker du Quai »). */
  label: string;
  title: string;
  gender: 'f' | 'm';
  face: FaceShape;
  cuts: readonly HairCut[];
  accessories: readonly Accessory[];
  names: readonly string[];
  aiProfile: NpcAiProfile;
  /** Tempérament : amplitude des réactions, humeur de repos (mêmes humeurs que les rivaux). */
  expressiveness: number;
  restMood: 'neutral' | 'confident' | 'focused' | 'thinking';
}

export const NPC_TEMPLATES: Record<NpcTemplateId, NpcTemplate> = {
  docker: {
    id: 'docker', label: 'Docker', title: 'docker du Quai', gender: 'm', face: 'carre',
    cuts: ['rase', 'courte', 'plaquee'], accessories: ['aucun', 'bonnet', 'boucle', 'barbe'],
    names: ['Bastien', 'Malo', 'Yvon', 'Théo', 'Gaël', 'Ronan', 'Lucas', 'Joël'],
    aiProfile: 'novice', expressiveness: 0.8, restMood: 'confident',
  },
  marchande: {
    id: 'marchande', label: 'Marchande', title: 'marchande des halles', gender: 'f', face: 'ovale',
    cuts: ['chignon', 'queue', 'milongs'], accessories: ['aucun', 'fichu', 'fleur', 'boucle'],
    names: ['Lise', 'Margot', 'Rose', 'Adèle', 'Jeanne', 'Nina', 'Céleste', 'Odile'],
    aiProfile: 'timide', expressiveness: 0.7, restMood: 'neutral',
  },
  commis: {
    id: 'commis', label: 'Commis', title: 'commis de la ville', gender: 'm', face: 'doux',
    cuts: ['raie', 'frange', 'boucles'], accessories: ['aucun', 'lunettes', 'casquette', 'cravate'],
    names: ['Paul', 'Émile', 'Victor', 'Hugo', 'Félix', 'Léon', 'Arthur', 'Simon'],
    aiProfile: 'timide', expressiveness: 0.6, restMood: 'thinking',
  },
  joueuse: {
    id: 'joueuse', label: 'Joueuse', title: 'habituée du tripot', gender: 'f', face: 'ovale',
    cuts: ['carre', 'ondulee', 'garconne'], accessories: ['aucun', 'bandeau', 'boucle', 'broche'],
    names: ['Inès', 'Clara', 'Louise', 'Mila', 'Elsa', 'Agathe', 'Salomé', 'Zoé'],
    aiProfile: 'novice', expressiveness: 0.75, restMood: 'focused',
  },
};

/** Teinte à quatre valeurs (aplat, ombre, ombre profonde, reflet), comme les palettes des rivaux. */
export interface Tone { base: string; shade: string; deep: string; hi: string }
const T = (base: string, shade: string, deep: string, hi: string): Tone => ({ base, shade, deep, hi });

/** Six carnations, de la plus claire à la plus foncée. */
export const NPC_SKINS: readonly Tone[] = [
  T('#f4d4be', '#d4a68e', '#ad7a66', '#fde8da'),
  T('#eac2a2', '#c99478', '#a26a54', '#f8dcc4'),
  T('#d9a682', '#b67c5c', '#8e5642', '#ecc3a2'),
  T('#c08a64', '#9a6444', '#744632', '#d8a882'),
  T('#9a6a4a', '#764a32', '#563424', '#b88a68'),
  T('#74503a', '#583828', '#3c261a', '#946c52'),
];

/** Couleurs de cheveux naturelles (aucune couleur de fantaisie : réservées aux rivaux et au joueur). */
export const NPC_HAIRS: readonly Tone[] = [
  T('#2a2422', '#191514', '#0c0a09', '#4e4440'), // noir
  T('#3e2c22', '#291c15', '#160e0a', '#64483a'), // brun foncé
  T('#5c3c26', '#432a19', '#28180e', '#86603e'), // châtain
  T('#7a3e24', '#5a2a16', '#36170b', '#a8603a'), // auburn
  T('#a07c4c', '#7c5c34', '#543c20', '#c8a46e'), // blond foncé
  T('#6c6058', '#4e4440', '#2e2826', '#948880'), // brun cendré
  T('#8e8a86', '#6c6864', '#4a4644', '#b4b0ac'), // gris
];

/** Couleurs de tenue sourdes (le vêtement principal) ; aucune palette de famille. */
export const NPC_CLOTHS: readonly Tone[] = [
  T('#3e5068', '#2c3a4e', '#1c2636', '#5e7290'), // bleu ardoise
  T('#55603a', '#3e4628', '#283018', '#768250'), // olive
  T('#7a3e2e', '#5a2c20', '#3a1a12', '#9e5a46'), // brique
  T('#8a6a2a', '#68501e', '#463412', '#ae8c44'), // moutarde
  T('#5a3a52', '#42283c', '#2a1826', '#7a5872'), // prune
  T('#2e5a58', '#204240', '#122a28', '#467a76'), // sarcelle
  T('#5a4432', '#423224', '#2a1f16', '#7a604a'), // brun
];

/** Couleurs secondaires neutres (chemise, corsage, tricot). */
export const NPC_SHIRTS: readonly Tone[] = [
  T('#d8cdb4', '#b4a88e', '#8c826c', '#ece4d0'), // crème
  T('#9a9890', '#7a7870', '#58564f', '#b8b6ae'), // gris
  T('#e6e0d2', '#c2bcae', '#98928a', '#f6f2ea'), // blanc cassé
  T('#8a9ab0', '#6a7a90', '#4c5a6e', '#aab8cc'), // bleu passé
];

/** Iris courants. */
export const NPC_IRISES: readonly { iris: string; deep: string; light: string; amber: string; glow: string }[] = [
  { iris: '#7a4a22', deep: '#2e1606', light: '#c08a52', amber: '#d8a050', glow: '220,170,110' }, // brun
  { iris: '#8a7a3a', deep: '#33280c', light: '#c8b870', amber: '#c0a040', glow: '220,200,130' }, // noisette
  { iris: '#5a7a5a', deep: '#1c2e1c', light: '#9cbc98', amber: '#b4a860', glow: '190,215,180' }, // vert-gris
  { iris: '#5a7088', deep: '#1a2636', light: '#9cb0c8', amber: '#a8bcc8', glow: '190,205,225' }, // gris-bleu
  { iris: '#4a2e1a', deep: '#1a0e06', light: '#8a6248', amber: '#a07040', glow: '200,150,110' }, // brun sombre
];

/** Apparence d’un PNJ : tout ce qui varie d’un individu à l’autre dans un même gabarit. */
export interface NpcLook {
  template: NpcTemplateId;
  seed: number;
  face: FaceShape;
  skin: Tone;
  hair: Tone;
  cut: HairCut;
  cloth: Tone;
  shirt: Tone;
  accessory: Accessory;
  iris: (typeof NPC_IRISES)[number];
}

/** `pnj-<gabarit>-<graine>` → gabarit et graine, ou null (identifiant mal formé). */
export function parseNpcId(id: string): { template: NpcTemplateId; seed: number } | null {
  const m = /^pnj-([a-z]+)-(\d{1,9})$/.exec(id);
  if (!m || !(NPC_TEMPLATE_IDS as readonly string[]).includes(m[1]!)) return null;
  return { template: m[1] as NpcTemplateId, seed: Number(m[2]) };
}

export function npcId(template: NpcTemplateId, seed: number): NpcId {
  return `pnj-${template}-${seed >>> 0}`;
}

export function isNpcId(id: string): id is NpcId {
  return parseNpcId(id) !== null;
}

function rngOf(t: NpcTemplateId, seed: number, salt: string) {
  return makeRng(hashString(`pnj|${t}|${seed}|${salt}`));
}

function pick<T>(xs: readonly T[], r: () => number): T {
  return xs[Math.floor(r() * xs.length) % xs.length]!;
}

/** Apparence déterministe d’un PNJ (même identifiant → même apparence, toujours). */
export function npcLook(id: string): NpcLook | null {
  const p = parseNpcId(id);
  if (!p) return null;
  const t = NPC_TEMPLATES[p.template];
  const r = rngOf(p.template, p.seed, 'look');
  // Coupe et accessoire parcourent leurs listes avec la graine (toute combinaison apparaît en 12 graines consécutives) ;
  // les couleurs sont tirées. Ordre de tirage fixe : une dimension nouvelle s’ajoute à la fin, sans changer les PNJ existants.
  const cut = t.cuts[p.seed % t.cuts.length]!;
  const accessory = t.accessories[Math.floor(p.seed / t.cuts.length) % t.accessories.length]!;
  const skin = pick(NPC_SKINS, r);
  const hair = pick(NPC_HAIRS, r);
  const cloth = pick(NPC_CLOTHS, r);
  const shirt = pick(NPC_SHIRTS, r);
  const iris = pick(NPC_IRISES, r);
  return { template: p.template, seed: p.seed, face: t.face, skin, hair, cut, cloth, shirt, accessory, iris };
}

/** Techniques ordinaires d’un PNJ (jamais Rupture ni Dissipation, apprises auprès des rivaux). */
const NPC_TECHNIQUES: readonly TechniqueId[] = ['Lecture', 'Ancrage', 'Sondage', 'Recentrage'];

/** Identité de jeu d’un PNJ : prénom, Signature, Techniques (déterministes, indépendants de l’apparence). */
export function npcIdentity(id: string): { template: NpcTemplate; name: string; family: Family; techniques: TechniqueId[] } | null {
  const p = parseNpcId(id);
  if (!p) return null;
  const t = NPC_TEMPLATES[p.template];
  const r = rngOf(p.template, p.seed, 'jeu');
  const name = pick(t.names, r);
  const family = pick(FAMILIES, r);
  const first = pick(NPC_TECHNIQUES, r);
  const second = pick(NPC_TECHNIQUES.filter((x) => x !== first), r);
  return { template: t, name, family, techniques: [first, second] };
}
