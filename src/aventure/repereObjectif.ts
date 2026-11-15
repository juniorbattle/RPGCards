/**
 * Passe 240 — le repère d'objectif de la Promenade libre (demande du responsable du 2026-11-15 : « un mini-map sur le coin
 * de l'écran ou un objective point pour nous guider à notre prochaine étape narrative » ; choix : le repère d'objectif).
 *
 * Ce module répond à la question « où aller maintenant ? » pour le quartier où se tient le joueur : la personne de la trame
 * (`etapeRecit`, le pendant de l'objectif affiché), la porte de la Salle des Bannières ou de l'arène, ou, quand l'étape se
 * joue ailleurs, le passage qui mène vers son quartier (plus court chemin entre les quartiers ouverts). Kaï, comme dans la
 * trame, surgit sans prévenir : un événement dû vient au joueur dans ses quartiers, une revanche dans tout quartier, au
 * prochain point de décision ; le guide garde alors l'étape. Il ne montre Kaï que quand plus aucune autre étape ne reste
 * (« Il vous attend », après le titre) et que le joueur n'est pas dans un quartier où il surgit. Aucun DOM ; l'application
 * projette les repères à l'écran. Pur.
 */
import type { IlotId } from '../ville/ilots';
import type { Vec2, Zone } from '../ville/monde';
import type { AventureEtat } from './aventure';
import type { Pose } from './directeur';
import { etapeRecit } from './guide';
import { evenementRival } from './rival';

/** Hauteur du repère : au-dessus d'une tête, au-dessus d'une porte, ou au passage vers un autre quartier. */
export type HauteurRepere = 'tete' | 'porte' | 'passage';

/** Un repère dans le quartier courant. `apparence` : le personnage suivi (sa position réelle prime sur `at`). */
export interface RepereObjectif {
  id: string;
  at: Vec2;
  hauteur: HauteurRepere;
  /** Ce que le repère nomme (« Gaspard », « La Salle des Bannières », « Monter vers la Grande Cour »). */
  nom: string;
  /** Une précision, au passage : l'étape et son quartier (« Gaspard · la Place du Fanal »). */
  detail: string | null;
  apparence?: string;
}

/** Ce que le guide montre dans ce quartier : un ou plusieurs repères (un choix), et une clé qui change avec eux. */
export interface Guidage {
  reperes: RepereObjectif[];
  /** Vrai quand l'étape se joue dans un autre quartier : les repères sont des passages. */
  ailleurs: boolean;
  cle: string;
}

/** Ce que le module lit du monde : les personnages posés, les zones et les liaisons de chaque quartier ouvert. */
export interface MondeGuide {
  ici: IlotId;
  /** Quartiers ouverts dans cette ville (dans l'ordre du Récit guidé). */
  ilots: readonly IlotId[];
  posesDe(id: IlotId): readonly Pose[];
  zonesDe(id: IlotId): readonly Zone[];
  sortiesDe(id: IlotId): Readonly<Record<string, { to: IlotId }>>;
  nomDe(id: IlotId): string;
  quaiRangs?: boolean;
  /** Kaï peut-il surgir (en QA, seulement avec les rencontres en vue) ? */
  kai?: boolean;
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Centre d'une zone au sol (rectangle ou disque). */
export function centreZone(z: Zone): Vec2 {
  const a = z.area;
  return 'r' in a ? { x: a.x, z: a.z } : { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 };
}

/**
 * Plus court chemin entre quartiers (en nombre de passages) : la sortie à prendre ici pour rejoindre `vers`, et la distance ;
 * null si `vers` n'est pas joignable (quartier fermé). Ordre stable : les sorties dans leur ordre de déclaration.
 */
export function premierPassage(m: Pick<MondeGuide, 'ilots' | 'sortiesDe'>, ici: IlotId, vers: IlotId): { sortie: string; distance: number } | null {
  if (ici === vers) return null;
  const vus = new Map<IlotId, string>();
  let front: Array<{ id: IlotId; sortie: string }> = [];
  for (const [sortie, s] of Object.entries(m.sortiesDe(ici))) {
    if (!m.ilots.includes(s.to) || s.to === ici || vus.has(s.to)) continue;
    vus.set(s.to, sortie);
    front.push({ id: s.to, sortie });
  }
  for (let d = 1; front.length; d++) {
    const hit = front.find((f) => f.id === vers);
    if (hit) return { sortie: hit.sortie, distance: d };
    const suivant: typeof front = [];
    for (const f of front) for (const s of Object.values(m.sortiesDe(f.id))) {
      if (!m.ilots.includes(s.to) || s.to === ici || vus.has(s.to)) continue;
      vus.set(s.to, f.sortie);
      suivant.push({ id: s.to, sortie: f.sortie });
    }
    front = suivant;
  }
  return null;
}

/** Une cible de l'étape : une personne posée, ou une porte d'un quartier. */
type Cible = { ilot: IlotId; repere: RepereObjectif };

function cherchePersonne(m: MondeGuide, id: string): Cible | null {
  for (const ilot of m.ilots) {
    const p = m.posesDe(ilot).find((x) => x.id === id);
    if (p) return { ilot, repere: { id, at: { ...p.at }, hauteur: 'tete', nom: capital(p.nom), detail: null, apparence: p.apparence } };
  }
  return null;
}

function cherchePorte(m: MondeGuide, target: string, nom: string): Cible | null {
  for (const ilot of m.ilots) {
    const z = m.zonesDe(ilot).find((x) => x.kind === 'porte' && x.target === target);
    if (z) return { ilot, repere: { id: z.id, at: centreZone(z), hauteur: 'porte', nom, detail: null } };
  }
  return null;
}

/** Les cibles de l'étape (plusieurs pour un choix), et le nom de Kaï quand c'est lui qu'on cherche. */
function ciblesEtape(e: AventureEtat, m: MondeGuide): Cible[] {
  const etape = etapeRecit(e);
  // Kaï annoncé (« Une revanche à prendre », « Il vous attend », comme à la Préparation) : montré seulement s'il ne vient pas
  // de lui-même ici (une revanche se rejoue dans tout quartier : le guide garde alors l'étape)
  if (m.kai !== false) {
    const perdu = e.rival?.perdus?.[0];
    const annonce = perdu !== undefined || !etape;
    if (annonce) {
      const ou = m.ilots.filter((x) => evenementRival(e, x, m.quaiRangs ?? true));
      // déjà dans un quartier où il surgit : il viendra au joueur (au prochain point de décision), le guide montre l'étape
      if (ou.length && !ou.includes(m.ici)) {
        const detail = perdu !== undefined ? 'Kaï · une revanche à prendre' : 'Kaï vous attend';
        return ou.map((ilot) => ({ ilot, repere: { id: `kai:${ilot}`, at: { x: 0, z: 0 }, hauteur: 'passage', nom: 'Kaï', detail } }));
      }
    }
  }
  if (!etape) return [];
  if (etape.kind === 'personne') { const c = cherchePersonne(m, etape.id); return c ? [c] : []; }
  if (etape.kind === 'choix') return etape.ids.flatMap((id) => { const c = cherchePersonne(m, id); return c ? [c] : []; });
  if (etape.kind === 'bannieres') { const c = cherchePorte(m, 'salle', 'La Salle des Bannières'); return c ? [c] : []; }
  // le Championnat : le héraut s'il est en ville (la Grande Cour), sinon la porte de l'arène
  const h = cherchePersonne(m, 'heraut');
  if (h) return [{ ...h, repere: { ...h.repere, detail: 'Championnat des Champions' } }];
  const a = cherchePorte(m, 'arene', 'L’arène');
  return a ? [{ ...a, repere: { ...a.repere, detail: 'Championnat des Champions' } }] : [];
}

/**
 * Le guidage du quartier courant, ou null quand il n'y a rien à montrer (après le titre sans Kaï, personne introuvable,
 * quartier injoignable). Ici : chaque cible du quartier ; ailleurs : le passage vers le quartier de la cible la plus proche.
 */
export function guidage(e: AventureEtat, m: MondeGuide): Guidage | null {
  const cibles = ciblesEtape(e, m);
  if (!cibles.length) return null;
  const ici = cibles.filter((c) => c.ilot === m.ici && !c.repere.id.startsWith('kai:'));
  if (ici.length) {
    const reperes = ici.map((c) => c.repere);
    return { reperes, ailleurs: false, cle: cleDe(reperes, false) };
  }
  let meilleur: { c: Cible; sortie: string; distance: number } | null = null;
  for (const c of cibles) {
    const p = premierPassage(m, m.ici, c.ilot);
    if (p && (!meilleur || p.distance < meilleur.distance)) meilleur = { c, ...p };
  }
  if (!meilleur) return null;
  const z = m.zonesDe(m.ici).find((x) => x.id === meilleur!.sortie);
  if (!z) return null;
  const { c } = meilleur;
  // la précision : l'étape (sa précision d'abord : « Championnat des Champions », « Kaï vous attend »), et son quartier
  // quand le passage n'y mène pas directement (le nom du passage le dit déjà sinon : « Monter vers la Grande Cour »)
  const etape = c.repere.detail ?? c.repere.nom;
  const direct = m.sortiesDe(m.ici)[meilleur.sortie]?.to === c.ilot;
  const detail = direct ? etape : `${etape} · ${m.nomDe(c.ilot)}`;
  const reperes: RepereObjectif[] = [{ id: z.id, at: centreZone(z), hauteur: 'passage', nom: z.label, detail }];
  return { reperes, ailleurs: true, cle: cleDe(reperes, true) };
}

const cleDe = (r: readonly RepereObjectif[], ailleurs: boolean): string => JSON.stringify([ailleurs, ...r.map((x) => [x.id, x.nom, x.detail, x.at.x, x.at.z])]);

// ------------------------------------------------------------------ réglage (dans ce navigateur, à part des sauvegardes)

export const CLE_REPERE = 'lqv.repere';
interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Repère d'objectif affiché ? Oui par défaut ; lecture protégée (un stockage refusé ne casse rien). */
export function lireRepere(st: Stockage | null): boolean {
  try { return st?.getItem(CLE_REPERE) !== '0'; } catch { return true; }
}

export function ecrireRepere(st: Stockage | null, affiche: boolean): boolean {
  try { st?.setItem(CLE_REPERE, affiche ? '1' : '0'); return !!st; } catch { return false; }
}

/**
 * Le repère est-il permis par l'adresse ? `?repere=0` le coupe ; en QA (`?qa=1`), seulement avec `?repere=1`, pour que les
 * parcours et les captures d'avant restent identiques au pixel près.
 */
export function reperePermis(search: string): boolean {
  const q = new URLSearchParams(search);
  if (q.get('repere') === '0') return false;
  if (q.get('qa') === '1') return q.get('repere') === '1';
  return true;
}
