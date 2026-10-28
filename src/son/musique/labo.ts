/**
 * M13 — laboratoire d'écoute (`?musique=1`), à part du jeu, chargé à la demande : chaque version, les jingles, les
 * variations à la volée (à l'envers, renversée, autre mode, valeurs doublées), les transitions sur la mesure. Rendu hors
 * ligne pour les outils de QA (`?qa=1` : `window.__musique`). Contrat `docs/m13/01_MUSIQUE.md`, §6.
 */
import { fabriquer, type BanqueBrute, type Zone } from './banque';
import { JINGLES, VERSIONS, type JingleId, type OptVersion, type VariationMelodie, type VersionId } from './catalogue';
import type { InstrId } from './generateurs';
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

const TOUS: InstrId[] = ['piano', 'rhodes', 'vibra', 'basse', 'ride', 'cloche', 'crash', 'charley', 'charley-ferme', 'gc', 'cc', 'cc-balai', 'balai', 'rim'];

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

/** Rendu hors ligne d'une version (`passes` passages, levée comprise), d'un jingle ou d'un scénario interactif. */
export async function rendre(cible: { version?: VersionId; jingle?: JingleId; scenario?: Scenario }, o: { passes?: number; graine?: number; sr?: number; options?: OptVersion; intro?: boolean; solo?: InstrId[] } = {}): Promise<Rendu> {
  const sr = o.sr ?? 44100;
  const t0 = performance.now();
  const sc = cible.scenario;
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

export function lancerLabo(o: { qa: boolean }): void {
  document.title = 'Laboratoire de la musique';
  // le laboratoire est à part du jeu : ses calques (plateau, enveloppe, scène) sont masqués
  for (const id of ['app', 'shell', 'arena', 'stage', 'activations']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const style = h('style', {}, `
    body { margin: 0; background: #0d0b10; color: #eae2d2; font: 15px/1.5 system-ui, sans-serif; }
    .lab { max-width: 880px; margin: 0 auto; padding: 24px 16px 60px; }
    h1 { font: 600 28px Georgia, serif; color: #f1d58f; margin: 0 0 4px; }
    h2 { font: 600 17px Georgia, serif; color: #e8c97a; margin: 22px 0 8px; }
    p { color: #c9bfae; margin: 6px 0; }
    .rang { display: flex; flex-wrap: wrap; gap: 8px; }
    button { font: inherit; padding: 8px 12px; border-radius: 8px; border: 1px solid #5c4d37; background: #1c1712; color: #f3e8d2; cursor: pointer; }
    button:hover { border-color: #d9b26a; } button.on { background: #d9b26a; color: #1a130b; border-color: #d9b26a; }
    .etat { margin-top: 14px; padding: 10px 12px; border-radius: 8px; background: #17131b; border: 1px solid #3a3040; min-height: 1.5em; }
    label { display: inline-flex; gap: 8px; align-items: center; }
  `);
  const etat = h('div', { class: 'etat', 'data-key': 'mu-etat' }, 'Cliquez une version pour lancer le son (le navigateur exige un geste).');
  let ctx: AudioContext | null = null;
  let lecteur: Lecteur | null = null;
  let banque: BanqueAudio | null = null;
  let variation: VariationMelodie = 'originale';
  let timer: number | null = null;
  const volume = (() => { const g = { v: 0.8 }; return g; })();
  let general: GainNode | null = null;

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

  const boutonsV = (Object.keys(VERSIONS) as VersionId[]).map((id) => {
    const b = h('button', { 'data-key': `mu-${id}` }, `${id} · ${VERSIONS[id].titre.replace('Les Quatre Voies — ', '')}`);
    b.onclick = async () => {
      const l = await pret();
      void ctx!.resume();
      l.jouer(id, { options: { melodie: variation } });
      boutonsV.forEach((x) => x.classList.toggle('on', x === b));
      etat.textContent = `${VERSIONS[id].titre} · ${VERSIONS[id].tempo} à la noire · salle « ${VERSIONS[id].salle} »${VERSIONS[id].lofi ? ' · lofi' : ''}. Chaque passage est regénéré.`;
    };
    return b;
  });
  const boutonsJ = (Object.keys(JINGLES) as JingleId[]).map((id) => {
    const b = h('button', { 'data-key': `mu-j-${id}` }, JINGLES[id].titre);
    b.onclick = async () => { const l = await pret(); void ctx!.resume(); l.jingle(id); };
    return b;
  });
  const VARS: Array<[VariationMelodie, string]> = [['originale', 'Originale'], ['envers', 'À l\'envers'], ['renversee', 'Renversée'], ['mineur', 'Mode mineur'], ['lente', 'Valeurs doublées']];
  const boutonsVar = VARS.map(([k, t]) => {
    const b = h('button', { 'data-key': `mu-var-${k}` }, t);
    b.onclick = () => {
      variation = k;
      boutonsVar.forEach((x) => x.classList.toggle('on', x === b));
      const id = lecteur?.enCours();
      if (lecteur && id) lecteur.jouer(id, { options: { melodie: variation }, intro: false });
    };
    return b;
  });
  boutonsVar[0]!.classList.add('on');
  const stop = h('button', { 'data-key': 'mu-stop' }, 'Arrêter');
  stop.onclick = () => { lecteur?.arreter(); boutonsV.forEach((x) => x.classList.remove('on')); };
  const demo = h('button', { 'data-key': 'mu-demo' }, 'Transitions : menus → titre → victoire → récit');
  demo.onclick = async () => {
    const l = await pret();
    void ctx!.resume();
    l.jouer('I-2');
    setTimeout(() => l.jouer('I-1'), 9000);
    setTimeout(() => { l.arreter(0.6); l.jingle('victoire'); }, 20000);
    setTimeout(() => l.jouer('I-3'), 24000);
  };
  const vol = h('input', { type: 'range', min: '0', max: '100', value: '80', 'data-key': 'mu-volume' }) as HTMLInputElement;
  vol.oninput = () => { volume.v = Number(vol.value) / 100; if (general && ctx) general.gain.setTargetAtTime(volume.v, ctx.currentTime, 0.05); };

  document.body.append(style, h('main', { class: 'lab', 'data-key': 'mu-labo' },
    h('h1', {}, 'Laboratoire de la musique'),
    h('p', {}, 'M13, lot MU-A : le thème « Les Quatre Voies » en trois versions et les quatre jingles, synthétisés par le code (aucun fichier son). Chaque passage regénère la basse, l\'accompagnement et la batterie.'),
    h('h2', {}, 'Versions'), h('div', { class: 'rang' }, ...boutonsV, stop),
    h('h2', {}, 'Variations à la volée (la mélodie de la tête, à la manière de Zelda)'), h('div', { class: 'rang' }, ...boutonsVar),
    h('h2', {}, 'Jingles'), h('div', { class: 'rang' }, ...boutonsJ),
    h('h2', {}, 'Transitions'), h('div', { class: 'rang' }, demo),
    h('h2', {}, 'Volume'), h('label', {}, vol),
    etat));
  window.addEventListener('pagehide', () => { if (timer !== null) clearInterval(timer); void ctx?.close(); });
  if (o.qa) (window as unknown as Record<string, unknown>).__musique = { rendre, versions: Object.keys(VERSIONS), jingles: Object.keys(JINGLES), TOUS };
}
