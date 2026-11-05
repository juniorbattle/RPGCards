/**
 * M16 — les points de collecte de la ville (contrat `docs/m16/01_CHASSE_ET_TECHNIQUES.md` §2, fiche C1 à C5) : DONNÉES
 * pures, sans dépendance à la logique de l'aventure (qui les lit). Dix points, deux par chapitre de la trame (I à V),
 * répartis sur les six quartiers de la ville en rangs ; trois sortes de garde (C3) : libre, annoncé par une rumeur (un
 * recoin du fond), gardé par un joueur de rue (le duel d'abord). Places choisies sur la géométrie réelle des quartiers
 * (`tools/m16-points-sonde.ts` : praticables, accessibles depuis l'arrivée, hors des zones d'interaction, loin des places
 * des personnages ; vérifiées par `test/m16.test.ts`).
 */
import type { Facing } from '../ville/monde';
import type { IlotId } from '../ville/ilots';

export type ChapitreTrame = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface Gardien {
  /** Apparence d'un PNJ de la ville (`pnj-<gabarit>-<graine>`, feuilles recolorées par graine : aucune image nouvelle). */
  apparence: string;
  nom: string;
  at: { x: number; z: number };
  facing: Facing;
  /** Ce qu'il dit quand on approche de sa carte. */
  ligne: string;
}

export interface PointCollecte {
  id: string;
  ilot: IlotId;
  at: { x: number; z: number };
  /** Chapitre à partir duquel le point s'allume (il reste allumé ensuite tant qu'on ne l'a pas ramassé). */
  chapitre: ChapitreTrame;
  garde: 'libre' | 'rumeur' | 'gardien';
  /** Où la carte a été trouvée (carton de la découverte, Collection). */
  lieu: string;
  /** La piste qu'en donne une rumeur (passants « ? »). */
  piste: string;
  gardien?: Gardien;
}

export const POINTS_COLLECTE: readonly PointCollecte[] = [
  { id: 'quai-caisses', ilot: 'quai', at: { x: 7, z: 1 }, chapitre: 'I', garde: 'libre', lieu: 'entre les caisses du Quai',
    piste: '« Un docker jure avoir vu une carte briller entre les caisses, au bout du Quai. »' },
  { id: 'quai-chapelle', ilot: 'quai', at: { x: -8, z: -40 }, chapitre: 'I', garde: 'rumeur', lieu: 'derrière la cour de la Chapelle',
    piste: '« On raconte qu’une carte dort derrière la cour de la Chapelle, tout en haut du Quai. »' },
  { id: 'parvis-tableau', ilot: 'parvis', at: { x: 2, z: -14.2 }, chapitre: 'II', garde: 'gardien', lieu: 'près de la placette du Tableau',
    piste: '« Une joueuse garde une carte près de la placette du Tableau, au Parvis. Elle ne la cède qu’à qui la bat. »',
    gardien: { apparence: 'pnj-joueuse-61', nom: 'une joueuse du Tableau', at: { x: 3.2, z: -14.2 }, facing: 'gauche', ligne: '« Cette carte ? Je l’ai vue la première. Gagne-la, si tu peux. »' } },
  { id: 'ruelles-porche', ilot: 'ruelles', at: { x: -8, z: -5.2 }, chapitre: 'II', garde: 'libre', lieu: 'sous un porche des Ruelles',
    piste: '« Dans les Ruelles, une lueur passe sous un porche, côté ouest. »' },
  { id: 'cour-angle', ilot: 'cour', at: { x: -15, z: -9 }, chapitre: 'III', garde: 'rumeur', lieu: 'dans l’angle ouest de la Grande Cour',
    piste: '« Il paraît qu’une carte s’est perdue dans l’angle ouest de la Grande Cour, loin de l’estrade. »' },
  { id: 'port-filets', ilot: 'port', at: { x: -11, z: -13 }, chapitre: 'III', garde: 'gardien', lieu: 'repêchée dans les filets du Port',
    piste: '« Au Port, un vieux pêcheur veille sur une carte repêchée. Il ne la donne qu’à qui le bat aux cartes. »',
    gardien: { apparence: 'pnj-docker-62', nom: 'un vieux pêcheur', at: { x: -12.1, z: -13 }, facing: 'droite', ligne: '« Repêchée cette nuit, celle-là. Elle ira à qui me bat, pas à qui la demande. »' } },
  { id: 'haute-astronomes', ilot: 'haute', at: { x: 0, z: -17 }, chapitre: 'IV', garde: 'libre', lieu: 'dans la rue des Astronomes',
    piste: '« Une carte scintille dans la Ville haute, au milieu de la rue des Astronomes. »' },
  { id: 'quai-chantier', ilot: 'quai', at: { x: 15, z: -13 }, chapitre: 'IV', garde: 'gardien', lieu: 'au bord du Chantier',
    piste: '« Un commis du Chantier a trouvé une carte sur le Quai, côté est. Il veut un duel pour la rendre. »',
    gardien: { apparence: 'pnj-commis-63', nom: 'un commis du Chantier', at: { x: 16.2, z: -13 }, facing: 'gauche', ligne: '« Trouvée, gardée. Une partie, et elle est à toi si tu gagnes. »' } },
  { id: 'ruelles-fond', ilot: 'ruelles', at: { x: 7, z: -38.2 }, chapitre: 'V', garde: 'rumeur', lieu: 'au fond de la dernière ruelle',
    piste: '« On dit que la dernière ruelle cache une carte, tout au fond, là où plus personne ne passe. »' },
  { id: 'parvis-arene', ilot: 'parvis', at: { x: -6, z: -45.2 }, chapitre: 'V', garde: 'libre', lieu: 'au pied de l’arène',
    piste: '« Au pied de l’arène, sur le Parvis, une carte attend le champion qui passera. »' },
];

export const pointCollecte = (id: string): PointCollecte | undefined => POINTS_COLLECTE.find((p) => p.id === id);
