/**
 * M11-E — moteur du son, synthétisé par code avec la Web Audio API (`docs/m11/06_SON.md`, ADR 042) : aucun fichier,
 * aucune bibliothèque. Le contexte audio n'est créé qu'après un geste du joueur (clic, touche) et seulement si le son est
 * permis et non coupé ; avant, `jouer` ne fait rien. Bus : général (volume, coupure) → limiteur → sortie ; effets (1,0),
 * ambiance (0,35), interface (0,6). Au plus 12 voix d'effets. Les ambiances se croisent en 0,8 s.
 */
import { makeRng } from '../game/engine/rng';
import { bornerVolume, ecrireReglages, gainGeneral, lireReglages, sonPermis, type ReglagesSon } from './reglages';
import type { AmbianceId, SonId } from './evenements';

export interface MoteurSon {
  jouer(id: SonId): void;
  ambiance(id: AmbianceId | null): void;
  reglages(): ReglagesSon;
  regler(r: Partial<ReglagesSon>): void;
  /** Le son est-il permis par l'adresse (`?son=0`, QA) ? */
  readonly permis: boolean;
  /** Le contexte audio existe-t-il (après un geste) ? */
  actif(): boolean;
  /** Sons demandés depuis le chargement (QA : vérifier un déclenchement sans écouter). */
  journal(): readonly SonId[];
}

type Ctx = AudioContext;
const MAX_VOIX = 12;

function stockage(): Storage | null { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } }

export function creerMoteurSon(search = typeof location !== 'undefined' ? location.search : '', st: Pick<Storage, 'getItem' | 'setItem'> | null = stockage()): MoteurSon {
  const permis = sonPermis(search);
  let reg = lireReglages(st);
  let ctx: Ctx | null = null;
  let general: GainNode | null = null;
  let bus: Record<'effets' | 'ambiance' | 'ui', GainNode> | null = null;
  let bruit: AudioBuffer | null = null;
  let voix = 0;
  let amb: { id: AmbianceId; stop: () => void } | null = null;
  let ambVoulue: AmbianceId | null = null;
  const demandes: SonId[] = [];

  const creer = (): void => {
    if (ctx || !permis || reg.coupe || typeof window === 'undefined') return;
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch { ctx = null; return; }
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.2;
    general = ctx.createGain();
    general.gain.value = gainGeneral(reg, permis);
    general.connect(lim).connect(ctx.destination);
    const g = (v: number) => { const n = ctx!.createGain(); n.gain.value = v; n.connect(general!); return n; };
    bus = { effets: g(1), ambiance: g(0.35), ui: g(0.6) };
    // deux secondes de bruit blanc, à graine fixe (aucun Math.random)
    const rng = makeRng(0x50a);
    bruit = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = bruit.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;
    if (ambVoulue) lancerAmbiance(ambVoulue);
  };
  const geste = (): void => { creer(); if (ctx?.state === 'suspended') void ctx.resume(); };
  // l'interface : un tic à chaque bouton (plus grave pour fermer, revenir, annuler)
  const clic = (e: Event): void => {
    const b = (e.target as Element | null)?.closest?.('button');
    if (!b || (b as HTMLButtonElement).disabled) return;
    api.jouer(/close|back|retour|revenir|fermer|annuler|plus tard/i.test(`${b.getAttribute('data-key') ?? ''} ${b.textContent ?? ''}`) ? 'ui-retour' : 'ui');
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', geste, { capture: true, passive: true });
    window.addEventListener('keydown', geste, { capture: true, passive: true });
    window.addEventListener('click', clic, { capture: true, passive: true });
  }

  // --- briques de synthèse ---
  const ton = (dest: AudioNode, t: number, f: number, type: OscillatorType, dur: number, gain: number, o: { vers?: number; attaque?: number } = {}): void => {
    const c = ctx!;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (o.vers) osc.frequency.exponentialRampToValueAtTime(o.vers, t + dur);
    const g = c.createGain();
    const a = o.attaque ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };
  const souffle = (dest: AudioNode, t: number, dur: number, type: BiquadFilterType, f: number, q: number, gain: number, vers?: number): void => {
    const c = ctx!;
    const src = c.createBufferSource();
    src.buffer = bruit;
    const fl = c.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (vers) { fl.frequency.exponentialRampToValueAtTime(vers, t + dur / 2); fl.frequency.exponentialRampToValueAtTime(f, t + dur); }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(dest);
    src.start(t, (t * 0.37) % 1.5);
    src.stop(t + dur + 0.05);
  };

  const RECETTES: Record<SonId, (d: AudioNode, t: number) => number> = {
    ui: (d, t) => { ton(d, t, 880, 'sine', 0.05, 0.25); return 0.06; },
    'ui-retour': (d, t) => { ton(d, t, 520, 'sine', 0.06, 0.22); return 0.07; },
    'carte-pose': (d, t) => { souffle(d, t, 0.07, 'bandpass', 2500, 0.8, 0.45); ton(d, t + 0.02, 180, 'triangle', 0.07, 0.3); return 0.1; },
    revelation: (d, t) => { ton(d, t, 523, 'triangle', 0.14, 0.22); ton(d, t + 0.09, 784, 'triangle', 0.18, 0.22); return 0.3; },
    clash: (d, t) => { ton(d, t, 90, 'sine', 0.38, 0.9, { vers: 42 }); souffle(d, t, 0.2, 'lowpass', 1800, 0.7, 0.55); return 0.4; },
    degats: (d, t) => { ton(d, t, 440, 'sawtooth', 0.32, 0.18, { vers: 110 }); return 0.35; },
    'degats-adverse': (d, t) => { ton(d, t, 660, 'sawtooth', 0.24, 0.12, { vers: 220 }); return 0.26; },
    garde: (d, t) => { ton(d, t, 1240, 'sine', 0.6, 0.16); ton(d, t, 1710, 'sine', 0.5, 0.1); return 0.6; },
    interference: (d, t) => { ton(d, t, 1500, 'square', 0.08, 0.07); ton(d, t + 0.05, 1100, 'sine', 0.12, 0.15); return 0.18; },
    signature: (d, t) => { for (const f of [392, 587, 784]) ton(d, t, f, 'sine', 1.1, 0.12, { attaque: 0.25 }); return 1.1; },
    victoire: (d, t) => { [523, 659, 784, 1047].forEach((f, i) => ton(d, t + i * 0.12, f, 'triangle', i === 3 ? 0.7 : 0.2, 0.22)); return 1.1; },
    defaite: (d, t) => { [440, 349, 294].forEach((f, i) => ton(d, t + i * 0.2, f, 'triangle', i === 2 ? 0.9 : 0.25, 0.2)); return 1.3; },
    pas: (d, t) => { souffle(d, t, 0.045, 'lowpass', 450 + ((t * 997) % 250), 1, 0.12); return 0.05; },
    repere: (d, t) => { ton(d, t, 1320, 'square', 0.07, 0.06); ton(d, t + 0.09, 1760, 'square', 0.09, 0.06); return 0.2; },
    rival: (d, t) => { for (const f of [196, 198.5, 147]) ton(d, t, f, 'sawtooth', 0.55, 0.07, { attaque: 0.03 }); ton(d, t, 80, 'sine', 0.5, 0.5, { vers: 50 }); return 0.6; },
    voyage: (d, t) => { souffle(d, t, 0.6, 'bandpass', 300, 1.2, 0.18, 1200); return 0.6; },
    gain: (d, t) => { [784, 988, 1175].forEach((f, i) => ton(d, t + i * 0.07, f, 'sine', 0.5, 0.14)); ton(d, t + 0.21, 1568, 'triangle', 0.6, 0.08); return 0.8; },
    titre: (d, t) => { [392, 523, 659, 784].forEach((f, i) => ton(d, t + i * 0.16, f, 'sawtooth', i === 3 ? 1.4 : 0.3, 0.06, { attaque: 0.02 })); for (const f of [523, 659, 784]) ton(d, t + 0.64, f, 'triangle', 1.6, 0.1, { attaque: 0.05 }); return 2.2; },
  };

  // --- ambiances : boucles de bruit filtré modulé, ponctuations rares ---
  const lancerAmbiance = (id: AmbianceId): void => {
    const c = ctx!;
    const sortie = c.createGain();
    sortie.gain.value = 0.0001;
    sortie.connect(bus!.ambiance);
    sortie.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.8);
    const arrets: Array<() => void> = [];
    const boucle = (type: BiquadFilterType, f: number, q: number, gain: number, lfo: number, prof: number): void => {
      const src = c.createBufferSource();
      src.buffer = bruit; src.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.value = gain;
      const l = c.createOscillator(); l.frequency.value = lfo;
      const lg = c.createGain(); lg.gain.value = gain * prof;
      l.connect(lg).connect(g.gain);
      src.connect(fl).connect(g).connect(sortie);
      src.start(); l.start();
      arrets.push(() => { try { src.stop(); l.stop(); } catch { /* déjà arrêtés */ } });
    };
    const bourdon = (f: number, gain: number): void => {
      const o = c.createOscillator(); o.frequency.value = f;
      const g = c.createGain(); g.gain.value = gain;
      o.connect(g).connect(sortie); o.start();
      arrets.push(() => { try { o.stop(); } catch { /* déjà arrêté */ } });
    };
    const ponctuer = (toutes: number, f: number[], gain: number): void => {
      let k = 0;
      const h = setInterval(() => { if (!ctx) return; const t = c.currentTime; f.forEach((x, i) => ton(sortie, t + i * 0.05, x * (1 + (k % 3) * 0.02), 'sine', 2.2, gain)); k++; }, toutes * 1000);
      arrets.push(() => clearInterval(h));
    };
    switch (id) {
      case 'amb-quai': boucle('lowpass', 500, 0.7, 0.25, 0.1, 0.5); ponctuer(9, [660, 990], 0.05); break;
      case 'amb-ruelles': boucle('highpass', 2200, 0.5, 0.1, 0.3, 0.4); boucle('bandpass', 900, 1.5, 0.05, 0.7, 0.6); break;
      case 'amb-parvis': boucle('bandpass', 600, 0.5, 0.18, 0.2, 0.5); break;
      case 'amb-cour': boucle('bandpass', 600, 0.5, 0.24, 0.17, 0.45); boucle('bandpass', 1300, 0.8, 0.08, 0.23, 0.5); break;
      case 'amb-port': boucle('lowpass', 350, 0.6, 0.3, 0.08, 0.8); break;
      case 'amb-haute': boucle('bandpass', 1400, 0.3, 0.07, 0.05, 0.6); ponctuer(11, [1568, 2093], 0.03); break;
      case 'amb-duel': bourdon(55, 0.06); bourdon(82.5, 0.035); boucle('lowpass', 200, 0.7, 0.08, 0.06, 0.4); break;
    }
    amb = { id, stop: () => { const t = c.currentTime; sortie.gain.cancelScheduledValues(t); sortie.gain.setValueAtTime(Math.max(0.0001, sortie.gain.value), t); sortie.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); setTimeout(() => { arrets.forEach((f) => f()); sortie.disconnect(); }, 900); } };
  };

  const api: MoteurSon = {
    permis,
    actif: () => !!ctx,
    journal: () => demandes,
    reglages: () => ({ ...reg }),
    regler(r) {
      reg = { ...reg, ...r, volume: bornerVolume(r.volume ?? reg.volume) };
      ecrireReglages(st, reg);
      if (general && ctx) general.gain.setTargetAtTime(gainGeneral(reg, permis), ctx.currentTime, 0.05);
      else creer();
    },
    jouer(id) {
      demandes.push(id);
      if (demandes.length > 200) demandes.splice(0, 100);
      if (!ctx || !bus || reg.coupe || !permis || ctx.state !== 'running') return;
      if (voix >= MAX_VOIX) return;
      const dest = id === 'ui' || id === 'ui-retour' ? bus.ui : bus.effets;
      const dur = RECETTES[id](dest, ctx.currentTime + 0.005);
      voix++;
      setTimeout(() => { voix = Math.max(0, voix - 1); }, (dur + 0.1) * 1000);
    },
    ambiance(id) {
      ambVoulue = id;
      if (amb?.id === id) return;
      amb?.stop();
      amb = null;
      if (id && ctx && bus) lancerAmbiance(id);
    },
  };
  return api;
}

let instance: MoteurSon | null = null;
/** Le moteur du son de la page (créé au premier appel ; aucun contexte audio avant un geste). */
export function son(): MoteurSon {
  if (!instance) {
    instance = creerMoteurSon();
    // QA : le moteur est lisible depuis la page (sons demandés, contexte créé ou non), jamais hors `?qa=1`
    if (typeof window !== 'undefined' && new URLSearchParams(location.search).get('qa') === '1') (window as unknown as { __lqvSon?: MoteurSon }).__lqvSon = instance;
  }
  return instance;
}
