/**
 * La ville en rangs (le Quai en quatre rangs, ARB-M10-12 ; le Parvis, les Ruelles et la Grande Cour depuis la reprise de
 * M09, ADR 028 « Reprise » ratifiée) n'existe qu'en dioramas d'images générées : elle est la ville de l'aventure et de la
 * démo (décision P1 du responsable, fiche de la reprise) seulement si les dioramas de ses quatre îlots sont admis par la
 * politique (hors QA : approuvés par le responsable), et ceux du Quai lisibles ; sinon, la ville d'aujourd'hui, dessinée
 * par code. Décidé avant de construire la ville (jamais de mélange, ni dans un îlot ni d'un îlot à l'autre). Seuls les
 * plans du Quai sont décodés ici (ceux que la ville reprend, même cache) : les autres îlots le sont derrière le fondu, en
 * y allant.
 *
 * Deuxième reprise de M09 (ADR 028) : la décision porte sur les quatre îlots d'origine (`ILOTS_COEUR`) ; chaque quartier
 * ajouté (la Place du Fanal, la Ville haute) est ensuite ouvert seulement si son propre diorama est admis.
 */
import { createDecorResolver, decideIlot, readDecorManifest } from './decors';
import { ILOTS_COEUR, MANIFESTE_RANGS, QUARTIERS_AJOUTES, type IlotId } from './ilots';
import type { SpritePolicy } from './spritesExternes';

export interface DecisionVille {
  /** La ville en rangs est la ville du jeu. */
  rangs: boolean;
  /** Les quartiers ajoutés ouverts (aucun hors de la ville en rangs). */
  ouverts: ReadonlySet<IlotId>;
}

export async function decideVille(politique: SpritePolicy): Promise<DecisionVille> {
  const non: DecisionVille = { rangs: false, ouverts: new Set() };
  if (politique === 'code') return non;
  const all = (await readDecorManifest('decors/', MANIFESTE_RANGS)).manifest?.ilots;
  const admis = (id: IlotId) => !!all && Object.prototype.hasOwnProperty.call(all, id) && decideIlot(politique, id, all[id]).ok;
  if (!ILOTS_COEUR.every(admis)) return non;
  const r = createDecorResolver(politique, () => {}, { manifest: MANIFESTE_RANGS });
  await r.prepare('quai');
  if (r.peek('quai').state !== 'diorama') return non;
  return { rangs: true, ouverts: new Set(QUARTIERS_AJOUTES.filter(admis)) };
}

export async function villeEnRangs(politique: SpritePolicy): Promise<boolean> {
  return (await decideVille(politique)).rangs;
}
