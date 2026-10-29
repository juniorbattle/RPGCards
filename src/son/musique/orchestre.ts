/**
 * M13 — l'orchestre du jeu (Web Audio) : le lecteur branché sur le bus de la musique, ses instruments calculés dans un
 * worker au premier geste (ceux de la musique demandée d'abord, les autres ensuite), et l'application des consignes du
 * chef (`chef.ts`) sans rien couper en plein vol (contrat `docs/m13/02_MUSIQUE_INTERACTIVE.md`, §1 et §2) : un
 * changement de morceau s'efface, laisse un silence, puis le nouveau commence par sa levée (`enchainement.ts`) ; le
 * passage au duel tendu se fait par un break sur la phrase ; un changement d'arrangement (chapitre) reprend la version
 * sur la mesure ; l'intensité change au passage suivant ; les couches entrent et sortent sur la mesure ; une ponctuation
 * tombe sur le temps ; la fin d'un duel s'arrête sur le temps fort, puis le jingle, un silence, et la musique suivante.
 * Chargé à la demande (`import()`), jamais avant un geste.
 */
import { DEFS, type BanqueBrute, type Zone } from './banque';
import { VERSIONS, type JingleId, type VersionId } from './catalogue';
import type { Consigne } from './chef';
import { FONDU_SORTIE_S, SILENCE_S, finArret } from './enchainement';
import type { InstrId } from './generateurs';
import { Lecteur, type BanqueAudio } from './lecteur';
import type { PonctuationId } from './ponctuations';

/** La banque calculée dans un worker, échantillon par échantillon (`recu` à chaque échantillon). */
export function banqueWorker(sr: number, instrs: InstrId[], progres: (n: number, total: number) => void, recu?: (instr: InstrId, z: Zone) => void): Promise<BanqueBrute> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./banque.worker.ts', import.meta.url), { type: 'module' });
    const b: BanqueBrute = {};
    let n = 0;
    w.onmessage = (e: MessageEvent<(Zone & { instr: InstrId }) | { fini: true; total: number }>) => {
      const d = e.data;
      if ('fini' in d) { w.terminate(); resolve(b); return; }
      const z: Zone = { racine: d.racine, couche: d.couche, sr: d.sr, data: d.data };
      (b[d.instr] ??= []).push(z);
      recu?.(d.instr, z);
      progres(++n, 0);
    };
    w.onerror = (err) => { w.terminate(); reject(err); };
    w.postMessage({ sr, instrs });
  });
}

const CALCULES = Object.keys(DEFS) as InstrId[];

export interface EtatOrchestre { pret: boolean; version: VersionId | null; couches: Record<string, number>; libre: number; focus: boolean; assourdi: boolean; sources: Record<string, { version: VersionId | null; x: number }> }

export class Orchestre {
  private readonly lecteur: Lecteur;
  private readonly banque: BanqueAudio = {};
  private timer: number | null = null;
  private voulu: Consigne = { version: null };
  private joue: { version: VersionId | null; cle: string; couches: Record<string, number> } = { version: null, cle: '', couches: {} };
  /** Fin du dernier jingle de fin : la musique suivante attend jusque-là. */
  private libre = 0;
  private pret = false;
  private etatFocus = false;
  private etatSourd = false;
  private sources = new Map<string, { version: VersionId | null; x: number }>();
  private sourdine: number | null = null;

  constructor(private readonly ctx: AudioContext, sortie: AudioNode, graine = 1) {
    this.lecteur = new Lecteur(ctx, sortie, this.banque, graine);
    this.reprendre();
  }

  /** Calcule les instruments : ceux de `d'abord` (la musique demandée), puis tous les autres, en arrière-plan. */
  async charger(dabord: VersionId | null): Promise<void> {
    const premiers = dabord ? VERSIONS[dabord].instruments.filter((i) => CALCULES.includes(i)) : CALCULES;
    const ajouter = (instr: InstrId, z: Zone): void => {
      const buf = this.ctx.createBuffer(1, z.data.length, z.sr);
      buf.copyToChannel(z.data, 0);
      (this.banque[instr] ??= []).push({ racine: z.racine, couche: z.couche, buffer: buf });
    };
    await banqueWorker(this.ctx.sampleRate, premiers, () => {}, ajouter);
    this.pret = true;
    this.appliquer(this.voulu);
    const reste = CALCULES.filter((i) => !premiers.includes(i));
    if (reste.length) await banqueWorker(this.ctx.sampleRate, reste, () => {}, ajouter);
  }

  /** Arrête la planification (volume de la musique à 0 : aucune note calculée ni jouée). */
  suspendre(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.lecteur.arreter(0.3);
    this.joue = { version: null, cle: '', couches: {} };
  }

  reprendre(): void {
    if (this.timer !== null) return;
    // planification en avance sur l'horloge audio ; un onglet caché ne réveille ses minuteries qu'une fois par seconde
    this.timer = window.setInterval(() => this.lecteur.avancer(this.ctx.currentTime + (document.hidden ? 1.6 : 0.3)), 25);
    if (this.pret) this.appliquer(this.voulu);
  }

  /** Ce qui doit jouer (idempotent : appelé à chaque image, il ne fait rien si rien ne change). */
  appliquer(c: Consigne, o: { assourdie?: boolean } = {}): void {
    this.voulu = c;
    if (!this.pret || this.timer === null) return;
    const l = this.lecteur;
    const now = this.ctx.currentTime;
    const opts = c.options ?? {};
    const cle = `${opts.chapitre ?? ''}|${opts.melodie ?? ''}`;
    const couches = c.couches ?? {};
    if (c.version !== this.joue.version) {
      // vers le silence : le morceau s'efface, et rien ne reprend avant la fin du silence qui suit
      if (!c.version) {
        if (l.enCours()) { l.arreter(FONDU_SORTIE_S); this.libre = finArret(now, this.libre); }
        this.joue = { version: null, cle: '', couches: {} };
        return;
      }
      const enCours = l.enCours();
      // un autre morceau : effacement, silence, puis la levée du nouveau ; le duel qui se tend : un break
      const quand = l.enchainer(c.version, { options: opts, couches, libre: this.libre, ...(c.salle ? { salle: c.salle } : {}) }).debut;
      // la ville s'assourdit jusqu'au premier temps du duel
      if (o.assourdie && enCours) {
        l.assourdir(true);
        if (this.sourdine !== null) clearTimeout(this.sourdine);
        this.sourdine = window.setTimeout(() => { this.sourdine = null; l.assourdir(this.etatSourd); }, Math.max(0, (quand - now) * 1000 + 120));
      }
    } else if (c.version) {
      if (cle !== this.joue.cle) l.jouer(c.version, { options: opts, couches, intro: false, ...(c.salle ? { salle: c.salle } : {}) });
      else {
        if (opts.intensite !== undefined) l.contexte({ intensite: opts.intensite });
        const diff: Record<string, number> = {};
        for (const [k, v] of Object.entries(couches)) if ((this.joue.couches[k] ?? -1) !== v) diff[k] = v;
        if (Object.keys(diff).length) l.couches(diff, { sur: 'mesure' });
      }
    }
    this.joue = { version: c.version, cle, couches: { ...couches } };
  }

  ponctuer(id: PonctuationId): void { if (this.pret && this.timer !== null) this.lecteur.ponctuer(id); }

  /** La fin d'un duel : arrêt sur le temps fort, le jingle ; la musique suivante attend la fin du jingle. */
  finir(j: 'victoire' | 'defaite'): void {
    if (!this.pret || this.timer === null) return;
    const l = this.lecteur;
    const t = l.enCours() ? l.terminer() : this.ctx.currentTime + 0.05;
    const d = l.jingle(j, t + 0.6);
    // un silence après le jingle, puis la musique suivante par sa levée
    this.libre = t + 0.6 + d + SILENCE_S;
    this.joue = { version: null, cle: '', couches: {} };
    this.voulu = { version: null };
  }

  /** Un jingle par-dessus la musique (carte gagnée, nouveau chapitre) : le fond s'efface le temps du jingle. */
  jingle(id: JingleId): void {
    if (!this.pret || this.timer === null) return;
    const l = this.lecteur;
    const now = this.ctx.currentTime;
    // après le jingle de fin d'un duel (la carte gagnée suit la victoire) : à sa suite, et le silence se déplace après lui
    if (this.libre > now && !l.enCours()) {
      const t = Math.max(now + 0.05, this.libre - SILENCE_S + 0.3);
      this.libre = t + l.jingle(id, t) + SILENCE_S;
      return;
    }
    const t = Math.max(l.enCours() ? l.prochain('temps') : now + 0.05, this.libre);
    const d = l.jingle(id, t);
    l.retirer(-9, t, d);
  }

  focus(on: boolean): void { if (on !== this.etatFocus) { this.etatFocus = on; this.lecteur.focus(on); } }
  assourdir(on: boolean): void { if (on !== this.etatSourd) { this.etatSourd = on; this.lecteur.assourdir(on); } }

  /** Une source de la ville (le combo du Fanal) : sa version, et la proximité du joueur (0 à 1). */
  source(nom: string, version: VersionId | null, x: number): void {
    if (!this.pret || this.timer === null) return;
    const s = this.sources.get(nom);
    if (!s || s.version !== version) {
      this.lecteur.source(nom, version);
      this.sources.set(nom, { version, x: -1 });
    }
    const cur = this.sources.get(nom)!;
    if (version && Math.abs(cur.x - x) >= 0.02) { this.lecteur.proximite(nom, x); cur.x = x; }
  }

  etat(): EtatOrchestre {
    return { pret: this.pret, version: this.lecteur.enCours(), couches: { ...this.joue.couches }, libre: this.libre, focus: this.etatFocus, assourdi: this.etatSourd, sources: Object.fromEntries(this.sources) };
  }

  fermer(): void {
    this.suspendre();
    if (this.sourdine !== null) clearTimeout(this.sourdine);
  }
}
