/**
 * M13 — lecteur (Web Audio) : joue les versions et les jingles sur l'horloge audio, en temps réel (planification en
 * avance, `avancer` appelé toutes les 25 ms) ou hors ligne (`OfflineAudioContext`, par fenêtres). Plusieurs pistes à la
 * fois : la musique de fond et des sources localisées dans la ville (contrat 2, §2). Par version qui joue, un mélangeur :
 * couches (fond, mélodie, tension…) qui entrent et sortent en fondu, tranches par instrument (le piano en trois registres
 * pour la stéréo), place de chaque musicien dans le temps, envoi vers la salle, moteur du vibraphone, chaîne lofi.
 * Fondus enchaînés calés sur la mesure, ponctuations sur le temps dans l'accord qui sonne, fin de duel sur le temps fort,
 * jingles. Contrats `docs/m13/01_MUSIQUE.md` (§4) et `02_MUSIQUE_INTERACTIVE.md`.
 */
import type { BanqueBrute } from './banque';
import { choisir } from './banque';
import { formation } from './arrangement';
import { JINGLES, mixDe, passage, VERSIONS, type DefJingle, type DefVersion, type JingleId, type OptVersion, type VersionId } from './catalogue';
import { chaineLofi, tamponSalle, type SalleId } from './effets';
import { planEnchainement, type PlanEnchainement } from './enchainement';
import { lier, type Evenement, type InstrId } from './generateurs';
import type { AccordP } from './partitions';
import { ponctuation, type PonctuationId } from './ponctuations';
import { freq } from './theorie';
import { boucleSection, corps, ensemble, MONOPHONIQUES as MONOPHONIQUES_, SECTIONS, souffler, VENTS, type InstrVent } from './vents';

export interface ZoneAudio { racine: number; couche: number; buffer: AudioBuffer }
export type BanqueAudio = Partial<Record<InstrId, ZoneAudio[]>>;

/** Les échantillons calculés, en tampons audio du contexte. */
export function versAudio(ctx: BaseAudioContext, b: BanqueBrute): BanqueAudio {
  const out: BanqueAudio = {};
  for (const [k, zs] of Object.entries(b) as Array<[InstrId, BanqueBrute[InstrId]]>) {
    out[k] = (zs ?? []).map((z) => {
      const buf = ctx.createBuffer(1, z.data.length, z.sr);
      buf.copyToChannel(z.data, 0);
      return { racine: z.racine, couche: z.couche, buffer: buf };
    });
  }
  return out;
}

/** Le gain d'une version dans son contexte : la ville garde son niveau quand sa formation grandit (`niveaux`, en dB). */
export const gainDe = (v: DefVersion, o: OptVersion): number => v.gain * 10 ** ((v.niveaux?.[formation(o.chapitre)] ?? 0) / 20);

/** Constante de temps de l'extinction d'une note relâchée (étouffoir, pédale). */
const RELACHE: Partial<Record<InstrId, number>> = { piano: 0.08, rhodes: 0.12, vibra: 0.25, basse: 0.05, guitare: 0.07, nylon: 0.1, cuivres: 0.07, saxes: 0.07 };
const FRAPPES = new Set<InstrId>(['ride', 'cloche', 'crash', 'charley', 'charley-ferme', 'gc', 'cc', 'cc-balai', 'balai', 'rim']);

/**
 * Jeu ensemble (contrat 2, §2) : la place de chaque musicien dans le temps, en secondes. Jazz : la ride légèrement
 * devant, la basse sur le temps, le piano et la mélodie un peu derrière ; lofi : la caisse claire posée en arrière.
 */
const DECALAGES: Record<'jazz' | 'lofi' | 'droit', Partial<Record<InstrId, number>>> = {
  jazz: { ride: -0.007, cloche: -0.007, charley: -0.004, basse: -0.002, piano: 0.006, rhodes: 0.008, vibra: 0.01, guitare: 0.004, nylon: 0.004, trompette: 0.014, sax: 0.014, flute: 0.01, cuivres: 0.006, cordes: 0.02, 'trompette-ouverte': 0.01, saxes: 0.01, archet: 0.01 },
  lofi: { 'cc-balai': 0.014, rim: 0.012, 'charley-ferme': -0.003, piano: 0.01, rhodes: 0.012, trompette: 0.018, sax: 0.018, flute: 0.014, nylon: 0.008 },
  droit: {},
};

/** Panoramique par registre (le piano s'étale de gauche à droite, comme vu du clavier). */
const registre = (instr: InstrId, m: number): { cle: string; pan: number } => {
  if (instr !== 'piano' && instr !== 'rhodes') return { cle: '', pan: 0 };
  return m < 55 ? { cle: 'g', pan: -0.22 } : m < 72 ? { cle: 'm', pan: 0 } : { cle: 'a', pan: 0.18 };
};

interface CfgMelangeur { salle: SalleId; lofi?: boolean; pedale?: boolean; gain: number; mix: DefVersion['mix']; jeu?: 'jazz' | 'lofi' | 'droit'; couches?: Record<string, number> }

class Melangeur {
  readonly maitre: GainNode;
  private canaux = new Map<string, GainNode>();
  private couches = new Map<string, GainNode>();
  /** Instant à partir duquel une couche est muette (ses notes ne sont plus calculées : les vents coûtent cher). */
  private silences = new Map<string, number>();
  private salle: ConvolverNode;
  private lofi: { arreter: () => void } | null = null;
  private arrets: Array<() => void> = [];
  private k = 0;

  constructor(private ctx: BaseAudioContext, sortie: AudioNode, private banque: BanqueAudio, private cfg: CfgMelangeur) {
    this.maitre = ctx.createGain();
    this.maitre.gain.value = cfg.gain;
    let dest: AudioNode = sortie;
    if (cfg.lofi) {
      const l = chaineLofi(ctx);
      l.sortie.connect(sortie);
      dest = l.entree;
      this.lofi = l;
    }
    this.maitre.connect(dest);
    this.salle = ctx.createConvolver();
    this.salle.buffer = tamponSalle(ctx, cfg.salle);
    this.salle.connect(this.maitre);
    for (const [k, v] of Object.entries(cfg.couches ?? {})) if (v <= 0.001) this.silences.set(k, -Infinity);
  }

  /** Gain d'une couche (créée à sa première note, au niveau initial de la version). */
  couche(nom: string): GainNode {
    let g = this.couches.get(nom);
    if (g) return g;
    g = this.ctx.createGain();
    g.gain.value = this.cfg.couches?.[nom] ?? 1;
    g.connect(this.maitre);
    this.couches.set(nom, g);
    return g;
  }

  private canal(instr: InstrId, couche: string, m: number): GainNode {
    const reg = registre(instr, m);
    const cle = `${couche}|${instr}|${reg.cle}`;
    let c = this.canaux.get(cle);
    if (c) return c;
    const mx = mixDe(instr, this.cfg.mix);
    c = this.ctx.createGain();
    c.gain.value = mx.g;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, mx.pan + reg.pan));
    let tete: AudioNode = c;
    if (VENTS.has(instr)) {
      // le corps de l'instrument à vent (ou du pupitre de cordes)
      const k = corps(this.ctx, instr as InstrVent);
      c.connect(k.entree);
      tete = k.sortie;
      this.arrets.push(k.arreter);
    }
    if (SECTIONS.has(instr)) {
      // un pupitre calculé : le chorus du canal l'élargit
      const e = ensemble(this.ctx, c);
      tete = e.sortie;
      this.arrets.push(e.arreter);
    }
    if (instr === 'nappe') {
      // la nappe : un seul couple de filtres pour toutes ses voix (adoucie, sans grave)
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.4;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 180; hp.Q.value = 0.5;
      c.connect(lp).connect(hp);
      tete = hp;
    }
    if (instr === 'vibra') {
      // le moteur du vibraphone : un trémolo doux, le même pour toutes les lames
      const trem = this.ctx.createGain();
      trem.gain.value = 0.85;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 5.2;
      const prof = this.ctx.createGain();
      prof.gain.value = 0.15;
      lfo.connect(prof).connect(trem.gain);
      lfo.start();
      this.arrets.push(() => { try { lfo.stop(); } catch { /* arrêté */ } });
      c.connect(trem);
      tete = trem;
    }
    tete.connect(pan).connect(this.couche(couche));
    const envoi = this.ctx.createGain();
    envoi.gain.value = mx.rev;
    tete.connect(envoi).connect(this.salle);
    this.canaux.set(cle, c);
    return c;
  }

  /** Une note (secondes absolues sur l'horloge du contexte ; `spb` : secondes par temps, pour les phrases). */
  note(e: Evenement, t0: number, d: number, spb = 1): void {
    const ctx = this.ctx;
    const t = Math.max(0, t0 + (DECALAGES[this.cfg.jeu ?? 'jazz'][e.instr] ?? 0));
    const couche = e.couche ?? 'fond';
    if (t >= (this.silences.get(couche) ?? Infinity)) return;
    if (e.instr === 'nappe') return this.nappe(e, t, d, couche);
    if (VENTS.has(e.instr)) {
      const notes = e.phrase ? e.phrase.map((x) => ({ ...x, t: t + x.t * spb, d: x.d * spb })) : [{ t, d, m: e.m, v: e.v, ...(e.orn ? { orn: e.orn } : {}) }];
      return souffler(ctx, this.canal(e.instr, couche, e.m), e.instr as InstrVent, notes);
    }
    const zones = this.banque[e.instr];
    if (!zones?.length) return;
    this.k = (this.k + 1) % 9973;
    const ch = choisir(zones, e.instr, e.m, e.v, ((this.k * 7919) % 101) / 50 - 1);
    if (!ch) return;
    const z = zones[ch.zone]!;
    const src = ctx.createBufferSource();
    src.buffer = z.buffer;
    src.playbackRate.value = ch.vitesse;
    const g = ctx.createGain();
    g.gain.value = ch.gain;
    src.connect(g).connect(this.canal(e.instr, couche, e.m));
    src.start(t);
    let longueur = z.buffer.duration / ch.vitesse;
    if (SECTIONS.has(e.instr)) {
      // la tenue bouclée : une note plus longue que l'échantillon continue sans saut
      const [a, b] = boucleSection(z.racine, z.buffer.sampleRate, z.buffer.length);
      src.loop = true;
      src.loopStart = a / z.buffer.sampleRate;
      src.loopEnd = b / z.buffer.sampleRate;
      longueur = Infinity;
    }
    if (FRAPPES.has(e.instr)) {
      // une cymbale étouffée (fin de duel) s'arrête net
      if (e.etouffe) { g.gain.setValueAtTime(ch.gain, t + d); g.gain.setTargetAtTime(0, t + d, 0.05); src.stop(t + d + 0.4); }
      else src.stop(t + longueur);
      return;
    }
    const tau = (RELACHE[e.instr] ?? 0.1) * (this.cfg.pedale ? 2 : 1);
    const fin = Math.min(t + d, t + longueur);
    g.gain.setValueAtTime(ch.gain, fin);
    g.gain.setTargetAtTime(0, fin, tau);
    src.stop(Math.min(t + longueur, fin + tau * 7));
  }

  /** La nappe : deux dents de scie désaccordées, attaque et extinction lentes (temps réel ; filtres partagés du canal). */
  private nappe(e: Evenement, t: number, d: number, couche: string): void {
    const ctx = this.ctx;
    const f = freq(e.m);
    const g = ctx.createGain();
    const a = 0.1 * e.v;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(a, t + Math.min(0.8, d * 0.4));
    g.gain.setValueAtTime(a, t + d);
    g.gain.setTargetAtTime(0.0001, t + d, 0.35);
    g.connect(this.canal('nappe', couche, e.m));
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(g);
      o.start(t);
      o.stop(t + d + 1.6);
    }
  }

  fondu(t: number, vers: number, duree: number): void {
    this.maitre.gain.cancelScheduledValues(t);
    this.maitre.gain.setValueAtTime(this.maitre.gain.value, t);
    this.maitre.gain.linearRampToValueAtTime(Math.max(0.0001, vers), t + duree);
  }

  /** Une couche vers un niveau, en fondu, à l'instant `t`. */
  regler(nom: string, niveau: number, t: number, duree: number): void {
    this.silences.set(nom, niveau <= 0.001 ? t + duree : Infinity);
    const g = this.couche(nom);
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(niveau, t + duree);
  }

  fermer(t: number): void {
    const ms = Math.max(0, (t - this.ctx.currentTime) * 1000) + 4000;
    setTimeout(() => {
      this.arrets.forEach((f) => f());
      this.lofi?.arreter();
      try { this.maitre.disconnect(); } catch { /* déjà fait */ }
    }, ms);
  }
}

interface Instance {
  v: DefVersion;
  mel: Melangeur;
  /** Premier temps de la version (levée comprise) ; `t0` : début du passage en cours. */
  debut: number;
  t0: number;
  p: number;
  spb: number;
  ev: Evenement[];
  acc: readonly AccordP[];
  i: number;
  fin: number;
  graine: number;
  o: OptVersion;
  arret: number | null;
}

interface Piste {
  cur: Instance | null;
  sortantes: Instance[];
  /** Gain de la piste (effacement du fond près d'une source ; proximité d'une source). */
  gain: GainNode;
  /** Source localisée : passe-bas selon la distance. */
  filtre: BiquadFilterNode | null;
}

export interface OptJouer {
  piste?: string;
  quand?: number;
  fondu?: number;
  options?: OptVersion;
  intro?: boolean;
  /** Niveaux de départ des couches (au lieu de ceux de la version). */
  couches?: Record<string, number>;
  /** La salle où la version sonne (au lieu de la sienne : l'acoustique du lieu d'un duel). */
  salle?: SalleId;
}

export class Lecteur {
  private pistes = new Map<string, Piste>();
  private bus: GainNode;
  private retrait: GainNode;
  private filtreBus: BiquadFilterNode;
  private proximites = new Map<string, number>();
  private etatFocus = false;
  private etatSourd = false;
  /** Mesures (outil de rendu) : seuls ces instruments jouent. */
  solo: ReadonlySet<InstrId> | null = null;

  constructor(private ctx: BaseAudioContext, sortie: AudioNode, private banque: BanqueAudio, private graine = 1) {
    this.bus = ctx.createGain();
    this.retrait = ctx.createGain();
    this.filtreBus = ctx.createBiquadFilter();
    this.filtreBus.type = 'lowpass';
    this.filtreBus.frequency.value = 20000;
    this.filtreBus.Q.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 2.2; comp.attack.value = 0.02; comp.release.value = 0.3;
    // pistes → bus (focus) → retrait (sous un jingle) → passe-bas (assourdie, focus) → compresseur ; les jingles entrent après le retrait
    this.bus.connect(this.retrait).connect(this.filtreBus).connect(comp).connect(sortie);
  }

  /** Le fond s'efface (en dB) pendant `duree` secondes à partir de `t`, puis revient (un jingle par-dessus la musique). */
  retirer(db: number, t: number, duree: number): void {
    const g = this.retrait.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(10 ** (db / 20), t, 0.08);
    g.setTargetAtTime(1, t + duree, 0.5);
  }

  private piste(nom: string): Piste {
    let p = this.pistes.get(nom);
    if (p) return p;
    const gain = this.ctx.createGain();
    let filtre: BiquadFilterNode | null = null;
    if (nom !== 'fond') {
      filtre = this.ctx.createBiquadFilter();
      filtre.type = 'lowpass'; filtre.frequency.value = 600; filtre.Q.value = 0.6;
      gain.gain.value = 0;
      gain.connect(filtre).connect(this.bus);
    } else gain.connect(this.bus);
    p = { cur: null, sortantes: [], gain, filtre };
    this.pistes.set(nom, p);
    return p;
  }

  enCours(piste = 'fond'): VersionId | null { return this.pistes.get(piste)?.cur?.v.id ?? null; }

  /**
   * Le début du prochain temps, temps fort (le 1 et le 3 d'une mesure à quatre temps, le 1 d'une valse), mesure ou phrase
   * de quatre mesures de la version en cours.
   */
  prochain(unite: 'temps' | 'fort' | 'mesure' | 'phrase' = 'mesure', piste = 'fond', apres = this.ctx.currentTime + 0.05): number {
    const c = this.pistes.get(piste)?.cur;
    if (!c) return apres;
    const m = c.v.mesure;
    const pas = (unite === 'temps' ? 1 : unite === 'fort' ? (m === 4 ? 2 : m) : unite === 'mesure' ? m : m * 4) * c.spb;
    return c.t0 + Math.ceil((apres - c.t0) / pas - 1e-6) * pas;
  }
  prochaineMesure(apres?: number): number { return this.prochain('mesure', 'fond', apres); }

  /** Joue une version : la précédente de la piste s'efface sur la mesure ; levée si la version commence seule. */
  jouer(id: VersionId, o: OptJouer = {}): void {
    const nom = o.piste ?? 'fond';
    const p = this.piste(nom);
    const v = VERSIONS[id];
    if (p.cur?.v.id === id && !o.options) return;
    const quand = o.quand ?? (p.cur ? this.prochain('mesure', nom) : this.ctx.currentTime + 0.1);
    const fondu = o.fondu ?? 1.2;
    const avant = p.cur;
    if (avant) this.sortir(p, avant, quand, fondu);
    const opts: OptVersion = { ...(avant?.v.id === id ? avant.o : {}), ...(o.options ?? {}) };
    const gain = gainDe(v, opts);
    const mel = new Melangeur(this.ctx, p.gain, this.banque, { salle: o.salle ?? v.salle, lofi: v.lofi ?? false, pedale: v.pedale ?? false, gain, mix: v.mix, jeu: v.jeu ?? (v.lofi ? 'lofi' : 'jazz'), couches: { ...(v.couches ?? {}), ...(o.couches ?? {}) } });
    if (avant) { mel.maitre.gain.value = 0.0001; mel.fondu(quand, gain, fondu * 0.6); }
    const intro = (o.intro ?? !avant) && !!v.intro;
    const inst: Instance = { v, mel, debut: quand, t0: quand, p: intro ? -1 : 0, spb: 60 / v.tempo, ev: [], acc: [], i: 0, fin: quand, graine: this.graine, o: opts, arret: null };
    this.preparer(inst, quand);
    p.cur = inst;
  }

  /**
   * Enchaîne vers une autre version (`enchainement.ts`) : la version en cours s'efface, un silence, puis la nouvelle par
   * sa levée ; le duel qui se tend, par un break. `libre` : rien ne reprend avant. Renvoie le plan suivi.
   */
  enchainer(id: VersionId, o: OptJouer & { libre?: number } = {}): PlanEnchainement {
    const p = this.pistes.get('fond');
    const c = p?.cur ?? null;
    const v = VERSIONS[id];
    const plan = planEnchainement({
      now: this.ctx.currentTime, de: c?.v.id ?? null, debutDe: c?.debut ?? null,
      prochainTemps: this.prochain('temps'), prochainePhrase: this.prochain('phrase'), libre: o.libre ?? 0,
    }, id, (v.mesure * 60) / v.tempo);
    if (plan.sortie && p && c) {
      if (plan.sortie.coupe) this.terminer('phrase');
      else this.sortir(p, c, plan.sortie.a, plan.sortie.duree);
    }
    const { libre: _l, ...jouer } = o;
    this.jouer(id, { ...jouer, quand: plan.debut, intro: plan.intro });
    return plan;
  }

  private sortir(p: Piste, inst: Instance, quand: number, fondu: number): void {
    inst.mel.fondu(quand, 0.0001, fondu);
    inst.arret = quand + fondu;
    inst.mel.fermer(quand + fondu);
    p.sortantes.push(inst);
    if (p.cur === inst) p.cur = null;
  }

  /** Change le contexte (variation de la mélodie, intensité, chapitre…) à partir du prochain passage. */
  contexte(o: OptVersion, piste = 'fond'): void { const c = this.pistes.get(piste)?.cur; if (c) c.o = { ...c.o, ...o }; }
  /** Compatibilité : variation de la mélodie. */
  varier(o: OptVersion): void { this.contexte(o); }

  /** Couches de la version en cours vers des niveaux (0 à 1), en fondu, sur la mesure (ou la phrase, ou le temps). */
  couches(niveaux: Record<string, number>, o: { piste?: string; sur?: 'temps' | 'fort' | 'mesure' | 'phrase'; duree?: number } = {}): void {
    const nom = o.piste ?? 'fond';
    const c = this.pistes.get(nom)?.cur;
    if (!c) return;
    const t = this.prochain(o.sur ?? 'mesure', nom);
    for (const [k, v] of Object.entries(niveaux)) c.mel.regler(k, v, t, o.duree ?? 1.5);
  }

  private preparer(inst: Instance, t0: number): void {
    const { ev, duree, acc } = passage(inst.v, inst.p, inst.graine, inst.o);
    inst.t0 = t0;
    inst.ev = ev;
    inst.acc = acc;
    inst.i = 0;
    inst.fin = t0 + duree * inst.spb;
  }

  /** Planifie tout ce qui commence avant `jusqua` (secondes, horloge du contexte). */
  avancer(jusqua: number): void {
    for (const p of this.pistes.values()) {
      for (const inst of [p.cur, ...p.sortantes]) {
        if (!inst) continue;
        for (;;) {
          while (inst.i < inst.ev.length) {
            const e = inst.ev[inst.i]!;
            const t = inst.t0 + e.t * inst.spb;
            if (t >= jusqua) break;
            inst.i++;
            if (inst.arret !== null && t > inst.arret) continue;
            if (t < this.ctx.currentTime - 0.05) continue;
            if (this.solo && !this.solo.has(e.instr)) continue;
            inst.mel.note(e, t, e.d * inst.spb, inst.spb);
          }
          if (inst.i < inst.ev.length || inst.fin >= jusqua || (inst.arret !== null && inst.fin > inst.arret)) break;
          inst.p++;
          this.preparer(inst, inst.fin);
        }
      }
      p.sortantes = p.sortantes.filter((s) => s.arret === null || s.arret > this.ctx.currentTime - 1);
    }
  }

  /** L'accord qui sonne à l'instant `t` dans la version de fond (null hors musique). */
  accordA(t: number, piste = 'fond'): string | null {
    const c = this.pistes.get(piste)?.cur;
    if (!c || !c.acc.length) return null;
    let beat = (t - c.t0) / c.spb;
    if (beat < 0) return c.acc[0]!.sym;
    const total = c.acc[c.acc.length - 1]!.t + c.acc[c.acc.length - 1]!.d;
    beat %= total;
    let s = c.acc[0]!.sym;
    for (const a of c.acc) if (a.t <= beat + 1e-6) s = a.sym;
    return s;
  }

  /** Une ponctuation sur le temps suivant, dans l'accord qui sonne (contrat 2, §2) ; renvoie son instant. */
  ponctuer(id: PonctuationId): number | null {
    const c = this.pistes.get('fond')?.cur;
    if (!c) return null;
    const t = this.prochain('temps');
    const sym = this.accordA(t) ?? 'Fmaj7';
    const mel = new Melangeur(this.ctx, this.piste('fond').gain, this.banque, { salle: c.v.salle, gain: c.v.gain, mix: c.v.mix });
    const p = ponctuation(id, sym);
    for (const e of p.ev) mel.note(e, t + e.t * c.spb, e.d * c.spb, c.spb);
    mel.fermer(t + p.duree * c.spb + 3);
    return t;
  }

  /**
   * Fin de duel (contrat 2, §2) : la musique de fond s'arrête sur le temps fort suivant, sur une cymbale étouffée et la
   * fondamentale ; renvoie l'instant de l'arrêt (le jingle peut s'y caler).
   */
  terminer(sur: 'fort' | 'phrase' = 'fort'): number {
    const p = this.pistes.get('fond');
    const c = p?.cur;
    if (!p || !c) return this.ctx.currentTime;
    const t = this.prochain(sur);
    const sym = this.accordA(t - 0.01) ?? 'Fmaj7';
    const mel = new Melangeur(this.ctx, p.gain, this.banque, { salle: c.v.salle, gain: c.v.gain, mix: c.v.mix });
    for (const e of ponctuation('fin', sym).ev) mel.note(e, t + e.t * c.spb, e.d * c.spb, c.spb);
    mel.fermer(t + 4);
    this.sortir(p, c, t, 0.08);
    return t;
  }

  /** Joue un jingle (sur le prochain temps de la musique de fond, sinon tout de suite) ; renvoie sa durée en secondes. */
  jingle(id: JingleId, quand?: number): number {
    const j: DefJingle = JINGLES[id];
    const t = quand ?? (this.pistes.get('fond')?.cur ? this.prochain('temps') : this.ctx.currentTime + 0.05);
    const mel = new Melangeur(this.ctx, this.filtreBus, this.banque, { salle: j.salle, gain: j.gain, mix: j.mix });
    const spb = 60 / j.tempo;
    for (const e of j.ev()) mel.note(e, t + e.t * spb, e.d * spb, spb);
    mel.fermer(t + j.duree * spb + 3);
    return j.duree * spb;
  }

  /**
   * Des événements bruts (laboratoire, mesures d'un instrument) : liés en phrases, joués à `tempo` dans une salle, à
   * partir de `quand` ; renvoie la durée en secondes.
   */
  brut(ev: readonly Evenement[], o: { tempo?: number; salle?: SalleId; quand?: number; mix?: DefVersion['mix']; mono?: ReadonlySet<InstrId> } = {}): number {
    const spb = 60 / (o.tempo ?? 60);
    const t = o.quand ?? this.ctx.currentTime + 0.05;
    const mel = new Melangeur(this.ctx, this.bus, this.banque, { salle: o.salle ?? 'studio', gain: 1, mix: o.mix ?? {} });
    const tri = [...ev].sort((a, b) => a.t - b.t);
    const lies = lier(tri, o.mono ?? MONOPHONIQUES_);
    let fin = 0;
    for (const e of lies) { mel.note(e, t + e.t * spb, e.d * spb, spb); fin = Math.max(fin, e.t + e.d); }
    mel.fermer(t + fin * spb + 3);
    return fin * spb;
  }

  /** Efface la musique d'une piste (fondu), tout de suite ou à partir de `quand`. */
  arreter(fondu = 1.2, piste = 'fond', quand = this.ctx.currentTime + 0.02): void {
    const p = this.pistes.get(piste);
    if (p?.cur) this.sortir(p, p.cur, quand, fondu);
  }

  /** Effacement (dialogues) : `db` négatif ; 0 pour revenir. */
  effacer(db: number, duree = 0.4): void {
    this.bus.gain.setTargetAtTime(10 ** (db / 20), this.ctx.currentTime, duree / 3);
  }

  private filtrer(): void {
    const f = this.etatSourd ? 700 : this.etatFocus ? 3500 : 20000;
    this.filtreBus.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.25);
  }

  /** Focus (contrat 2) : sous un dialogue, la musique baisse de 5 dB et s'adoucit. */
  focus(on: boolean): void { this.etatFocus = on; this.effacer(on ? -5 : 0); this.filtrer(); }

  /** Assourdie (la ville quand un duel commence) : passe-bas profond, ou retour. */
  assourdir(on: boolean): void { this.etatSourd = on; this.filtrer(); }

  /**
   * Source localisée (contrat 2, §2) : une version jouée par un lieu de la ville, sur sa propre piste ; sa proximité
   * (0 loin, 1 tout près) règle son niveau et sa clarté, et efface d'autant la musique de fond.
   */
  source(nom: string, id: VersionId | null): void {
    if (!id) { this.arreter(2, nom); this.proximites.delete(nom); this.appliquerProximites(); return; }
    this.jouer(id, { piste: nom, intro: false, quand: this.ctx.currentTime + 0.1, fondu: 0.5 });
    if (!this.proximites.has(nom)) this.proximites.set(nom, 0);
  }

  proximite(nom: string, x: number): void {
    const v = Math.max(0, Math.min(1, x));
    this.proximites.set(nom, v);
    const p = this.pistes.get(nom);
    if (p?.filtre) {
      const t = this.ctx.currentTime;
      p.gain.gain.setTargetAtTime(v ** 1.6, t, 0.2);
      p.filtre.frequency.setTargetAtTime(500 + 11000 * v * v, t, 0.2);
    }
    this.appliquerProximites();
  }

  private appliquerProximites(): void {
    const max = Math.max(0, ...this.proximites.values());
    const fond = this.pistes.get('fond');
    if (fond) fond.gain.gain.setTargetAtTime(1 - 0.7 * max, this.ctx.currentTime, 0.25);
  }
}

/** Durée (secondes) de `passes` passages d'une version, levée comprise. */
export function dureeVersion(id: VersionId, passes: number, intro = true): number {
  const v = VERSIONS[id];
  return ((intro && v.intro ? v.intro.duree : 0) + v.duree * passes) * (60 / v.tempo);
}
