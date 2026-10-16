/**
 * Bulle du rival (M03, preview validée) : libellé d’humeur accordé + réplique courte.
 * Module PUR. Entrée = l’Expression déjà produite par l’ExpressionDirector (faits PUBLICS
 * uniquement) + la personnalité. Aucune réplique n’affirme connaître une information secrète :
 * c’est de la couleur, pas un indice (aucun système de tells, mission M02/M03).
 */
import { hashString, makeRng } from '../game/engine/rng';
import type { Expression } from './expression';
import type { Mood, RivalPersonality } from './personalities';

const LABEL: Record<Mood, [string, string]> = {
  neutral: ['Calme', 'Calme'],
  focused: ['Concentré', 'Concentrée'],
  confident: ['Sûr de lui', 'Sûre d’elle'],
  smug: ['Narquois', 'Narquoise'],
  pleased: ['Satisfait', 'Satisfaite'],
  triumphant: ['Triomphant', 'Triomphante'],
  surprised: ['Surpris', 'Surprise'],
  pained: ['Touché', 'Touchée'],
  annoyed: ['Contrarié', 'Contrariée'],
  angry: ['Furieux', 'Furieuse'],
  relieved: ['Soulagé', 'Soulagée'],
  defeated: ['Abattu', 'Abattue'],
  thinking: ['Pensif', 'Pensive'],
  shocked: ['Sidéré', 'Sidérée'],
};

type Voice = RivalPersonality['id'];

const LINES: Record<Voice, Record<Mood, string[]>> = {
  braise: {
    neutral: ['Alors, on joue ?', 'J’attends.'],
    focused: ['À moi de jouer.', 'Regarde bien.'],
    confident: ['Tu vas sentir la chaleur.', 'Facile.'],
    smug: ['C’est tout ?', 'Hmpf. Voyons.'],
    pleased: ['Ça me plaît.', 'Joli coup pour moi.'],
    triumphant: ['Ha ! Brûlé !', 'Trop chaud pour toi.'],
    surprised: ['Quoi ?!', 'Pas mal…'],
    pained: ['Tch… ça pique.', 'Aïe !'],
    annoyed: ['Grr…', 'Tu m’énerves.'],
    angry: ['Tu vas me le payer !', 'Assez !'],
    relieved: ['Ouf, ça tient.', 'Raté !'],
    defeated: ['…Bien joué.', 'Je reviendrai.'],
    thinking: ['Hmm…', 'Voyons voir…'],
    shocked: ['Impossible !', 'Les deux ?!'],
  },
  ronce: {
    neutral: ['Prenez votre temps.', 'Je vous écoute.'],
    focused: ['Voyons comment vous allez répondre.', 'Chaque appui compte.'],
    confident: ['Ma défense est prête.', 'Je suis sereine.'],
    smug: ['Patience…', 'Vous l’aviez vu venir ?'],
    pleased: ['La ronce tient bon.', 'Bien.'],
    triumphant: ['La forêt l’emporte.', 'Vous avez bien lutté.'],
    surprised: ['Je ne m’attendais pas à ça !', 'Oh !'],
    pained: ['Vous frappez fort.', 'Mmh…'],
    annoyed: ['Dommage.', 'Vous m’avez eue.'],
    angry: ['Cela suffit.', 'Vous allez trop loin.'],
    relieved: ['Ma Garde a tenu.', 'Rien ne passe.'],
    defeated: ['Je m’incline.', 'Belle partie.'],
    thinking: ['Laissez-moi réfléchir…', 'Hmm…'],
    shocked: ['Tous les deux ?!', 'Incroyable…'],
  },
  voile: {
    neutral: ['Montrez-moi.', 'Je vous observe…'],
    focused: ['Intéressant…', 'Le voile se lève.'],
    confident: ['Tout se dévoile, tôt ou tard.', 'Sereine, comme toujours.'],
    smug: ['Charmant.', 'Vraiment ?'],
    pleased: ['Exactement.', 'Joli.'],
    triumphant: ['Le voile retombe sur vous.', 'Rideau.'],
    surprised: ['Oh… inattendu.', 'Tiens donc !'],
    pained: ['Touchée…', 'Hmpf.'],
    annoyed: ['Fâcheux.', 'Vous m’agacez.'],
    angry: ['Assez de ce jeu !', 'Vous allez le regretter.'],
    relieved: ['Rien ne m’atteint.', 'Ouf…'],
    defeated: ['Bien joué… cette fois.', 'Le voile se déchire.'],
    thinking: ['Voyons…', 'Laissez-moi lire la table…'],
    shocked: ['Les deux ?!', 'Quelle audace !'],
  },
};

/** Répliques dédiées à des faits publics précis (la cause vient de l’ExpressionDirector). */
const CAUSES: Array<{ re: RegExp; line: Partial<Record<Voice, string>> & { all: string } }> = [
  { re: /perd au Rang mais absorbe/, line: { all: 'Ma Garde absorbe tout.', braise: 'Ha ! Ça n’a pas traversé !' } },
  { re: /votre Garde absorbe/, line: { all: 'Votre Garde est solide…', braise: 'Ton bouclier tient… pour l’instant.' } },
  { re: /impacts simultanés/, line: { all: 'Touchés tous les deux !' } },
  { re: /deux Gardes/, line: { all: 'Deux Gardes… personne ne bouge.' } },
  { re: /double K\.-O\./, line: { all: 'Prolongation ! Tout se joue maintenant.' } },
  { re: /Signature adverse/, line: { all: 'Votre Signature ?!', braise: 'Ta Signature ?!' } },
  { re: /révèle sa Signature/, line: { all: 'Voici ma Signature.' } },
  { re: /engage une carte/, line: { all: 'À vous de jouer.', braise: 'À toi.' } },
  { re: /sa Garde tient/, line: { all: 'Ma Garde tient.', braise: 'Rien ne passe !' } },
  { re: /votre Garde le bloque/, line: { all: 'Votre Garde m’arrête…', braise: 'Ton bouclier ! Grr…' } },
];

export function moodLabel(e: Pick<Expression, 'mood'>, p: Pick<RivalPersonality, 'gender'>): string {
  const pair = LABEL[e.mood] ?? [e.mood, e.mood];
  return p.gender === 'f' ? pair[1] : pair[0];
}

/** Réplique déterministe (même expression publique + même graine → même réplique). */
export function rivalLine(e: Expression, p: Pick<RivalPersonality, 'id'>, seed: number): string {
  for (const c of CAUSES) {
    if (c.re.test(e.cause)) return c.line[p.id] ?? c.line.all;
  }
  const options = LINES[p.id]?.[e.mood] ?? ['…'];
  const r = makeRng(hashString(`line|${seed}|${p.id}|${e.mood}|${e.cause}`));
  return options[Math.floor(r() * options.length) % options.length]!;
}
