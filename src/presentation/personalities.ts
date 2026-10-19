/**
 * Personnalités de rivaux — PROVISOIRES (aucun personnage canonique validé).
 * Une personnalité relie : apparence procédurale, tempérament expressif et profil tactique de l’IA.
 * Les expressions dépendent du tempérament et des événements PUBLICS uniquement (pas de tells).
 * M08 C3 : un adversaire est soit l’un des quatre rivaux signatures, soit un duelliste PNJ de la ville
 * (`pnj-<gabarit>-<graine>`, `./npcs`), dont la personnalité est dérivée de l’identifiant.
 */
import type { Family } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import { NPC_TEMPLATES, npcIdentity, npcLook, type NpcId, type NpcTemplateId } from './npcs';

/** Les quatre rivaux signatures (personnages uniques). */
export type SignatureRivalId = 'braise' | 'ronce' | 'voile' | 'astre';
/** Identifiant d’un adversaire : rival signature ou duelliste PNJ de la ville. */
export type OpponentId = SignatureRivalId | NpcId;
export const SIGNATURE_RIVAL_IDS: readonly SignatureRivalId[] = ['braise', 'ronce', 'voile', 'astre'];

export function isSignatureRival(id: string): id is SignatureRivalId {
  return (SIGNATURE_RIVAL_IDS as readonly string[]).includes(id);
}

export type HairStyle = 'spiky' | 'braid' | 'bob';
export type Outfit = 'jacket' | 'cloak' | 'coat';

export interface RivalPersonality {
  id: OpponentId;
  name: string;
  title: string;
  /** Accord des libellés d’humeur (« concentré » / « concentrée »). */
  gender: 'f' | 'm';
  family: Family;
  /** Profil de l’IA ; `novice` et `timide` : profils génériques des PNJ (difficulté basse, M08 C3). */
  aiProfile: 'offensif' | 'prudent' | 'lecteur' | 'equilibre' | 'novice' | 'timide';
  techniques: TechniqueId[];
  /** Tempérament : amplitude des réactions (0..1), humeur de repos. */
  expressiveness: number;
  restMood: Mood;
  look: {
    skin: string;
    skinShade: string;
    hair: string;
    hairHi: string;
    hairStyle: HairStyle;
    outfit: Outfit;
    cloth: string;
    clothHi: string;
    trim: string;
    eyes: string;
    jaw: number; // 0 rond … 1 anguleux
    mark: 'scar' | 'freckles' | 'beauty' | null;
    headband: boolean;
  };
  /** M08 C3 : gabarit d’un duelliste PNJ de la ville (absent pour un rival signature). */
  npc?: NpcTemplateId;
}

export type Mood =
  | 'neutral' | 'focused' | 'confident' | 'smug' | 'pleased' | 'triumphant'
  | 'surprised' | 'pained' | 'annoyed' | 'angry' | 'relieved' | 'defeated' | 'thinking' | 'shocked';

export const PERSONALITIES: RivalPersonality[] = [
  {
    id: 'braise', name: 'Kaï', title: 'la Braise du quai', gender: 'm', family: 'Cendre', aiProfile: 'offensif',
    techniques: ['Sondage', 'Lecture'], expressiveness: 1, restMood: 'confident',
    look: { skin: '#e2a982', skinShade: '#b9785a', hair: '#2a1410', hairHi: '#c2411d', hairStyle: 'spiky', outfit: 'jacket', cloth: '#7a2410', clothHi: '#d0541f', trim: '#ffb347', eyes: '#d98a1e', jaw: 0.8, mark: 'scar', headband: true },
  },
  {
    id: 'ronce', name: 'Maëlle', title: 'gardienne des Ronces', gender: 'f', family: 'Ronce', aiProfile: 'prudent',
    techniques: ['Ancrage', 'Rupture'], expressiveness: 0.55, restMood: 'neutral',
    look: { skin: '#c98e6a', skinShade: '#9a6248', hair: '#3b2a1a', hairHi: '#7a5a34', hairStyle: 'braid', outfit: 'cloak', cloth: '#1d4a29', clothHi: '#3f8a46', trim: '#d4ec7a', eyes: '#4f9a4a', jaw: 0.3, mark: 'freckles', headband: false },
  },
  {
    id: 'voile', name: 'Sélène', title: 'liseuse du Voile', gender: 'f', family: 'Voile', aiProfile: 'lecteur',
    techniques: ['Lecture', 'Dissipation'], expressiveness: 0.75, restMood: 'smug',
    look: { skin: '#f0c9b0', skinShade: '#c99a82', hair: '#c9cbe8', hairHi: '#ffffff', hairStyle: 'bob', outfit: 'coat', cloth: '#2f2d6e', clothHi: '#5d63c4', trim: '#a8e6ff', eyes: '#8a5cd6', jaw: 0.45, mark: 'beauty', headband: true },
  },
  // M05 : quatrième rival (famille Astre, profil « équilibré » déjà présent dans l’IA). Ajouté EN FIN
  // de liste : `personalityFor(seed)` (entrées QA historiques) ne choisit toujours que parmi les trois premiers.
  {
    id: 'astre', name: 'Orin', title: 'l’arpenteur des Astres', gender: 'm', family: 'Astre', aiProfile: 'equilibre',
    techniques: ['Recentrage', 'Ancrage'], expressiveness: 0.65, restMood: 'thinking',
    look: { skin: '#9a6444', skinShade: '#6e432c', hair: '#1c1f33', hairHi: '#6f80c4', hairStyle: 'spiky', outfit: 'coat', cloth: '#3b3214', clothHi: '#b8962f', trim: '#ffe08a', eyes: '#e0b23a', jaw: 0.6, mark: null, headband: false },
  },
];

const NPC_CACHE = new Map<string, RivalPersonality>();

/**
 * Personnalité d’un duelliste PNJ, dérivée de son identifiant (`pnj-<gabarit>-<graine>`) : prénom, Signature et
 * Techniques tirés de la graine, tempérament et profil de jeu génériques du gabarit ; `look` reprend ses couleurs pour
 * l’ancien rendu V1 (`?qa=1&figure=v1`). En cache (même objet pour un même identifiant). Null si l’identifiant est inconnu.
 */
export function npcPersonality(id: string): RivalPersonality | null {
  const hit = NPC_CACHE.get(id);
  if (hit) return hit;
  const L = npcLook(id);
  const I = npcIdentity(id);
  if (!L || !I) return null;
  const t = NPC_TEMPLATES[L.template];
  const short = ['rase', 'courte', 'plaquee', 'raie', 'frange', 'boucles', 'garconne'].includes(L.cut);
  const p: RivalPersonality = {
    id: id as NpcId, name: I.name, title: t.title, gender: t.gender, family: I.family, aiProfile: t.aiProfile,
    techniques: I.techniques, expressiveness: t.expressiveness, restMood: t.restMood, npc: t.id,
    look: {
      skin: L.skin.base, skinShade: L.skin.shade, hair: L.hair.base, hairHi: L.hair.hi, hairStyle: short ? 'spiky' : 'bob',
      outfit: L.template === 'docker' ? 'jacket' : 'coat', cloth: L.cloth.base, clothHi: L.cloth.hi, trim: L.shirt.base,
      eyes: L.iris.iris, jaw: L.face === 'carre' ? 0.8 : L.face === 'ovale' ? 0.3 : 0.45, mark: null, headband: L.accessory === 'bandeau',
    },
  };
  NPC_CACHE.set(id, p);
  return p;
}

/** Personnalité d’un adversaire quelconque (rival signature ou PNJ), ou null. */
export function personalityById(id: string | null | undefined): RivalPersonality | null {
  if (!id) return null;
  return PERSONALITIES.find((p) => p.id === id) ?? npcPersonality(id);
}

export function personalityFor(seed: number, forced?: string | null): RivalPersonality {
  // M08 C3 : `?rival=pnj-<gabarit>-<graine>` impose aussi un PNJ (entrée QA directe, planche).
  const byId = personalityById(forced);
  if (byId) return byId;
  // Toujours parmi les trois rivaux historiques : les seeds QA M02–M03 gardent le même adversaire.
  return PERSONALITIES[((seed % 3) + 3) % 3]!;
}
