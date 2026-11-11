/**
 * M17 — Apprendre le duel (contrat `docs/m17/01_TUTORIEL_DU_DUEL.md`, fiche M17) : le catalogue des leçons, pur.
 *
 * Une leçon est une situation de duel posée d'avance (`fixture`, comme les scénarios de QA) contre un partenaire
 * d'entraînement aux commandes fixées (le maître de table, annoncé comme tel, jamais présenté comme l'IA), puis, tour
 * par tour, les gestes attendus du joueur (`attendu` : la commande exacte) et ce que dit le maître de table avant (`dire`)
 * et après le Clash (`apres`). Le dernier tour d'une leçon de base est libre (A2). Le moteur, les règles et le catalogue
 * des cartes sont ceux du jeu : un Clash de leçon se résout pour de vrai.
 *
 * Textes : `[complet, court]` (profil, A6) ; écriture épicène, tutoiement.
 */
import { cardDef, cardTitle } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import { fixture, type SideSetup } from '../game/fixtures/fixture';
import type { ClashReport, CommitChoice, GameConfig, GameState, Phase, PlayerCommand, PlayerId, SlotIndex, Stance, TacticPlan } from '../game/model/types';

export type Txt = readonly [complet: string, court: string];

/** Un geste guidé : dans telle phase du tour, la commande attendue du joueur. */
export interface Geste {
  phase: Phase;
  dire: Txt;
  attendu: (s: GameState) => PlayerCommand;
  /** Le joueur attend que le partenaire ait verrouillé d'abord (leçon de la Signature : la révision). */
  apresPartenaire?: boolean;
}

export interface TourLecon {
  tour: number;
  /** Gestes guidés de ce tour ; vide ou absent avec `libre` : le joueur choisit seul. */
  gestes?: Geste[];
  /** Les phases sans geste guidé sont libres (texte `dire` du tour). */
  libre?: boolean;
  dire?: Txt;
  /** Après le Clash du tour : pourquoi. */
  apres?: Txt;
  /** Vérification (tests) de l'issue du Clash guidé. */
  issue?: (r: ClashReport) => boolean;
}

export type GroupeLecon = 'base' | 'element';

export interface Lecon {
  id: LeconId;
  titre: string;
  /** Une ligne pour la bibliothèque. */
  resume: string;
  groupe: GroupeLecon;
  config: () => GameConfig;
  build: (cfg: GameConfig) => GameState;
  /** Commandes du partenaire par `tour:phase` ; `null` : il attend (rejoué au geste suivant du joueur). */
  partenaire: Record<string, (s: GameState) => PlayerCommand | null>;
  tours: TourLecon[];
  /** Conseils du duel (`src/shell/tips.ts`) qu'une leçon faite éteint (B5). */
  couvre: readonly string[];
}

// fiche de clôture (D1, règle B6) : « Repousser et remplacer » rejoint les bases, « Réviser face à une Signature » les éléments
export const LECONS_BASE = ['clash', 'posture', 'secondaires', 'tactique', 'interferer', 'insight', 'repousser'] as const;
export const LECONS_ELEMENTS = ['familles', 'effets', 'regard', 'tech-Sondage', 'tech-Recentrage', 'tech-Lecture', 'tech-Ancrage', 'tech-Rupture', 'tech-Dissipation', 'signature', 'revision', 'prolongation'] as const;
export type LeconId = (typeof LECONS_BASE)[number] | (typeof LECONS_ELEMENTS)[number];
export const LECON_IDS: readonly LeconId[] = [...LECONS_BASE, ...LECONS_ELEMENTS];
export const estLeconId = (x: string): x is LeconId => (LECON_IDS as readonly string[]).includes(x);

// ---------------------------------------------------------------------------
// Briques

/** Le partenaire d'entraînement (nom affiché par la séance). */
export const PARTENAIRE = 'Le maître de table';

const N = (r: 1 | 2 | 3 | 4): string => `neutre-${r}`;
const NEUTRES: string[] = ([1, 2, 3, 4] as const).flatMap((r) => [N(r), N(r), N(r), N(r)]);
const FAM = ['Cendre', 'Voile', 'Ronce', 'Astre'] as const;
/** Les seize cartes de base (une identité par famille et par Rang), certaines remplacées par une variante. */
function basiques(variantes: string[] = []): string[] {
  return FAM.flatMap((f) => ([1, 2, 3, 4] as const).map((r) => variantes.find((v) => v.startsWith(`${f}-${r}-`)) ?? `${f}-${r}-basic`));
}

interface Joueur { hp?: number; deck?: string[]; techniques?: TechniqueId[]; signature?: GameConfig['players']['p1']['signature']; insight?: number }
function config(p1: Joueur = {}, p2: Joueur = {}, seed = 1717): GameConfig {
  const side = (name: string, j: Joueur) => {
    const deck = [...(j.deck ?? NEUTRES), ...(j.signature ? [`sig-${j.signature}`] : [])];
    return { name, hp: j.hp ?? 40, signature: j.signature ?? null, variants: 'none' as const, deck, techniques: j.techniques ?? [], ...(j.insight !== undefined ? { insightStart: j.insight } : {}) };
  };
  return { seed, players: { p1: side('Vous', p1), p2: side(PARTENAIRE, p2) } };
}

/** L'instance en main de telle définition (les neutres ont quatre instances par Rang). */
export function enMain(s: GameState, pid: PlayerId, defId: string): string {
  const id = s.players[pid].hand.find((x) => s.cards[x]!.defId === defId);
  if (!id) throw new Error(`Leçon : ${defId} absente de la main de ${pid}`);
  return id;
}

const def = (short: string): string => (short.startsWith('sig-') || short.startsWith('neutre-') || !/-\d$/.test(short) ? short : `${short}-basic`);

function engager(pid: PlayerId, prim: string, stance: Stance, sec?: string, slot?: SlotIndex): (s: GameState) => PlayerCommand {
  return (s) => {
    const full = s.players[pid].slots.every((x) => x !== null);
    const secondaryId = sec ? enMain(s, pid, def(sec)) : null;
    return { type: 'commit', player: pid, primaryId: enMain(s, pid, def(prim)), stance, secondaryId, replaceSlot: sec && full ? (slot ?? 0) : null, ...(sec && !full && slot !== undefined ? { slot } : {}) };
  };
}
const plans = (pid: PlayerId, p: [TacticPlan | null, TacticPlan | null], technique: Extract<PlayerCommand, { type: 'tactics' }>['technique'] = null) =>
  (): PlayerCommand => ({ type: 'tactics', player: pid, plans: p, technique });
const reveler = (pid: PlayerId, reveal: SlotIndex[]) => (): PlayerCommand => ({ type: 'prepare', player: pid, reveal });
const commitDe = (s: GameState, pid: PlayerId, prim: string, stance: Stance): CommitChoice => ({ primaryId: enMain(s, pid, def(prim)), stance, secondaryId: null, replaceSlot: null });

function poser(cfg: GameConfig, p1: SideSetup, p2: SideSetup, turn: number, phase: 'COMMIT' | 'PREPARE' | 'START' = 'COMMIT'): GameState {
  return fixture(cfg, p1, p2, { turn, phase });
}

const t = (complet: string, court: string): Txt => [complet, court];
const LIBRE: Txt = t('À toi : ce tour, tu choisis seul. Je joue pour de bon, comme un adversaire.', 'À toi de jouer, seul.');

// ---------------------------------------------------------------------------
// Les six leçons de base (A1) : cartes grises, un concept à la fois

const clash: Lecon = {
  id: 'clash', groupe: 'base', titre: 'Le Clash', resume: 'Le Rang décide qui gagne, la Puissance fait les dégâts.',
  couvre: ['resolved', 'zero'],
  config: () => config(),
  build: (cfg) => poser(cfg, { hand: [N(4), N(1), N(2), N(3)] }, { hand: [N(2), N(4), N(3), N(1)] }, 1),
  partenaire: { '1:COMMIT': engager('p2', N(2), 'assault'), '2:COMMIT': engager('p2', N(4), 'assault') },
  tours: [
    { tour: 1, gestes: [{ phase: 'COMMIT', attendu: engager('p1', N(4), 'assault'),
      dire: t('Bienvenue à ma table. Un duel se joue en Clashs : chacun pose une carte, la Primaire, puis on la révèle en même temps. Chaque carte a un Rang (I à IV) et une Puissance. Pose ton Neutre IV en ASSAUT. Je jouerai un Rang II en Assaut ; en duel, tu ne le saurais pas.', 'Pose Neutre IV en ASSAUT (je joue un Rang II).') }],
      apres: t('Rang IV contre Rang II : ton Rang l’emporte, tu gagnes le Clash. Ta Puissance, 12, fait les dégâts.', 'Rang IV > II : tu gagnes, ta Puissance (12) blesse.'),
      issue: (r) => r.winner === 'p1' && r.damage.p2 === 12 },
    { tour: 2, gestes: [{ phase: 'COMMIT', attendu: engager('p1', N(3), 'assault'),
      dire: t('Ta main s’est complétée à quatre cartes. Pose ton Neutre III en ASSAUT. Je jouerai un Rang IV.', 'Neutre III en ASSAUT (je joue un Rang IV).') }],
      apres: t('Rang III contre Rang IV : cette fois, mon Rang l’emporte, et c’est ma Puissance, 12, qui te touche. Retiens : le Rang décide qui gagne, la Puissance dit combien.', 'Rang III < IV : je gagne, ma Puissance te blesse.'),
      issue: (r) => r.winner === 'p2' && r.damage.p1 === 12 },
    { tour: 3, libre: true, dire: LIBRE },
  ],
};

const posture: Lecon = {
  id: 'posture', groupe: 'base', titre: 'Assaut ou Garde', resume: 'La Garde gagne les égalités ; dominée, elle absorbe la moitié de sa Puissance.',
  couvre: [],
  config: () => config(),
  build: (cfg) => poser(cfg, { hand: [N(3), N(4), N(1), N(2)] }, { hand: [N(3), N(2), N(4), N(1)] }, 1),
  partenaire: { '1:COMMIT': engager('p2', N(3), 'assault'), '2:COMMIT': engager('p2', N(2), 'guard') },
  tours: [
    { tour: 1, gestes: [{ phase: 'COMMIT', attendu: engager('p1', N(3), 'guard'),
      dire: t('Ta Primaire se pose en ASSAUT, pour frapper, ou en GARDE, pour tenir. Je vais attaquer avec un Rang III. Pose ton Neutre III en GARDE.', 'Neutre III en GARDE (j’attaque en Rang III).') }],
      apres: t('Rang III contre Rang III : à égalité, la Garde gagne. Ta Garde bloque tout (0 dégât) et te rapporte 1 Insight.', 'Égalité : la Garde gagne, 0 dégât, +1 Insight.'),
      issue: (r) => r.guardWin && r.winner === 'p1' && r.damage.p1 === 0 },
    { tour: 2, gestes: [{ phase: 'COMMIT', attendu: engager('p1', N(4), 'assault'),
      dire: t('Je me mets en Garde avec un Rang II. Pose ton Neutre IV en ASSAUT.', 'Neutre IV en ASSAUT (je garde en Rang II).') }],
      apres: t('Ton Rang IV domine ma Garde. Une Garde dominée absorbe la moitié de sa Puissance : la moitié de 6, soit 3. Tu infliges 12 − 3 = 9 ; au moins 1 dégât passe toujours.', 'Garde dominée : elle absorbe 3, tu passes 9.'),
      issue: (r) => r.winner === 'p1' && r.damage.p2 === 9 },
    { tour: 3, libre: true, dire: LIBRE },
  ],
};

const secondaires: Lecon = {
  id: 'secondaires', groupe: 'base', titre: 'Les Secondaires', resume: 'Charger, réserve cachée, active.',
  couvre: ['prepare', 'commit'],
  config: () => config(),
  build: (cfg) => poser(cfg, { hand: [N(2), N(3), N(4), N(1)] }, { hand: [N(1), N(2), N(3), N(4)] }, 1),
  partenaire: { '1:COMMIT': engager('p2', N(1), 'assault'), '2:COMMIT': engager('p2', N(2), 'assault') },
  tours: [
    { tour: 1, gestes: [{ phase: 'COMMIT', attendu: engager('p1', N(2), 'guard', N(3), 0),
      dire: t('Avec ta Primaire, tu peux poser une Secondaire, face cachée, sur une case libre. Pose Neutre II en GARDE en Primaire, et Neutre III sur la case SECONDAIRE 1. J’attaque en Rang I.', 'Neutre II en GARDE, Neutre III en Secondaire 1.') }],
      apres: t('Ta Garde tient. Ta Secondaire a passé ce tour EN CHARGEMENT : une Secondaire ne sert jamais le tour où on la pose.', 'Ta Secondaire charge : inutilisable ce tour.'),
      issue: (r) => r.guardWin && r.winner === 'p1' },
    { tour: 2, gestes: [
      { phase: 'PREPARE', attendu: reveler('p1', [0]),
        dire: t('Ta Secondaire est maintenant une RÉSERVE CACHÉE : prête, et invisible pour moi. Révèle-la : elle devient ACTIVE.', 'Révèle ta Secondaire 1.') },
      { phase: 'COMMIT', attendu: engager('p1', N(4), 'assault'),
        dire: t('Pose ton Neutre IV en ASSAUT. J’attaque en Rang II.', 'Neutre IV en ASSAUT.') },
      { phase: 'TACTICS', attendu: plans('p1', [null, null]),
        dire: t('Une Secondaire active peut soutenir ta Primaire une fois les Primaires révélées : ce sera la prochaine leçon. Pour l’instant, choisis « Conserver » : elle ne joue pas ce tour et reste active.', 'Conserver : elle reste active.') }],
      apres: t('Rang IV contre II : 12 dégâts. Ta Secondaire est restée ACTIVE pour la suite. Retiens les trois états : EN CHARGEMENT, RÉSERVE CACHÉE, ACTIVE.', 'Trois états : chargement, réserve cachée, active.'),
      issue: (r) => r.winner === 'p1' && r.damage.p2 === 12 },
    { tour: 3, libre: true, dire: LIBRE },
  ],
};

const tactique: Lecon = {
  id: 'tactique', groupe: 'base', titre: 'Les choix tactiques', resume: 'Amplifier le Rang pour gagner, les Dégâts pour frapper fort.',
  couvre: ['tactics'],
  config: () => config({}, { hp: 60 }),
  build: (cfg) => poser(cfg, { hand: [N(3), N(4), N(1), N(2)], slots: [{ def: N(2), active: true }, { def: N(3), active: true }] }, { hand: [N(4), N(2), N(1), N(3)] }, 3),
  partenaire: { '3:COMMIT': engager('p2', N(4), 'assault'), '4:COMMIT': engager('p2', N(2), 'assault') },
  tours: [
    { tour: 3, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', N(3), 'assault'),
        dire: t('Tu as deux Secondaires actives. Je vais attaquer avec un Rang IV : ton Neutre III seul perdrait. Pose-le quand même en ASSAUT.', 'Neutre III en ASSAUT (j’attaque en Rang IV).') },
      { phase: 'TACTICS', attendu: plans('p1', [{ mode: 'rank' }, null]),
        dire: t('Les Primaires sont révélées. Choisis en secret ce que fait ta Secondaire 1 : Amplifier le Rang ajoute son Rang, +2, à ton score.', 'Secondaire 1 : Amplifier le Rang (+2).') }],
      apres: t('3 + 2 = 5 contre 4 : ton soutien renverse le Clash. Une Secondaire utilisée part à la défausse.', '3 + 2 = 5 > 4 : le soutien renverse le Clash.'),
      issue: (r) => r.winner === 'p1' && r.damage.p2 === 9 },
    { tour: 4, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', N(4), 'assault'),
        dire: t('J’attaque en Rang II. Pose ton Neutre IV en ASSAUT.', 'Neutre IV en ASSAUT.') },
      { phase: 'TACTICS', attendu: plans('p1', [null, { mode: 'damage' }]),
        dire: t('Amplifier les dégâts multiplie ta Puissance, en Assaut seulement : ton Neutre III donne ×3. Choisis-le pour ta Secondaire 2.', 'Secondaire 2 : Amplifier les dégâts (×3).') }],
      apres: t('Tu gagnes le Clash : 12 × 3 = 36 dégâts. Le Rang pour gagner, les Dégâts pour frapper fort.', '12 × 3 = 36 : Rang pour gagner, Dégâts pour frapper.'),
      issue: (r) => r.winner === 'p1' && r.damage.p2 === 36 },
    { tour: 5, libre: true, dire: LIBRE },
  ],
};

const interferer: Lecon = {
  id: 'interferer', groupe: 'base', titre: 'Interférer', resume: 'Annuler le soutien adverse qui allait gagner le Clash.',
  couvre: [],
  config: () => config(),
  build: (cfg) => poser(cfg, { hand: [N(3), N(2), N(1), N(4)], slots: [{ def: N(4), active: true }, null] }, { hand: [N(3), N(1), N(2), N(4)], slots: [{ def: N(3), active: true }, null] }, 3),
  partenaire: { '3:COMMIT': engager('p2', N(3), 'assault'), '3:TACTICS': plans('p2', [{ mode: 'rank' }, null]) },
  tours: [
    { tour: 3, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', N(3), 'guard'),
        dire: t('J’attaque en Rang III, et ma Secondaire active, un Rang III, va amplifier mon Rang : 3 + 3 = 6. Pose ton Neutre III en GARDE.', 'Neutre III en GARDE (je ferai 3 + 3).') },
      { phase: 'TACTICS', attendu: plans('p1', [{ mode: 'interfere', target: 0 }, null]),
        dire: t('Ta Secondaire de Rang IV peut INTERFÉRER : elle annule le soutien d’une Secondaire adverse active de Rang imprimé égal ou inférieur. Choisis Interférer, puis vise ma Secondaire.', 'Secondaire 1 : Interférer sur ma Secondaire.') }],
      apres: t('Ton Interférence a annulé mon soutien : 3 contre 3, et la Garde gagne l’égalité. Sans elle, mon Assaut passait ta Garde. Une Interférence se consomme, et l’on choisit en même temps : en duel, tu vises ce que tu crois.', 'Soutien annulé : 3 contre 3, ta Garde gagne.'),
      issue: (r) => r.guardWin && r.winner === 'p1' && r.cancelled.p2.length === 1 },
    { tour: 4, libre: true, dire: LIBRE },
  ],
};

const insight: Lecon = {
  id: 'insight', groupe: 'base', titre: 'Insight et Technique', resume: 'La réserve de 0 à 2, une Technique par tour.',
  couvre: ['insight', 'start'],
  config: () => config({ techniques: ['Sondage'] }),
  // fiche de clôture (D1) : le début du tour commence par la défausse (main de cinq cartes : une carte revenue en main)
  build: (cfg) => poser(cfg, { hand: [N(4), N(1), N(2), N(3), N(1)], insight: 0 }, { hand: [N(3), N(2), N(1), N(4)] }, 1, 'START'),
  partenaire: { '1:COMMIT': engager('p2', N(3), 'assault') },
  tours: [
    { tour: 1, gestes: [{ phase: 'START', attendu: (s) => ({ type: 'start', player: 'p1', discard: [enMain(s, 'p1', N(1))], technique: null }),
      dire: t('Début du tour : on joue avec quatre cartes en main. Une carte est revenue dans la tienne, tu en as cinq : défausse un de tes deux Neutres I.', 'Cinq cartes : défausse un Neutre I.') },
    { phase: 'COMMIT', attendu: engager('p1', N(4), 'guard'),
      dire: t('L’Insight, en haut de ton cadre, paie tes Techniques. Tu n’en as aucun. J’attaque en Rang III : pose ton Neutre IV en GARDE.', 'Neutre IV en GARDE (j’attaque en Rang III).') }],
      apres: t('Ta Garde gagne contre un Assaut : +1 Insight. La réserve va de 0 à 2 ; on en gagne surtout ainsi, ou par une Interférence réussie.', 'Garde gagnante : +1 Insight (réserve 0 à 2).'),
      issue: (r) => r.guardWin && r.winner === 'p1' },
    { tour: 2, libre: true, dire: LIBRE, gestes: [{ phase: 'START', attendu: () => ({ type: 'start', player: 'p1', discard: [], technique: { id: 'Sondage' } }),
      dire: t('Début du tour : tu as 1 Insight. Utilise Sondage (coût 1) : tu verras en secret une carte de ma main. Une seule Technique par tour.', 'Utilise Sondage (1 Insight).') }],
      apres: t('Sondage t’a montré une carte de ma main, à toi seul. L’autre Technique de la rue, Recentrage, change une carte de ta main. Leurs fenêtres s’affichent dans tes commandes.', 'Une Technique par tour, payée en Insight.') },
  ],
};

// Fiche de clôture (D1) : le Repoussement après une Garde victorieuse, puis le remplacement d'une Secondaire (deux cases
// pleines). Cartes grises, tour libre à la fin (A2).
const repousser: Lecon = {
  id: 'repousser', groupe: 'base', titre: 'Repousser et remplacer', resume: 'Garde gagnante : une réserve adverse retourne en main ; deux cases pleines : une Secondaire en remplace une.',
  couvre: ['el-repousser'],
  config: () => config(),
  build: (cfg) => poser(cfg, { hand: [N(4), N(3), N(1), N(2)], slots: [{ def: N(2) }, { def: N(3) }] }, { hand: [N(2), N(1), N(3), N(4)], slots: [{ def: N(1) }, null] }, 3),
  partenaire: { '3:COMMIT': engager('p2', N(2), 'assault'), '4:COMMIT': engager('p2', N(1), 'guard') },
  tours: [
    { tour: 3, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', N(4), 'guard'),
        dire: t('J’attaque en Rang II. Pose ton Neutre IV en GARDE : une Garde qui gagne contre un Assaut a droit à un Repoussement.', 'Neutre IV en GARDE (j’attaque en Rang II).') },
      { phase: 'REPEL', attendu: () => ({ type: 'repel', player: 'p1', targetSlot: 0 }),
        dire: t('Ta Garde a gagné. Repousse ma réserve cachée : clique-la, elle retourne dans ma main, et ce que j’avais préparé est perdu. On peut aussi y renoncer.', 'Repousse ma réserve cachée.') }],
      apres: t('Ma réserve est revenue dans ma main : je devrai la rejouer et la recharger. Seule une Garde victorieuse repousse, une fois par Clash.', 'Garde gagnante : une réserve adverse repoussée.'),
      issue: (r) => r.guardWin && r.winner === 'p1' },
    { tour: 4, gestes: [
      { phase: 'PREPARE', attendu: reveler('p1', []),
        dire: t('Tes deux réserves sont prêtes ; garde-les cachées pour l’instant.', 'Garde tes réserves cachées.') },
      { phase: 'COMMIT', attendu: engager('p1', N(3), 'assault', N(1), 1),
        dire: t('Tes deux cases sont pleines : une nouvelle Secondaire en remplace une, et la carte remplacée part à la défausse. Pose ton Neutre III en ASSAUT, puis ton Neutre I en SECONDAIRE : choisis la case 2.', 'Neutre III en ASSAUT, Neutre I sur la case 2.') }],
      apres: t('Ton Neutre I a pris la case 2 ; l’ancienne réserve est à la défausse. La nouvelle se charge ce tour : tu pourras la révéler au prochain.', 'Remplacée : l’ancienne part à la défausse.') },
    { tour: 5, libre: true, dire: LIBRE },
  ],
};

// ---------------------------------------------------------------------------
// Les leçons des nouveaux éléments (B2), une minute chacune

const familles: Lecon = {
  id: 'familles', groupe: 'element', titre: 'Familles et affinité', resume: 'Une Secondaire de la même famille que la Primaire donne +1.',
  couvre: [],
  config: () => config({ deck: basiques() }, { deck: basiques() }),
  build: (cfg) => poser(cfg, { hand: ['Cendre-3', 'Ronce-2', 'Astre-2', 'Voile-3'], slots: [{ def: 'Voile-1', active: true }, { def: 'Cendre-1', active: true }] }, { hand: ['Astre-4', 'Cendre-2', 'Ronce-1', 'Voile-2'] }, 3),
  partenaire: { '3:COMMIT': engager('p2', 'Astre-4', 'guard') },
  tours: [
    { tour: 3, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', 'Cendre-3', 'assault'),
        dire: t('Les cartes des quatre familles jouent comme les grises, avec une affinité en plus. Je me mets en Garde avec un Rang IV. Pose Cendre III en ASSAUT.', 'Cendre III en ASSAUT (je garde en Rang IV).') },
      { phase: 'TACTICS', attendu: plans('p1', [null, { mode: 'rank' }]),
        dire: t('Voile I ne donnerait que +1 : 4 contre 4, et la Garde gagne l’égalité. Cendre I est de la même famille que ta Primaire : elle donne +1 de plus. Amplifie le Rang avec Cendre I.', 'Cendre I (même famille) : Amplifier le Rang.') }],
      apres: t('3 + 1 + 1 = 5 contre 4 : l’affinité a fait la différence. Elle compte pour le Rang et pour les Dégâts, jamais pour Interférer (le Rang imprimé seul).', 'Affinité +1 : 5 contre 4.'),
      issue: (r) => r.winner === 'p1' && !r.guardWin },
  ],
};

const effets: Lecon = {
  id: 'effets', groupe: 'element', titre: 'Les effets des variantes', resume: 'RÉVÉLER, ARMÉ, la pastille, les temps forts.',
  couvre: ['reveler', 'arme', 'pastille', 'temps', 'el-effet'],
  config: () => config({ deck: basiques(['Ronce-2-seve', 'Astre-1-boussole', 'Cendre-2-braise']) }, { deck: basiques() }),
  build: (cfg) => poser(cfg, { hand: ['Cendre-2-braise', 'Voile-3', 'Ronce-4', 'Astre-2'], slots: [{ def: 'Ronce-2-seve' }, { def: 'Astre-1-boussole', active: true }], hp: 30 }, { hand: ['Voile-1', 'Cendre-3', 'Ronce-1', 'Astre-4'] }, 3, 'PREPARE'),
  partenaire: { '3:COMMIT': engager('p2', 'Voile-1', 'assault') },
  tours: [
    { tour: 3, gestes: [
      { phase: 'PREPARE', attendu: reveler('p1', [0]),
        dire: t('Une variante porte un effet. Le bandeau RÉVÉLER signale un effet qui joue au moment où tu révèles la carte. Révèle Sève : tu as moins de PV que moi, elle te soigne de 2.', 'Révèle Sève (RÉVÉLER : soin).') },
      { phase: 'COMMIT', attendu: engager('p1', 'Cendre-2-braise', 'assault'),
        dire: t('Braise porte un effet de Primaire : révélée, elle sera ARMÉE, son effet attendra sa condition (gagner contre un Assaut). Pose Braise en ASSAUT. J’attaque en Rang I.', 'Braise en ASSAUT (elle sera ARMÉE).') },
      { phase: 'TACTICS', attendu: plans('p1', [null, { mode: 'rank' }]),
        dire: t('La pastille sous la gemme d’une carte dit QUAND son effet joue. Celle de Boussole : en Rang. Dans le menu, le mode qui déclenche l’effet porte son nom. Amplifie le Rang avec Boussole.', 'Boussole : Amplifier le Rang (sa pastille).') }],
      apres: t('Braise a gagné contre un Assaut : son effet armé ajoute 2 dégâts. Chaque effet qui joue s’affiche au centre de l’écran : ce sont les temps forts.', 'Braise armée : +2 dégâts, montrés en temps fort.'),
      issue: (r) => r.winner === 'p1' && r.fixedDamage.p2 === 2 },
  ],
};

const regard: Lecon = {
  id: 'regard', groupe: 'element', titre: 'Regard privé et camouflage', resume: 'Ce que tu vois, ce que l’adversaire sait.',
  couvre: ['prive', 'el-regard'],
  config: () => config({ deck: basiques(['Voile-1-eclaireur']) }, { deck: basiques(['Voile-3-dissimulation']) }),
  build: (cfg) => poser(cfg, { hand: ['Ronce-4', 'Cendre-2', 'Astre-3', 'Voile-2'], slots: [{ def: 'Voile-1-eclaireur' }, null] }, { hand: ['Cendre-3', 'Astre-1', 'Ronce-1', 'Voile-4'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-2' }] }, 3, 'PREPARE'),
  partenaire: { '3:PREPARE': reveler('p2', [0, 1]), '3:COMMIT': engager('p2', 'Cendre-3', 'assault'), '3:TACTICS': plans('p2', [{ mode: 'keep' }, { mode: 'rank' }]) },
  tours: [
    { tour: 3, gestes: [
      { phase: 'PREPARE', attendu: reveler('p1', [0]),
        dire: t('Éclaireur, à sa révélation, te montre une carte de ma main, à toi seul : c’est un regard PRIVÉ. Je sais que tu as regardé, pas ce que tu as vu. Révèle Éclaireur.', 'Révèle Éclaireur (regard privé).') },
      { phase: 'COMMIT', attendu: engager('p1', 'Ronce-4', 'guard'),
        dire: t('J’ai révélé Dissimulation : mon autre Secondaire est masquée, tu vois sa famille, pas la carte. Pose Ronce IV en GARDE.', 'Ronce IV en GARDE.') },
      { phase: 'TACTICS', attendu: plans('p1', [null, null]),
        dire: t('Choisis « Conserver » : Éclaireur reste active.', 'Conserver.') }],
      apres: t('Ma Secondaire masquée a soutenu mon Rang : tu as vu qu’elle jouait, pas sa valeur ni la carte. Le journal du duel garde tes regards privés ; la Technique Dissipation lève un camouflage.', 'Soutien masqué : vu, jamais identifié.'),
      issue: (r) => r.winner === 'p2' },
  ],
};

const techStart = (id: 'Sondage' | 'Recentrage'): Lecon => ({
  id: `tech-${id}`, groupe: 'element', titre: id, resume: id === 'Sondage' ? 'Voir en secret une carte de la main adverse.' : 'Remplacer une carte de ta main.',
  couvre: ['start', `el-tech-${id}`],
  config: () => config({ techniques: [id], insight: 1 }),
  build: (cfg) => poser(cfg, { hand: [N(4), N(3), N(2), N(1)], insight: 1 }, { hand: [N(3), N(1), N(4), N(2)] }, 1, 'START'),
  partenaire: { '1:COMMIT': engager('p2', N(3), 'assault') },
  tours: [
    { tour: 1, libre: true, dire: LIBRE, gestes: [{ phase: 'START',
      attendu: (s) => ({ type: 'start', player: 'p1', discard: [], technique: id === 'Sondage' ? { id } : { id, cardId: enMain(s, 'p1', N(1)) } }),
      dire: id === 'Sondage'
        ? t('Sondage se joue au début du tour, pour 1 Insight : tu vois en secret une carte au hasard de ma main. Utilise Sondage.', 'Utilise Sondage.')
        : t('Recentrage se joue au début du tour, pour 1 Insight : une carte de ta main va sous ta pioche, et tu en pioches une autre. Utilise Recentrage sur ton Neutre I.', 'Recentrage : ton Neutre I.') }],
      apres: id === 'Sondage'
        ? t('Tu as vu une carte de ma main ; moi, je sais seulement que tu as regardé. Une Technique par tour, payée à la déclaration.', 'Une carte vue, en secret.')
        : t('Ton Neutre I est sous ta pioche, une autre carte l’a remplacé. Une Technique par tour, payée à la déclaration.', 'Une carte changée.') },
  ],
});

const lecture: Lecon = {
  id: 'tech-Lecture', groupe: 'element', titre: 'Lecture', resume: 'Voir le mode adverse, puis changer le tien.',
  couvre: ['el-tech-Lecture'],
  config: () => config({ techniques: ['Lecture'], insight: 2 }),
  build: (cfg) => poser(cfg, { hand: [N(4), N(3), N(2), N(1)], insight: 2 }, { hand: [N(4), N(2), N(3), N(1)] }, 1),
  partenaire: { '1:COMMIT': engager('p2', N(4), 'assault') },
  tours: [
    { tour: 1, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', N(4), 'assault'),
        dire: t('Lecture joue juste après l’engagement, pour 2 Insight. Engage d’abord ton Neutre IV en ASSAUT.', 'Neutre IV en ASSAUT.') },
      { phase: 'LECTURE', attendu: () => ({ type: 'lecture', player: 'p1', use: true }),
        dire: t('Utilise Lecture : tu vois le mode de ma Primaire avant la révélation.', 'Utilise Lecture.') },
      { phase: 'LECTURE_CHANGE', attendu: () => ({ type: 'lectureStance', player: 'p1', stance: 'guard' }),
        dire: t('Je suis en ASSAUT, avec un Rang égal au tien. En GARDE, tu gagnerais l’égalité : passe en GARDE.', 'Passe en GARDE.') }],
      apres: t('Ta Garde gagne l’égalité : 0 dégât, +1 Insight. Sans Lecture, nos deux Assauts se touchaient en même temps.', 'Lecture : Garde gagnante à l’égalité.'),
      issue: (r) => r.guardWin && r.winner === 'p1' },
  ],
};

const ancrage: Lecon = {
  id: 'tech-Ancrage', groupe: 'element', titre: 'Ancrage', resume: 'Une Secondaire annulée reste active sur sa case.',
  couvre: ['el-tech-Ancrage'],
  config: () => config({ techniques: ['Ancrage'], insight: 1 }),
  build: (cfg) => poser(cfg, { hand: [N(3), N(4), N(1), N(2)], slots: [{ def: N(2), active: true }, null], insight: 1 }, { hand: [N(2), N(3), N(1), N(4)], slots: [{ def: N(3), active: true }, null] }, 3),
  partenaire: { '3:COMMIT': engager('p2', N(2), 'assault'), '3:TACTICS': plans('p2', [{ mode: 'interfere', target: 0 }, null]) },
  tours: [
    { tour: 3, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', N(3), 'assault'),
        dire: t('Pose ton Neutre III en ASSAUT. J’attaque en Rang II.', 'Neutre III en ASSAUT.') },
      { phase: 'TACTICS', attendu: plans('p1', [{ mode: 'rank' }, null], { id: 'Ancrage', slot: 0 }),
        dire: t('Je vais Interférer sur ta Secondaire. Amplifie le Rang avec elle, puis active Ancrage (1 Insight) et désigne-la : annulée, elle restera active sur sa case.', 'Rang avec ta Secondaire, puis Ancrage sur elle.') }],
      apres: t('Mon Interférence a annulé ton soutien, mais grâce à Ancrage ta Secondaire est restée ACTIVE : elle resservira. Son action, elle, reste annulée.', 'Annulée, mais restée active.'),
      issue: (r) => r.winner === 'p1' && r.cancelled.p1.length === 1 },
  ],
};

const rupture: Lecon = {
  id: 'tech-Rupture', groupe: 'element', titre: 'Rupture', resume: 'Garde gagnante : une Secondaire active adverse retourne en main.',
  couvre: ['el-tech-Rupture'],
  config: () => config({ deck: basiques(), techniques: ['Rupture'], insight: 2 }, { deck: basiques() }),
  build: (cfg) => poser(cfg, { hand: ['Ronce-4', 'Cendre-1', 'Astre-2', 'Voile-2'], insight: 2 }, { hand: ['Cendre-2', 'Ronce-1', 'Voile-1', 'Astre-1'], slots: [{ def: 'Astre-3', active: true }, null] }, 3),
  partenaire: { '3:COMMIT': engager('p2', 'Cendre-2', 'assault'), '3:TACTICS': plans('p2', [{ mode: 'keep' }, null]) },
  tours: [
    { tour: 3, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', 'Ronce-4', 'guard'),
        dire: t('Rupture se joue en Garde, pour 2 Insight. Pose Ronce IV en GARDE. J’attaque en Rang II.', 'Ronce IV en GARDE.') },
      { phase: 'TACTICS', attendu: plans('p1', [null, null], { id: 'Rupture', targetSlot: 0 }),
        dire: t('Active Rupture, puis vise ma Secondaire active : si ta Garde gagne, elle retourne dans ma main.', 'Rupture, puis vise ma Secondaire.') },
      { phase: 'REPEL', attendu: () => ({ type: 'repel', player: 'p1', targetSlot: 0 }),
        dire: t('Ta Garde a gagné : clique ma Secondaire surlignée pour la renvoyer dans ma main.', 'Clique ma Secondaire surlignée.') }],
      apres: t('Ta Garde a gagné : Rupture renvoie ma Secondaire active dans ma main. Elle n’agit que si je n’ai aucune Secondaire cachée à repousser.', 'Rupture : ma Secondaire retourne en main.'),
      issue: (r) => r.guardWin && r.winner === 'p1' },
  ],
};

const dissipation: Lecon = {
  id: 'tech-Dissipation', groupe: 'element', titre: 'Dissipation', resume: 'Lever un camouflage avant l’engagement.',
  couvre: ['el-tech-Dissipation'],
  config: () => config({ deck: basiques(), techniques: ['Dissipation'] }, { deck: basiques(['Voile-3-dissimulation', 'Voile-1-eclaireur']) }),
  build: (cfg) => poser(cfg, { hand: ['Cendre-4', 'Ronce-2', 'Astre-1', 'Voile-2'] }, { hand: ['Ronce-3', 'Cendre-2', 'Astre-2', 'Ronce-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Voile-1-eclaireur' }] }, 5, 'PREPARE'),
  partenaire: { '5:PREPARE': reveler('p2', [0, 1]), '5:COMMIT': engager('p2', 'Ronce-3', 'guard'), '5:TACTICS': plans('p2', [{ mode: 'keep' }, { mode: 'keep' }]) },
  tours: [
    { tour: 5, libre: true, dire: LIBRE, gestes: [{ phase: 'DISSIPATION', attendu: () => ({ type: 'dissipate', player: 'p1', targetSlot: 0 }),
      dire: t('J’ai révélé Dissimulation : mon autre Secondaire est masquée. Dissipation (1 Insight) neutralise ce camouflage jusqu’à la fin du tour. Utilise Dissipation sur ma Dissimulation.', 'Dissipation sur ma Dissimulation.') }],
      apres: t('Le camouflage est levé : tu as vu ma carte masquée. Ce que j’avais déjà vu, je l’ai vu ; Dissipation n’efface rien.', 'Camouflage levé.') },
  ],
};

const signature: Lecon = {
  id: 'signature', groupe: 'element', titre: 'La Signature', resume: 'Rang ∞, annoncée dès son engagement ; l’adversaire peut réviser.',
  couvre: ['el-signature'],
  config: () => config({ deck: basiques(), signature: 'Cendre' }, { deck: basiques() }),
  build: (cfg) => poser(cfg, { hand: ['sig-Cendre', 'Cendre-2', 'Voile-1', 'Astre-2'] }, { hand: ['Ronce-4', 'Ronce-1', 'Astre-1', 'Voile-2'] }, 1),
  partenaire: {
    '1:COMMIT': engager('p2', 'Ronce-4', 'assault'),
    '1:REVISION': (s) => ({ type: 'revise', player: 'p2', commit: commitDe(s, 'p2', 'Ronce-1', 'guard') }),
  },
  tours: [
    { tour: 1, gestes: [{ phase: 'COMMIT', apresPartenaire: true, attendu: engager('p1', 'sig-Cendre', 'assault'),
      dire: t('Ta Signature a un Rang infini : elle bat toute Primaire ordinaire. Mais elle est ANNONCÉE, face visible, dès que tu l’engages (ton mode reste secret), et qui a déjà engagé sa carte peut réviser une fois. J’ai engagé la mienne : pose Brasier Originel en ASSAUT.', 'Brasier Originel en ASSAUT (j’ai engagé).') }],
      apres: t('Voyant ta Signature, j’ai révisé : une petite Garde plutôt que mon Rang IV. Le Rang ∞ l’emporte quand même. Une Signature ne peut jamais être Secondaire.', 'J’ai révisé ; ∞ l’emporte.'),
      issue: (r) => r.winner === 'p1' },
  ],
};

// Fiche de clôture (D1) : la révision du joueur (avenant 08, amendement 1). Le partenaire engage APRÈS le joueur.
const revision: Lecon = {
  id: 'revision', groupe: 'element', titre: 'Réviser face à une Signature', resume: 'Engagé avant une Signature annoncée, tu peux changer ton engagement, une seule fois.',
  couvre: ['el-revision'],
  config: () => config({}, { signature: 'Cendre' }),
  build: (cfg) => poser(cfg, { hand: [N(4), N(1), N(2), N(3)] }, { hand: ['sig-Cendre', N(2), N(3), N(1)] }, 1),
  // le partenaire attend que le joueur ait engagé sa carte (fait public), puis engage sa Signature
  partenaire: { '1:COMMIT': (s) => (s.pending.p1 ? engager('p2', 'sig-Cendre', 'assault')(s) : null) },
  tours: [
    { tour: 1, gestes: [
      { phase: 'COMMIT', attendu: engager('p1', N(4), 'assault'),
        dire: t('Engage ton Neutre IV en ASSAUT, avant moi : j’engagerai ma carte ensuite.', 'Neutre IV en ASSAUT (avant moi).') },
      { phase: 'REVISION', attendu: (s) => ({ type: 'revise', player: 'p1', commit: commitDe(s, 'p1', N(1), 'guard') }),
        dire: t('J’ai engagé ma Signature, Brasier Originel : elle est annoncée, Rang infini, elle bat toute Primaire ordinaire. Comme tu as engagé ta carte avant moi, tu peux réviser, une seule fois. Ton Neutre IV serait perdu pour rien : remplace-le par ton Neutre I en GARDE, puis engage la révision.', 'Révise : Neutre I en GARDE.') }],
      apres: t('Tu perds ce Clash, mais avec ta plus petite carte, et ta Garde a absorbé une part des dégâts ; ton Neutre IV reste en main. On ne révise qu’une fois, et seulement si l’on a engagé avant la Signature.', 'Révision : la petite carte, la grosse gardée.'),
      issue: (r) => r.winner === 'p2' },
  ],
};

const prolongation: Lecon = {
  id: 'prolongation', groupe: 'element', titre: 'La prolongation', resume: 'Double K.-O. : 1 PV chacun, le duel continue.',
  couvre: [],
  config: () => config({ deck: basiques(['Cendre-4-contrecoup']) }, { deck: basiques(), signature: 'Ronce' }),
  build: (cfg) => poser(cfg, { hand: ['Cendre-4-contrecoup', 'Voile-2', 'Astre-1', 'Ronce-1'], hp: 3 }, { hand: ['sig-Ronce', 'Astre-2', 'Voile-1', 'Cendre-1'], hp: 3 }, 5),
  partenaire: { '5:COMMIT': engager('p2', 'sig-Ronce', 'assault') },
  tours: [
    { tour: 5, gestes: [{ phase: 'COMMIT', attendu: engager('p1', 'Cendre-4-contrecoup', 'assault'),
      dire: t('Il nous reste 3 PV chacun. Contrecoup, même perdante contre un Assaut, inflige 3 dégâts. J’attaque avec ma Signature : pose Contrecoup en ASSAUT.', 'Contrecoup en ASSAUT.') }],
      apres: t('Double K.-O. : nous tombons ensemble. Personne ne perd : PROLONGATION, 1 PV chacun, et le duel continue.', 'Double K.-O. : prolongation, 1 PV chacun.'),
      issue: (r) => r.winner === 'p2' },
    { tour: 6, libre: true, dire: LIBRE },
  ],
};

export const LECONS: Readonly<Record<LeconId, Lecon>> = {
  clash, posture, secondaires, tactique, interferer, insight,
  familles, effets, regard, 'tech-Sondage': techStart('Sondage'), 'tech-Recentrage': techStart('Recentrage'), 'tech-Lecture': lecture,
  'tech-Ancrage': ancrage, 'tech-Rupture': rupture, 'tech-Dissipation': dissipation, signature, prolongation,
  repousser, revision,
};

export const lecon = (id: LeconId): Lecon => LECONS[id];
/** Le dernier tour d'une leçon (fin : son Clash résolu, ou la fin du duel). */
export const dernierTour = (l: Lecon): number => l.tours[l.tours.length - 1]!.tour;
export const tourDe = (l: Lecon, turn: number): TourLecon | null => l.tours.find((x) => x.tour === turn) ?? null;

/** Le geste guidé de ce tour et de cette phase, s'il y en a un. */
export function gesteDe(l: Lecon, turn: number, phase: Phase): Geste | null {
  return tourDe(l, turn)?.gestes?.find((g) => g.phase === phase) ?? null;
}

/** Une leçon est-elle finie (son dernier Clash résolu, ou le duel terminé) ? */
export function leconFinie(l: Lecon, s: Pick<GameState, 'turn' | 'phase'>): boolean {
  return s.phase === 'ENDED' || (s.phase === 'RESOLVED' && s.turn >= dernierTour(l));
}

// ---------------------------------------------------------------------------
// Comparaison d'une commande du joueur au geste attendu

const defDe = (s: GameState, id: string | null | undefined): string | null => (id ? s.cards[id]?.defId ?? null : null);
const planCle = (p: TacticPlan | null | undefined): string => (!p || p.mode === 'keep' ? 'keep' : p.mode === 'interfere' ? `interfere:${p.target}` : p.mode);

/** Raison pour laquelle `recu` n'est pas le geste attendu (texte pour le joueur), ou `null` s'il l'est. */
export function ecartGeste(s: GameState, attendu: PlayerCommand, recu: PlayerCommand): string | null {
  if (recu.type !== attendu.type) return 'Pas encore : suis la consigne du maître de table.';
  switch (attendu.type) {
    case 'commit': {
      const r = recu as typeof attendu;
      const a = attendu;
      if (defDe(s, r.primaryId) !== defDe(s, a.primaryId)) return `La Primaire attendue : ${nomCarte(defDe(s, a.primaryId))}.`;
      if (r.stance !== a.stance) return `Le mode attendu : ${a.stance === 'assault' ? 'ASSAUT' : 'GARDE'}.`;
      if (defDe(s, r.secondaryId) !== defDe(s, a.secondaryId)) return a.secondaryId ? `La Secondaire attendue : ${nomCarte(defDe(s, a.secondaryId))}.` : 'Pas de Secondaire pour ce tour.';
      const slot = (x: typeof a) => x.slot ?? x.replaceSlot ?? null;
      if (a.secondaryId && slot(a) !== null && slot(r) !== slot(a)) return `La Secondaire va sur la case SECONDAIRE ${slot(a)! + 1}.`;
      return null;
    }
    case 'tactics': {
      const r = recu as typeof attendu;
      for (const i of [0, 1] as const) if (planCle(r.plans[i]) !== planCle(attendu.plans[i])) return `Ta Secondaire ${i + 1} : ${modeNom(attendu.plans[i])}.`;
      const tq = (x: typeof r.technique) => (x ? `${x.id}:${'slot' in x ? x.slot : 'targetSlot' in x ? x.targetSlot : ''}` : '');
      if (tq(r.technique) !== tq(attendu.technique)) return attendu.technique ? `Active ${attendu.technique.id} sur la bonne case.` : 'Pas de Technique pour ce tour.';
      return null;
    }
    case 'prepare': {
      const r = recu as typeof attendu;
      return [...r.reveal].sort().join() === [...attendu.reveal].sort().join() ? null : attendu.reveal.length ? `Révèle ta Secondaire ${attendu.reveal.map((x) => x + 1).join(' et ')}.` : 'Garde tes réserves cachées.';
    }
    case 'start': {
      const r = recu as typeof attendu;
      if ((r.technique?.id ?? null) !== (attendu.technique?.id ?? null)) return attendu.technique ? `Choisis ${attendu.technique.id}.` : 'Pas de Technique ici.';
      const carte = (x: typeof r.technique) => (x && 'cardId' in x ? defDe(s, x.cardId) : null);
      if (carte(r.technique) !== carte(attendu.technique)) return `La carte attendue : ${nomCarte(carte(attendu.technique))}.`;
      return r.discard.length === attendu.discard.length ? null : 'Pas de défausse ici.';
    }
    case 'revise': {
      const r = recu as typeof attendu;
      if (!attendu.commit) return r.commit ? 'Garde ton engagement.' : null;
      if (!r.commit) return 'Révise ton engagement : suis la consigne.';
      return ecartGeste(s, { type: 'commit', player: attendu.player, ...attendu.commit }, { type: 'commit', player: r.player, ...r.commit });
    }
    case 'lecture': return (recu as typeof attendu).use === attendu.use ? null : attendu.use ? 'Utilise Lecture.' : 'Passe.';
    case 'lectureStance': return (recu as typeof attendu).stance === attendu.stance ? null : `Passe en ${attendu.stance === 'assault' ? 'ASSAUT' : 'GARDE'}.`;
    case 'dissipate': return (recu as typeof attendu).targetSlot === attendu.targetSlot ? null : 'Vise la Dissimulation.';
    case 'repel': return (recu as typeof attendu).targetSlot === attendu.targetSlot ? null : 'Vise la Secondaire surlignée.';
    default: return null;
  }
}

export function nomCarte(defId: string | null): string {
  if (!defId) return '—';
  const d = cardDef(defId);
  return d.signature ? d.name : cardTitle(d);
}

export function modeNom(p: TacticPlan | null | undefined): string {
  const k = planCle(p);
  return k === 'keep' ? 'Conserver' : k === 'rank' ? 'Amplifier le Rang' : k === 'damage' ? 'Amplifier les dégâts' : 'Interférer';
}
