/**
 * La ville en rangs (le Quai en quatre rangs, ARB-M10-12 ; le Parvis, les Ruelles et la Grande Cour depuis la reprise de
 * M09, ADR 028 « Reprise » ratifiée) n'existe qu'en dioramas d'images générées : elle est la ville de l'aventure et de la
 * démo (décision P1 du responsable, fiche de la reprise) seulement si les dioramas de ses quatre îlots sont admis par la
 * politique (hors QA : approuvés par le responsable), et ceux du Quai lisibles ; sinon, la ville d'aujourd'hui, dessinée
 * par code. Décidé avant de construire la ville (jamais de mélange, ni dans un îlot ni d'un îlot à l'autre). Seuls les
 * plans du Quai sont décodés ici (ceux que la ville reprend, même cache) : les autres îlots le sont derrière le fondu, en
 * y allant.
 */
import { createDecorResolver, decideIlot, readDecorManifest } from './decors';
import { ILOTS_RANGS, isIlotId, MANIFESTE_RANGS } from './ilots';
import type { SpritePolicy } from './spritesExternes';

export async function villeEnRangs(politique: SpritePolicy): Promise<boolean> {
  if (politique === 'code') return false;
  const all = (await readDecorManifest('decors/', MANIFESTE_RANGS)).manifest?.ilots;
  const ids = Object.keys(ILOTS_RANGS).filter(isIlotId);
  if (!all || !ids.every((id) => Object.prototype.hasOwnProperty.call(all, id) && decideIlot(politique, id, all[id]).ok)) return false;
  const r = createDecorResolver(politique, () => {}, { manifest: MANIFESTE_RANGS });
  await r.prepare('quai');
  return r.peek('quai').state === 'diorama';
}
