/**
 * M09 — la ville d'exploration : rendu de l'îlot, personnage du joueur au clavier et à la souris, PNJ, bulles
 * d'interaction. Indépendante du produit : elle signale les interactions (`onInteract`) et c'est l'appelant qui décide
 * (laboratoire de caméra en V1, démo jouable en V2). Caméra derrière l'interface `CameraRig` (cameras.ts).
 *
 * Post-traitement en trois passes, à la manière de l'arène (ADR 019) et de Cité du Tournoi (`PostFX.ts`) : scène HDR
 * linéaire → halo des lanternes à demi-définition → finition (flou de bascule « miniature » au-dessus et au-dessous du
 * personnage, étalonnage ombres froides / hautes lumières chaudes, vignettage, ACES, sRGB) en une seule passe.
 * Îlots à l'encre (direction D, ADR 026) : passe d'encre puis, si l'îlot le demande (passe 47), flou de profondeur à la
 * place du flou de bascule ; reflet plan de la rue rendu avant la scène (`reflets.ts`) pour les flaques et le port.
 * M09 V4 (ADR 028) : un îlot dont le diorama de plans peints est admis (`decors.ts`) est construit en diorama
 * (`diorama.ts`) au lieu de son décor par code ; la décision est prise avant la construction, les plans décodés et envoyés
 * au GPU avant l'entrée (derrière le fondu de la démo), l'image retenue tant qu'elle attend ; sans diorama admis, l'îlot
 * garde son décor par code. Diorama : pas d'encre ni de papier, la passe d'encre ne fait que porter la profondeur au flou.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { cadrageSujets, createRig, RIGS, type CameraId, type CameraRig, type RigParams, type RigTuning } from './cameras';
import { createDecorResolver, type DecorCamera, type DecorReport, type DecorState } from './decors';
import { buildDiorama } from './diorama';
import { ilotDef, type IlotDef, type IlotId, type Passer } from './ilots';
import { activeZone, nearestFree, newWalker, stepWalker, type Facing, type Ilot, type Vec2, type Walker, type Zone } from './monde';
import type { IlotNpc } from './quai';
import { U } from './materiaux';
import { LAYER_NOREFLECT, PlanarReflection } from './reflets';
import type { QuaiScene } from './scene';
import { WALKER_H, createWalkerSprite, recolorTargets, type WalkerSprite } from './sprites';
import { createSheetResolver, type ExternalReport, type SheetSpec, type SpritePolicy } from './spritesExternes';

export interface TownOptions {
  host: HTMLElement;
  artSeed: number;
  camera: CameraId;
  /** Identifiant du personnage joueur (`player-<Famille>`). */
  player: string;
  /** Îlot de départ (défaut : le Quai) et point d'apparition (clé de ses `spawns`). */
  ilot?: IlotId;
  spawn?: string;
  /** Captures : temps figé, aucune animation. */
  freeze?: boolean;
  reducedMotion?: boolean;
  /** Interaction demandée (E / Entrée / clic sur la bulle) dans une zone. */
  onInteract?: (zone: Zone) => void;
  /** Touche Échap (menu). */
  onMenu?: () => void;
  /**
   * Feuilles de personnages (ADR 027, `spritePolicy`) :`approuvees` (défaut, jeu) n'accepte que les feuilles approuvées
   * du manifeste, `qa` aussi les autres (signalées), `code` garde l'atlas dessiné par code.
   */
  sprites?: SpritePolicy;
  /**
   * Plans de décor (ADR 028, `decorPolicy`) : `approuvees` (défaut, jeu) n'accepte que les dioramas dont tous les plans
   * sont approuvés, `qa` aussi les autres (signalés), `code` garde le décor par code.
   */
  decors?: SpritePolicy;
  /** Réglages de cadrage pris dans l'URL (`rig=…`, `parseRig`), par-dessus ceux de l'îlot : ajustement à l'œil (fiche B1). */
  rig?: RigTuning | null;
  /** Îlot de départ remplacé (passe 62, laboratoire : le Quai profond, `?profondeur=1`). */
  ilotDef?: IlotDef;
  /**
   * M10-B (prototype `?aventure=1`) : définition de chaque îlot lue à chaque montage (personnages posés selon la
   * progression) ; `undefined` = celle du registre. Absent : comportement inchangé (démo, laboratoire).
   */
  ilotDefOf?: (id: IlotId) => IlotDef | undefined;
  /** Manifeste des plans lu dans `decors/` (passe 62, laboratoire : `manifest-profondeur.json`). */
  decorsManifest?: string;
}

/**
 * Cadrage d'une cinématique (M11) : point visé, et réglages relatifs à ceux de l'îlot : `zoom` multiplie la distance
 * (moins de 1 : plus près), `hauteur` s'ajoute à la hauteur visée (m), `followZ` remplace la part de profondeur suivie,
 * `tau` la constante de l'amorti (s). `sujets` : des personnages à cadrer (`cadrageSujets`) ; le point visé, la distance
 * et la hauteur en découlent (`serre` : plus serré au-dessus de 1).
 */
export interface Cadrage { at: Vec2; zoom?: number; hauteur?: number; followZ?: number; tau?: number; sujets?: readonly Vec2[]; serre?: number }

export interface TownStats {
  camera: CameraId;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
  lights: number;
  cpuMs: number;
  frames: number;
  buildMs: number;
  /** Première entrée : de la création de la ville à sa première image (feuilles préparées comprises). */
  firstFrameMs: number | null;
  /** Dernier changement d'îlot (`goTo`) : construction, puis jusqu'à la première image qui suit. */
  mountMs: number | null;
  mountFrameMs: number | null;
}

export interface Town {
  /** Îlot courant (plan pur). */
  readonly ilot: Ilot;
  ilotId(): IlotId;
  /** Change d'îlot (un seul en mémoire) et place le joueur à un point d'apparition. */
  goTo(id: IlotId, spawn: string): void;
  setCamera(id: CameraId): void;
  camera(): CameraId;
  /** Place le joueur (téléportation, caméra sans amorti). */
  place(at: Vec2, facing?: Facing): void;
  walker(): Walker;
  zone(): Zone | null;
  /** Suspend la boucle (pendant un duel) / la reprend. */
  setPaused(p: boolean): void;
  /** Bloque les entrées du joueur (dialogue ouvert). */
  setInputLocked(l: boolean): void;
  stats(): TownStats;
  /**
   * Feuilles de personnages : politique, personnages dessinés par une feuille (dont non approuvées, en QA), refus motivés ;
   * `hiddenFrames` : images rendues alors qu'un personnage attendait encore sa feuille (0 attendu : préparation avant).
   */
  externalReport(): ExternalReport & { hiddenFrames: number };
  /**
   * Plans de décor (ADR 028) : politique, îlots en diorama, plans non approuvés (QA), refus motivés, temps et mémoire GPU ;
   * `world` : décor de l'îlot courant ; `pendingFrames` : images rendues alors que la décision du décor attendait encore
   * (0 attendu) ; `late` : dioramas prêts après le délai, l'îlot ayant déjà été montré avec son décor par code.
   */
  decorReport(): DecorReport & { ilot: IlotId; world: 'code' | 'diorama'; pendingFrames: number; late: string[] };
  /**
   * Prépare les feuilles des personnages d'un îlot et son diorama (décodage, envoi au GPU) avant d'y entrer, derrière
   * le fondu (C3, ADR 027 ; ADR 028) ; résolu quand chacun est prêt ou refusé.
   */
  prepare(id: IlotId): Promise<void>;
  /** Les feuilles et le décor de cet îlot sont-ils déjà décidés (prêts ou refusés) ? Alors `goTo` n'attend rien. */
  isPrepared(id: IlotId): boolean;
  /** Résolu quand aucun personnage de l'îlot courant n'attend plus sa feuille ni l'îlot son décor (crochets de QA). */
  ready(): Promise<void>;
  /** Rend une image tout de suite (captures en temps figé). */
  renderNow(): void;
  /** Repères au-dessus des personnages de l'îlot (« ! » : un défi à relever ; « ? » : quelqu'un à écouter). */
  setMarkers(m: Readonly<Record<string, '!' | '?' | 'vu' | null>>): void;
  /**
   * M11-A (rencontres en vue, rival) : fait marcher un personnage de l'îlot (identifiant de personnalité) jusqu'à `to`, à
   * `speed` m/s, puis le tourne vers `face` ; résolu à l'arrivée (tout de suite en temps figé ou mouvement réduit). La
   * logique (où, quand) est dans l'appelant ; un remontage de l'îlot remet chacun à sa place.
   */
  walkNpc(id: string, to: Vec2, speed: number, face: Facing): Promise<void>;
  /** Position courante d'un personnage de l'îlot (QA, M11-A) ; null s'il n'y est pas. */
  npcAt(id: string): Vec2 | null;
  /** Hauteur des personnages dans l'îlot courant (m), pour placer les bulles au-dessus des têtes. */
  walkerH(): number;
  /**
   * M11 (cinématiques, `docs/m11/07_CINEMATIQUES.md`) : la caméra vise `c.at` au lieu du joueur, avec ses réglages ;
   * `snap` : coupe franche, sinon mouvement amorti (constante `c.tau`). `null` : la caméra revient au joueur (amortie,
   * ou coupe avec `snap`). Un changement d'îlot l'annule.
   */
  cadrer(c: Cadrage | null, snap?: boolean): void;
  /** Réglages de la caméra de l'îlot courant (bornes du point visé comprises), pour composer une cinématique. */
  cameraParams(): Readonly<RigParams>;
  /** Position écran (px CSS) d'un point du monde, pour les bulles DOM. */
  project(p: { x: number; y: number; z: number }): { x: number; y: number; visible: boolean };
  dispose(): void;
}

const FINISH_VERT = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
attribute vec3 position; attribute vec2 uv; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FINISH_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uAspect; uniform float uTilt; uniform float uFocusY; uniform float uFocusW;
uniform float uPaper;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  // Flou de bascule (miniature HD-2D) : net autour du personnage, flou croissant vers le haut et le bas du cadre.
  float amt = smoothstep(uFocusW, uFocusW + 0.32, abs(vUv.y - uFocusY)) * uTilt;
  if (amt > 0.02) {
    vec3 acc = c; float n = 1.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 2.39996; float r = sqrt((float(i) + 0.5) / 12.0);
      acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * amt * 6.5 * uTexel).rgb; n += 1.0;
    }
    c = acc / n;
  }
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // direction D : couleurs de joaillerie un peu plus franches (vitraux, lanternes des familles)
  if (uPaper > 0.0) c = max(mix(vec3(l), c, 1.14), 0.0);
  c = mix(c, c * vec3(0.92, 0.98, 1.22), (1.0 - smoothstep(0.0, 0.2, l)) * 0.6);
  c *= mix(vec3(1.0), vec3(1.07, 1.0, 0.9), smoothstep(0.25, 1.2, l));
  c += vec3(0.005, 0.008, 0.017) * (1.0 - smoothstep(0.0, 0.08, l));
  vec2 p = (vUv - vec2(0.5, 0.5)) * vec2(uAspect, 1.0);
  float r = length(p) / length(vec2(uAspect * 0.5, 0.5));
  c *= 1.0 - smoothstep(0.45, 1.05, r) * 0.42;
  if (uPaper > 0.0) {
    // grain de papier (direction D) : fibres fines et ondulation douce, fixes à l'écran comme le support d'une carte
    vec2 px = vUv / uTexel;
    float h = fract(sin(dot(floor(px), vec2(12.9898, 78.233))) * 43758.5453);
    float fib = sin(px.x * 0.37 + sin(px.y * 0.051) * 4.0) * 0.5 + 0.5;
    c *= 1.0 - uPaper * (0.035 * h + 0.025 * fib);
  }
  gl_FragColor = vec4(ACESFilmicToneMapping(c), 1.0);
  gl_FragColor = sRGBTransferOETF(gl_FragColor);
}`;

/**
 * M09 V3, direction D (« décor encré comme une illustration de carte », ADR 026) : contours à l'encre tirés de la
 * profondeur, avant le halo et le flou de bascule (les traits se fondent dans le flou comme le reste de l'image).
 * La profondeur 1/z est linéaire à l'écran sur un plan : son laplacien relatif est nul sur une surface plane et marque
 * les plis et les marches (poutres en saillie de 9 cm, encadrements, rives de toit) ; un saut relatif marque les
 * silhouettes (bâtiments sur le ciel, personnages). Traits plus légers au loin (ville haute).
 */
const INK_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 uTexel; uniform float uNear; uniform float uFar;
uniform float uInk; uniform vec3 uInkColor; uniform vec4 uInkEdge; uniform float uInkW;
varying vec2 vUv;
float invZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return (uFar - (uFar - uNear) * d) / (uNear * uFar); }
float edgeAt(vec2 uv, vec2 o, float w0){
  float wl = invZ(uv - vec2(o.x, 0.0)), wr = invZ(uv + vec2(o.x, 0.0));
  float wd = invZ(uv - vec2(0.0, o.y)), wu = invZ(uv + vec2(0.0, o.y));
  float lap = abs(wl + wr + wd + wu - 4.0 * w0) / w0;
  float jump = max(max(abs(wl - w0), abs(wr - w0)), max(abs(wd - w0), abs(wu - w0))) / w0;
  return max(smoothstep(uInkEdge.x, uInkEdge.y, lap), smoothstep(uInkEdge.z, uInkEdge.w, jump));
}
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float w0 = invZ(vUv);
  // trait d'environ deux pixels à 1280 × 720, trois à 1920 × 1080 : deux voisinages, le plus marqué l'emporte
  float e = max(edgeAt(vUv, uTexel, w0), 0.8 * edgeAt(vUv, uTexel * uInkW, w0));
  float z = 1.0 / max(w0, 1e-6);
  e *= 1.0 - smoothstep(30.0, 110.0, z) * 0.55;
  // la profondeur de vue (m) passe au flou de profondeur dans l'alpha (la passe suivante ne peut pas relire la texture
  // de profondeur : elle est attachée au tampon qu'elle écrit)
  gl_FragColor = vec4(mix(c, uInkColor, e * uInk), z);
}`;

/**
 * M09 V3 (passe 47) : flou de profondeur, adapté de Cité du Tournoi (RPG-ArtByCode, lecture seule, `src/atmosphere/PostFX.ts`
 * L. 35-80) : cercle de confusion tiré de la profondeur (alpha écrit par la passe d'encre), nul dans la bande jouable,
 * croissant au premier plan (eau, bateaux) et au loin (ville haute, atténué) ; 24 échantillons en spirale d'or, une
 * contribution par échantillon qui l'atteint (son propre cercle couvre la distance), les plus lointains ne bavent pas
 * sur un centre plus proche et plus net ; les points lumineux pèsent davantage (bokeh des lanternes).
 */
const DOF_VERT = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
in vec3 position; in vec2 uv; out vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// GLSL 3 : lectures à niveau fixe (textureLod) dans la boucle ; avec texture2D, le compilateur D3D signalait des
// dérivées indéfinies (boucle après un retour anticipé, avertissement X3595).
const DOF_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform vec4 uBand; uniform float uFarAmt; uniform float uMaxBlur;
in vec2 vUv; out vec4 fragColor;
float coc(float z){
  return max(1.0 - smoothstep(uBand.y, uBand.x, z), smoothstep(uBand.z, uBand.w, z) * uFarAmt);
}
void main(){
  vec4 base = textureLod(tDiffuse, vUv, 0.0);
  float z0 = base.a;
  float c0 = coc(z0);
  float rad = c0 * uMaxBlur;
  if (rad < 0.35) { fragColor = vec4(base.rgb, 1.0); return; }
  vec3 acc = base.rgb; float wsum = 1.0;
  for (int i = 0; i < 24; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / 24.0);
    float a = fi * 2.3999632;
    vec4 sc = textureLod(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * rad * uTexel, 0.0);
    float rs = coc(sc.a) * uMaxBlur;
    float dist = r * rad;
    float reach = smoothstep(dist - 1.2, dist + 0.6, rs);
    float behind = sc.a > z0 + 1.5 ? smoothstep(0.0, 1.0, c0 * 2.0) : 1.0;
    float lum = dot(sc.rgb, vec3(0.3, 0.55, 0.15));
    float w = reach * behind * (1.0 + smoothstep(1.2, 5.0, lum) * 1.6);
    acc += sc.rgb * w; wsum += w;
  }
  fragColor = vec4(acc / wsum, 1.0);
}`;

/** Passe d'encre : lit la profondeur du tampon où la scène vient d'être rendue (les tampons du compositeur alternent). */
class InkPass extends ShaderPass {
  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
    this.uniforms.tDepth!.value = readBuffer.depthTexture;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}

/** Flou de bascule par caméra (discret en frontale : surtout le haut des façades et le premier plan). */
const TILT: Record<CameraId, { amount: number; width: number }> = { frontale: { amount: 0.55, width: 0.24 } };

export function createTown(o: TownOptions): Town {
  const t0 = performance.now();
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.domElement.className = 'ville-canvas';
  o.host.appendChild(renderer.domElement);

  // îlot de départ remplacé (passe 62 : Quai profond du laboratoire, `?profondeur=1`) ; les voisins restent ceux du registre
  const defOf = (id: IlotId): IlotDef => o.ilotDefOf?.(id) ?? (o.ilotDef && o.ilotDef.id === id ? o.ilotDef : ilotDef(id, false));
  let def: IlotDef = o.ilotDef ?? defOf(o.ilot ?? 'quai');
  // Feuilles de personnages (ADR 027) : lecture du manifeste et décodage lancés avant la construction de l'îlot (le
  // réseau et le décodeur avancent pendant qu'elle occupe le fil principal) ; envoi au GPU dès qu'une feuille est prête.
  const sheets = createSheetResolver(o.sprites ?? 'approuvees', (t) => renderer.initTexture(t), {
    check: (id: string, spec: SheetSpec) => {
      const targets = recolorTargets(id);
      return spec.recolor.filter((s) => !targets[s]).map((s) => `${id} : teinte « ${s} » sans couleur cible pour ce personnage`);
    },
  });
  const castOf = (d: IlotDef) => [o.player, ...d.npcs.map((n) => n.id), ...d.ambient.map((a) => a.id)];
  void sheets.prepare(castOf(def));
  // Plans de décor (ADR 028) : décision immédiate si le manifeste est déjà lu et les plans décodés (`preloadDecors`,
  // laboratoire et démo), sinon décor par code construit tout de suite et image retenue jusqu'à la décision (au plus
  // `HOLD_MS`) : un diorama admis le remplace alors avant la première image.
  const decors = createDecorResolver(o.decors ?? 'approuvees', (t) => renderer.initTexture(t), { manifest: o.decorsManifest });
  void decors.prepare(def.id);
  let worldKind: 'code' | 'diorama' = 'code';
  /** Cadrage déclaré par le diorama monté (passe 60 : cadrage élargi de la porte), null pour le décor par code. */
  let dioramaCamera: DecorCamera | null = null;
  const buildWorld = (d: IlotDef, st: DecorState): QuaiScene => {
    worldKind = st.state === 'diorama' ? 'diorama' : 'code';
    dioramaCamera = st.state === 'diorama' ? st.diorama.camera : null;
    return st.state === 'diorama' ? buildDiorama(d, st.diorama, o.artSeed) : d.build(o.artSeed);
  };
  const decorAtStart = decors.peek(def.id);
  let world: QuaiScene = buildWorld(def, decorAtStart);
  let scene = world.scene;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 400);
  // la caméra principale voit aussi ce que le reflet ne montre pas (sol, eau, brumes)
  camera.layers.enable(LAYER_NOREFLECT);
  const refl = new PlanarReflection();
  /** Cadrage de l'îlot : celui du diorama s'il en déclare un (passe 60), sinon celui de l'îlot ; l'URL l'emporte. */
  const rigOf = (id: CameraId): CameraRig => {
    const c = worldKind === 'diorama' ? dioramaCamera : null;
    if (!c) return createRig(id, def.camera, def.rig, o.rig);
    const { minX, maxX, ...tuning } = c;
    return createRig(id, { minX: minX ?? def.camera.minX, maxX: maxX ?? def.camera.maxX }, def.rig, tuning, o.rig);
  };
  let rig: CameraRig = rigOf(o.camera);
  const walkerH = () => def.walkerH ?? WALKER_H;
  const markerY = () => walkerH() + 0.53;

  // --- personnages ---
  // Un personnage dont la feuille est encore en attente reste caché, et l'image n'est pas rendue tant qu'il y en a un
  // (au plus `HOLD_MS`) : jamais de bascule visible du dessin par code vers la feuille (C3).
  const pending = new Map<WalkerSprite, string>();
  let pendingSince = 0;
  let hiddenFrames = 0;
  // décor de l'îlot courant pas encore décidé (manifeste ou plans en cours) : image retenue, comme pour les feuilles
  let decorPending = decorAtStart.state === 'attente';
  let decorSince = performance.now();
  let decorPendingFrames = 0;
  /** Images rendues depuis l'entrée dans l'îlot courant (un diorama prêt trop tard ne remplace plus un décor déjà vu). */
  let visitFrames = 0;
  const decorLate: string[] = [];
  const waiters: (() => void)[] = [];
  const flush = () => { if (!pending.size && !decorPending) for (const f of waiters.splice(0)) f(); };
  const applySheet = (id: string, s: WalkerSprite) => {
    const st = sheets.peek(id);
    if (st.state === 'prete') { s.setSheet(st.sheet); s.group.visible = true; return; }
    if (st.state === 'code') { s.group.visible = true; return; }
    if (!pending.size) pendingSince = performance.now();
    pending.set(s, id);
    s.group.visible = false;
    void sheets.prepare([id]).then(() => {
      if (pending.get(s) !== id) return;
      pending.delete(s);
      applySheet(id, s);
      flush();
    });
  };
  const playerSprite: WalkerSprite = createWalkerSprite(o.player);
  playerSprite.setHeight(walkerH());
  scene.add(playerSprite.group);
  applySheet(o.player, playerSprite);
  type NpcSprite = { n: IlotNpc; s: WalkerSprite; marker: THREE.Mesh; kind: '!' | '?' | 'vu' | null };
  /** M11-A : personnages déplacés (approche) : position, regard, marche en cours ; gardés si le décor remonte l'îlot
   *  (diorama décidé après coup), effacés à un changement d'îlot (`goTo`). */
  const npcState = new Map<string, { pos: Vec2; face?: Facing; walk?: { to: Vec2; speed: number; face: Facing; phase: number; done: () => void } }>();
  const makeNpcs = (): NpcSprite[] => def.npcs.map((n) => {
    const s = createWalkerSprite(n.id);
    s.setHeight(walkerH());
    scene.add(s.group);
    s.set(n.at, n.facing, 0, false, 0);
    applySheet(n.id, s);
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshBasicMaterial({ map: markerTexture('!'), transparent: true, depthWrite: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
    marker.position.set(n.at.x, markerY(), n.at.z + 0.02);
    marker.visible = false;
    marker.renderOrder = 3;
    scene.add(marker);
    return { n, s, marker, kind: null };
  });
  // Passants : va-et-vient sur une ligne z, déterministe (figé avec `freeze`) ; ils s'arrêtent si le joueur est juste
  // devant eux (pas d'obstacle dynamique dans la logique pure : on ne traverse pas, on attend).
  type PasserSprite = { a: Passer; s: WalkerSprite; x: number; dir: 1 | -1; phase: number; blocked: boolean };
  const makePassers = (): PasserSprite[] => def.ambient.map((a) => {
    const s = createWalkerSprite(a.id);
    s.setHeight(walkerH());
    scene.add(s.group);
    applySheet(a.id, s);
    return { a, s, x: a.x0 + (a.phase ?? 0) * (a.x1 - a.x0), dir: 1, phase: 0, blocked: false };
  });
  let npcSprites = makeNpcs();
  let passers = makePassers();
  const spawn = def.ilot.spawns[o.spawn ?? 'arrivee'] ?? def.ilot.spawns.arrivee!;
  let walker = newWalker(spawn, spawn.face ?? 'face');

  // --- post-traitement ---
  // Cible avec texture de profondeur (passe d'encre) ; le compositeur la clone pour son second tampon.
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  sceneTarget.depthTexture = new THREE.DepthTexture(1, 1);
  const composer = new EffectComposer(renderer, sceneTarget);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const ink = new InkPass(new THREE.RawShaderMaterial({
    name: 'VilleEncre',
    uniforms: {
      tDiffuse: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2() }, uNear: { value: 0.5 }, uFar: { value: 400 },
      uInk: { value: 0.92 }, uInkColor: { value: new THREE.Color(0.005, 0.006, 0.018) }, uInkEdge: { value: new THREE.Vector4(0.0008, 0.003, 0.008, 0.025) }, uInkW: { value: 2 },
    },
    vertexShader: FINISH_VERT,
    fragmentShader: INK_FRAG,
  }));
  composer.addPass(ink);
  const dof = new ShaderPass(new THREE.RawShaderMaterial({
    name: 'VilleFlou',
    uniforms: {
      tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uBand: { value: new THREE.Vector4(10, 7, 30, 75) }, uFarAmt: { value: 0.5 }, uMaxBlur: { value: 0 },
    },
    vertexShader: DOF_VERT,
    fragmentShader: DOF_FRAG,
    glslVersion: THREE.GLSL3,
  }));
  composer.addPass(dof);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.55, 0.92);
  const bloomSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w: number, h: number) => bloomSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
  composer.addPass(bloom);
  const finish = new ShaderPass(new THREE.RawShaderMaterial({
    name: 'VilleFinition',
    uniforms: {
      tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uAspect: { value: 16 / 9 }, toneMappingExposure: { value: 1.05 },
      uTilt: { value: 1 }, uFocusY: { value: 0.45 }, uFocusW: { value: 0.16 }, uPaper: { value: 0 },
    },
    defines: { ACES_FILMIC_TONE_MAPPING: '', SRGB_TRANSFER: '' },
    vertexShader: FINISH_VERT,
    fragmentShader: FINISH_FRAG,
  }));
  composer.addPass(finish);

  const applyRig = () => {
    // diorama (ADR 028) : ni encre ni papier ; la passe d'encre, à force nulle, ne fait que porter la profondeur au flou
    const peint = worldKind === 'diorama';
    const encre = def.style === 'encre' && !peint;
    ink.enabled = encre || peint;
    ink.uniforms.uInk!.value = peint ? 0 : 0.92;
    // le flou de profondeur lit la profondeur écrite par la passe d'encre ; il remplace alors le flou de bascule
    dof.enabled = (encre || peint) && !!def.dof;
    finish.uniforms.uPaper!.value = encre ? 1 : 0;
    finish.uniforms.toneMappingExposure!.value = encre ? 1.22 : 1.05;
    if (def.reflets) U.uReflProxy.value.set(def.reflets.proxyZ, def.reflets.proxyY);
    else U.uReflReady.value = 0;
    const tl = TILT[rig.params.id];
    finish.uniforms.uTilt!.value = dof.enabled ? 0 : tl.amount;
    finish.uniforms.uFocusW!.value = tl.width;
    playerSprite.setTilt(rig.params.spriteTilt);
    for (const { s } of npcSprites) s.setTilt(rig.params.spriteTilt);
  };
  applyRig();

  const resize = () => {
    const w = Math.max(1, o.host.clientWidth || window.innerWidth);
    const h = Math.max(1, o.host.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    composer.setSize(w, h);
    (finish.uniforms.uTexel!.value as THREE.Vector2).set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
    finish.uniforms.uAspect!.value = w / h;
    rig.resize(camera, w / h);
    (ink.uniforms.uTexel!.value as THREE.Vector2).set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
    ink.uniforms.uInkW!.value = Math.max(1.5, (h * pixelRatio) / 540);
    ink.uniforms.uNear!.value = camera.near;
    ink.uniforms.uFar!.value = camera.far;
    (dof.uniforms.uTexel!.value as THREE.Vector2).set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
    dof.uniforms.uMaxBlur!.value = (def.dof?.maxBlur ?? 0) * ((h * pixelRatio) / 1080);
    refl.setSize(w * pixelRatio, h * pixelRatio);
  };
  window.addEventListener('resize', resize);
  resize();

  // --- entrées ---
  const keys = new Set<string>();
  let locked = false;
  let target: Vec2 | null = null;
  // M11 (cinématiques) : la caméra vise ce cadrage au lieu du joueur ; coupe franche à la prochaine image si `coupe`
  let cadrage: Cadrage | null = null;
  let coupe = false;
  const surSujets = () => (cadrage?.sujets?.length
    ? cadrageSujets(cadrage.sujets, { h: walkerH(), fov: rig.params.fov, aspect: camera.aspect, serre: (cadrage.serre ?? 1) / (cadrage.zoom ?? 1) })
    : null);
  const camAt = (): Vec2 => surSujets()?.at ?? cadrage?.at ?? walker.pos;
  const camTuning = (): Partial<RigParams> | undefined => {
    if (!cadrage) return undefined;
    const p = rig.params;
    const s = surSujets();
    if (s) {
      // des personnages cadrés : les bornes du point visé s'écartent de ce que la caméra rapprochée ne voit plus
      const m = Math.max(0, p.distance - s.distance) * Math.tan(THREE.MathUtils.degToRad(p.fov / 2)) * camera.aspect;
      return { minX: Math.min(p.minX - m, (p.minX + p.maxX) / 2), maxX: Math.max(p.maxX + m, (p.minX + p.maxX) / 2), distance: s.distance, aimY: s.aimY, followZ: 1, ...(cadrage.tau !== undefined ? { tau: cadrage.tau } : {}) };
    }
    // plus près, le champ est plus étroit : les bornes du point visé s'écartent d'autant (le bord du décor visible ne
    // change pas) ; plus loin, elles se resserrent
    const marge = cadrage.zoom !== undefined ? (1 - cadrage.zoom) * p.distance * Math.tan(THREE.MathUtils.degToRad(p.fov / 2)) * camera.aspect : 0;
    return {
      ...(marge ? { minX: Math.min(p.minX - marge, (p.minX + p.maxX) / 2), maxX: Math.max(p.maxX + marge, (p.minX + p.maxX) / 2) } : {}),
      ...(cadrage.zoom !== undefined ? { distance: p.distance * cadrage.zoom } : {}),
      ...(cadrage.hauteur !== undefined ? { aimY: p.aimY + cadrage.hauteur } : {}),
      ...(cadrage.followZ !== undefined ? { followZ: cadrage.followZ } : {}),
      ...(cadrage.tau !== undefined ? { tau: cadrage.tau } : {}),
    };
  };
  const KEYMAP: Record<string, [number, number]> = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], KeyZ: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyQ: [-1, 0], KeyD: [1, 0],
  };
  const onKey = (e: KeyboardEvent) => {
    const down = e.type === 'keydown';
    // Ville en pause (préparation, duel, deck, options…) : ses raccourcis ne doivent rien faire par-dessus l'écran.
    if (paused) { keys.clear(); return; }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (KEYMAP[e.code] || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (down) keys.add(e.code); else keys.delete(e.code);
      if (down) { target = null; e.preventDefault(); }
      return;
    }
    if (!down) return;
    // Échap passe toujours (fermer un dialogue ouvert même si le focus est resté sur la scène).
    if (e.code === 'Escape') { o.onMenu?.(); return; }
    if (locked) return;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
      const z = activeZone(def.ilot, walker.pos);
      if (z) { e.preventDefault(); o.onInteract?.(z); }
    }
  };
  // Phase de capture : la ville voit la touche AVANT l'enveloppe (qui peut la remettre en marche en quittant un écran ;
  // sans cela, l'Échap qui ferme le deck rouvrait aussitôt le menu de la ville).
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  const blurAll = () => keys.clear();
  window.addEventListener('blur', blurAll);
  // Clic au sol : rayon de la caméra par le pixel (dé-projection), intersection avec le plan y = 0.
  const onClick = (e: PointerEvent) => {
    if (locked || e.button !== 0) return;
    const r = renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    const a = new THREE.Vector3(nx, ny, -1).unproject(camera);
    const b = new THREE.Vector3(nx, ny, 1).unproject(camera);
    if (Math.abs(b.y - a.y) < 1e-6) return;
    const t = a.y / (a.y - b.y);
    if (t < 0) return;
    const hit = a.clone().lerp(b, t);
    // Clic sur (ou tout près d') un PNJ : aller devant lui, puis l'interaction se propose.
    const npc = def.npcs.find((n) => Math.hypot(n.at.x - hit.x, n.at.z - hit.z) < 0.9);
    const want = npc ? { x: npc.at.x + (walker.pos.x < npc.at.x ? -0.9 : 0.9), z: npc.at.z + 0.2 } : { x: hit.x, z: hit.z };
    target = nearestFree(def.ilot, want);
  };
  renderer.domElement.addEventListener('pointerdown', onClick);

  // --- boucle ---
  let paused = false;
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let time = o.freeze ? 1 : 0;
  let frames = 0;
  let cpuMs = 0;
  const STEP = 1 / 60;
  const inputDir = (): Vec2 => {
    let x = 0;
    let z = 0;
    for (const k of keys) { const d = KEYMAP[k]; if (d) { x += d[0]; z += d[1]; } }
    return { x, z };
  };
  const focus = new THREE.Vector3();
  /** Profondeur de vue (m) d'un point du monde, à la verticale de la caméra. */
  const viewDepth = (y: number, z: number) => -focus.set(camera.position.x, y, z).applyMatrix4(camera.matrixWorldInverse).z;
  const render = () => {
    world.update(time);
    world.focus?.(walker.pos, !!o.freeze, camera.position);
    playerSprite.set(walker.pos, walker.facing, walker.phase, walker.moving, time);
    for (const e of npcSprites) {
      const { n, s } = e;
      // M11-A : un personnage qui marche (approche) suit sa position propre et son regard de marche
      const st = npcState.get(n.id);
      if (st?.walk) { s.set(st.pos, regard(st.pos, st.walk.to, st.walk.face), st.walk.phase, true, time); continue; }
      const at = st?.pos ?? n.at;
      if (st?.face) { s.set(at, st.face, 0, false, time + n.at.x); continue; }
      // Les PNJ se tournent vers le joueur quand il approche (à moins de 2,5 m).
      const d = Math.hypot(walker.pos.x - at.x, walker.pos.z - at.z);
      const face: Facing = d < 2.5 ? (Math.abs(walker.pos.x - at.x) > Math.abs(walker.pos.z - at.z) ? (walker.pos.x > at.x ? 'droite' : 'gauche') : walker.pos.z > at.z ? 'face' : 'dos') : n.facing;
      s.set(at, face, 0, false, time + n.at.x);
    }
    for (const e of npcSprites) if (e.marker.visible) {
      const at = npcState.get(e.n.id)?.pos ?? e.n.at;
      e.marker.position.set(at.x, markerY() + (e.kind === 'vu' ? 0.3 : o.freeze ? 0 : Math.sin(time * 2.4 + e.n.at.x) * 0.05), at.z + 0.02);
    }
    for (const p of passers) p.s.set({ x: p.x, z: p.a.z }, p.dir > 0 ? 'droite' : 'gauche', p.phase, !o.freeze && !p.blocked, time);
    focus.set(camAt().x, 0.9, camAt().z).project(camera);
    finish.uniforms.uFocusY!.value = THREE.MathUtils.clamp(focus.y * 0.5 + 0.5, 0.2, 0.8);
    if (dof.enabled && def.dof) {
      camera.updateMatrixWorld();
      const d = def.dof;
      // quartier en rangs (passe 65) : quand la caméra suit le personnage au-delà du bord net (nearZ derrière elle), le
      // flou de premier plan reste devant la caméra au lieu de tout couvrir
      const n0 = Math.max(viewDepth(0.3, d.nearZ), camera.near + d.nearSpan);
      const f0 = viewDepth(4, d.farZ);
      (dof.uniforms.uBand!.value as THREE.Vector4).set(n0, Math.max(camera.near, n0 - d.nearSpan), f0, f0 + d.farSpan);
      dof.uniforms.uFarAmt!.value = d.farAmt;
    }
    const c0 = performance.now();
    renderer.info.reset();
    if (def.reflets) refl.update(renderer, scene, camera);
    composer.render();
    cpuMs = performance.now() - c0;
    frames++;
    visitFrames++;
    if (pending.size) hiddenFrames++;
    if (decorPending) decorPendingFrames++;
    if (firstFrameMs === null) firstFrameMs = Math.round(performance.now() - t0);
    if (mountT0 !== null) { mountFrameMs = Math.round(performance.now() - mountT0); mountT0 = null; }
  };
  /** Feuilles ou décor en attente : l'image précédente reste (ou rien, à la première entrée), au plus `HOLD_MS`. */
  const HOLD_MS = 1500;
  const holding = () => (pending.size > 0 && performance.now() - pendingSince < HOLD_MS) || (decorPending && performance.now() - decorSince < HOLD_MS);
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (paused) { last = now; return; }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!o.freeze) {
      time += dt;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n++ < 6) {
        const dir = locked ? { x: 0, z: 0 } : inputDir();
        walker = stepWalker(def.ilot, walker, { dir, slow: keys.has('ShiftLeft') || keys.has('ShiftRight'), target: locked ? null : target }, STEP);
        if (target && !walker.moving && Math.hypot(target.x - walker.pos.x, target.z - walker.pos.z) < 0.15) target = null;
        for (const st of npcState.values()) {
          const w = st.walk;
          if (!w) continue;
          const dx = w.to.x - st.pos.x;
          const dz = w.to.z - st.pos.z;
          const dist = Math.hypot(dx, dz);
          const stepLen = w.speed * STEP;
          if (dist <= stepLen) { st.pos = { ...w.to }; st.face = w.face; st.walk = undefined; w.done(); continue; }
          st.pos = { x: st.pos.x + (dx / dist) * stepLen, z: st.pos.z + (dz / dist) * stepLen };
          w.phase = (w.phase + stepLen / 1.5) % 1;
        }
        for (const p of passers) {
          const ahead = (walker.pos.x - p.x) * p.dir;
          p.blocked = ahead > 0 && ahead < 1.1 && Math.abs(walker.pos.z - p.a.z) < 0.8;
          if (p.blocked) continue;
          p.x += p.dir * p.a.speed * STEP;
          p.phase = (p.phase + (p.a.speed * STEP) / 1.5) % 1;
          if (p.x > p.a.x1) { p.x = p.a.x1; p.dir = -1; }
          if (p.x < p.a.x0) { p.x = p.a.x0; p.dir = 1; }
        }
        acc -= STEP;
      }
      acc = Math.min(acc, STEP);
    }
    rig.update(camera, camAt(), dt, o.freeze || coupe, camTuning());
    coupe = false;
    if (holding()) return;
    render();
  };
  let firstFrameMs: number | null = null;
  let mountT0: number | null = null;
  let mountMs: number | null = null;
  let mountFrameMs: number | null = null;
  rig.update(camera, camAt(), 0, true, camTuning());
  raf = requestAnimationFrame(tick);
  const buildMs = Math.round(performance.now() - t0);

  /** Retire les personnages de l'îlot courant (le joueur reste, détaché), puis sa scène. */
  const unmountWorld = () => {
    scene.remove(playerSprite.group);
    for (const e of npcSprites) { pending.delete(e.s); e.s.dispose(); e.marker.geometry.dispose(); (e.marker.material as THREE.Material).dispose(); }
    for (const p of passers) { pending.delete(p.s); p.s.dispose(); }
    world.dispose();
  };
  /** Monte la scène de l'îlot `def` selon la décision de son décor, puis le joueur, les PNJ et les passants. */
  const mountWorld = (st: DecorState) => {
    world = buildWorld(def, st);
    scene = world.scene;
    renderPass.scene = scene;
    scene.add(playerSprite.group);
    playerSprite.setHeight(walkerH());
    npcSprites = makeNpcs();
    passers = makePassers();
  };
  /**
   * Décor de l'îlot courant pas encore décidé : image retenue (au plus `HOLD_MS`) ; à la décision, un diorama admis
   * remplace le décor par code s'il n'a pas encore été montré, sinon l'îlot le garde pour cette visite (rapporté).
   */
  const settleDecor = (id: IlotId) => {
    decorPending = true;
    decorSince = performance.now();
    void decors.prepare(id).then(() => {
      if (def.id !== id || !decorPending) return;
      decorPending = false;
      const st = decors.peek(id);
      if (st.state === 'diorama' && worldKind === 'code') {
        if (visitFrames === 0) {
          unmountWorld();
          mountWorld(st);
          rig = rigOf(rig.params.id);
          applyRig();
          resize();
          rig.update(camera, camAt(), 0, true, camTuning());
        } else decorLate.push(`${id} : diorama prêt après ${Math.round(performance.now() - decorSince)} ms, décor par code gardé pour cette visite`);
      }
      flush();
    });
  };

  /** Démonte l'îlot courant (personnages, passants, scène) et monte le suivant ; le renderer et le post-traitement restent. */
  const mount = (id: IlotId, spawnKey: string) => {
    const m0 = performance.now();
    // M11-A : un remontage remet chacun à sa place ; une marche en cours se termine (jamais de promesse en suspens)
    for (const st of npcState.values()) st.walk?.done();
    npcState.clear();
    mountT0 = m0;
    unmountWorld();
    const prev = def.id;
    def = defOf(id);
    // feuilles et diorama de l'îlot d'arrivée : déjà prêts si l'appelant les a préparés derrière le fondu (`prepare`)
    void sheets.prepare(castOf(def));
    const st = decors.peek(def.id);
    mountWorld(st);
    // les plans de l'îlot quitté sont libérés (un retour les prépare de nouveau)
    if (prev !== def.id) decors.release(prev);
    visitFrames = 0;
    decorPending = false;
    if (st.state === 'attente') settleDecor(def.id);
    const sp = def.ilot.spawns[spawnKey] ?? def.ilot.spawns.arrivee!;
    walker = newWalker(sp, sp.face ?? walker.facing);
    target = null;
    cadrage = null;
    keys.clear();
    rig = rigOf(rig.params.id);
    applyRig();
    resize();
    rig.update(camera, camAt(), 0, true, camTuning());
    mountMs = Math.round(performance.now() - m0);
    flush();
  };
  // première entrée sans décision du décor (manifeste pas encore lu) : décor par code construit, image retenue
  if (decorPending) settleDecor(def.id);

  return {
    get ilot() { return def.ilot; },
    ilotId: () => def.id,
    goTo: mount,
    setCamera(id) {
      rig = rigOf(id);
      applyRig();
      resize();
      rig.update(camera, camAt(), 0, true, camTuning());
    },
    camera: () => rig.params.id,
    place(at, facing) {
      walker = { ...newWalker(at, facing ?? walker.facing) };
      target = null;
      rig.update(camera, camAt(), 0, true, camTuning());
    },
    walker: () => walker,
    zone: () => activeZone(def.ilot, walker.pos),
    setPaused(p) { paused = p; renderer.domElement.style.visibility = p ? 'hidden' : 'visible'; keys.clear(); },
    setInputLocked(l) { locked = l; if (l) { keys.clear(); target = null; } },
    stats() {
      const info = renderer.info;
      return {
        camera: rig.params.id, calls: info.render.calls, triangles: info.render.triangles, textures: info.memory.textures,
        geometries: info.memory.geometries, programs: info.programs?.length ?? 0, lights: world.lights.length,
        cpuMs: Math.round(cpuMs * 10) / 10, frames, buildMs, firstFrameMs, mountMs, mountFrameMs,
      };
    },
    externalReport: () => ({ ...sheets.report(), hiddenFrames }),
    decorReport: () => ({ ...decors.report(), ilot: def.id, world: worldKind, pendingFrames: decorPendingFrames, late: [...decorLate] }),
    // plans décodés puis envoyés au GPU dès qu'ils sont prêts (`peek`), pendant le fondu : `goTo` n'a plus qu'à construire
    prepare: (id) => Promise.all([sheets.prepare(castOf(o.ilotDefOf?.(id) ?? ilotDef(id, false))), decors.prepare(id).then(() => { decors.peek(id); })]).then(() => undefined),
    isPrepared: (id) => castOf(o.ilotDefOf?.(id) ?? ilotDef(id, false)).every((x) => sheets.peek(x).state !== 'attente') && decors.peek(id).state !== 'attente',
    ready: () => (pending.size || decorPending ? new Promise<void>((res) => waiters.push(res)) : Promise.resolve()),
    renderNow() { rig.update(camera, camAt(), 0, true, camTuning()); render(); },
    walkerH,
    cadrer(c, snap = false) { cadrage = c ? { ...c, at: { ...c.at } } : null; if (snap) coupe = true; },
    cameraParams: () => rig.params,
    setMarkers(m) {
      for (const e of npcSprites) {
        const k = m[e.n.id] ?? null;
        if (k !== e.kind) {
          e.kind = k;
          e.marker.visible = !!k;
          // M11-A : la bulle d'alerte d'un guetteur, plus grande que les repères
          e.marker.scale.setScalar(k === 'vu' ? 1.7 : 1);
          if (k) (e.marker.material as THREE.MeshBasicMaterial).map = markerTexture(k);
        }
      }
    },
    walkNpc(id, to, speed, face) {
      const e = npcSprites.find((x) => x.n.id === id);
      if (!e) return Promise.resolve();
      const from = npcState.get(id)?.pos ?? e.n.at;
      npcState.get(id)?.walk?.done();
      if (o.freeze || o.reducedMotion || paused) { npcState.set(id, { pos: { ...to }, face }); return Promise.resolve(); }
      return new Promise<void>((done) => { npcState.set(id, { pos: { ...from }, walk: { to: { ...to }, speed, face, phase: 0, done } }); });
    },
    npcAt(id) {
      const e = npcSprites.find((x) => x.n.id === id);
      return e ? { ...(npcState.get(id)?.pos ?? e.n.at) } : null;
    },
    project(p) {
      const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, visible: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('blur', blurAll);
      playerSprite.dispose();
      for (const { s, marker } of npcSprites) { s.dispose(); marker.geometry.dispose(); (marker.material as THREE.Material).dispose(); }
      for (const p of passers) p.s.dispose();
      for (const t of MARKERS.values()) t.dispose();
      MARKERS.clear();
      world.dispose();
      decors.release(def.id);
      refl.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

const MARKERS = new Map<string, THREE.CanvasTexture>();
/** Repère peint : losange ambré (accent chaud des lanternes), signe sombre au centre. */
function markerTexture(kind: '!' | '?' | 'vu'): THREE.CanvasTexture {
  const hit = MARKERS.get(kind);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 80;
  const g = c.getContext('2d')!;
  if (kind === 'vu') {
    // M11-A : la bulle « ! » d'un guetteur qui repère le joueur (dessinée par code) : bulle ivoire, point d'exclamation rouge sombre
    g.beginPath();
    g.moveTo(14, 6); g.lineTo(50, 6); g.quadraticCurveTo(60, 6, 60, 16); g.lineTo(60, 52); g.quadraticCurveTo(60, 62, 50, 62);
    g.lineTo(38, 62); g.lineTo(32, 76); g.lineTo(26, 62); g.lineTo(14, 62); g.quadraticCurveTo(4, 62, 4, 52); g.lineTo(4, 16); g.quadraticCurveTo(4, 6, 14, 6);
    g.closePath();
    g.fillStyle = '#f3ead6';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#1c1210';
    g.stroke();
    g.fillStyle = '#9a1c16';
    g.beginPath(); g.moveTo(26, 14); g.lineTo(38, 14); g.lineTo(35, 44); g.lineTo(29, 44); g.closePath(); g.fill();
    g.beginPath(); g.arc(32, 53, 4.5, 0, Math.PI * 2); g.fill();
    const tv = new THREE.CanvasTexture(c);
    tv.colorSpace = THREE.SRGBColorSpace;
    MARKERS.set(kind, tv);
    return tv;
  }
  g.translate(32, 36);
  g.beginPath();
  g.moveTo(0, -30); g.lineTo(26, 0); g.lineTo(0, 30); g.lineTo(-26, 0); g.closePath();
  g.fillStyle = '#e8b45a';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#2a1a0c';
  g.stroke();
  g.fillStyle = '#2a1a0c';
  g.font = 'bold 34px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(kind, 0, 2);
  g.beginPath();
  g.moveTo(-6, 34); g.lineTo(6, 34); g.lineTo(0, 42); g.closePath();
  g.fillStyle = '#e8b45a';
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  MARKERS.set(kind, t);
  return t;
}

export { RIGS };

/** Regard de marche vers une destination (quatre directions) ; à l'arrêt, le regard final. */
function regard(p: Vec2, to: Vec2, fin: Facing): Facing {
  const dx = to.x - p.x;
  const dz = to.z - p.z;
  if (Math.hypot(dx, dz) < 1e-3) return fin;
  if (Math.abs(dx) > Math.abs(dz) * 1.15) return dx > 0 ? 'droite' : 'gauche';
  return dz > 0 ? 'face' : 'dos';
}
