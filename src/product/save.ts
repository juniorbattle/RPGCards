/**
 * Sauvegarde locale VERSIONNÉE (M04) — profil, deck, options, historique des duels.
 *
 * Garanties :
 * - une sauvegarde n’est écrite qu’après validation de son propre contenu, puis relue et comparée ;
 *   la version précédente valide est conservée comme copie de secours (`lqv.save.backup`) ;
 * - une sauvegarde illisible n’est JAMAIS effacée silencieusement : elle est mise à l’écart
 *   (`lqv.save.corrupt`) seulement quand le joueur choisit de repartir de zéro ou de restaurer ;
 * - une sauvegarde d’une version plus récente est refusée explicitement (pas de déclassement) ;
 * - un stockage indisponible (navigation privée, quota) n’empêche pas de jouer : il est signalé.
 * Aucune donnée ne quitte le navigateur (pas de compte, pas de réseau).
 */
import { FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import type { DeckChoice } from './deck';
import { GAME_VERSION } from './version';

export const SAVE_KEY = 'lqv.save';
export const BACKUP_KEY = 'lqv.save.backup';
export const CORRUPT_KEY = 'lqv.save.corrupt';
export const SCHEMA_VERSION = 1;

export type Pace = 'normal' | 'fast' | 'instant';

export interface Options {
  pace: Pace;
  /** `null` = suivre la préférence du système. */
  reducedMotion: boolean | null;
  scale: number;
  /** Conseils contextuels pendant le duel. */
  tips: boolean;
  /** Mode démo (réversible) : toute la collection du catalogue est équipable. */
  fullCollection: boolean;
  /** Seed esthétique (illustrations, rival) — n’affecte jamais le tirage des cartes. */
  artSeed: number;
}

export type DuelOutcome = 'victory' | 'defeat' | 'abandon';

/** Résumé PUBLIC d’un duel terminé (aucun champ privé du rival). */
export interface DuelSummary {
  id: string;
  encounterId: string;
  rival: string;
  outcome: DuelOutcome;
  turns: number;
  overtime: number;
  dealt: number;
  taken: number;
  hp: { me: number; opp: number };
  seed: number;
  signature: Family;
  at: string;
}

export interface SaveData {
  schemaVersion: typeof SCHEMA_VERSION;
  gameVersion: string;
  createdAt: string;
  updatedAt: string;
  profile: { name: string; seed: number };
  deck: DeckChoice;
  options: Options;
  /** Plus récent en dernier ; borné à `HISTORY_MAX`. */
  history: DuelSummary[];
  /** Nombre de duels commencés (dérive la seed de chaque duel). */
  duelCounter: number;
}

export const HISTORY_MAX = 60;

export const DEFAULT_OPTIONS: Options = { pace: 'normal', reducedMotion: null, scale: 1, tips: true, fullCollection: false, artSeed: 7 };

export function newSave(now: Date, name: string, seed: number, deck: DeckChoice): SaveData {
  const t = now.toISOString();
  return { schemaVersion: SCHEMA_VERSION, gameVersion: GAME_VERSION, createdAt: t, updatedAt: t, profile: { name, seed: seed >>> 0 }, deck: structuredClone(deck), options: { ...DEFAULT_OPTIONS }, history: [], duelCounter: 0 };
}

// ---------------------------------------------------------------------------
// Validation structurelle (sans dépendance) : chaque erreur nomme le champ fautif.

type Errs = string[];
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isIso = (x: unknown) => isStr(x) && !Number.isNaN(Date.parse(x));

function checkDeck(x: unknown, errs: Errs, at: string): void {
  if (!isObj(x)) { errs.push(`${at} : objet attendu`); return; }
  if (!(FAMILIES as readonly unknown[]).includes(x.signature)) errs.push(`${at}.signature : famille inconnue`);
  if (!Array.isArray(x.variants) || !x.variants.every(isStr)) errs.push(`${at}.variants : liste de définitions attendue`);
  if (!Array.isArray(x.techniques) || !x.techniques.every((t) => (TECHNIQUE_IDS as readonly unknown[]).includes(t))) errs.push(`${at}.techniques : Techniques inconnues`);
}

function checkOptions(x: unknown, errs: Errs): void {
  if (!isObj(x)) { errs.push('options : objet attendu'); return; }
  if (!['normal', 'fast', 'instant'].includes(x.pace as string)) errs.push('options.pace');
  if (x.reducedMotion !== null && typeof x.reducedMotion !== 'boolean') errs.push('options.reducedMotion');
  if (!isNum(x.scale) || x.scale < 0.8 || x.scale > 1.5) errs.push('options.scale');
  if (typeof x.tips !== 'boolean') errs.push('options.tips');
  if (typeof x.fullCollection !== 'boolean') errs.push('options.fullCollection');
  if (!isInt(x.artSeed)) errs.push('options.artSeed');
}

function checkSummary(x: unknown, errs: Errs, at: string): void {
  if (!isObj(x)) { errs.push(`${at} : objet attendu`); return; }
  for (const k of ['id', 'encounterId', 'rival']) if (!isStr(x[k])) errs.push(`${at}.${k}`);
  if (!['victory', 'defeat', 'abandon'].includes(x.outcome as string)) errs.push(`${at}.outcome`);
  for (const k of ['turns', 'overtime', 'dealt', 'taken', 'seed']) if (!isInt(x[k])) errs.push(`${at}.${k}`);
  if (!isObj(x.hp) || !isInt(x.hp.me) || !isInt(x.hp.opp)) errs.push(`${at}.hp`);
  if (!(FAMILIES as readonly unknown[]).includes(x.signature)) errs.push(`${at}.signature`);
  if (!isIso(x.at)) errs.push(`${at}.at`);
}

/** Valide une sauvegarde AU SCHÉMA COURANT ; liste vide = valide. */
export function validateSave(x: unknown): Errs {
  const errs: Errs = [];
  if (!isObj(x)) return ['racine : objet attendu'];
  if (x.schemaVersion !== SCHEMA_VERSION) errs.push(`schemaVersion : ${String(x.schemaVersion)} au lieu de ${SCHEMA_VERSION}`);
  if (!isStr(x.gameVersion)) errs.push('gameVersion');
  if (!isIso(x.createdAt)) errs.push('createdAt');
  if (!isIso(x.updatedAt)) errs.push('updatedAt');
  if (!isObj(x.profile) || !isStr(x.profile.name) || !isInt(x.profile.seed)) errs.push('profile');
  checkDeck(x.deck, errs, 'deck');
  checkOptions(x.options, errs);
  if (!Array.isArray(x.history)) errs.push('history : liste attendue');
  else x.history.forEach((h, i) => checkSummary(h, errs, `history[${i}]`));
  if (!isInt(x.duelCounter) || x.duelCounter < 0) errs.push('duelCounter');
  return errs;
}

export type ParseResult =
  | { ok: true; save: SaveData; migratedFrom: number | null }
  | { ok: false; kind: 'syntax' | 'invalid' | 'future'; reason: string };

/**
 * Lit un texte de sauvegarde : JSON → migration éventuelle vers le schéma courant → validation.
 * Une version de schéma future est refusée (jamais réécrite par une version plus ancienne du jeu).
 */
export function parseSave(text: string): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, kind: 'syntax', reason: 'Fichier de sauvegarde illisible (JSON invalide).' }; }
  if (!isObj(raw) || !isInt(raw.schemaVersion)) return { ok: false, kind: 'invalid', reason: 'Version de schéma absente.' };
  const from = raw.schemaVersion;
  if (from > SCHEMA_VERSION) return { ok: false, kind: 'future', reason: `Sauvegarde créée par une version plus récente du jeu (schéma ${from}, ce jeu lit le schéma ${SCHEMA_VERSION}).` };
  let cur: unknown = raw;
  for (let v = from; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, kind: 'invalid', reason: `Aucune migration depuis le schéma ${v}.` };
    cur = step(cur as Record<string, unknown>);
  }
  const errs = validateSave(cur);
  if (errs.length) return { ok: false, kind: 'invalid', reason: `Sauvegarde invalide : ${errs.slice(0, 4).join(' ; ')}${errs.length > 4 ? ` (+${errs.length - 4})` : ''}.` };
  return { ok: true, save: cur as SaveData, migratedFrom: from === SCHEMA_VERSION ? null : from };
}

/** Migrations successives `v → v+1` (aucune avant le schéma 1, le premier publié). */
const MIGRATIONS: Record<number, (x: Record<string, unknown>) => Record<string, unknown>> = {};

// ---------------------------------------------------------------------------
// Stockage

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; save: SaveData; migratedFrom: number | null }
  | { status: 'corrupt'; reason: string; kind: 'syntax' | 'invalid' | 'future'; backup: SaveData | null }
  | { status: 'unavailable'; reason: string };

export type WriteResult = { ok: true } | { ok: false; reason: string };

/** Accès au stockage local ; tolérant aux navigateurs qui le refusent (exceptions capturées). */
export class SaveStore {
  constructor(private readonly storage: StorageLike | null, private readonly now: () => Date = () => new Date()) {}

  /** Stockage du navigateur, ou `null` s’il est indisponible (navigation privée stricte, iframe…). */
  static browser(): StorageLike | null {
    try {
      const s = window.localStorage;
      const k = 'lqv.probe';
      s.setItem(k, '1');
      s.removeItem(k);
      return s;
    } catch {
      return null;
    }
  }

  get available(): boolean {
    return !!this.storage;
  }

  private read(key: string): string | null {
    try { return this.storage?.getItem(key) ?? null; } catch { return null; }
  }

  load(): LoadResult {
    if (!this.storage) return { status: 'unavailable', reason: 'Le stockage local de ce navigateur est indisponible : la progression ne pourra pas être conservée.' };
    const text = this.read(SAVE_KEY);
    if (text === null) {
      // Pas de sauvegarde principale mais une copie de secours valide : on la propose.
      const b = this.backup();
      return b ? { status: 'corrupt', kind: 'invalid', reason: 'Sauvegarde principale absente ; une copie de secours existe.', backup: b } : { status: 'empty' };
    }
    const r = parseSave(text);
    if (r.ok) return { status: 'ok', save: r.save, migratedFrom: r.migratedFrom };
    return { status: 'corrupt', kind: r.kind, reason: r.reason, backup: this.backup() };
  }

  /** Copie de secours valide (version précédente), si elle existe. */
  backup(): SaveData | null {
    const t = this.read(BACKUP_KEY);
    if (t === null) return null;
    const r = parseSave(t);
    return r.ok ? r.save : null;
  }

  /** Texte brut de la sauvegarde principale (export de diagnostic, même illisible). */
  rawMain(): string | null {
    return this.read(SAVE_KEY);
  }

  /**
   * Écriture vérifiée : valide → copie l’ancienne version valide en secours → écrit → relit.
   * En cas d’échec (quota, refus), l’ancienne sauvegarde reste intacte et l’erreur est rendue.
   */
  write(save: SaveData): WriteResult {
    if (!this.storage) return { ok: false, reason: 'Stockage local indisponible.' };
    const next: SaveData = { ...save, gameVersion: GAME_VERSION, updatedAt: this.now().toISOString() };
    const errs = validateSave(next);
    if (errs.length) return { ok: false, reason: `Sauvegarde refusée (données incohérentes) : ${errs.slice(0, 3).join(' ; ')}` };
    const text = JSON.stringify(next);
    try {
      const prev = this.storage.getItem(SAVE_KEY);
      if (prev !== null && prev !== text && parseSave(prev).ok) this.storage.setItem(BACKUP_KEY, prev);
      this.storage.setItem(SAVE_KEY, text);
      if (this.storage.getItem(SAVE_KEY) !== text) return { ok: false, reason: 'Relecture de la sauvegarde différente de l’écriture.' };
      Object.assign(save, { gameVersion: next.gameVersion, updatedAt: next.updatedAt });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: `Écriture impossible (${err instanceof Error ? err.name : 'erreur'}) : stockage plein ou refusé.` };
    }
  }

  /** Met la sauvegarde principale illisible à l’écart (jamais détruite sans trace). */
  quarantine(): void {
    if (!this.storage) return;
    try {
      const t = this.storage.getItem(SAVE_KEY);
      if (t !== null) this.storage.setItem(CORRUPT_KEY, JSON.stringify({ at: this.now().toISOString(), text: t }));
      this.storage.removeItem(SAVE_KEY);
    } catch { /* stockage refusé : rien à faire de plus */ }
  }

  /** Restaure la copie de secours comme sauvegarde principale (l’illisible est mise à l’écart). */
  restoreBackup(): SaveData | null {
    const b = this.backup();
    if (!b) return null;
    this.quarantine();
    return this.write(b).ok ? b : null;
  }

  /** Effacement explicite (confirmé par le joueur) : principale et secours ; l’écart illisible est conservé. */
  erase(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(SAVE_KEY);
      this.storage.removeItem(BACKUP_KEY);
    } catch { /* idem */ }
  }
}

/** Seed de duel dérivée du profil (reproductible : le n-ième duel d’un profil a toujours la même seed). */
export function duelSeed(profileSeed: number, n: number): number {
  let x = (profileSeed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export type { TechniqueId };
