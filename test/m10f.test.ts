/**
 * M10-F — parcours complet du mode Aventure, du prologue au titre, pour chacune des quatre familles d'accueil : chaque
 * duel est joué jusqu'au bout sur le moteur réel par l'IA « équilibré » du joueur (graine fixe, l'adversaire verrouille en
 * premier comme le rival du jeu), avec la logique de l'application autour des duels (`fin.ts` : ouverture, fin, faits).
 * Reprise vérifiée à chaque scène : la sauvegarde est écrite, relue (`MagasinAventure`) et le parcours continue sur la
 * copie relue ; chaque duel est sauvegardé au milieu, contrôlé (`verifierDuel`) et repris par rejeu de ses commandes.
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import { PROFILES } from '../src/game/ai/policy';
import { Match } from '../src/game/match';
import { appliquer, chapitre, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { equiperSignature } from '../src/aventure/deck';
import { conclureDuel, ouvrirDuel, REGLES_DUEL } from '../src/aventure/fin';
import { figureDe, ROLES } from '../src/aventure/modele';
import { manche, statutFinale, statutPoule } from '../src/aventure/competitions';
import { collectionDe } from '../src/aventure/registre';
import { pvJoueur } from '../src/aventure/paliers';
import { quetes } from '../src/aventure/quetes';
import { duelChampionnat, duelFigure, duelPrologue, type DuelPrevu } from '../src/aventure/rencontres';
import { CLE_AVENTURE, MagasinAventure, nouvelleSauvegarde, verifierDuel, type AventureSave } from '../src/aventure/sauvegarde';
import { RULES } from '../src/product/resume';
import { duelSeed } from '../src/product/save';

class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

const AT = '2026-10-25T12:00:00.000Z';
const MAX_ESSAIS = 40;

interface Bilan { duels: number; victoires: number; defaites: number; reprises: number; scenes: number; tours: number }

/** Un parcours : la sauvegarde vit dans un stockage en mémoire ; chaque scène est relue avant de continuer. */
class Parcours {
  readonly mem = new Mem();
  readonly store = new MagasinAventure(this.mem, () => new Date(AT));
  s: AventureSave;
  bilan: Bilan = { duels: 0, victoires: 0, defaites: 0, reprises: 0, scenes: 0, tours: 0 };

  constructor(graine: number) {
    this.s = nouvelleSauvegarde(new Date(AT), 'QA Parcours', graine);
    this.scene(() => this.fait({ type: 'scene', id: 'P1' }));
  }

  /** Une scène : appliquer, écrire, relire ; la suite part de la copie relue, identique à l'écrite. */
  scene(f: () => void): void {
    f();
    const w = this.store.ecrire(this.s);
    expect(w, 'écriture de la sauvegarde').toEqual({ ok: true });
    const c = this.store.charger();
    expect(c.status, 'relecture de la sauvegarde').toBe('ok');
    if (c.status !== 'ok') throw new Error('relecture');
    expect(JSON.parse(this.mem.getItem(CLE_AVENTURE)!)).toEqual(JSON.parse(JSON.stringify(this.s)));
    this.s = c.save;
    this.bilan.scenes++;
  }

  fait(ev: Evenement): void {
    const r = appliquer(this.s.etat, ev, AT);
    expect(r.refus, `${ev.type} refusé`).toBeUndefined();
    this.s.etat = r.etat;
  }

  get e(): AventureEtat { return this.s.etat; }

  /** Un duel joué par l'interface de logique de l'application : ouvert, sauvegardé au milieu, repris, conclu. */
  duel(prevuDe: (seed: number) => DuelPrevu): 'victoire' | 'defaite' {
    let prevu!: DuelPrevu;
    this.scene(() => {
      prevu = prevuDe(duelSeed(this.s.profil.graine, this.s.compteur));
      const o = ouvrirDuel(this.s, prevu, AT);
      expect(o.refus).toBeUndefined();
    });
    const d0 = this.s.duel!;
    expect(d0.rules).toBe(RULES);
    const ai = { p2: { profile: PROFILES[prevu.personnalite.aiProfile]!, seed: d0.seed ^ 0xa7 }, p1: { profile: PROFILES.equilibre!, seed: d0.seed ^ 0x51 } };
    let m = new Match(d0.config, ai);
    m.order = ['p2', 'p1'];
    const jouer = (jusquA: number) => {
      while (m.state.phase !== 'ENDED' && m.state.turn <= jusquA) {
        m.stepAi();
        const phase: string = m.state.phase;
        if (phase === 'RESOLVED') m.nextTurn();
        else if (phase !== 'ENDED' && !m.state.awaiting.some((p) => !m.state.pending[p])) throw new Error(`blocage en ${phase}`);
      }
    };
    // milieu du duel : point de sauvegarde (commandes et empreinte), relu, contrôlé, puis repris par rejeu
    jouer(3);
    if (m.state.phase !== 'ENDED') {
      this.scene(() => { Object.assign(this.s.duel!, { commands: structuredClone(m.commands), hash: m.hash(), turn: m.state.turn }); });
      const d = this.s.duel!;
      expect(verifierDuel(d)).toEqual({ ok: true });
      const repris = new Match(d.config, ai);
      repris.order = ['p2', 'p1'];
      for (const c of d.commands) repris.submit(c);
      expect(repris.hash()).toBe(d.hash);
      m = repris;
      this.bilan.reprises++;
    }
    jouer(200);
    expect(m.state.phase).toBe('ENDED');
    const issue = m.state.winner === 'p1' ? 'victoire' : 'defaite';
    this.scene(() => {
      const fin = conclureDuel(this.s, this.s.duel!, m.events, issue, m.state.turn, AT);
      expect(fin.refus).toBeUndefined();
      expect(fin.pv[1]).toBe(fin.pv[0] + 3);
    });
    this.bilan.duels++;
    this.bilan.tours += m.state.turn;
    if (issue === 'victoire') this.bilan.victoires++; else this.bilan.defaites++;
    return issue;
  }

  /** Rejoue un duel jusqu'à la victoire (une défaite ne ferme rien, AV-07). */
  gagner(prevuDe: (seed: number) => DuelPrevu, quoi: string): void {
    for (let k = 0; k < MAX_ESSAIS; k++) if (this.duel(prevuDe) === 'victoire') return;
    throw new Error(`${quoi} : pas de victoire en ${MAX_ESSAIS} duels`);
  }
}

function parcoursComplet(accueil: Family, graine: number): Parcours {
  const p = new Parcours(graine);
  // Prologue : P2, le duel public contre Kaï (son issue ne bloque rien), puis l'affiliation et P8
  p.scene(() => p.fait({ type: 'scene', id: 'P2' }));
  p.duel((seed) => duelPrologue(seed, p.e));
  expect(p.e.prologue).not.toBeNull();
  expect(FAMILIES.every((f) => p.e.familles[f] === 'invite')).toBe(true);
  p.scene(() => p.fait({ type: 'confirmer', famille: accueil }));
  p.scene(() => p.fait({ type: 'scene', id: 'P8' }));
  expect(chapitre(p.e)).toBe('maison');
  // La maison, puis les trois autres voies (engagées à la Salle des Bannières après la Signature de la maison)
  for (const f of [accueil, ...FAMILIES.filter((x) => x !== accueil)]) {
    if (f !== accueil) p.scene(() => p.fait({ type: 'engager', famille: f }));
    for (const r of ROLES) {
      const fig = figureDe(f, r);
      p.gagner((seed) => duelFigure(fig.id, p.e, seed, false), fig.id);
      expect(p.e.vaincues).toContain(fig.id);
    }
    expect(p.e.familles[f]).toBe('chef');
  }
  expect(chapitre(p.e)).toBe('championnat');
  expect(collectionDe(p.e.registre).signatures.sort()).toEqual([...FAMILIES].sort());
  // Le Championnat : la poule (trois chefs, une Signature différente à chaque duel), le Miroir, la Finale
  let derniere: Family | null = null;
  for (let k = 0; manche(p.e.competitions) === 'poule'; k++) {
    if (k > MAX_ESSAIS) throw new Error('poule : trop de duels');
    const vaincus = p.e.competitions.championnat.poule;
    const chef = FAMILIES.find((f) => !vaincus[f])!;
    const sig = FAMILIES.find((f) => statutPoule(p.e.competitions, chef, f).ouvert && f !== derniere)!;
    p.scene(() => { p.s.etat = { ...p.e, deck: equiperSignature(p.e.deck, sig) }; });
    p.duel((seed) => duelChampionnat('poule', p.e, seed, chef, p.s.historique));
    derniere = sig;
  }
  p.gagner((seed) => duelChampionnat('miroir', p.e, seed, undefined, p.s.historique), 'Miroir');
  for (let k = 0; manche(p.e.competitions) === 'finale'; k++) {
    if (k > MAX_ESSAIS) throw new Error('finale : trop de duels');
    const sig = FAMILIES.find((f) => statutFinale(p.e.competitions, f).ouvert)!;
    p.scene(() => { p.s.etat = { ...p.e, deck: equiperSignature(p.e.deck, sig) }; });
    p.duel((seed) => duelChampionnat('finale', p.e, seed, undefined, p.s.historique));
  }
  return p;
}

describe('M10-F — parcours complet du prologue au titre (IA du joueur, graine fixe, reprise à chaque scène)', () => {
  for (const [i, f] of FAMILIES.entries()) {
    it(`famille d'accueil ${f}`, () => {
      const p = parcoursComplet(f, 20261025 + i);
      const e = p.e;
      expect(manche(e.competitions)).toBe('titre');
      expect(e.competitions.championnat.titre).toBe(true);
      expect(chapitre(e)).toBe('champion');
      // PV : 50 + 3 par combat mené à son terme ; historique et compteur cohérents
      expect(e.combats).toBe(p.bilan.duels);
      expect(pvJoueur(e.combats)).toBe(50 + 3 * p.bilan.duels);
      expect(p.s.compteur).toBe(p.bilan.duels);
      expect(p.s.historique.length).toBe(Math.min(60, p.bilan.duels));
      expect(p.s.duel).toBeNull();
      // les quêtes principales sont toutes menées à leur terme
      for (const q of quetes(e).filter((x) => x.type === 'principale')) expect(q.etapes.every((s) => s.faite), q.titre).toBe(true);
      expect(REGLES_DUEL).toBe(RULES);
      console.log(`${f} : ${p.bilan.duels} duels (${p.bilan.victoires} victoires, ${p.bilan.defaites} défaites), ${p.bilan.scenes} scènes relues, ${p.bilan.reprises} duels repris au milieu, ${(p.bilan.tours / p.bilan.duels).toFixed(1)} tours par duel, PV finaux ${pvJoueur(e.combats)}`);
    }, 120000);
  }

  it('déterminisme : la même graine redonne le même parcours, octet pour octet', () => {
    const a = parcoursComplet('Ronce', 777);
    const b = parcoursComplet('Ronce', 777);
    expect(b.mem.getItem(CLE_AVENTURE)).toBe(a.mem.getItem(CLE_AVENTURE));
  }, 120000);
});

describe('M10-F — textes du mode Aventure relus', () => {
  it('rôles accordés, « Parler au … », aucun texte affiché « prototype » ni identifiant brut', async () => {
    const { roleDe, figureDe: fig } = await import('../src/aventure/modele');
    const { parlerA } = await import('../src/aventure/ilots');
    expect(roleDe(fig('Cendre', 'cadet'))).toBe('cadette');
    expect(roleDe(fig('Ronce', 'chef'))).toBe('cheffe');
    expect(roleDe(fig('Cendre', 'chef'))).toBe('chef');
    expect(parlerA('le héraut du Tournoi')).toBe('Parler au héraut du Tournoi');
    expect(parlerA('Kaï')).toBe('Parler à Kaï');
    expect(parlerA('une joueuse du Parvis')).toBe('Parler à une joueuse du Parvis');
    const { readdirSync, readFileSync } = await import('node:fs');
    for (const f of readdirSync('src/aventure').filter((x) => x.endsWith('.ts'))) {
      const code = readFileSync(`src/aventure/${f}`, 'utf8').split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).map((l) => l.replace(/\/\/.*$/, '')).join('\n');
      for (const re of [/['`][^'`]*prototype[^'`]*['`]/i, /Nom du duelliste/, /avenant M10-A\)/, /\(\$\{ROLE_LABEL\./]) expect(re.test(code), `${f} : ${re}`).toBe(false);
    }
  });
});
