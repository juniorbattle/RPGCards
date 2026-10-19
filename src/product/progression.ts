/**
 * Progression locale (M05) — DONNÉES ET RÈGLES DE PROTOTYPE, NON CANONIQUES, réversibles par donnée.
 *
 * Ce qui progresse : rivaux rencontrés / vaincus, étape de la série, et COLLECTION (variantes et
 * Techniques existantes rendues équipables). Ce qui ne progresse pas : aucune monnaie, aucun rang de
 * joueur, aucune rareté nouvelle, aucun bonus de Puissance ni de PV (§9.1, §11.1, §15.2). Une
 * récompense est accordée à la PREMIÈRE victoire contre un rival : on « apprend » son style (ses
 * variantes de famille, sa Technique distinctive) — choix d’habillage réglable ici, à arbitrer.
 * Module pur : aucune dépendance au DOM ni au stockage.
 */
import { CATALOG, EFFECTS, FAMILIES } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import { isSignatureRival, type SignatureRivalId } from '../presentation/personalities';
import { STARTER_COLLECTION } from './collection';
import { variantsOf, type Collection } from './deck';
import { ENCOUNTERS, SERIES, encounterById, personalityOf, type Encounter } from './encounters';
import type { DuelSummary } from './save';

/** Seuls les rivaux signatures entrent dans la progression ; un duelliste PNJ de la ville n’y laisse rien (M08 C3). */
type RivalId = SignatureRivalId;

export interface Progress {
  series: { step: number; completed: number };
  met: RivalId[];
  defeated: RivalId[];
  unlockLog: UnlockEntry[];
}

export interface UnlockEntry {
  at: string;
  duel: string;
  rival: RivalId;
  items: string[];
}

export interface Reward {
  variants: string[];
  techniques: TechniqueId[];
}

const familyVariants = (fam: string, ranks: number[]) => ranks.flatMap((r) => variantsOf(`${fam}-${r}`));

/** Première victoire contre un rival → ses variantes de famille (Rangs II–IV) et sa Technique distinctive. */
export const FIRST_WIN_REWARDS: Record<RivalId, Reward> = {
  braise: { variants: familyVariants('Cendre', [2, 3, 4]), techniques: [] },
  ronce: { variants: familyVariants('Ronce', [2, 3, 4]), techniques: ['Rupture'] },
  voile: { variants: familyVariants('Voile', [2, 3, 4]), techniques: ['Dissipation'] },
  astre: { variants: familyVariants('Astre', [2, 3, 4]), techniques: [] },
};

export function newProgress(): Progress {
  return { series: { step: 0, completed: 0 }, met: [], defeated: [], unlockLog: [] };
}

export interface EncounterStatus {
  open: boolean;
  state: 'done' | 'open' | 'locked';
  reason: string;
}

/** Disponibilité d’une rencontre (règle de prototype, déclarative). */
export function encounterStatus(enc: Encounter, p: Progress): EncounterStatus {
  // M08 C3 : les duels de la ville sont ouverts d’emblée (entraînement, sans récompense).
  if (enc.kind === 'town') return { open: true, state: 'open', reason: 'Duel de la ville' };
  if (enc.kind === 'series') {
    const step = enc.step!;
    if (p.series.step >= step) return { open: false, state: 'done', reason: 'Manche remportée' };
    if (p.series.step === step - 1) return { open: true, state: 'open', reason: 'Manche suivante' };
    const prev = personalityOf(SERIES.steps[step - 2]!);
    return { open: false, state: 'locked', reason: `Battez d’abord ${prev.name} dans la série` };
  }
  if (enc.rival === 'braise' || (isSignatureRival(enc.rival) && p.met.includes(enc.rival))) return { open: true, state: 'open', reason: 'Rencontre libre' };
  if (enc.rival === 'astre') return p.series.completed > 0 ? { open: true, state: 'open', reason: 'Défi débloqué' } : { open: false, state: 'locked', reason: `Remportez le ${SERIES.title} pour défier Orin` };
  return { open: false, state: 'locked', reason: `Rencontrez d’abord ${personalityOf(enc.rival).name} dans le ${SERIES.title}` };
}

export function playableEncounters(p: Progress): string[] {
  return ENCOUNTERS.filter((e) => encounterStatus(e, p).open).map((e) => e.id);
}

export interface OutcomeEffect {
  collection: Collection;
  progress: Progress;
  /** Cartes / Techniques nouvellement équipables. */
  unlocked: string[];
  series: { step: number; completed: boolean } | null;
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** Applique un duel terminé à la progression (pur ; abandon et défaite ne font rien gagner ; un duel contre un PNJ de
 *  la ville non plus : il reste dans l’historique seulement). */
export function applyOutcome(collection: Collection, progress: Progress, sum: DuelSummary): OutcomeEffect {
  const enc = encounterById(sum.encounterId);
  if (!isSignatureRival(sum.rival)) return { collection: structuredClone(collection), progress: structuredClone(progress), unlocked: [], series: null };
  const rival: RivalId = sum.rival;
  const p: Progress = structuredClone(progress);
  const col: Collection = structuredClone(collection);
  p.met = uniq([...p.met, rival]);
  let unlocked: string[] = [];
  let series: OutcomeEffect['series'] = null;
  if (sum.outcome === 'victory') {
    if (!p.defeated.includes(rival)) {
      const r = FIRST_WIN_REWARDS[rival];
      unlocked = [...r.variants.filter((v) => !col.variants.includes(v)), ...r.techniques.filter((t) => !col.techniques.includes(t))];
      col.variants = uniq([...col.variants, ...r.variants]);
      col.techniques = uniq([...col.techniques, ...r.techniques]);
      if (unlocked.length) p.unlockLog = [...p.unlockLog, { at: sum.at, duel: sum.id, rival, items: unlocked }];
    }
    p.defeated = uniq([...p.defeated, rival]);
    if (enc?.kind === 'series' && p.series.step === enc.step! - 1) {
      p.series.step = enc.step!;
      const done = enc.step === SERIES.steps.length;
      if (done) p.series.completed += 1;
      series = { step: enc.step!, completed: done };
    }
  }
  return { collection: col, progress: p, unlocked, series };
}

/** Rejouer la série : retour à la manche 1 (collection et historique conservés). */
export function replaySeries(p: Progress): Progress {
  return { ...structuredClone(p), series: { step: 0, completed: p.series.completed } };
}

/** Reconstitue collection et progression à partir d’un historique (migration du schéma 1). */
export function deriveFromHistory(history: readonly DuelSummary[]): { collection: Collection; progress: Progress } {
  let collection: Collection = structuredClone(STARTER_COLLECTION);
  let progress = newProgress();
  for (const h of history) {
    if (!(h.rival in FIRST_WIN_REWARDS)) continue;
    const r = applyOutcome(collection, progress, h);
    collection = r.collection;
    progress = r.progress;
  }
  return { collection, progress };
}

/** Comment obtenir une carte / Technique non possédée (texte affichable). */
export function unlockSource(id: string): string {
  for (const [rival, r] of Object.entries(FIRST_WIN_REWARDS) as Array<[RivalId, Reward]>) {
    if (r.variants.includes(id) || r.techniques.includes(id as TechniqueId)) return `Première victoire contre ${personalityOf(rival).name} (prototype)`;
  }
  return CATALOG[id]?.rarity === 'Basic' ? 'Possédée' : 'Non disponible dans ce prototype';
}

/** Libellé lisible d’un élément débloqué. */
export function unlockLabel(id: string): string {
  const d = CATALOG[id];
  return d ? `${d.name}${d.effect ? ` — ${EFFECTS[d.effect].name}` : ''}` : `Technique ${id}`;
}

/** Vérification de cohérence : toute variante / Technique de la collection existe au catalogue. */
export function collectionIsKnown(c: Collection): boolean {
  return c.variants.every((v) => CATALOG[v] && CATALOG[v].rarity !== 'Basic' && !CATALOG[v].signature) && c.signatures.every((f) => (FAMILIES as readonly string[]).includes(f));
}
