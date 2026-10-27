/**
 * M10-C — écran Collection de l'aventure : vue DÉRIVÉE du registre des gains et de l'état (aucune autre source), carte par
 * carte : possédée (avec l'origine de son gain) ou à gagner (avec la manière de l'obtenir : rien n'est caché, P-N4).
 * Module pur.
 */
import { CATALOG, FAMILIES, variantLetter, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import type { AventureEtat } from './aventure';
import { varianteDe } from './competitions';
import { deF, FIGURES, figureDe, MAISONS, NEUTRES, RANGS, TECHNIQUES_RUE, type EtatFamille } from './modele';
import { collectionDe, variantesIdentite, type Gain } from './registre';

export interface EntreeCollection {
  /** Définition (`Cendre-3-…`, `sig-Cendre`) ou Technique. */
  id: string;
  possedee: boolean;
  /** Possédée : origine du gain ; sinon, comment l'obtenir. */
  texte: string;
  dansDeck: boolean;
  /** Variante : sa lettre (A, B ou C ; avenant 09). */
  lettre?: string;
}

export interface FamilleCollection {
  famille: Family;
  etat: EtatFamille;
  basics: EntreeCollection[];
  /** Trois variantes par Rang, A, B et C (I : Épreuve, II : Joute, III : cadet, IV : bras droit ; avenant 09). */
  variantes: EntreeCollection[];
  signature: EntreeCollection;
}

export interface VueCollection {
  neutres: Array<{ id: string; possedees: number; dansDeck: number }>;
  familles: FamilleCollection[];
  techniques: EntreeCollection[];
  /** Cartes familiales et Signatures possédées sur le total (16 Basics, 48 variantes, 4 Signatures). */
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
  if (k === 'championnat') return 'Titre du Championnat';
  if (k === 'duel') {
    const fig = g.kind === 'variante'
      ? FIGURES.find((x) => x.enjeu.kind === 'variante' && CATALOG[x.enjeu.defId]!.identity === CATALOG[g.items[0]!]?.identity)
      : g.family ? figureDe(g.family, 'chef') : undefined;
    return fig ? `Victoire contre ${fig.nom}` : 'Victoire en duel';
  }
  return g.source;
}

/**
 * Comment gagner une variante (jamais caché) : lieutenant, Épreuve ou Joute de sa famille ; avenant 09 : une variante au
 * choix à la première victoire (`revanche` faux : aucune variante de l'identité possédée), les deux autres en revanche, toutes
 * celles qui manquent au titre du Championnat.
 */
export function voieVariante(defId: string, revanche = false): string {
  const d = CATALOG[defId]!;
  const fig = FIGURES.find((x) => x.enjeu.kind === 'variante' && CATALOG[x.enjeu.defId]!.identity === d.identity);
  const epreuve = CATALOG[varianteDe(d.family, 1)]!.identity === d.identity;
  if (revanche) {
    const voie = fig ? `Battre de nouveau ${fig.nom} (revanche)` : epreuve ? `Regagner l’Épreuve du quartier ${deF(d.family)}` : `Regagner la Joute de la maison ${deF(d.family)}`;
    return `${voie}, ou remporter le Championnat`;
  }
  if (fig) return `Battre ${fig.nom}, ${fig.titre} (une variante au choix)`;
  if (epreuve) return `Gagner l’Épreuve du quartier ${deF(d.family)} (trois victoires d’affilée ; une variante au choix)`;
  return `Gagner la Joute de la maison ${deF(d.family)} (une variante au choix)`;
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
    const variantes = RANGS.flatMap((r) => {
      const ids = variantesIdentite(`${f}-${r}`);
      const une = ids.some((id) => gain(`variante:${id}`));
      return ids.map((id) => {
        const g = gain(`variante:${id}`);
        return { id, possedee: !!g, dansDeck: deck.has(id), texte: g ? origineGain(g) : voieVariante(id, une), lettre: variantLetter(CATALOG[id]!) ?? undefined };
      });
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
  return { neutres, familles, techniques, compte: { possedees, total: FAMILIES.length * (4 + 12 + 1) } };
}
