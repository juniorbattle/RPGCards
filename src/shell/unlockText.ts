/** Texte « comment l’obtenir » d’une carte ou Technique non possédée (déblocages de PROTOTYPE, M05). */
import { unlockSource } from '../product/progression';

export function unlockHint(id: string): string {
  return unlockSource(id);
}
