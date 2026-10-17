/**
 * Worker de pré-génération des illustrations (passe 14) : même tracé que la page (`drawCardArt`),
 * sur un OffscreenCanvas tramé par le processeur, encodé en PNG HORS du fil principal.
 *
 * Entrée : `{ artSeed }`. Sortie : un message `{ key, defId, url }` par définition du CATALOGUE
 * entier (36), puis `{ done: true }`. Le worker ne reçoit jamais de deck : il ne sait rien des
 * cartes du rival.
 */
import { CATALOG } from '../game/catalog/cards';
import { ART_H, ART_W, artKey, drawCardArt } from './cardArt';

declare const FileReaderSync: { new (): { readAsDataURL(blob: Blob): string } };
interface WorkerScope {
  onmessage: ((e: MessageEvent<{ artSeed: number }>) => void) | null;
  postMessage(message: unknown): void;
  close(): void;
}
const scope = self as unknown as WorkerScope;

scope.onmessage = async (e) => {
  const { artSeed } = e.data;
  const reader = new FileReaderSync();
  for (const defId of Object.keys(CATALOG)) {
    const c = new OffscreenCanvas(ART_W, ART_H);
    // Même réglage que la page (`cardArt.ts`) : tramage processeur, donc mêmes pixels.
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) break;
    drawCardArt(ctx, defId, artSeed);
    const url = reader.readAsDataURL(await c.convertToBlob({ type: 'image/png' }));
    scope.postMessage({ key: artKey(defId, artSeed), defId, url });
  }
  scope.postMessage({ done: true });
  scope.close();
};
