/**
 * M13 — laboratoire d'écoute (`?musique=1`), à part du jeu, chargé à la demande : chaque version, les jingles, les
 * variations à la volée (à l'envers, renversée, autre mode, valeurs doublées), les transitions sur la mesure. Rendu hors
 * ligne pour les outils de QA (`?qa=1` : `window.__musique`). Contrat `docs/m13/01_MUSIQUE.md`, §6.
 */
import { fabriquer, type BanqueBrute, type Zone } from './banque';
import { JINGLES, VERSIONS, type JingleId, type OptVersion, type VariationMelodie, type VersionId } from './catalogue';
import { makeRng } from '../../game/engine/rng';
import type { SalleId } from './effets';
import { accordsTenus, basseDeux, comping, versEvenements, type Evenement, type InstrId } from './generateurs';
import { QUATRE_VOIES } from './partitions';
import { transposer } from './variations';
import { dureeVersion, Lecteur, versAudio, type BanqueAudio } from './lecteur';
import type { PonctuationId } from './ponctuations';

/**
 * Une action d'un scénario de rendu (secondes depuis le début) : la musique interactive (couches, ponctuations, fin de
 * duel, sources, focus) rendue hors ligne et mesurée comme un morceau (contrat 2, §4).
 */
export type Action =
  | { t: number; faire: 'jouer'; version: VersionId; options?: OptVersion; fondu?: number; intro?: boolean; piste?: string }
  | { t: number; faire: 'contexte'; options: OptVersion; piste?: string }
  | { t: number; faire: 'couches'; niveaux: Record<string, number>; sur?: 'temps' | 'fort' | 'mesure' | 'phrase'; duree?: number; piste?: string }
  | { t: number; faire: 'ponctuer'; id: PonctuationId }
  | { t: number; faire: 'terminer'; jingle?: JingleId }
  | { t: number; faire: 'jingle'; id: JingleId }
  | { t: number; faire: 'arreter'; fondu?: number; piste?: string }
  | { t: number; faire: 'focus'; on: boolean }
  | { t: number; faire: 'assourdir'; on: boolean }
  | { t: number; faire: 'source'; nom: string; version: VersionId | null }
  | { t: number; faire: 'proximite'; nom: string; x: number };
export interface Scenario { duree: number; actions: Action[] }

/** Applique une action au lecteur (laboratoire, scénarios de rendu). */
export function agir(l: Lecteur, a: Action): void {
  switch (a.faire) {
    case 'jouer': l.jouer(a.version, { options: a.options, fondu: a.fondu, intro: a.intro, piste: a.piste }); break;
    case 'contexte': l.contexte(a.options, a.piste); break;
    case 'couches': l.couches(a.niveaux, { sur: a.sur, duree: a.duree, piste: a.piste }); break;
    case 'ponctuer': l.ponctuer(a.id); break;
    case 'terminer': { const t = l.terminer(); if (a.jingle) l.jingle(a.jingle, t + 0.6); break; }
    case 'jingle': l.jingle(a.id); break;
    case 'arreter': l.arreter(a.fondu, a.piste); break;
    case 'focus': l.focus(a.on); break;
    case 'assourdir': l.assourdir(a.on); break;
    case 'source': l.source(a.nom, a.version); break;
    case 'proximite': l.proximite(a.nom, a.x); break;
  }
}

/** Les instruments qu'un scénario fait jouer (versions jouées, jingles, ponctuations). */
function instrumentsDe(sc: Scenario): InstrId[] {
  const s = new Set<InstrId>(['piano', 'vibra', 'basse', 'crash', 'cloche', 'gc', 'cc']);
  for (const a of sc.actions) {
    if ((a.faire === 'jouer' || a.faire === 'source') && a.version) VERSIONS[a.version].instruments.forEach((i) => s.add(i));
    if (a.faire === 'jingle') JINGLES[a.id].instruments.forEach((i) => s.add(i));
    if (a.faire === 'terminer' && a.jingle) JINGLES[a.jingle].instruments.forEach((i) => s.add(i));
  }
  return [...s];
}

const TOUS: InstrId[] = ['piano', 'rhodes', 'vibra', 'basse', 'guitare', 'nylon', 'ride', 'cloche', 'crash', 'charley', 'charley-ferme', 'gc', 'cc', 'cc-balai', 'balai', 'rim'];
/** Les instruments à écouter seuls (laboratoire, aperçus) : la mélodie du premier A dans leur registre, accompagnée. */
export const DEMOS: InstrId[] = ['trompette', 'sax', 'flute', 'cuivres', 'cordes', 'guitare', 'nylon', 'piano', 'rhodes', 'vibra'];

/** Démonstration d'un instrument : le premier A du thème I dans son registre (piano et contrebasse discrets dessous). */
export function demo(instr: InstrId): { ev: Evenement[]; tempo: number; salle: SalleId } {
  const rng = makeRng(0xde40 + instr.length);
  const A = QUATRE_VOIES.sections.A1!;
  const oct: Partial<Record<InstrId, number>> = { sax: -12, guitare: -12, nylon: -12 };
  const mel = transposer(A.melodie, oct[instr] ?? 0);
  const ev: Evenement[] = [];
  if (instr === 'cuivres') {
    ev.push(...comping(A.accords, 32, rng, { instr: 'cuivres', densite: 0.35, vel: 0.7, tessiture: { lo: 55, hi: 79 } }));
    ev.push(...versEvenements(mel, 'vibra', 0.6));
  } else if (instr === 'cordes') {
    ev.push(...accordsTenus(A.accords, 32, rng, { instr: 'cordes', tessiture: { lo: 50, hi: 74 }, vel: 0.45, melodie: mel }));
    ev.push(...versEvenements(mel, 'cordes', 0.6));
  } else {
    // ornements des vents : coulé par en dessous sur les notes longues qui suivent un silence, chute à la fin
    const notes = versEvenements(mel, instr, 0.68).map((e, i, xs) => {
      const avant = xs[i - 1];
      if (i === xs.length - 1) return { ...e, orn: 'chute' as const };
      if (e.d >= 1.5 && (!avant || e.t - (avant.t + avant.d) > 0.4)) return { ...e, orn: 'scoop' as const };
      return e;
    });
    ev.push(...notes);
    if (instr !== 'piano') ev.push(...comping(A.accords, 32, rng, { instr: 'piano', densite: 0.4, vel: 0.36, tessiture: { lo: 48, hi: 66 } }));
  }
  ev.push(...basseDeux(A.accords, 32, rng).map((e) => ({ ...e, v: e.v * 0.8 })));
  return { ev: ev.map((e) => ({ ...e, t: e.t + 0.5 })), tempo: 116, salle: 'club' };
}

/** La fondamentale par autocorrélation (QA des instruments en temps réel). */
function f0Estimee(x: Float32Array, sr: number, fmin: number, fmax: number, debut: number, duree: number): number {
  const a = Math.round(debut * sr);
  const n = Math.round(duree * sr);
  const r = (lag: number) => { let s = 0; for (let i = a; i < a + n; i++) s += x[i]! * x[i + lag]!; return s; };
  let best = -Infinity;
  let bl = 0;
  for (let lag = Math.floor(sr / fmax); lag <= Math.ceil(sr / fmin); lag++) { const s = r(lag); if (s > best) { best = s; bl = lag; } }
  const y0 = r(bl - 1), y1 = r(bl), y2 = r(bl + 1);
  const dx = (y0 - y2) / (2 * (y0 - 2 * y1 + y2));
  return sr / (bl + (Number.isFinite(dx) ? dx : 0));
}

/** Justesse d'un instrument (écart en cents de chaque note jouée seule, à sec). */
export async function justesse(instr: InstrId, notes: number[], sr = 44100): Promise<Array<{ m: number; cents: number }>> {
  const out: Array<{ m: number; cents: number }> = [];
  const brute = fabriquer(sr, [instr]);
  for (const m of notes) {
    const ctx = new OfflineAudioContext(1, Math.ceil(1.2 * sr), sr);
    const l = new Lecteur(ctx, ctx.destination, versAudio(ctx, brute), 1);
    l.brut([{ t: 0, d: 0.45, instr, m, v: 0.6 }], { tempo: 60, quand: 0.05, mix: { [instr]: { rev: 0 } } });
    const buf = await ctx.startRendering();
    const f0 = 440 * 2 ** ((m - 69) / 12);
    const f = f0Estimee(buf.getChannelData(0), sr, f0 * 0.8, f0 * 1.25, 0.17, 0.2);
    out.push({ m, cents: Math.round(1200 * Math.log2(f / f0) * 10) / 10 });
  }
  return out;
}

/** La banque calculée dans un worker, échantillon par échantillon (progression affichée). */
function banqueWorker(sr: number, instrs: InstrId[], progres: (n: number, total: number) => void): Promise<BanqueBrute> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./banque.worker.ts', import.meta.url), { type: 'module' });
    const b: BanqueBrute = {};
    let n = 0;
    w.onmessage = (e: MessageEvent<(Zone & { instr: InstrId }) | { fini: true; total: number }>) => {
      const d = e.data;
      if ('fini' in d) { w.terminate(); resolve(b); return; }
      (b[d.instr] ??= []).push({ racine: d.racine, couche: d.couche, sr: d.sr, data: d.data });
      progres(++n, 0);
    };
    w.onerror = (err) => { w.terminate(); reject(err); };
    w.postMessage({ sr, instrs });
  });
}

/** WAV 16 bits stéréo d'un tampon audio. */
export function encoderWav(buf: AudioBuffer): Uint8Array {
  const n = buf.length;
  const ch = buf.numberOfChannels;
  const out = new Uint8Array(44 + n * ch * 2);
  const dv = new DataView(out.buffer);
  const ecrire = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  ecrire(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * 2, true); ecrire(8, 'WAVE'); ecrire(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, buf.sampleRate, true);
  dv.setUint32(28, buf.sampleRate * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true);
  ecrire(36, 'data'); dv.setUint32(40, n * ch * 2, true);
  const canaux = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, canaux[c]![i]!)); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return out;
}

export interface Rendu { wav: Uint8Array; duree: number; msBanque: number; msRendu: number }

/** Rendu hors ligne d'une version (`passes` passages, levée comprise), d'un jingle, d'un scénario ou d'une démonstration. */
export async function rendre(cible: { version?: VersionId; jingle?: JingleId; scenario?: Scenario; demo?: InstrId }, o: { passes?: number; graine?: number; sr?: number; options?: OptVersion; intro?: boolean; solo?: InstrId[] } = {}): Promise<Rendu> {
  const sr = o.sr ?? 44100;
  const t0 = performance.now();
  const sc = cible.scenario;
  if (cible.demo) {
    const d = demo(cible.demo);
    const brute = fabriquer(sr, [...new Set(d.ev.map((e) => e.instr))]);
    const msBanque = performance.now() - t0;
    const fin = Math.max(...d.ev.map((e) => e.t + e.d)) * (60 / d.tempo);
    const duree = fin + 3.5;
    const ctx = new OfflineAudioContext(2, Math.ceil(duree * sr), sr);
    const l = new Lecteur(ctx, ctx.destination, versAudio(ctx, brute), 1);
    l.brut(d.ev, { tempo: d.tempo, salle: d.salle, quand: 0.05 });
    const t1 = performance.now();
    const buf = await ctx.startRendering();
    return { wav: encoderWav(buf), duree, msBanque, msRendu: performance.now() - t1 };
  }
  const instrs = sc ? instrumentsDe(sc) : cible.version ? VERSIONS[cible.version].instruments : JINGLES[cible.jingle!].instruments;
  const brute = fabriquer(sr, instrs);
  const msBanque = performance.now() - t0;
  const debut = 0.05;
  const intro = o.intro ?? true;
  const musique = sc ? sc.duree : cible.version ? dureeVersion(cible.version, o.passes ?? 1, intro) : JINGLES[cible.jingle!].duree * (60 / JINGLES[cible.jingle!].tempo);
  const duree = debut + musique + 3.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(duree * sr), sr);
  const l = new Lecteur(ctx, ctx.destination, versAudio(ctx, brute), o.graine ?? 1);
  if (o.solo) l.solo = new Set(o.solo);
  if (sc) {
    // les actions aux instants dits (au quantum de rendu près), la planification par fenêtres d'une seconde entre elles
    const q = 128 / sr;
    const instants = new Map<number, Action[]>();
    const a0 = sc.actions.filter((a) => a.t <= debut);
    for (const a of sc.actions) if (a.t > debut) { const k = Math.ceil(a.t / q) * q; instants.set(k, [...(instants.get(k) ?? []), a]); }
    for (let t = 1; t < duree - 0.5; t += 1) { const k = Math.ceil(t / q) * q; if (!instants.has(k)) instants.set(k, []); }
    a0.forEach((a) => agir(l, a));
    l.avancer(1.25);
    for (const [k, as] of instants) void ctx.suspend(k).then(() => { as.forEach((a) => agir(l, a)); l.avancer(k + 1.25); void ctx.resume(); });
  } else if (cible.version) {
    // planification par fenêtres d'une seconde, comme le lecteur en temps réel (peu de nœuds vivants à la fois : le coût
    // mesuré est celui du jeu)
    const fin = debut + musique - 1e-3;
    l.jouer(cible.version, { quand: debut, intro, options: o.options ?? {} });
    l.avancer(Math.min(fin, 1.25));
    for (let t = 1; t < duree - 0.5; t += 1) {
      const tt = t;
      void ctx.suspend(tt).then(() => { l.avancer(Math.min(fin, tt + 1.25)); void ctx.resume(); });
    }
  } else l.jingle(cible.jingle!, debut);
  const t1 = performance.now();
  const buf = await ctx.startRendering();
  return { wav: encoderWav(buf), duree, msBanque, msRendu: performance.now() - t1 };
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: Array<Node | string>): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...kids);
  return e;
};

const FORMATIONS: Array<[number | undefined, string]> = [[0, 'Prologue et chapitre I (guitare, contrebasse)'], [undefined, 'Chapitres II et III (le trio)'], [4, 'Chapitres IV et V (avec les vents)'], [6, 'Champion']];

export function lancerLabo(o: { qa: boolean }): void {
  document.title = 'Laboratoire de la musique';
  // le laboratoire est à part du jeu : ses calques (plateau, enveloppe, scène) sont masqués
  for (const id of ['app', 'shell', 'arena', 'stage', 'activations']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  // la page du jeu ne défile pas ; celle du laboratoire, si
  const style = h('style', {}, `
    html, body { height: auto !important; overflow: auto !important; position: static !important; }
    body { margin: 0; background: #0d0b10; color: #eae2d2; font: 15px/1.5 system-ui, sans-serif; }
    .lab { max-width: 920px; margin: 0 auto; padding: 24px 16px 60px; }
    h1 { font: 600 28px Georgia, serif; color: #f1d58f; margin: 0 0 4px; }
    h2 { font: 600 17px Georgia, serif; color: #e8c97a; margin: 22px 0 8px; }
    p { color: #c9bfae; margin: 6px 0; }
    .rang { display: flex; flex-wrap: wrap; gap: 8px; }
    button { font: inherit; padding: 8px 12px; border-radius: 8px; border: 1px solid #5c4d37; background: #1c1712; color: #f3e8d2; cursor: pointer; }
    button:hover { border-color: #d9b26a; } button.on { background: #d9b26a; color: #1a130b; border-color: #d9b26a; }
    .etat { margin-top: 14px; padding: 10px 12px; border-radius: 8px; background: #17131b; border: 1px solid #3a3040; min-height: 1.5em; }
    label { display: inline-flex; gap: 8px; align-items: center; }
    input[type=range] { width: min(320px, 70vw); }
  `);
  const etat = h('div', { class: 'etat', 'data-key': 'mu-etat' }, 'Cliquez une version pour lancer le son (le navigateur exige un geste).');
  let ctx: AudioContext | null = null;
  let lecteur: Lecteur | null = null;
  let banque: BanqueAudio | null = null;
  let variation: VariationMelodie = 'originale';
  let chapitre: number | undefined;
  let timer: number | null = null;
  const volume = { v: 0.8 };
  let general: GainNode | null = null;
  const couches: Record<string, number> = { melodie: 0, tension: 0, cuivres: 0 };

  const pret = async (): Promise<Lecteur> => {
    if (lecteur) return lecteur;
    ctx = new AudioContext();
    general = ctx.createGain();
    general.gain.value = volume.v;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
    general.connect(lim).connect(ctx.destination);
    const t0 = performance.now();
    let n = 0;
    const brute = await banqueWorker(ctx.sampleRate, TOUS, (k) => { n = k; etat.textContent = `Calcul des instruments… ${k} échantillons`; });
    banque = versAudio(ctx, brute);
    etat.textContent = `Instruments calculés : ${n} échantillons en ${Math.round(performance.now() - t0)} ms.`;
    lecteur = new Lecteur(ctx, general, banque, 1);
    timer = window.setInterval(() => { if (ctx && lecteur) lecteur.avancer(ctx.currentTime + 0.25); }, 25);
    return lecteur;
  };
  const go = async (f: (l: Lecteur) => void): Promise<void> => { const l = await pret(); void ctx!.resume(); f(l); };
  const options = (): OptVersion => ({ melodie: variation, chapitre });
  const bouton = (cle: string, texte: string, f: (l: Lecteur, b: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = h('button', { 'data-key': cle }, texte);
    b.onclick = () => void go((l) => f(l, b));
    return b;
  };
  const decrire = (id: VersionId): string => {
    const v = VERSIONS[id];
    return `${v.titre} · ${v.tempo} à la noire${v.mesure === 3 ? ', à trois temps' : ''} · salle « ${v.salle} »${v.lofi ? ' · lofi' : ''}. Chaque passage est regénéré.`;
  };

  const ids = Object.keys(VERSIONS) as VersionId[];
  const boutonsV = ids.map((id) => bouton(`mu-${id}`, `${id} · ${VERSIONS[id].titre.replace(/^[^—]+— /, '')}`, (l, b) => {
    l.jouer(id, { options: options() });
    if (VERSIONS[id].couches) { for (const k of Object.keys(couches)) couches[k] = VERSIONS[id].couches![k] ?? 1; majCouches(); }
    boutonsV.forEach((x) => x.classList.toggle('on', x === b));
    etat.textContent = decrire(id);
  }));
  const parTheme = (pre: string) => boutonsV.filter((_, i) => ids[i]!.startsWith(pre) && (pre !== 'I-' || !ids[i]!.startsWith('II') && !ids[i]!.startsWith('III')));
  const stop = bouton('mu-stop', 'Arrêter', (l) => { l.arreter(); boutonsV.forEach((x) => x.classList.remove('on')); });

  // la ville qui grandit
  const boutonsF = FORMATIONS.map(([ch, t]) => {
    const b = h('button', { 'data-key': `mu-ch-${ch ?? 'trio'}` }, t);
    b.onclick = () => {
      chapitre = ch;
      boutonsF.forEach((x) => x.classList.toggle('on', x === b));
      const id = lecteur?.enCours();
      if (lecteur && id?.startsWith('II-')) lecteur.jouer(id, { options: options(), intro: false });
    };
    return b;
  });
  boutonsF[1]!.classList.add('on');

  // le duel : couches et ponctuations
  const boutonsC = (['melodie', 'tension', 'cuivres'] as const).map((k) => {
    const noms = { melodie: 'Mélodie (premier Clash)', tension: 'Tension (PV sous 30 %)', cuivres: 'Cuivres (Signature annoncée)' };
    return bouton(`mu-couche-${k}`, noms[k], (l) => { couches[k] = couches[k]! > 0 ? 0 : 1; l.couches({ [k]: couches[k]! }); majCouches(); });
  });
  const majCouches = (): void => { boutonsC.forEach((b, i) => b.classList.toggle('on', (couches[['melodie', 'tension', 'cuivres'][i]!] ?? 0) > 0)); };
  const ponct = ([['gagne', 'Clash gagné'], ['perdu', 'Clash perdu'], ['signature', 'Signature'], ['prolongation', 'Prolongation']] as const).map(([k, t]) => bouton(`mu-p-${k}`, t, (l) => { l.ponctuer(k); }));
  const fins = ([['victoire', 'Fin : victoire'], ['defaite', 'Fin : défaite']] as const).map(([k, t]) => bouton(`mu-fin-${k}`, t, (l) => { const t0 = l.terminer(); l.jingle(k, t0 + 0.6); boutonsV.forEach((x) => x.classList.remove('on')); }));
  const tendu = bouton('mu-tendu', 'Passer au duel tendu', (l) => { l.jouer('III-2', { fondu: 0.8 }); });

  // la ville : dialogue, entrée en duel, le Fanal
  const dialogue = bouton('mu-focus', 'Dialogue (la musique s\'efface)', (l, b) => { const on = !b.classList.contains('on'); l.focus(on); b.classList.toggle('on', on); });
  const versDuel = bouton('mu-vers-duel', 'Entrer en duel', (l) => { l.assourdir(true); setTimeout(() => { l.jouer('III-1', { fondu: 1 }); l.assourdir(false); }, 1500); });
  const fanal = h('input', { type: 'range', min: '0', max: '100', value: '0', 'data-key': 'mu-fanal' }) as HTMLInputElement;
  let fanalOn = false;
  fanal.oninput = () => void go((l) => { if (!fanalOn) { l.source('fanal', 'I-2'); fanalOn = true; } l.proximite('fanal', Number(fanal.value) / 100); });

  const boutonsJ = (Object.keys(JINGLES) as JingleId[]).map((id) => bouton(`mu-j-${id}`, JINGLES[id].titre, (l) => { l.jingle(id); }));
  const VARS: Array<[VariationMelodie, string]> = [['originale', 'Originale'], ['envers', 'À l\'envers'], ['renversee', 'Renversée'], ['mineur', 'Autre mode'], ['lente', 'Valeurs doublées']];
  const boutonsVar = VARS.map(([k, t]) => {
    const b = h('button', { 'data-key': `mu-var-${k}` }, t);
    b.onclick = () => {
      variation = k;
      boutonsVar.forEach((x) => x.classList.toggle('on', x === b));
      if (lecteur?.enCours() === 'I-1') lecteur.jouer('I-1', { options: options(), intro: false });
    };
    return b;
  });
  boutonsVar[0]!.classList.add('on');
  const boutonsD = DEMOS.map((i) => bouton(`mu-demo-${i}`, i, (l) => {
    l.arreter(0.5);
    const d = demo(i);
    const s = l.brut(d.ev, { tempo: d.tempo, salle: d.salle });
    etat.textContent = `${i} seul : le premier A du thème I dans son registre (${Math.round(s)} s).`;
  }));
  const demoT = bouton('mu-demo', 'Transitions : menus → titre → victoire → récit', (l) => {
    l.jouer('I-2');
    setTimeout(() => l.jouer('I-1'), 9000);
    setTimeout(() => { l.arreter(0.6); l.jingle('victoire'); }, 20000);
    setTimeout(() => l.jouer('I-3'), 24000);
  });
  const vol = h('input', { type: 'range', min: '0', max: '100', value: '80', 'data-key': 'mu-volume' }) as HTMLInputElement;
  vol.oninput = () => { volume.v = Number(vol.value) / 100; if (general && ctx) general.gain.setTargetAtTime(volume.v, ctx.currentTime, 0.05); };

  document.body.append(style, h('main', { class: 'lab', 'data-key': 'mu-labo' },
    h('h1', {}, 'Laboratoire de la musique'),
    h('p', {}, 'M13 : la musique synthétisée par le code (aucun fichier son). Chaque passage regénère la basse, l\'accompagnement, la batterie et les chorus ; les changements tombent sur la mesure, les ponctuations sur le temps, dans l\'accord qui sonne.'),
    h('h2', {}, 'I. « Les Quatre Voies »'), h('div', { class: 'rang' }, ...parTheme('I-'), stop),
    h('h2', {}, 'Variations du titre à la volée (à la manière de Zelda)'), h('div', { class: 'rang' }, ...boutonsVar),
    h('h2', {}, 'II. « La ville la nuit »'), h('div', { class: 'rang' }, ...parTheme('II-')),
    h('p', {}, 'La ville grandit avec l\'histoire :'), h('div', { class: 'rang' }, ...boutonsF),
    h('div', { class: 'rang' }, dialogue, versDuel),
    h('p', {}, 'Le Fanal (un combo de bar, source localisée) : approchez-vous.'), h('label', {}, 'loin', fanal, 'tout près'),
    h('h2', {}, 'III. « Duel »'), h('div', { class: 'rang' }, ...parTheme('III-'), tendu),
    h('p', {}, 'Les couches (elles entrent et sortent sur la mesure) :'), h('div', { class: 'rang' }, ...boutonsC),
    h('p', {}, 'Les ponctuations et la fin du duel :'), h('div', { class: 'rang' }, ...ponct, ...fins),
    h('h2', {}, 'Jingles'), h('div', { class: 'rang' }, ...boutonsJ),
    h('h2', {}, 'Les instruments seuls'), h('div', { class: 'rang' }, ...boutonsD),
    h('h2', {}, 'Transitions'), h('div', { class: 'rang' }, demoT),
    h('h2', {}, 'Volume'), h('label', {}, vol),
    etat));
  window.addEventListener('pagehide', () => { if (timer !== null) clearInterval(timer); void ctx?.close(); });
  if (o.qa) (window as unknown as Record<string, unknown>).__musique = { rendre, justesse, versions: Object.keys(VERSIONS), jingles: Object.keys(JINGLES), demos: DEMOS, TOUS };
}
