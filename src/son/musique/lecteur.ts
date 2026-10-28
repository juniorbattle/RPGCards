/**
 * M13 — lecteur (Web Audio) : joue les versions et les jingles sur l'horloge audio, en temps réel (planification en
 * avance, `avancer` appelé toutes les 25 ms) ou hors ligne (tout planifié d'un coup, `OfflineAudioContext`). Un mélangeur
 * par version qui joue (tranches par instrument, panoramique, envoi vers la salle, moteur du vibraphone, chaîne lofi),
 * fondus enchaînés calés sur la mesure, jingles sur le temps. Contrat `docs/m13/01_MUSIQUE.md`, §4.
 */
import type { BanqueBrute } from './banque';
import { choisir } from './banque';
import { JINGLES, mixDe, passage, VERSIONS, type DefJingle, type DefVersion, type JingleId, type OptVersion, type VersionId } from './catalogue';
import { chaineLofi, tamponSalle, type SalleId } from './effets';
import type { Evenement, InstrId } from './generateurs';
import { freq } from './theorie';

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

/** Constante de temps de l'extinction d'une note relâchée (étouffoir, pédale). */
const RELACHE: Partial<Record<InstrId, number>> = { piano: 0.08, rhodes: 0.12, vibra: 0.25, basse: 0.05 };
const FRAPPES = new Set<InstrId>(['ride', 'cloche', 'crash', 'charley', 'charley-ferme', 'gc', 'cc', 'cc-balai', 'balai', 'rim']);

class Melangeur {
  readonly maitre: GainNode;
  private canaux = new Map<InstrId, GainNode>();
  private salle: ConvolverNode;
  private lofi: { arreter: () => void } | null = null;
  private arrets: Array<() => void> = [];
  private k = 0;

  constructor(private ctx: BaseAudioContext, sortie: AudioNode, private banque: BanqueAudio, private cfg: { salle: SalleId; lofi?: boolean; pedale?: boolean; gain: number; mix: DefVersion['mix'] }) {
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
    const retour = ctx.createGain();
    retour.gain.value = 1;
    this.salle.connect(retour).connect(this.maitre);
  }

  private canal(instr: InstrId): GainNode {
    let c = this.canaux.get(instr);
    if (c) return c;
    const m = mixDe(instr, this.cfg.mix);
    c = this.ctx.createGain();
    c.gain.value = m.g;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = m.pan;
    let tete: AudioNode = c;
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
    tete.connect(pan).connect(this.maitre);
    const envoi = this.ctx.createGain();
    envoi.gain.value = m.rev;
    tete.connect(envoi).connect(this.salle);
    this.canaux.set(instr, c);
    return c;
  }

  /** Une note (secondes absolues sur l'horloge du contexte). */
  note(e: Evenement, t: number, d: number): void {
    const ctx = this.ctx;
    if (e.instr === 'nappe') return this.nappe(e, t, d);
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
    src.connect(g).connect(this.canal(e.instr));
    src.start(Math.max(t, 0));
    const longueur = z.buffer.duration / ch.vitesse;
    if (FRAPPES.has(e.instr)) {
      src.stop(t + longueur);
      return;
    }
    const tau = (RELACHE[e.instr] ?? 0.1) * (this.cfg.pedale ? 2 : 1);
    const fin = Math.min(t + d, t + longueur);
    g.gain.setValueAtTime(ch.gain, fin);
    g.gain.setTargetAtTime(0, fin, tau);
    src.stop(Math.min(t + longueur, fin + tau * 6));
  }

  /** La nappe : deux dents de scie désaccordées, attaque et extinction lentes (temps réel ; filtres partagés du canal). */
  private nappe(e: Evenement, t: number, d: number): void {
    const ctx = this.ctx;
    const f = freq(e.m);
    const g = ctx.createGain();
    const a = 0.1 * e.v;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(a, t + Math.min(0.8, d * 0.4));
    g.gain.setValueAtTime(a, t + d);
    g.gain.setTargetAtTime(0.0001, t + d, 0.35);
    g.connect(this.canal('nappe'));
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
    this.maitre.gain.setValueAtTime(this.maitre.gain.value, t);
    this.maitre.gain.linearRampToValueAtTime(vers, t + duree);
  }

  fermer(t: number): void {
    const ctx = this.ctx;
    const ms = Math.max(0, (t - ctx.currentTime) * 1000) + 4000;
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
  t0: number;
  p: number;
  spb: number;
  ev: Evenement[];
  i: number;
  fin: number;
  graine: number;
  o: OptVersion;
  arret: number | null;
}

export class Lecteur {
  private cur: Instance | null = null;
  private sortantes: Instance[] = [];
  private bus: GainNode;
  /** Mesures (outil de rendu) : seuls ces instruments jouent. */
  solo: ReadonlySet<InstrId> | null = null;

  constructor(private ctx: BaseAudioContext, sortie: AudioNode, private banque: BanqueAudio, private graine = 1) {
    this.bus = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 2.2; comp.attack.value = 0.02; comp.release.value = 0.3;
    this.bus.connect(comp).connect(sortie);
  }

  enCours(): VersionId | null { return this.cur?.v.id ?? null; }

  /** Le début de la prochaine mesure de la version en cours (ou maintenant). */
  prochaineMesure(apres = this.ctx.currentTime + 0.05): number {
    const c = this.cur;
    if (!c) return apres;
    const mes = c.v.mesure * c.spb;
    return c.t0 + Math.ceil((apres - c.t0) / mes - 1e-6) * mes;
  }

  /** Joue une version : la précédente s'efface sur la mesure ; levée si la version commence seule. */
  jouer(id: VersionId, o: { quand?: number; fondu?: number; options?: OptVersion; intro?: boolean } = {}): void {
    const v = VERSIONS[id];
    const quand = o.quand ?? (this.cur ? this.prochaineMesure() : this.ctx.currentTime + 0.1);
    const fondu = o.fondu ?? 1.2;
    if (this.cur) {
      this.cur.mel.fondu(quand, 0.0001, fondu);
      this.cur.arret = quand + fondu;
      this.cur.mel.fermer(quand + fondu);
      this.sortantes.push(this.cur);
    }
    const mel = new Melangeur(this.ctx, this.bus, this.banque, { salle: v.salle, lofi: v.lofi ?? false, pedale: v.pedale ?? false, gain: v.gain, mix: v.mix });
    if (this.cur) { mel.maitre.gain.value = 0.0001; mel.fondu(quand, v.gain, fondu * 0.6); }
    const intro = (o.intro ?? !this.cur) && !!v.intro;
    const inst: Instance = { v, mel, t0: quand, p: intro ? -1 : 0, spb: 60 / v.tempo, ev: [], i: 0, fin: quand, graine: this.graine, o: o.options ?? {}, arret: null };
    this.preparer(inst, quand);
    this.cur = inst;
  }

  /** Change la variation de la mélodie à partir du prochain passage. */
  varier(o: OptVersion): void { if (this.cur) this.cur.o = o; }

  private preparer(inst: Instance, t0: number): void {
    const { ev, duree } = passage(inst.v, inst.p, inst.graine, inst.o);
    inst.t0 = t0;
    inst.ev = ev;
    inst.i = 0;
    inst.fin = t0 + duree * inst.spb;
  }

  /** Planifie tout ce qui commence avant `jusqua` (secondes, horloge du contexte). */
  avancer(jusqua: number): void {
    for (const inst of [this.cur, ...this.sortantes]) {
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
          inst.mel.note(e, t, e.d * inst.spb);
        }
        if (inst.i < inst.ev.length || inst.fin >= jusqua || (inst.arret !== null && inst.fin > inst.arret)) break;
        inst.p++;
        this.preparer(inst, inst.fin);
      }
    }
    this.sortantes = this.sortantes.filter((s) => s.arret === null || s.arret > this.ctx.currentTime - 1);
  }

  /** Joue un jingle (sur le prochain temps de la version en cours, sinon tout de suite) ; renvoie sa durée en secondes. */
  jingle(id: JingleId, quand?: number): number {
    const j: DefJingle = JINGLES[id];
    let t = quand ?? this.ctx.currentTime + 0.05;
    if (quand === undefined && this.cur) {
      const b = this.cur.spb;
      t = this.cur.t0 + Math.ceil((t - this.cur.t0) / b) * b;
    }
    const mel = new Melangeur(this.ctx, this.bus, this.banque, { salle: j.salle, gain: j.gain, mix: j.mix });
    const spb = 60 / j.tempo;
    for (const e of j.ev()) mel.note(e, t + e.t * spb, e.d * spb);
    mel.fermer(t + j.duree * spb + 3);
    return j.duree * spb;
  }

  /** Efface la musique (fondu). */
  arreter(fondu = 1.2): void {
    const t = this.ctx.currentTime + 0.02;
    if (this.cur) {
      this.cur.mel.fondu(t, 0.0001, fondu);
      this.cur.arret = t + fondu;
      this.cur.mel.fermer(t + fondu);
      this.sortantes.push(this.cur);
      this.cur = null;
    }
  }

  /** Effacement léger (dialogues) : `db` négatif, rendu à 0 pour revenir. */
  effacer(db: number, duree = 0.4): void {
    const g = 10 ** (db / 20);
    const t = this.ctx.currentTime;
    this.bus.gain.setTargetAtTime(g, t, duree / 3);
  }
}

/** Durée (secondes) de `passes` passages d'une version, levée comprise. */
export function dureeVersion(id: VersionId, passes: number, intro = true): number {
  const v = VERSIONS[id];
  return ((intro && v.intro ? v.intro.duree : 0) + v.duree * passes) * (60 / v.tempo);
}
