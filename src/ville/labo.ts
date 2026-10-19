/**
 * M09 V1 — laboratoire de la ville (`?ville=1`), à part du jeu : l'îlot du Quai en frontale 2.5D (décision du
 * responsable), le duelliste qui marche, les PNJ. Chargé à la demande (import dynamique) : le jeu par défaut ne change
 * pas. Crochets de QA (`qa=1`) : `window.__lqvVille` (position, mesures).
 */
import type { Family } from '../game/catalog/cards';
import { CAMERA_IDS, RIGS, parseRig, type CameraId } from './cameras';
import type { Zone } from './monde';
import { installVilleStyles, promptBubble, toast } from './ui';
import { createTown, type Town } from './ville';
import { isIlotId, type IlotId } from './ilots';
import { recolorTargets, walkerAtlasCanvas, walkerAtlasCanvasFor } from './sprites';
import { spritePolicy, type RecolorSlot } from './spritesExternes';
import { decorPolicy, preloadDecors } from './decors';

export interface LabParams { artSeed: number; qa: boolean; freeze: boolean; reducedMotion: boolean; sig: Family | null }

export async function startLab(p: LabParams, q: URLSearchParams): Promise<Town> {
  installVilleStyles();
  document.title = 'Les Quatre Voies — laboratoire de la ville';
  const ilot: IlotId = isIlotId(q.get('ilot')) ? (q.get('ilot') as IlotId) : 'quai';
  const decors = decorPolicy(p.qa, q.get('decors'));
  // plans de décor de l'îlot de départ lus et décodés avant la ville (ADR 028) : diorama construit tout de suite
  await preloadDecors([ilot], decors);
  const host = document.createElement('div');
  host.className = 'ville-host';
  document.body.append(host);
  const cam: CameraId = 'frontale';
  const town = createTown({
    host, artSeed: p.artSeed, camera: cam, player: `player-${p.sig ?? 'Cendre'}`, spawn: q.get('spawn') ?? undefined,
    ilot,
    freeze: p.freeze, reducedMotion: p.reducedMotion, sprites: spritePolicy(p.qa, q.get('sprites')), decors, rig: parseRig(q.get('rig')),
    onInteract: (z: Zone) => toast(`Laboratoire : « ${z.label} » sera branché dans la démo (M09 V2).`),
  });
  const panel = document.createElement('div');
  panel.className = 'ville-panel';
  const title = document.createElement('div');
  title.className = 'ville-title';
  let titled = '';
  const setTitle = () => {
    if (titled === town.ilotId()) return;
    titled = town.ilotId();
    title.innerHTML = `<b>Laboratoire de la ville</b> — ${town.ilot.name}, la nuit <small>M09 V1 · prototype · caméra frontale 2.5D (décision du responsable)</small>`;
  };
  setTitle();
  const row = document.createElement('div');
  row.className = 'ville-cams';
  row.setAttribute('role', 'radiogroup');
  row.setAttribute('aria-label', 'Caméra d’exploration');
  const buttons = CAMERA_IDS.map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ville-btn';
    b.dataset.key = `vcam-${id}`;
    b.textContent = RIGS[id].label;
    b.onclick = () => setCam(id);
    row.append(b);
    return b;
  });
  const help = document.createElement('div');
  help.className = 'ville-help';
  help.textContent = 'ZQSD / WASD ou flèches : marcher · Maj : pas lent · clic au sol : y aller · E : interagir';
  const stats = document.createElement('div');
  stats.className = 'ville-stats';
  panel.append(title, ...(CAMERA_IDS.length > 1 ? [row] : []), help, ...(p.qa ? [stats] : []));
  document.body.append(panel);
  const setCam = (id: CameraId) => {
    town.setCamera(id);
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(CAMERA_IDS[i] === id)));
    const u = new URL(location.href);
    u.searchParams.set('vcam', id);
    history.replaceState(null, '', u);
  };
  setCam(cam);
  const bubble = promptBubble(town);
  let intervals: number[] = [];
  let lastT = performance.now();
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    intervals.push(now - lastT);
    lastT = now;
    if (intervals.length > 120) intervals = intervals.slice(-120);
    bubble.update();
    setTitle();
    if (p.qa && town.stats().frames % 15 === 0) {
      const s = town.stats();
      const sorted = [...intervals].sort((a, b) => a - b);
      stats.textContent = `${s.camera} · ${s.calls} appels · ${Math.round(s.triangles / 1000)} k triangles · ${s.textures} textures · ${s.programs} programmes · rendu ${s.cpuMs} ms (processeur) · intervalle médian ${Math.round(sorted[sorted.length >> 1] ?? 0)} ms`;
    }
  };
  requestAnimationFrame(loop);
  // Crochets de QA publiés une fois les feuilles de personnages de l'îlot décidées (une capture ne les voit jamais en
  // attente). `atlasAt` : atlas à une autre échelle, au besoin en tons clés (preuves du contrat v2, ADR 027).
  if (p.qa) {
    void town.ready().then(() => {
      (window as unknown as Record<string, unknown>).__lqvVille = {
        town, setCam, intervals: () => [...intervals], atlas: (id: string) => walkerAtlasCanvas(id).toDataURL('image/png'),
        atlasAt: (id: string, scale: number, keyed: RecolorSlot[] = []) => walkerAtlasCanvasFor(id, { scale, keyed }).toDataURL('image/png'),
        // couleurs cibles de la recoloration d'un personnage (preuve de l'exactitude en pixel art, ADR 028)
        targets: (id: string) => recolorTargets(id),
      };
    });
  }
  return town;
}
