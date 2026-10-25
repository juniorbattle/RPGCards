/**
 * Contrôle d’un duel sauvegardé avant sa reprise (M05) : versions du catalogue et des règles, puis
 * rejeu des commandes sur le moteur pur et comparaison du hash (état + journal complet). Pur.
 */
import { CATALOG_VERSION, replay } from '../game/replay/replay';
import type { ActiveDuel } from './save';

export const RULES = 'V3.0+delta-V3.3.2';

export function verifyActiveCore(a: ActiveDuel): { ok: true } | { ok: false; reason: string } {
  if (a.catalog !== CATALOG_VERSION) return { ok: false, reason: `Catalogue différent (${a.catalog}).` };
  if (a.rules !== RULES) return { ok: false, reason: `Règles différentes (${a.rules}).` };
  if (!a.commands.length) return { ok: true };
  try {
    const r = replay({ format: 'lqv-replay/1', rules: RULES, catalog: a.catalog, config: a.config, commands: a.commands });
    return r.hash === a.hash ? { ok: true } : { ok: false, reason: 'Le rejeu du duel ne retrouve pas l’état sauvegardé (données modifiées ?).' };
  } catch (err) {
    return { ok: false, reason: `Le rejeu du duel a échoué (${err instanceof Error ? err.message : 'erreur'}).` };
  }
}
