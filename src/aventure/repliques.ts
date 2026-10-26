/**
 * M11-C — le système de répliques (`docs/m11/04_DIALOGUES_ET_NARRATION.md`, PROPOSÉ ; ADR 040). Catalogue PUR : des
 * répliques par locuteur avec un prédicat sur un contexte de faits PUBLICS (chapitre, voie du joueur, tempérament du
 * locuteur, relation, moment) ; la plus spécifique l'emporte, puis un tirage déterministe ; jamais la même réplique deux
 * fois de suite pour un même locuteur quand il en a une autre (mémoire `dialogues` de la sauvegarde). Écriture épicène,
 * sans point médian : aucun accord de genre pour le joueur ; une bulle tient en 240 caractères.
 */
import { hashString, makeRng } from '../game/engine/rng';
import type { Family } from '../game/catalog/cards';
import type { IlotId } from '../ville/ilots';
import type { Issue } from './aventure';
import type { Temperament } from './temperaments';

export type Moment = 'vue' | 'parole' | 'rival' | 'rumeur' | 'revanche';
export type Chapitre = 'prologue' | 'I' | 'II' | 'III' | 'IV' | 'V' | 'titre';

/** Contexte d'une réplique : uniquement des faits publics de l'aventure et des duels (ADR 011). */
export interface Contexte {
  moment: Moment;
  chapitre: Chapitre;
  voie: Family | null;
  temperament: Temperament | null;
  /** Duels joués contre ce locuteur ; victoires et défaites du joueur ; issue du dernier. */
  joues: number;
  victoires: number;
  defaites: number;
  dernier: Issue | null;
  /** Chefs vaincus (toutes familles) ; la cheffe ou le chef de la famille d'accueil est-elle une femme ? */
  chefs: number;
  cheffe: boolean;
  ilot?: IlotId;
}

export interface Quand {
  moment?: Moment[];
  chapitre?: Chapitre[];
  voie?: Family[];
  temperament?: Temperament[];
  dernier?: Issue[];
  /** Au moins / au plus tant de duels joués contre lui. */
  jouesMin?: number;
  jouesMax?: number;
  /** Le joueur mène (plus de victoires que de défaites) ou est mené. */
  mene?: boolean;
  ilot?: IlotId[];
}

export interface Replique { id: string; texte: string | ((c: Contexte) => string); quand?: Quand }

export const LONGUEUR_MAX = 240;

const tient = (q: Quand | undefined, c: Contexte): boolean => {
  if (!q) return true;
  if (q.moment && !q.moment.includes(c.moment)) return false;
  if (q.chapitre && !q.chapitre.includes(c.chapitre)) return false;
  if (q.voie && (!c.voie || !q.voie.includes(c.voie))) return false;
  if (q.temperament && (!c.temperament || !q.temperament.includes(c.temperament))) return false;
  if (q.dernier && (!c.dernier || !q.dernier.includes(c.dernier))) return false;
  if (q.jouesMin !== undefined && c.joues < q.jouesMin) return false;
  if (q.jouesMax !== undefined && c.joues > q.jouesMax) return false;
  if (q.mene !== undefined && (c.victoires > c.defaites) !== q.mene) return false;
  if (q.ilot && (!c.ilot || !q.ilot.includes(c.ilot))) return false;
  return true;
};
const specificite = (q: Quand | undefined): number => (q ? Object.keys(q).length : 0);
export const texteDe = (r: Replique, c: Contexte): string => (typeof r.texte === 'string' ? r.texte : r.texte(c));

export interface MemoireDialogues { dernier: Record<string, string>; n: Record<string, number> }
export const memoireVide = (): MemoireDialogues => ({ dernier: {}, n: {} });

/**
 * Choisit la réplique d'un locuteur : les éligibles de la plus grande spécificité ; parmi elles, pas la dernière dite
 * (s'il y en a une autre) ; puis un tirage déterministe (graine du profil, locuteur, nombre de répliques déjà dites).
 * Renvoie la réplique, son texte et la mémoire mise à jour (pure : la mémoire d'entrée n'est pas modifiée).
 */
export function choisir(locuteur: string, c: Contexte, memo: MemoireDialogues, graine: number, catalogue: Readonly<Record<string, readonly Replique[]>> = CATALOGUE): { replique: Replique; texte: string; memo: MemoireDialogues } | null {
  const toutes = (catalogue[voixDe(locuteur)] ?? []).filter((r) => tient(r.quand, c));
  if (!toutes.length) return null;
  const top = Math.max(...toutes.map((r) => specificite(r.quand)));
  let cands = toutes.filter((r) => specificite(r.quand) === top);
  const avant = memo.dernier[locuteur];
  if (cands.length > 1 && avant) cands = cands.filter((r) => r.id !== avant);
  // une seule plus spécifique, déjà dite : on revient aux variantes un cran moins spécifiques
  if (cands.length === 1 && cands[0]!.id === avant) {
    const autres = toutes.filter((r) => r.id !== avant);
    const top2 = autres.length ? Math.max(...autres.map((r) => specificite(r.quand))) : -1;
    if (autres.length) cands = autres.filter((r) => specificite(r.quand) === top2);
  }
  const n = memo.n[locuteur] ?? 0;
  const rng = makeRng(hashString(`repliques:${graine >>> 0}:${locuteur}:${n}`));
  const r = cands[Math.floor(rng() * cands.length)]!;
  return { replique: r, texte: texteDe(r, c), memo: { dernier: { ...memo.dernier, [locuteur]: r.id }, n: { ...memo.n, [locuteur]: n + 1 } } };
}

/** Voix d'un locuteur : les PNJ de la rue partagent la voix de leur gabarit ; chacun garde sa mémoire. */
export function voixDe(locuteur: string): string {
  if (locuteur === 'rue-docker' || locuteur === 'rue-port') return 'docker';
  if (locuteur === 'rue-joueuse' || locuteur === 'rue-cour' || locuteur === 'rue-haute') return 'joueuse';
  if (locuteur === 'rue-commis') return 'commis';
  if (locuteur.startsWith('rumeur-')) return 'rumeur';
  if (/^(cadet|brasDroit|chef)-/.test(locuteur)) return `figure-${locuteur.split('-')[0]}`;
  return locuteur;
}

const V = (ids: string, t: Replique['texte'], quand?: Quand): Replique => ({ id: ids, texte: t, ...(quand ? { quand } : {}) });
const tous: Temperament[] = ['passif', 'franc', 'ruse', 'agressif', 'calculateur', 'vicieux'];
void tous;

// --------------------------------------------------------------------- la rue : ce qui est commun aux joueurs de cartes
/** Répliques de la rue par tempérament (vue : duel forcé ; parole : le joueur vient lui parler ; revanche : déjà joué). */
const RUE: Replique[] = [
  // passif
  V('rue-passif-vue-1', '« Oh… Pardon, je vous regardais. Puisqu’on y est… une petite partie ? Je ne joue pas très fort. »', { moment: ['vue'], temperament: ['passif'] }),
  V('rue-passif-vue-2', '« Ah, c’est vous. On m’a dit de ne pas laisser passer une partie. Alors… on joue ? »', { moment: ['vue'], temperament: ['passif'] }),
  V('rue-passif-vue-3', '« Je n’osais pas vous arrêter. Mais une partie, ça ne se refuse pas, ici. »', { moment: ['vue'], temperament: ['passif'] }),
  V('rue-passif-parole-1', '« Une partie ? Si vous voulez… Je ne promets rien. »', { moment: ['parole'], temperament: ['passif'] }),
  V('rue-passif-parole-2', '« Vous jouez ? Moi, je regarde surtout. Mais pourquoi pas, une fois. »', { moment: ['parole'], temperament: ['passif'] }),
  V('rue-passif-parole-3', '« Doucement, alors. Je joue pour le plaisir, pas pour gagner. »', { moment: ['parole'], temperament: ['passif'] }),
  // franc
  V('rue-franc-vue-1', '« Hé, toi ! Nos regards se sont croisés : chez nous, ça veut dire une partie. »', { moment: ['vue'], temperament: ['franc'] }),
  V('rue-franc-vue-2', '« Toi, là ! Tu as l’air de savoir tenir des cartes. Montre-moi ça. »', { moment: ['vue'], temperament: ['franc'] }),
  V('rue-franc-vue-3', '« Pas si vite ! Sur ce pavé, on ne passe pas sans une partie. Règle de la rue. »', { moment: ['vue'], temperament: ['franc'] }),
  V('rue-franc-parole-1', '« Une partie, pour passer le temps ? »', { moment: ['parole'], temperament: ['franc'] }),
  V('rue-franc-parole-2', '« Tu cherches une partie ? Tu tombes bien, moi aussi. »', { moment: ['parole'], temperament: ['franc'] }),
  V('rue-franc-parole-3', '« Allez, une main. Celui qui perd paie la tournée de cidre… façon de parler. »', { moment: ['parole'], temperament: ['franc'] }),
  // rusé
  V('rue-ruse-vue-1', '« Je vous ai vu venir de loin. Vous, en revanche, ne m’aviez pas vu. Jouons. »', { moment: ['vue'], temperament: ['ruse'] }),
  V('rue-ruse-vue-2', '« Vous passez souvent par ici. On finit par connaître vos pas… et vos cartes. »', { moment: ['vue'], temperament: ['ruse'] }),
  V('rue-ruse-vue-3', '« Tiens, tiens. Le hasard fait bien les choses. Une partie, entre gens qui observent ? »', { moment: ['vue'], temperament: ['ruse'] }),
  V('rue-ruse-parole-1', '« Une partie ? J’accepte. J’ai quelques idées à essayer sur vous. »', { moment: ['parole'], temperament: ['ruse'] }),
  V('rue-ruse-parole-2', '« Vous voulez jouer ? Moi, je veux surtout voir comment vous jouez. »', { moment: ['parole'], temperament: ['ruse'] }),
  V('rue-ruse-parole-3', '« Asseyons-nous. Je parle peu, je regarde beaucoup. »', { moment: ['parole'], temperament: ['ruse'] }),
  // agressif
  V('rue-agressif-vue-1', '« Toi ! Je t’attendais. Cette fois, je frappe le premier et je ne lâche pas. »', { moment: ['vue'], temperament: ['agressif'] }),
  V('rue-agressif-vue-2', '« Reste là ! Ta réputation commence à m’agacer. On règle ça maintenant. »', { moment: ['vue'], temperament: ['agressif'] }),
  V('rue-agressif-vue-3', '« Je t’ai vu ! Sors tes cartes, j’ai faim de Clashes ce soir. »', { moment: ['vue'], temperament: ['agressif'] }),
  V('rue-agressif-parole-1', '« Une partie ? Tu vas le regretter. J’ai appris à frapper fort. »', { moment: ['parole'], temperament: ['agressif'] }),
  V('rue-agressif-parole-2', '« Viens. Je ne laisse plus rien passer, tu vas voir. »', { moment: ['parole'], temperament: ['agressif'] }),
  V('rue-agressif-parole-3', '« Tu me cherches ? Tu vas me trouver. »', { moment: ['parole'], temperament: ['agressif'] }),
  // calculateur
  V('rue-calculateur-vue-1', '« Quatre-vingt-dix secondes que je vous observe. Assez pour une hypothèse. Vérifions-la. »', { moment: ['vue'], temperament: ['calculateur'] }),
  V('rue-calculateur-vue-2', '« Je tiens le compte de vos parties. Il me manque des chiffres : jouons. »', { moment: ['vue'], temperament: ['calculateur'] }),
  V('rue-calculateur-vue-3', '« Selon mes calculs, vous alliez passer ici. Une partie, pour affiner la méthode. »', { moment: ['vue'], temperament: ['calculateur'] }),
  V('rue-calculateur-parole-1', '« Une partie ? Volontiers. Chaque Garde coûte, chaque Assaut se compte. »', { moment: ['parole'], temperament: ['calculateur'] }),
  V('rue-calculateur-parole-2', '« J’ai revu mes plans depuis la dernière saison. Testons-les. »', { moment: ['parole'], temperament: ['calculateur'] }),
  V('rue-calculateur-parole-3', '« Asseyez-vous. Je compte les cartes, vous compterez vos PV. »', { moment: ['parole'], temperament: ['calculateur'] }),
  // vicieux
  V('rue-vicieux-vue-1', '« Tiens, la vedette du quartier. Voyons combien de temps la chance te suit sans moi dans les pattes. »', { moment: ['vue'], temperament: ['vicieux'] }),
  V('rue-vicieux-vue-2', '« Pas un pas de plus. On joue, et je te promets que tu vas détester chaque tour. »', { moment: ['vue'], temperament: ['vicieux'] }),
  V('rue-vicieux-vue-3', '« Je connais tes habitudes, maintenant. Elles vont te coûter cher. »', { moment: ['vue'], temperament: ['vicieux'] }),
  V('rue-vicieux-parole-1', '« Une partie ? Avec plaisir. J’adore défaire les plans des autres. »', { moment: ['parole'], temperament: ['vicieux'] }),
  V('rue-vicieux-parole-2', '« Viens donc. Mes Secondaires ont des dents, ce soir. »', { moment: ['parole'], temperament: ['vicieux'] }),
  V('rue-vicieux-parole-3', '« Assieds-toi. Ne te fie à rien de ce que je montre. »', { moment: ['parole'], temperament: ['vicieux'] }),
  // revanches (déjà joué contre lui) : selon l'issue du dernier duel
  V('rue-revanche-v-1', '« Toi ! La dernière fois, tu m’as eu. J’ai travaillé depuis : on remet ça, tout de suite. »', { moment: ['vue', 'parole'], dernier: ['victoire'], jouesMin: 1 }),
  V('rue-revanche-v-2', '« Je n’ai pas digéré notre dernière partie. Revanche, et sans pitié. »', { moment: ['vue', 'parole'], dernier: ['victoire'], jouesMin: 1 }),
  V('rue-revanche-v-3', '« Te revoilà. J’ai changé ma façon de jouer : tu ne vas pas la reconnaître. »', { moment: ['vue', 'parole'], dernier: ['victoire'], jouesMin: 1 }),
  V('rue-revanche-d-1', '« Encore toi ? Tu as vu ce qui s’est passé la dernière fois. Allez, une autre. »', { moment: ['vue', 'parole'], dernier: ['defaite', 'abandon'], jouesMin: 1 }),
  V('rue-revanche-d-2', '« Tu reviens chercher une deuxième leçon ? Je suis de bonne humeur. »', { moment: ['vue', 'parole'], dernier: ['defaite', 'abandon'], jouesMin: 1 }),
  V('rue-revanche-d-3', '« On recommence ? La dernière, je l’ai gagnée sans forcer. »', { moment: ['vue', 'parole'], dernier: ['defaite', 'abandon'], jouesMin: 1 }),
  V('rue-revanche-vv', '« Encore une victoire, et ce sera une de trop. Je ne joue plus comme avant, tu sais. »', { moment: ['vue', 'parole'], dernier: ['victoire'], jouesMin: 2, temperament: ['agressif', 'vicieux', 'calculateur'] }),
];
const rue = (extra: Replique[]): Replique[] => [...RUE, ...extra];

// --------------------------------------------------------------------- les membres des familles : la voix de leur maison
const membre = (f: Family, lignes: { vue: string[]; parole: string[]; revanche: string[] }): Replique[] => [
  ...lignes.vue.map((t, i) => V(`membre-${f}-vue-${i + 1}`, t, { moment: ['vue'], chapitre: ['I', 'II', 'III', 'IV', 'V', 'titre'] })),
  ...lignes.parole.map((t, i) => V(`membre-${f}-parole-${i + 1}`, t, { moment: ['parole'], chapitre: ['I', 'II', 'III', 'IV', 'V', 'titre'] })),
  ...lignes.revanche.map((t, i) => V(`membre-${f}-revanche-${i + 1}`, t, { moment: ['vue', 'parole'], chapitre: ['I', 'II', 'III', 'IV', 'V', 'titre'], jouesMin: 1 })),
];

export const CATALOGUE: Readonly<Record<string, readonly Replique[]>> = {
  docker: rue([
    V('docker-franc-1', '« Hé, toi ! Entre deux caisses, on a le temps d’une main. Assieds-toi sur ce tonneau. »', { moment: ['vue', 'parole'], temperament: ['franc'], chapitre: ['I', 'II'] }),
    V('docker-port-1', '« Au Port, une partie se joue entre deux marées. Une main, pour voir si tu tiens ? »', { moment: ['vue', 'parole'], ilot: ['port'] }),
    V('docker-agressif-1', '« Les dockers ne reculent pas. Moi encore moins, depuis que j’ai vu jouer la Cendre. »', { moment: ['vue', 'parole'], temperament: ['agressif'], chapitre: ['III', 'IV', 'V'] }),
  ]),
  joueuse: rue([
    V('joueuse-haute-1', '« Ici, on joue sous les étoiles, et on compte chaque carte. Une partie ? »', { moment: ['vue', 'parole'], ilot: ['haute'] }),
    V('joueuse-cour-1', '« Toute la Grande Cour regarde. Faisons-lui un beau spectacle. »', { moment: ['vue', 'parole'], ilot: ['cour'] }),
    V('joueuse-calc-1', '« J’ai rempli trois carnets sur les duels de l’arène. Le vôtre manque. »', { moment: ['vue', 'parole'], temperament: ['calculateur'], ilot: ['parvis', 'haute'] }),
  ]),
  commis: rue([
    V('commis-ruelles-1', '« Dans les Ruelles, on joue à voix basse. Une partie, sous le linge qui sèche ? »', { moment: ['vue', 'parole'], ilot: ['ruelles'] }),
    V('commis-vicieux-1', '« J’ai fait les commissions du Voile assez longtemps pour apprendre leurs tours. Tu vas voir. »', { moment: ['vue', 'parole'], temperament: ['vicieux'] }),
  ]),
  'membre-Cendre': membre('Cendre', {
    vue: ['« Hé ! Tu passes devant la Maison du Chantier sans saluer ? Ici, on salue avec des cartes. »', '« Toi ! Le feu ne recule pas, et moi non plus. En garde. »', '« Arrête-toi. À la Cendre, on frappe d’abord, on discute après. »'],
    parole: ['« Ici, on joue vite et on frappe fort. Une partie, pour voir ce que vaut ta braise ? »', '« Une main rapide ? Ça brûle ou ça casse, c’est tout. »', '« Viens près du brasero. On joue mieux avec les mains chaudes. »'],
    revanche: ['« Tu reviens au Chantier ? Bien. La braise s’est rallumée. »', '« Encore une ? Cette fois, je ne laisse rien refroidir. »'],
  }),
  'membre-Ronce': membre('Ronce', {
    vue: ['« Doucement. Vous êtes sur les terres de la Ronce : on vous propose une partie, à notre rythme. »', '« Ne vous pressez pas tant. Une partie lente vous ferait du bien. »', '« Vous ne me voyiez pas, entre les filets. Moi, je vous voyais. Asseyez-vous. »'],
    parole: ['« Une partie lente, comme on les aime à la Ronce ? Prenez votre temps, la nuit est longue. »', '« On ne gagne rien à courir. Jouons, et tenons. »', '« Ce qui tient, dure. Voyons ce qui tient chez vous. »'],
    revanche: ['« Vous revoilà. Les racines poussent, entre deux parties. »', '« Encore une ? Je tiens toujours, moi. »'],
  }),
  'membre-Voile': membre('Voile', {
    vue: ['« Vous croyez passer inaperçu ? Personne ne passe inaperçu dans les Ruelles. Jouons. »', '« Je lisais votre jeu depuis l’arcade. Il est temps de le vérifier. »', '« Halte. Le Voile vous a vu venir avant que vous ne sachiez où vous alliez. »'],
    parole: ['« Je lis déjà votre jeu… Une partie pour me prouver le contraire ? »', '« Vous croyez cacher votre main. Montrez-moi comme vous la cachez. »', '« Une partie ? Je verrai plus que vous ne montrerez. »'],
    revanche: ['« Vous revenez. Je savais que vous reviendriez. »', '« Votre dernier jeu, je l’ai relu trois fois. Rejouons. »'],
  }),
  'membre-Astre': membre('Astre', {
    vue: ['« Les étoiles annonçaient notre rencontre. Une partie, pour leur donner raison ? »', '« Arrêtez-vous un instant. Le ciel tourne, et nos chemins se croisent. »', '« Je vous attendais à cette heure-ci, exactement. Jouons. »'],
    parole: ['« Les astres disaient qu’on jouerait ce soir. Une partie ? »', '« Tout revient, tout s’assemble. Même une partie entre nous. »', '« Combinons nos voies le temps d’un duel. »'],
    revanche: ['« Tout revient. Même vous. »', '« Encore une conjonction. Le ciel insiste, jouons. »'],
  }),
  // --------------------------------------------------------------------- Kaï : les événements fixes (K1 à K6)
  kai: [
    V('kai-K1-cendre', '« Tessa est tombée ? Pas mal, pour une recrue. Mais à la Cendre, c’est moi qu’on regarde. Montre-moi. »', { moment: ['rival'], chapitre: ['I'], voie: ['Cendre'] }),
    V('kai-K1-autre', (c) => `« Alors comme ça, tu as choisi ${LE[c.voie ?? 'Cendre']}. Moi, la Cendre m’a pris. Voyons qui a le plus appris depuis le Quai. »`, { moment: ['rival'], chapitre: ['I'] }),
    V('kai-K2', (c) => `« Tu as fait tomber ${c.cheffe ? 'ta cheffe' : 'ton chef'}. Toute la ville en parle. Avant d’aller frapper aux autres portes, passe par moi. »`, { moment: ['rival'], chapitre: ['II'] }),
    V('kai-K2-mene', '« Tu mènes entre nous, je sais. Mais une Signature ne fait pas tout : prouve-le encore. »', { moment: ['rival'], chapitre: ['II'], mene: true, jouesMin: 2 }),
    V('kai-K3', '« Une deuxième maison qui t’ouvre ses portes… Je monte aussi, tu sais. Un duel, pour garder le compte juste. »', { moment: ['rival'], chapitre: ['III'] }),
    V('kai-K3-perdu', '« La dernière fois, tu as plié. Pas de quoi rougir : je joue de mieux en mieux. Encore une ? »', { moment: ['rival'], chapitre: ['III'], dernier: ['defaite'] }),
    V('kai-K3-gagne', '« Tu as gagné la dernière fois. Je n’ai pensé qu’à ça. Cette fois, je lis tes Gardes. »', { moment: ['rival'], chapitre: ['III'], dernier: ['victoire'] }),
    V('kai-K4', '« Plus qu’une voie et tu touches au Championnat. Moi, j’y serai. Prouve-moi que toi aussi. »', { moment: ['rival'], chapitre: ['IV'] }),
    V('kai-K4-mene', '« Je compte nos duels, tu sais. Tu mènes. Ce soir, je calcule chaque Clash. »', { moment: ['rival'], chapitre: ['IV'], mene: true, jouesMin: 3 }),
    V('kai-K5', '« Le Championnat est ouvert. On a commencé ensemble, sur le Quai. Un dernier duel avant l’arène, pour le plaisir. »', { moment: ['rival'], chapitre: ['V'] }),
    V('kai-K5-mene', '« Tu mènes depuis trop longtemps. Avant l’arène, je veux une dernière chance de te faire douter. »', { moment: ['rival'], chapitre: ['V'], mene: true, jouesMin: 3 }),
    V('kai-K6', '« Personne en ville ne joue mieux que toi. Je le savais depuis le premier soir. » Kaï vous tend la main. « La prochaine partie, c’est quand tu veux. »', { moment: ['rival'], chapitre: ['titre'] }),
  ],
  // --------------------------------------------------------------------- les rumeurs
  rumeur: [
    V('rumeur-I-1', (c) => `« On raconte qu’une recrue ${c.voie ? DE[c.voie] : 'du Quai'} a fait parler d’elle au duel public. Ce soir, toute la ville joue aux cartes. »`, { moment: ['rumeur'], chapitre: ['prologue', 'I'] }),
    V('rumeur-I-2', '« Paraît que des cartes grises ont battu la Braise du quai. Depuis, les dockers regardent leurs mains autrement. »', { moment: ['rumeur'], chapitre: ['prologue', 'I'] }),
    V('rumeur-I-3', '« Faites attention en marchant : les joueurs de la rue arrêtent quiconque croise leur regard. C’est la coutume. »', { moment: ['rumeur'], chapitre: ['prologue', 'I'] }),
    V('rumeur-mi-1', (c) => `« On dit que ${c.chefs} chef${c.chefs > 1 ? 's sont tombés' : ' est tombé'} cette saison, et que la Salle des Bannières ne désemplit pas. »`, { moment: ['rumeur'], chapitre: ['II', 'III', 'IV'] }),
    V('rumeur-mi-2', '« Les joueurs de la rue ont changé, ces temps-ci. Plus durs, plus malins. Ils disent que c’est à cause de vous. »', { moment: ['rumeur'], chapitre: ['II', 'III', 'IV'] }),
    V('rumeur-mi-3', '« Kaï court la ville. On le croise là où on ne l’attend pas, et il cherche toujours la même personne. »', { moment: ['rumeur'], chapitre: ['II', 'III', 'IV'] }),
    V('rumeur-V-1', '« Le Championnat des Champions s’ouvre : le héraut l’annonce dans la Grande Cour, et les paris montent sur la place du Parvis. »', { moment: ['rumeur'], chapitre: ['V'] }),
    V('rumeur-V-2', '« Ysolde, la Tenante du titre, n’a pas perdu une finale depuis quatre ans. On dit qu’elle annonce son plan, tant elle est sûre d’elle. »', { moment: ['rumeur'], chapitre: ['V'] }),
    V('rumeur-V-3', '« Les quatre chefs se sont assis ensemble sur l’estrade. On n’avait pas vu ça depuis des années. »', { moment: ['rumeur'], chapitre: ['V'] }),
    V('rumeur-titre-1', '« Toute la ville parle de vous : personne ne joue mieux, dit-on. »', { moment: ['rumeur'], chapitre: ['titre'] }),
    V('rumeur-titre-2', '« Les enfants du Quai jouent avec des cartes grises, maintenant. Ils disent que c’est comme ça que tout a commencé. »', { moment: ['rumeur'], chapitre: ['titre'] }),
    V('rumeur-titre-3', '« Même Kaï le dit à qui veut l’entendre : personne en ville ne joue mieux que vous. »', { moment: ['rumeur'], chapitre: ['titre'] }),
    // les rumeurs locales (Place du Fanal et Ville haute, passe 136)
    V('rumeur-port-debut', '« Au Port, on regarde comment vous tenez une partie, pas comment vous la commencez. La Ronce a de vieilles racines ici, au fond de la cour. »', { moment: ['rumeur'], ilot: ['port'], chapitre: ['prologue', 'I'] }),
    V('rumeur-port-mi', (c) => `« Les dockers parient sur la Salle des Bannières : ${tombes(c.chefs)} cette saison, et le vieux phare n’a jamais vu autant de monde. »`, { moment: ['rumeur'], ilot: ['port'], chapitre: ['II', 'III', 'IV'] }),
    V('rumeur-port-V', '« Le Championnat s’ouvre dans la Grande Cour : au Port, on fermera les entrepôts plus tôt pour aller voir. »', { moment: ['rumeur'], ilot: ['port'], chapitre: ['V'] }),
    V('rumeur-port-titre', '« Les marins racontent votre finale d’un quai à l’autre. »', { moment: ['rumeur'], ilot: ['port'], chapitre: ['titre'] }),
    V('rumeur-haute-debut', '« Là-haut, à l’Observatoire, l’Astre note tout : les duels, les mains jouées, et même les vôtres, paraît-il. »', { moment: ['rumeur'], ilot: ['haute'], chapitre: ['prologue', 'I'] }),
    V('rumeur-haute-mi', (c) => `« Les astronomes tiennent le compte des maisons : ${tombes(c.chefs)}. Les étoiles changent moins vite que la Salle des Bannières. »`, { moment: ['rumeur'], ilot: ['haute'], chapitre: ['II', 'III', 'IV'] }),
    V('rumeur-haute-V', '« Depuis l’esplanade, on voit l’estrade de la Grande Cour : le Championnat des Champions s’y joue, et l’Astre a déjà ses favoris. »', { moment: ['rumeur'], ilot: ['haute'], chapitre: ['V'] }),
    V('rumeur-haute-titre', '« L’Observatoire a inscrit votre titre dans ses registres : cela ne s’efface pas. »', { moment: ['rumeur'], ilot: ['haute'], chapitre: ['titre'] }),
  ],
  // --------------------------------------------------------------------- les figures : revanches (après la première victoire)
  'figure-cadet': [
    V('cadet-rev-franc', '« Encore ? Soit. Mais ce que tu as gagné, tu l’as déjà. »', { moment: ['revanche'], temperament: ['franc'] }),
    V('cadet-rev-franc-2', '« Une revanche ? J’en rêvais. Sans enjeu, mais pas sans fierté. »', { moment: ['revanche'], temperament: ['franc'] }),
    V('cadet-rev-agr', '« Depuis notre duel, je m’entraîne tous les soirs. Revanche, et cette fois je mène. »', { moment: ['revanche'], temperament: ['agressif'] }),
    V('cadet-rev-agr-2', '« Tu reviens me voir ? Tu as bien fait : j’ai changé de jeu. »', { moment: ['revanche'], temperament: ['agressif'] }),
    V('cadet-rev-calc', '« J’ai analysé notre duel. Trois erreurs. Je ne les referai pas. »', { moment: ['revanche'], temperament: ['calculateur'] }),
    V('cadet-rev-calc-2', '« Revanche ? D’accord. Mes carnets sont prêts. »', { moment: ['revanche'], temperament: ['calculateur'] }),
  ],
  'figure-brasDroit': [
    V('bd-rev-franc', (c) => `« Avant ${c.cheffe ? 'la cheffe' : 'le chef'}, il y avait moi. Maintenant, il n’y a plus que le plaisir du jeu. Une revanche ? »`, { moment: ['revanche'], temperament: ['franc'] }),
    V('bd-rev-ruse', '« Vous revenez. J’ai gardé le souvenir de votre jeu ; voyons s’il a changé. »', { moment: ['revanche'], temperament: ['ruse'] }),
    V('bd-rev-ruse-2', '« Une revanche, sans enjeu. Les meilleures parties sont celles-là. »', { moment: ['revanche'], temperament: ['ruse'] }),
    V('bd-rev-calc', '« Je garde la porte, mais la porte est ouverte pour vous, maintenant. Rejouons, pour l’honneur. »', { moment: ['revanche'], temperament: ['calculateur'] }),
    V('bd-rev-calc-2', '« J’ai repris chaque Clash de notre duel. Je sais où j’ai perdu. Revanche. »', { moment: ['revanche'], temperament: ['calculateur'] }),
  ],
  'figure-chef': [
    V('chef-rev-1', '« Tout ce chemin, pour revenir jusqu’à moi. Bien. Jouons sans enjeu, comme au premier soir. »', { moment: ['revanche'] }),
    V('chef-rev-2', '« Ma Signature est à vous. Mon jeu, lui, est toujours le mien. Revanche ? »', { moment: ['revanche'] }),
    V('chef-rev-3', '« Revenir me défier, quand on n’a plus rien à gagner : voilà qui me plaît. »', { moment: ['revanche'] }),
  ],
  // --------------------------------------------------------------------- le héraut du Tournoi
  heraut: [
    V('heraut-1', '« Personne en ville ne joue mieux que vous. La Grande Cour l’a proclamé, et elle s’en souviendra. » Les revanches restent ouvertes, sans enjeu.', { moment: ['parole'], chapitre: ['titre'] }),
    V('heraut-2', '« On grave déjà votre nom sous l’estrade. » Le héraut sourit. « Revenez quand vous voulez : la Grande Cour aime les revanches. »', { moment: ['parole'], chapitre: ['titre'] }),
    V('heraut-3', '« Le titre vous revient. Les quatre chefs se sont levés pour l’annoncer, et la foule avec eux. »', { moment: ['parole'], chapitre: ['titre'] }),
  ],
};

const LE: Record<Family, string> = { Cendre: 'la Cendre', Voile: 'le Voile', Ronce: 'la Ronce', Astre: 'l’Astre' };
const DE: Record<Family, string> = { Cendre: 'de la Cendre', Voile: 'du Voile', Ronce: 'de la Ronce', Astre: 'de l’Astre' };
const tombes = (n: number): string => (n ? `${n} chef${n > 1 ? 's sont tombés' : ' est tombé'}` : 'aucun chef n’est encore tombé');
