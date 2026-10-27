/**
 * Pré-génération des illustrations hors du fil principal (passe 14).
 *
 * Une illustration générée à sa première apparition coûtait ≈ 5 ms à la commande qui la montrait,
 * dont ≈ 4,3 ms d’encodage PNG. Un worker produit tout le catalogue dès le démarrage ; la page
 * range chaque résultat dans le cache de `cardArt.ts` (la première arrivée gagne). Une carte
 * demandée avant son illustration est générée sur place, comme avant. Sans Worker ni
 * OffscreenCanvas, rien ne change.
 *
 * Contrôle QA (`?qa=1&artCheck=1`) : chaque illustration du worker est comparée à une génération
 * synchrone de la page ; les écarts sont comptés (`__lqv.artWarm()`).
 */
import { adoptCardArt, cardArtVersion, paintCardArtUrl } from './cardArt';

export interface ArtWarmStats {
  seed: number | null;
  /** Illustrations reçues du worker. */
  received: number;
  /** Retenues dans le cache (les autres avaient déjà été générées sur place). */
  adopted: number;
  done: boolean;
  failed: boolean;
  /** Mode `artCheck` : illustrations comparées à la génération synchrone, et écarts. */
  checked: number;
  mismatches: string[];
}

let worker: Worker | null = null;
let stats: ArtWarmStats = { seed: null, received: 0, adopted: 0, done: false, failed: false, checked: 0, mismatches: [] };

export function artWarmStats(): ArtWarmStats {
  return { ...stats, mismatches: [...stats.mismatches] };
}

/**
 * M07 L4 : images déjà DÉCODÉES avant leur première apparition. Le premier écran qui montre beaucoup de
 * cartes (deck, collection) décodait ses illustrations en plein changement d’écran (à-coups mesurés sur le
 * GPU intégré). `decode()` travaille hors du fil principal ; les images sont gardées pour que le navigateur
 * réutilise leur décodage. Par petits lots, aux temps morts.
 */
const decoded: HTMLImageElement[] = [];
export function predecode(urls: readonly string[]): void {
  if (typeof Image === 'undefined') return;
  const queue = urls.filter((u) => !decoded.some((i) => i.src === u));
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 50));
  const step = () => {
    for (const u of queue.splice(0, 6)) {
      const img = new Image();
      img.src = u;
      img.decode().catch(() => {});
      decoded.push(img);
    }
    if (queue.length) idle(step);
  };
  idle(step);
}

/** Lance la pré-génération pour cette graine d’art (sans effet si elle est déjà lancée). */
export function warmCardArt(artSeed: number, check = false): void {
  if (stats.seed === artSeed) return;
  worker?.terminate();
  worker = null;
  stats = { seed: artSeed, received: 0, adopted: 0, done: false, failed: false, checked: 0, mismatches: [] };
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') { stats.failed = true; return; }
  const own = stats;
  let w: Worker;
  try {
    w = new Worker(new URL('./cardArtWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    own.failed = true;
    return;
  }
  worker = w;
  const urls: string[] = [];
  const stop =() => { w.terminate(); if (worker === w) worker = null; };
  w.onmessage = (e: MessageEvent<{ key: string; defId: string; url: string } | { done: true }>) => {
    const m = e.data;
    if ('done' in m) { own.done = true; stop(); predecode(urls); return; }
    own.received++;
    urls.push(m.url);
    if (adoptCardArt(m.key, m.url)) own.adopted++;
    if (check) {
      own.checked++;
      if (paintCardArtUrl(m.defId, artSeed) !== m.url) own.mismatches.push(m.defId);
    }
  };
  // Repli : les illustrations manquantes seront générées sur place, comme avant.
  w.onerror = () => { own.failed = true; stop(); };
  w.postMessage({ artSeed, version: cardArtVersion() });
}
