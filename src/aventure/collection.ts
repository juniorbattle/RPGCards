/**
 * M10-C — écran Collection de l'aventure : vue DÉRIVÉE du registre des gains et de l'état (aucune autre source), carte par
 * carte : possédée (avec l'origine de son gain) ou à gagner (avec la manière de l'obtenir : rien n'est caché, P-N4).
 * Module pur.
 */
import { CATALOG, FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import type { AventureEtat } from './aventure';
import { varianteDe } from './competitions';
import { deF, FIGURES, figureDe, MAISONS, NEUTRES, RANGS, TECHNIQUES_RUE, type EtatFamille } from './modele';
import { collectionDe, type Gain } from './registre';

export interface EntreeCollection {
  /** Définition (`Cendre-3-…`, `sig-Cendre`) ou Technique. */
  id: string;
  possedee: boolean;
  /** Possédée : origine du gain ; sinon, comment l'obtenir. */
  texte: string;
  dansDeck: boolean;
}

export interface FamilleCollection {
  famille: Family;
  etat: EtatFamille;
  basics: EntreeCollection[];
  /** Une variante par Rang (I : Épreuve, II : Joute, III : cadet, IV : bras droit). */
  variantes: EntreeCollection[];
  signature: EntreeCollection;
}

export interface VueCollection {
  neutres: Array<{ id: string; possedees: number; dansDeck: number }>;
  familles: FamilleCollection[];
  techniques: EntreeCollection[];
  /** Cartes familiales et Signatures possédées sur le total (16 Basics, 16 variantes, 4 Signatures). */
  compte: { possedees: number; total: number };
}

/** Origine lisible d'un gain du registre. */
export function origineGain(g: Gain): string {
  const [k, a] = g.source.split(':');
  const f = a as Family;
  if (g.source === 'P0') return 'Départ : la rue';
  if (k === 'P7') return `Affiliation ${deF(f)}`;
  if (k === 'engagement') return `Défi officiel ${deF(f)} engagé`;
  if (k === 'epreuve') return `Épreuve du quartier ${deF(f)}`;
  if (k === 'joute') return `Joute de la maison ${deF(f)}`;
  if (k === 'duel') {
    const fig = g.kind === 'variante'
      ? FIGURES.find((x) => x.enjeu.kind === 'variante' && x.enjeu.defId === g.items[0])
      : g.family ? figureDe(g.family, 'chef') : undefined;
    return fig ? `Victoire contre ${fig.nom}` : 'Victoire en duel';
  }
  return g.source;
}

/** Comment gagner une variante (jamais caché) : lieutenant, Épreuve ou Joute de sa famille. */
function voieVariante(defId: string): string {
  const d = CATALOG[defId]!;
  const fig = FIGURES.find((x) => x.enjeu.kind === 'variante' && x.enjeu.defId === defId);
  if (fig) return `Battre ${fig.nom}, ${fig.titre}`;
  if (varianteDe(d.family, 1) === defId) return `Gagner l’Épreuve du quartier ${deF(d.family)} (trois victoires d’affilée)`;
  return `Gagner la Joute de la maison ${deF(d.family)}`;
}

export function vueCollection(e: AventureEtat): VueCollection {
  const col = collectionDe(e.registre);
  const gain = (key: string) => e.registre.find((g) => g.key === key);
  const deck = new Set(e.deck.cartes);
  let possedees = 0;
  const familles = FAMILIES.map((f): FamilleCollection => {
    const gb = gain(`basics:${f}`);
    const basics = RANGS.map((r) => ({
      id: `${f}-${r}-basic`, possedee: !!gb, dansDeck: deck.has(`${f}-${r}-basic`),
      texte: gb ? origineGain(gb) : `À l’affiliation ${deF(f)}, ou à l’engagement de son défi officiel`,
    }));
    const variantes = RANGS.map((r) => {
      const id = Object.values(CATALOG).find((d) => d.family === f && d.rank === r && d.rarity !== 'Basic' && !d.signature)!.defId;
      const g = gain(`variante:${id}`);
      return { id, possedee: !!g, dansDeck: deck.has(id), texte: g ? origineGain(g) : voieVariante(id) };
    });
    const gs = gain(`signature:${f}`);
    const chef = figureDe(f, 'chef');
    const signature = { id: `sig-${f}`, possedee: !!gs, dansDeck: e.deck.signature === f, texte: gs ? origineGain(gs) : `Battre ${chef.nom}, ${chef.titre}` };
    possedees += [...basics, ...variantes, signature].filter((x) => x.possedee).length;
    return { famille: f, etat: e.familles[f], basics, variantes, signature };
  });
  const techniques = TECHNIQUE_IDS.map((t: TechniqueId) => {
    const g = gain(`technique:${t}`);
    const maison = FAMILIES.find((f) => MAISONS[f].technique === t);
    const voie = TECHNIQUES_RUE.includes(t) ? 'Départ : la rue' : maison ? `Avec les cartes de base ${deF(maison)}` : 'Non enseignée dans l’aventure';
    return { id: t, possedee: !!g, dansDeck: e.deck.techniques.includes(t), texte: g ? origineGain(g) : voie };
  });
  const neutres = RANGS.map((r) => ({ id: NEUTRES[r].defId, possedees: col.neutres[r], dansDeck: e.deck.cartes.filter((c) => c === NEUTRES[r].defId).length }));
  return { neutres, familles, techniques, compte: { possedees, total: FAMILIES.length * 9 } };
}
