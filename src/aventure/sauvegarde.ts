/**
 * M10-B — sauvegarde du mode Aventure, À PART de celle du jeu (avenant A-9, proposé) : clé `lqv.aventure`, schéma
 * `aventure/1`, copie de secours `lqv.aventure.backup`, mise à l'écart d'une sauvegarde illisible
 * (`lqv.aventure.corrupt`), version plus récente refusée, écriture vérifiée par relecture. La sauvegarde du jeu standard
 * (`lqv.save`, `src/product/save.ts`) n'est JAMAIS lue ni écrite ici : les profils et parties de la RC 0.8 restent
 * intacts. Pur hormis l'accès au stockage passé en paramètre.
 */
import { FAMILIES } from '../game/catalog/cards';
import type { Command, GameConfig } from '../game/model/types';
import { CATALOG_VERSION, replay } from '../game/replay/replay';
import { RULES } from '../product/resume';
import type { StorageLike } from '../product/save';
import { GAME_VERSION } from '../product/version';
import { isIlotId, type IlotId } from '../ville/ilots';
import { controlerEtat, nouvelleAventure, type AventureEtat, type Issue } from './aventure';
import { nouveauDirecteur, type EtatDirecteur } from './directeur';
import { nouvellesCompetitions } from './competitions';
import { validerDeckAv } from './deck';
import { SCENES } from './modele';
import { collectionDe, controlerRegistre } from './registre';

export const CLE_AVENTURE = 'lqv.aventure';
export const CLE_SECOURS = 'lqv.aventure.backup';
export const CLE_ECART = 'lqv.aventure.corrupt';
export const SCHEMA_AVENTURE = 'aventure/1';

/** Duel de l'aventure en cours : repris EXACTEMENT par rejeu des commandes (contrôle par hash), comme `ActiveDuel`. */
export interface DuelAventure {
  id: string;
  /** Rencontre : `prologue`, une figure (`cadet-Ronce`…) ou une facultative (`rue-docker`, `rival-kai`). */
  rencontre: string;
  seed: number;
  startedAt: string;
  rules: string;
  catalog: string;
  config: GameConfig;
  commands: Command[];
  hash: string;
  turn: number;
  /** Duel commencé avec un deck de prêt (prototype d'avant l'avenant M10-A) ; `false` depuis : le deck d'aventure. */
  pret: boolean;
}

export interface DuelResume { id: string; rencontre: string; issue: Issue; turns: number; at: string }

export interface AventureSave {
  schema: typeof SCHEMA_AVENTURE;
  gameVersion: string;
  createdAt: string;
  updatedAt: string;
  profil: { nom: string; graine: number };
  etat: AventureEtat;
  directeur: EtatDirecteur;
  ville: { ilot: IlotId; pos: { x: number; z: number } | null };
  duel: DuelAventure | null;
  historique: DuelResume[];
  compteur: number;
}

export function nouvelleSauvegarde(now: Date, nom: string, graine: number): AventureSave {
  const t = now.toISOString();
  return {
    schema: SCHEMA_AVENTURE, gameVersion: GAME_VERSION, createdAt: t, updatedAt: t, profil: { nom, graine: graine >>> 0 },
    etat: nouvelleAventure(t), directeur: nouveauDirecteur(graine), ville: { ilot: 'quai', pos: null }, duel: null, historique: [], compteur: 0,
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Validation structurelle et de cohérence ; liste vide = sauvegarde valide. */
export function validerSauvegarde(x: unknown): string[] {
  const errs: string[] = [];
  if (!isObj(x)) return ['racine : objet attendu'];
  if (x.schema !== SCHEMA_AVENTURE) errs.push(`schema : ${String(x.schema)}`);
  if (!isObj(x.profil) || typeof x.profil.nom !== 'string' || !Number.isInteger(x.profil.graine)) errs.push('profil invalide');
  const e = x.etat as AventureEtat | undefined;
  if (!isObj(e)) return [...errs, 'etat : objet attendu'];
  if (!Array.isArray(e.scenes) || e.scenes.some((s) => !(SCENES as readonly string[]).includes(s))) errs.push('etat.scenes invalide');
  if (!isObj(e.familles) || FAMILIES.some((f) => typeof e.familles[f] !== 'string')) errs.push('etat.familles invalide');
  if (!Array.isArray(e.registre)) errs.push('etat.registre invalide');
  if (!isObj(e.deck) || !Array.isArray(e.deck.cartes)) errs.push('etat.deck invalide');
  if (!isObj(e.competitions) || !isObj(e.competitions.championnat)) errs.push('etat.competitions invalide');
  if (errs.length) return errs;
  errs.push(...controlerRegistre(e.registre), ...controlerEtat(e));
  const col = collectionDe(e.registre);
  errs.push(...validerDeckAv(e.deck, col).map((p) => `deck : ${p.text}`));
  if (!isObj(x.directeur) || !Number.isInteger((x.directeur as unknown as EtatDirecteur).battement)) errs.push('directeur invalide');
  if (!isObj(x.ville) || !isIlotId((x.ville as AventureSave['ville']).ilot)) errs.push('ville invalide');
  if (!Array.isArray(x.historique)) errs.push('historique invalide');
  return errs;
}

export type ChargeAventure =
  | { status: 'vide' }
  | { status: 'ok'; save: AventureSave }
  | { status: 'illisible'; raison: string; secours: AventureSave | null }
  | { status: 'future'; raison: string }
  | { status: 'indisponible' };

function lire(text: string): { ok: true; save: AventureSave } | { ok: false; future: boolean; raison: string } {
  let x: unknown;
  try { x = JSON.parse(text); } catch { return { ok: false, future: false, raison: 'Sauvegarde illisible (JSON).' }; }
  if (isObj(x) && typeof x.schema === 'string' && x.schema.startsWith('aventure/') && x.schema !== SCHEMA_AVENTURE) {
    return { ok: false, future: true, raison: `Sauvegarde d’une version plus récente (${x.schema}) : elle n’est pas modifiée.` };
  }
  // aventure/1 d'avant les compétitions (même schéma, champ ajouté) : état par défaut, sans perte.
  if (isObj(x) && isObj(x.etat) && !('competitions' in x.etat)) (x.etat as Record<string, unknown>).competitions = nouvellesCompetitions();
  const errs = validerSauvegarde(x);
  return errs.length ? { ok: false, future: false, raison: `Sauvegarde incohérente : ${errs.slice(0, 3).join(' ; ')}` } : { ok: true, save: x as AventureSave };
}

export class MagasinAventure {
  constructor(private readonly storage: StorageLike | null, private readonly now: () => Date = () => new Date()) {}

  private get(k: string): string | null { try { return this.storage?.getItem(k) ?? null; } catch { return null; } }

  charger(): ChargeAventure {
    if (!this.storage) return { status: 'indisponible' };
    const t = this.get(CLE_AVENTURE);
    if (t === null) return { status: 'vide' };
    const r = lire(t);
    if (r.ok) return { status: 'ok', save: r.save };
    if (r.future) return { status: 'future', raison: r.raison };
    const b = this.get(CLE_SECOURS);
    const s = b ? lire(b) : null;
    return { status: 'illisible', raison: r.raison, secours: s && s.ok ? s.save : null };
  }

  /** Écriture vérifiée (validation, copie de secours de la précédente valide, relecture). */
  ecrire(save: AventureSave): { ok: true } | { ok: false; raison: string } {
    if (!this.storage) return { ok: false, raison: 'Stockage local indisponible.' };
    const next: AventureSave = { ...save, gameVersion: GAME_VERSION, updatedAt: this.now().toISOString() };
    const errs = validerSauvegarde(next);
    if (errs.length) return { ok: false, raison: `Sauvegarde refusée : ${errs.slice(0, 3).join(' ; ')}` };
    const text = JSON.stringify(next);
    try {
      const prev = this.storage.getItem(CLE_AVENTURE);
      if (prev !== null && prev !== text && lire(prev).ok) this.storage.setItem(CLE_SECOURS, prev);
      this.storage.setItem(CLE_AVENTURE, text);
      if (this.storage.getItem(CLE_AVENTURE) !== text) return { ok: false, raison: 'Relecture différente de l’écriture.' };
      save.updatedAt = next.updatedAt;
      save.gameVersion = next.gameVersion;
      return { ok: true };
    } catch (err) {
      return { ok: false, raison: `Écriture impossible (${err instanceof Error ? err.name : 'erreur'}).` };
    }
  }

  /** Met l'aventure illisible à l'écart (jamais détruite sans trace), pour repartir de zéro. */
  ecarter(): void {
    if (!this.storage) return;
    try {
      const t = this.storage.getItem(CLE_AVENTURE);
      if (t !== null) this.storage.setItem(CLE_ECART, JSON.stringify({ at: this.now().toISOString(), text: t }));
      this.storage.removeItem(CLE_AVENTURE);
    } catch { /* stockage refusé */ }
  }
}

/** Catalogue des duels de l'aventure : le catalogue standard et les quatre neutres (avenant M10-A, AV-09). */
export const CATALOG_AVENTURE = `${CATALOG_VERSION}+4n`;

/** Contrôle de version d'un duel sauvegardé avant reprise (mêmes règles que le jeu) ; un duel du prototype commencé avec
 *  un deck de prêt (catalogue standard) se reprend encore exactement : sa configuration est gardée telle quelle. */
export const duelCompatible = (d: DuelAventure): boolean => d.rules === RULES && (d.catalog === CATALOG_AVENTURE || d.catalog === CATALOG_VERSION);

/**
 * Contrôle d'un duel de l'aventure avant sa reprise (comme `verifyActiveCore` du mode standard, qui n'accepte que le
 * catalogue standard) : versions, puis rejeu des commandes sur le moteur pur et comparaison de l'empreinte.
 */
export function verifierDuel(d: DuelAventure): { ok: true } | { ok: false; reason: string } {
  if (!duelCompatible(d)) return { ok: false, reason: 'Version des règles ou du catalogue différente.' };
  if (!d.commands.length) return { ok: true };
  try {
    const r = replay({ format: 'lqv-replay/1', rules: RULES, catalog: d.catalog, config: d.config, commands: d.commands });
    return r.hash === d.hash ? { ok: true } : { ok: false, reason: 'Le rejeu du duel ne retrouve pas l’état sauvegardé (données modifiées ?).' };
  } catch (err) {
    return { ok: false, reason: `Le rejeu du duel a échoué (${err instanceof Error ? err.message : 'erreur'}).` };
  }
}
