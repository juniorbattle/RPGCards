/**
 * M10-B (prototype `?aventure=1`) — DONNÉES DU MODE AVENTURE, PROPOSÉES, NON RATIFIÉES (contrats `docs/m10/`, fiche
 * `docs/FICHE_ARBITRAGES_M10.md`). Ratifié : ADR 029 (choix libre), ADR 030 (16 neutres : 4 × I à IV, sans famille, effet
 * ni bonus), ADR 031 (Basics à l'affiliation / à l'engagement, variantes aux lieutenants, Signature au chef).
 *
 * Données pures, sans DOM ni rendu. Les cartes neutres sont celles du moteur (`NEUTRAL_CATALOG`, avenant M10-A, AV-01) ;
 * elles entrent en duel depuis la décision du responsable sur l'ARB-M10-02 (2026-10-20).
 */
import { FAMILIES, type Family, type OrdinaryRank } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import type { Facing } from '../ville/monde';
import type { IlotId } from '../ville/ilots';
import type { VenueId } from '../presentation/venues';

export const RANGS: readonly OrdinaryRank[] = [1, 2, 3, 4];
export const ROMAIN: Record<OrdinaryRank, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

/** Carte neutre (ADR 030 ; avenant M10-A, AV-01 : Puissance 3 / 6 / 9 / 12, sans famille, effet ni bonus). */
export interface NeutreDef {
  defId: string;
  rank: OrdinaryRank;
  power: number;
  name: string;
}

export const NEUTRES: Record<OrdinaryRank, NeutreDef> = {
  1: { defId: 'neutre-1', rank: 1, power: 3, name: 'Neutre I' },
  2: { defId: 'neutre-2', rank: 2, power: 6, name: 'Neutre II' },
  3: { defId: 'neutre-3', rank: 3, power: 9, name: 'Neutre III' },
  4: { defId: 'neutre-4', rank: 4, power: 12, name: 'Neutre IV' },
};
export const COPIES_NEUTRES = 4;
export const isNeutre = (defId: string): boolean => /^neutre-[1-4]$/.test(defId);
export const rangNeutre = (defId: string): OrdinaryRank => Number(defId.slice(7)) as OrdinaryRank;

/** États d'une famille pour le joueur (ADR 029 §4 ; lecture proposée ARB-M10-01). Monotones, sauf changement
 *  d'affiliation explicite (P-N6). */
export type EtatFamille = 'inconnue' | 'remarque' | 'invite' | 'affilie' | 'defiee' | 'chef';
export const ORDRE_ETAT: Record<EtatFamille, number> = { inconnue: 0, remarque: 1, invite: 2, affilie: 3, defiee: 3, chef: 4 };

/** Scènes du prologue (`docs/m10/CONTRAT_NARRATIF_M10.md` §3). */
export const SCENES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] as const;
export type SceneId = (typeof SCENES)[number];

export type Role = 'cadet' | 'brasDroit' | 'chef';
export const ROLES: readonly Role[] = ['cadet', 'brasDroit', 'chef'];
export const ROLE_LABEL: Record<Role, string> = { cadet: 'cadet', brasDroit: 'bras droit', chef: 'chef' };

/** Personnage structurant d'une famille (noms de travail, ARB-M10-07). */
export interface Figure {
  /** Identifiant stable dans l'aventure (clés de registre et de sauvegarde). */
  id: string;
  nom: string;
  titre: string;
  famille: Family;
  role: Role;
  /** Apparence : un rival V2 (`braise`…) ou un gabarit PNJ (`pnj-<gabarit>-<graine>`) ; provisoire pour les chefs. */
  apparence: string;
  gender: 'f' | 'm';
  /** Où il se tient dans la ville (îlot, place, regard) ; au Quai, dans le Quai en quatre rangs (ARB-M10-12). */
  ilot: IlotId;
  at: { x: number; z: number };
  facing: Facing;
  /** Place dans l'ancien Quai (en bande), le secours tant que le Quai en rangs n'est pas affiché ; absente : la même. */
  bande?: { at: { x: number; z: number }; facing: Facing };
  /** Lieu du duel (ADR 022). */
  venue: VenueId;
  techniques: TechniqueId[];
  /** Récompense de sa première défaite (registre) : variante (lieutenants) ou Signature (chef). */
  enjeu: { kind: 'variante'; defId: string } | { kind: 'signature' };
}

/** Maison d'une famille (P-N1, P-N3) et Technique enseignée avec ses Basics (A-3, proposée). */
export interface Maison {
  famille: Family;
  nom: string;
  ilot: IlotId;
  devise: string;
  credo: string;
  technique: TechniqueId;
  /** Ce que dit l'émissaire en présentant la famille (prototype). */
  offre: string;
}

export const MAISONS: Record<Family, Maison> = {
  Cendre: {
    famille: 'Cendre', nom: 'la Maison du Chantier', ilot: 'quai', devise: '« Le feu ne recule pas. »', technique: 'Lecture',
    credo: 'Pression et prise de risque : on gagne en prenant l’initiative, et même un coup perdu doit coûter à l’adversaire.',
    offre: 'Chez nous, on frappe le premier. Rejoins la Cendre : tu recevras nos quatre cartes de base, et la Lecture pour sentir venir les coups.',
  },
  Ronce: {
    famille: 'Ronce', nom: 'le Fanal', ilot: 'quai', devise: '« Ce qui tient, dure. »', technique: 'Rupture',
    credo: 'Garde, contrôle et préservation : on gagne en tenant, en usant l’élan adverse, en ne perdant rien.',
    offre: 'Tu as tenu face à Kaï. La Ronce garde le feu du port : rejoins-nous, nos quatre cartes de base et la Rupture sont à toi.',
  },
  Voile: {
    famille: 'Voile', nom: 'la maison de la Fontaine', ilot: 'ruelles', devise: '« Celui qui voit choisit. »', technique: 'Dissipation',
    credo: 'Information, camouflage et perturbation : on gagne avant le Clash, en sachant et en cachant.',
    offre: 'J’ai vu tes yeux pendant le duel : tu lisais. Le Voile t’offre ses quatre cartes de base, et la Dissipation pour défaire les ruses.',
  },
  Astre: {
    famille: 'Astre', nom: 'l’Observatoire du Parvis', ilot: 'parvis', devise: '« Tout revient, tout s’assemble. »', technique: 'Ancrage',
    credo: 'Adaptation, recirculation, synergies : on gagne en combinant les voies et en faisant revenir ses meilleures cartes.',
    offre: 'Les étoiles ont remarqué ton jeu. L’Astre unit ce que les autres séparent : nos quatre cartes de base et l’Ancrage t’attendent.',
  },
};

/** Techniques de la rue (prologue, avenant M10-A, AV-05). */
export const TECHNIQUES_RUE: TechniqueId[] = ['Sondage', 'Recentrage'];

const v = (fam: Family, rank: OrdinaryRank, effect: string) => ({ kind: 'variante' as const, defId: `${fam}-${rank}-${effect}` });

/**
 * Les douze figures structurantes (deux lieutenants et un chef par famille, ARB-M10-06 et 07). Cadets : gabarits PNJ
 * (ADR 023) aux graines choisies ici ; bras droits : les rivaux V2 (ADR 021) ; chefs : apparence PROVISOIRE (gabarit PNJ)
 * en attendant leur identité V2 (production non commandée).
 */
export const FIGURES: readonly Figure[] = [
  // Cendre — la Maison du Chantier (le Quai, ouest, façade `chantier`)
  { id: 'cadet-Cendre', nom: 'Tessa', titre: 'cadette de la Cendre', famille: 'Cendre', role: 'cadet', apparence: 'pnj-marchande-21', gender: 'f', ilot: 'quai', at: { x: -15.2, z: -1.4 }, facing: 'face', venue: 'rue', techniques: ['Sondage', 'Lecture'], enjeu: v('Cendre', 3, 'ferveur') },
  { id: 'brasDroit-Cendre', nom: 'Kaï', titre: 'la Braise du quai, bras droit de la Cendre', famille: 'Cendre', role: 'brasDroit', apparence: 'braise', gender: 'm', ilot: 'quai', at: { x: -9.5, z: -13.2 }, facing: 'face', bande: { at: { x: -17.6, z: -0.6 }, facing: 'droite' }, venue: 'rue', techniques: ['Sondage', 'Lecture'], enjeu: v('Cendre', 4, 'contrecoup') },
  { id: 'chef-Cendre', nom: 'Bran', titre: 'le Premier Feu, chef de la Cendre', famille: 'Cendre', role: 'chef', apparence: 'pnj-docker-33', gender: 'm', ilot: 'quai', at: { x: -4.0, z: -40.2 }, facing: 'face', bande: { at: { x: -13.4, z: -2.3 }, facing: 'face' }, venue: 'rue', techniques: ['Lecture', 'Sondage'], enjeu: { kind: 'signature' } },
  // Ronce — le Fanal (le Quai, façade `fanal`)
  { id: 'cadet-Ronce', nom: 'Gaspard', titre: 'cadet de la Ronce, tavernier du Fanal', famille: 'Ronce', role: 'cadet', apparence: 'pnj-commis-17', gender: 'm', ilot: 'quai', at: { x: 8.8, z: -1.5 }, facing: 'face', venue: 'bar', techniques: ['Ancrage', 'Rupture'], enjeu: v('Ronce', 3, 'entrave') },
  { id: 'brasDroit-Ronce', nom: 'Maëlle', titre: 'gardienne des Ronces, bras droit de la Ronce', famille: 'Ronce', role: 'brasDroit', apparence: 'ronce', gender: 'f', ilot: 'quai', at: { x: 5.6, z: -1.5 }, facing: 'face', venue: 'bar', techniques: ['Ancrage', 'Rupture'], enjeu: v('Ronce', 4, 'tenacite') },
  { id: 'chef-Ronce', nom: 'Mère Aubépine', titre: 'la Gardienne du Fanal, cheffe de la Ronce', famille: 'Ronce', role: 'chef', apparence: 'pnj-marchande-45', gender: 'f', ilot: 'quai', at: { x: 10.5, z: -27.6 }, facing: 'face', bande: { at: { x: 10.4, z: -2.3 }, facing: 'face' }, venue: 'bar', techniques: ['Ancrage', 'Rupture'], enjeu: { kind: 'signature' } },
  // Voile — la maison de la Fontaine (les Ruelles)
  { id: 'cadet-Voile', nom: 'Lior', titre: 'cadet du Voile, colporteur des Ruelles', famille: 'Voile', role: 'cadet', apparence: 'pnj-commis-23', gender: 'm', ilot: 'ruelles', at: { x: -1.4, z: 1.0 }, facing: 'gauche', venue: 'salle', techniques: ['Lecture', 'Dissipation'], enjeu: v('Voile', 3, 'dissimulation') },
  { id: 'brasDroit-Voile', nom: 'Sélène', titre: 'liseuse du Voile, bras droit du Voile', famille: 'Voile', role: 'brasDroit', apparence: 'voile', gender: 'f', ilot: 'ruelles', at: { x: 9.6, z: -0.6 }, facing: 'gauche', venue: 'salle', techniques: ['Lecture', 'Dissipation'], enjeu: v('Voile', 4, 'silence') },
  { id: 'chef-Voile', nom: 'Ilse', titre: 'la Dame aux Voiles, cheffe du Voile', famille: 'Voile', role: 'chef', apparence: 'pnj-joueuse-37', gender: 'f', ilot: 'ruelles', at: { x: 5.2, z: -1.6 }, facing: 'face', venue: 'salle', techniques: ['Lecture', 'Dissipation'], enjeu: { kind: 'signature' } },
  // Astre — l'Observatoire du Parvis
  { id: 'cadet-Astre', nom: 'Mira', titre: 'cadette de l’Astre, joueuse du Parvis', famille: 'Astre', role: 'cadet', apparence: 'pnj-joueuse-29', gender: 'f', ilot: 'parvis', at: { x: -6.2, z: 0.7 }, facing: 'droite', venue: 'arene', techniques: ['Recentrage', 'Ancrage'], enjeu: v('Astre', 3, 'relance') },
  { id: 'brasDroit-Astre', nom: 'Orin', titre: 'l’arpenteur des Astres, bras droit de l’Astre', famille: 'Astre', role: 'brasDroit', apparence: 'astre', gender: 'm', ilot: 'parvis', at: { x: 2.9, z: -3.5 }, facing: 'face', venue: 'arene', techniques: ['Recentrage', 'Ancrage'], enjeu: v('Astre', 4, 'convergence') },
  { id: 'chef-Astre', nom: 'Halvard', titre: 'le Cartographe, chef de l’Astre', famille: 'Astre', role: 'chef', apparence: 'pnj-commis-41', gender: 'm', ilot: 'parvis', at: { x: 6.4, z: -2.2 }, facing: 'gauche', venue: 'arene', techniques: ['Recentrage', 'Ancrage'], enjeu: { kind: 'signature' } },
];

export function figure(id: string): Figure {
  const f = FIGURES.find((x) => x.id === id);
  if (!f) throw new Error(`Figure inconnue : ${id}`);
  return f;
}
export const figureDe = (famille: Family, role: Role): Figure => figure(`${role}-${famille}`);
/** L'émissaire du prologue est le cadet (P-N2). */
export const emissaire = (famille: Family): Figure => figureDe(famille, 'cadet');

/** Kaï au prologue : le gris du Quai (rival récurrent, P-N7), à l'est du Quai, près des braseros. */
export const KAI_PROLOGUE = { id: 'kai-prologue', apparence: 'braise', nom: 'Kaï', titre: 'le gris du Quai', ilot: 'quai' as IlotId, at: { x: 13.6, z: 0.9 }, facing: 'gauche' as Facing, venue: 'rue' as VenueId };

/** Réplique d'accueil de chaque figure avant son défi (textes de prototype, tirés du credo de sa famille). */
export const REPLIQUES: Record<string, string> = {
  'cadet-Cendre': '« Sur le Quai, tu as porté le premier coup. Ici, on verra si tu portes aussi le dernier. »',
  'brasDroit-Cendre': '« Les cartes grises du tournoi… Tu te souviens ? Moi aussi. Cette fois, je porte la braise. »',
  'chef-Cendre': '« Le feu ne recule pas. Si tu veux le Brasier, prends-le. »',
  'cadet-Ronce': '« Au Fanal, on ne gagne pas en criant : on gagne en tenant. Tiens bon, si tu peux. »',
  'brasDroit-Ronce': '« Je garde la porte de Mère Aubépine. Elle ne s’ouvre que pour qui ne cède pas. »',
  'chef-Ronce': '« Ce qui tient, dure. Montre-moi que tu dures, et la Couronne est à toi. »',
  'cadet-Voile': '« J’ai déjà vu ta main, tu sais. Enfin… peut-être. Joue, on verra. »',
  'brasDroit-Voile': '« Je lis les duellistes avant leurs cartes. Votre jeu, je l’ai lu au Quai. »',
  'chef-Voile': '« Celui qui voit choisit. Voyons si vous voyez assez pour mériter le Miroir. »',
  'cadet-Astre': '« Tout revient, tout s’assemble. Même tes défaites, si tu sais les ramener. »',
  'brasDroit-Astre': '« Les étoiles tournent ; les duellistes passent. Vous, vous restez. Intéressant. »',
  'chef-Astre': '« J’ai tracé la carte de chaque voie. Il me manque la tienne. »',
};

/** La Tenante du titre (finale du Championnat, PROGRESSION §4) : maîtresse du mélange des voies ; apparence provisoire. */
export const TENANTE = { apparence: 'pnj-joueuse-51', nom: 'Ysolde', titre: 'la Tenante du titre', famille: 'Astre' as const };

export const familles = (): Family[] => [...FAMILIES];

/** Articles : la Cendre, le Voile, la Ronce, l'Astre (« de la Cendre », « du Voile », « de l'Astre »). */
const ART: Record<Family, { le: string; de: string; a: string }> = {
  Cendre: { le: 'la Cendre', de: 'de la Cendre', a: 'à la Cendre' },
  Voile: { le: 'le Voile', de: 'du Voile', a: 'au Voile' },
  Ronce: { le: 'la Ronce', de: 'de la Ronce', a: 'à la Ronce' },
  Astre: { le: 'l’Astre', de: 'de l’Astre', a: 'à l’Astre' },
};
export const leF = (f: Family): string => ART[f].le;
export const deF = (f: Family): string => ART[f].de;
export const aF = (f: Family): string => ART[f].a;
