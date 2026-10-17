/** Texte « comment l’obtenir » d’une carte ou Technique non possédée (déblocages de PROTOTYPE, M05). */
import { CATALOG } from '../game/catalog/cards';

export function unlockHint(id: string): string {
  const d = CATALOG[id];
  if (d && !d.signature) return d.rarity === 'Basic' ? 'Possédée' : 'Non possédée (prototype)';
  return 'Non apprise (prototype)';
}
