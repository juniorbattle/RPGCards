/**
 * Personnalités de rivaux — PROVISOIRES (aucun personnage canonique validé).
 * Une personnalité relie : identité, tempérament expressif et profil tactique de l’IA ; son apparence est son
 * identité « vectoriel V2 » (`src/scene/v2/`, retrouvée par `id`).
 * Les expressions dépendent du tempérament et des événements PUBLICS uniquement (pas de tells).
 * M08 C3 : un adversaire est soit l’un des quatre rivaux signatures, soit un duelliste PNJ de la ville
 * (`pnj-<gabarit>-<graine>`, `./npcs`), dont la personnalité est dérivée de l’identifiant.
 */
import type { Family } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import { NPC_TEMPLATES, npcIdentity, npcLook, type NpcId, type NpcTemplateId } from './npcs';

/** Les quatre rivaux signatures (personnages uniques). */
export type SignatureRivalId = 'braise' | 'ronce' | 'voile' | 'astre';
/** M10-C : les quatre chefs de famille du mode Aventure (jamais tirés par le jeu standard). */
export type ChefId = 'chef-cendre' | 'chef-ronce' | 'chef-voile' | 'chef-astre';
/** Identifiant d’un adversaire : rival signature, chef de famille (mode Aventure) ou duelliste PNJ de la ville. */
export type OpponentId = SignatureRivalId | ChefId | NpcId;
export const SIGNATURE_RIVAL_IDS: readonly SignatureRivalId[] = ['braise', 'ronce', 'voile', 'astre'];

export function isSignatureRival(id: string): id is SignatureRivalId {
  return (SIGNATURE_RIVAL_IDS as readonly string[]).includes(id);
}

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
  },
  {
    id: 'ronce', name: 'Maëlle', title: 'gardienne des Ronces', gender: 'f', family: 'Ronce', aiProfile: 'prudent',
    techniques: ['Ancrage', 'Rupture'], expressiveness: 0.55, restMood: 'neutral',
  },
  {
    id: 'voile', name: 'Sélène', title: 'liseuse du Voile', gender: 'f', family: 'Voile', aiProfile: 'lecteur',
    techniques: ['Lecture', 'Dissipation'], expressiveness: 0.75, restMood: 'smug',
  },
  // M05 : quatrième rival (famille Astre, profil « équilibré » déjà présent dans l’IA). Ajouté EN FIN
  // de liste : `personalityFor(seed)` (entrées QA historiques) ne choisit toujours que parmi les trois premiers.
  {
    id: 'astre', name: 'Orin', title: 'l’arpenteur des Astres', gender: 'm', family: 'Astre', aiProfile: 'equilibre',
    techniques: ['Recentrage', 'Ancrage'], expressiveness: 0.65, restMood: 'thinking',
  },
];

/**
 * M10-C : les quatre chefs de famille du mode Aventure, avec leur identité V2 (`src/scene/v2/chefs.ts`). Hors de
 * `PERSONALITIES` : le jeu standard (rencontres, `personalityFor`) ne les voit pas ; seul `personalityById` les trouve.
 */
export const CHEF_PERSONALITIES: RivalPersonality[] = [
  { id: 'chef-cendre', name: 'Bran', title: 'le Premier Feu', gender: 'm', family: 'Cendre', aiProfile: 'lecteur', techniques: ['Lecture', 'Sondage'], expressiveness: 0.7, restMood: 'confident' },
  { id: 'chef-ronce', name: 'Mère Aubépine', title: 'la Gardienne du Fanal', gender: 'f', family: 'Ronce', aiProfile: 'lecteur', techniques: ['Ancrage', 'Rupture'], expressiveness: 0.5, restMood: 'neutral' },
  { id: 'chef-voile', name: 'Ilse', title: 'la Dame aux Voiles', gender: 'f', family: 'Voile', aiProfile: 'lecteur', techniques: ['Lecture', 'Dissipation'], expressiveness: 0.6, restMood: 'smug' },
  { id: 'chef-astre', name: 'Halvard', title: 'le Cartographe', gender: 'm', family: 'Astre', aiProfile: 'lecteur', techniques: ['Recentrage', 'Ancrage'], expressiveness: 0.55, restMood: 'thinking' },
];

const NPC_CACHE = new Map<string, RivalPersonality>();

/**
 * Personnalité d’un duelliste PNJ, dérivée de son identifiant (`pnj-<gabarit>-<graine>`) : prénom, Signature et
 * Techniques tirés de la graine, tempérament et profil de jeu génériques du gabarit ; son apparence est son identité V2
 * (`src/scene/v2/pnj.ts`). En cache (même objet pour un même identifiant). Null si l’identifiant est inconnu.
 */
export function npcPersonality(id: string): RivalPersonality | null {
  const hit = NPC_CACHE.get(id);
  if (hit) return hit;
  const L = npcLook(id);
  const I = npcIdentity(id);
  if (!L || !I) return null;
  const t = NPC_TEMPLATES[L.template];
  const p: RivalPersonality = {
    id: id as NpcId, name: I.name, title: t.title, gender: t.gender, family: I.family, aiProfile: t.aiProfile,
    techniques: I.techniques, expressiveness: t.expressiveness, restMood: t.restMood, npc: t.id,
  };
  NPC_CACHE.set(id, p);
  return p;
}

/** Personnalité d’un adversaire quelconque (rival signature ou PNJ), ou null. */
export function personalityById(id: string | null | undefined): RivalPersonality | null {
  if (!id) return null;
  return PERSONALITIES.find((p) => p.id === id) ?? CHEF_PERSONALITIES.find((p) => p.id === id) ?? npcPersonality(id);
}

export function personalityFor(seed: number, forced?: string | null): RivalPersonality {
  // M08 C3 : `?rival=pnj-<gabarit>-<graine>` impose aussi un PNJ (entrée QA directe, planche).
  const byId = personalityById(forced);
  if (byId) return byId;
  // Toujours parmi les trois rivaux historiques : les seeds QA M02–M03 gardent le même adversaire.
  return PERSONALITIES[((seed % 3) + 3) % 3]!;
}
