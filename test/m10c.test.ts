/**
 * M10-C — la maison : éditeur de deck de l'aventure (R-AV, case par case), écran Collection (vue dérivée du registre),
 * parcours complet d'une famille d'accueil (test paramétré sur les quatre familles), reprise d'un duel de lieutenant
 * fermé en cours, identités V2 des chefs.
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import { TECHNIQUE_IDS } from '../src/game/catalog/techniques';
import { Match } from '../src/game/match';
import { PROFILES } from '../src/game/ai/policy';
import { appliquer, controlerEtat, nouvelleAventure, statutDefi, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { basculerTechnique, choixPourCase, deckMoteur, rangDe, remplacerCase, validerDeckAv, type DeckAv } from '../src/aventure/deck';
import { origineGain, vueCollection } from '../src/aventure/collection';
import { figureDe, FIGURES, isNeutre, ROLES } from '../src/aventure/modele';
import { collectionDe } from '../src/aventure/registre';
import { duelFigure } from '../src/aventure/rencontres';
import { CATALOG_AVENTURE, MagasinAventure, nouvelleSauvegarde, verifierDuel } from '../src/aventure/sauvegarde';
import { CHEF_PERSONALITIES, PERSONALITIES, personalityById } from '../src/presentation/personalities';
import { kitV2 } from '../src/scene/v2';

const AT = '2026-10-20T12:00:00.000Z';
const FAITS0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };

/** Applique les faits un à un ; `apres` est appelé après chacun (contrôles « après chaque gain »). */
function run(e: AventureEtat, evs: Evenement[], apres?: (e: AventureEtat, gains: string[]) => void): { etat: AventureEtat; gains: string[]; refus: string[] } {
  const gains: string[] = [];
  const refus: string[] = [];
  for (const ev of evs) {
    const r = appliquer(e, ev, AT);
    e = r.etat;
    gains.push(...r.gains.map((g) => g.key));
    if (r.refus) refus.push(r.refus);
    apres?.(e, r.gains.map((g) => g.key));
  }
  return { etat: e, gains, refus };
}

const prologue = (): AventureEtat => run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: FAITS0 }]).etat;
const defi = (id: string, issue: 'victoire' | 'defaite' | 'abandon', duel: string): Evenement[] => [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue, duel }];

/** Générateur pseudo-aléatoire de test (graine fixe). */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return s / 2 ** 32; };
}

describe('M10-C — éditeur de deck de l’aventure (R-AV case par case)', () => {
  it('choix d’une case : même Rang, identités libres et possédées, neutres dans la limite de celles possédées', () => {
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }]).etat;
    const col = () => collectionDe(e.registre);
    const iBasic = e.deck.cartes.indexOf('Cendre-3-basic');
    expect(choixPourCase(e.deck, col(), iBasic)).toEqual(['neutre-3', 'Cendre-3-basic']);
    // une neutre de Rang III ne peut pas prendre l'identité Cendre-3, déjà jouée ailleurs
    const iNeutre = e.deck.cartes.indexOf('neutre-3');
    expect(choixPourCase(e.deck, col(), iNeutre)).toEqual(['neutre-3']);
    expect(remplacerCase(e.deck, col(), iNeutre, 'Cendre-3-basic')).toBe(e.deck);
    // la variante gagnée devient un choix de la case de son identité
    e = run(e, defi('cadet-Cendre', 'victoire', 'a1')).etat;
    const i3 = e.deck.cartes.indexOf('Cendre-3-ferveur');
    expect(choixPourCase(e.deck, col(), i3)).toEqual(['neutre-3', 'Cendre-3-basic', 'Cendre-3-ferveur']);
    // rendre la case à une neutre, puis remettre la Basic depuis une case neutre
    let d = remplacerCase(e.deck, col(), i3, 'neutre-3');
    expect(d.cartes.filter((c) => c === 'neutre-3')).toHaveLength(4);
    expect(validerDeckAv(d, col())).toEqual([]);
    d = remplacerCase(d, col(), d.cartes.indexOf('neutre-3'), 'Cendre-3-basic');
    expect(d.cartes.filter((c) => c.startsWith('Cendre-3'))).toEqual(['Cendre-3-basic']);
    expect(validerDeckAv(d, col())).toEqual([]);
    // une carte non possédée n'entre jamais
    expect(remplacerCase(d, col(), d.cartes.indexOf('Cendre-4-basic'), 'Cendre-4-contrecoup')).toBe(d);
    expect(remplacerCase(d, col(), d.cartes.indexOf('neutre-1'), 'Voile-1-basic')).toBe(d);
  });

  it('mille modifications au hasard, à chaque étape de l’ascension : le deck reste légal (R-AV) et trié par Rang', () => {
    const r = rng(0x10c);
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }]).etat;
    const etapes: Evenement[][] = [defi('cadet-Ronce', 'victoire', 'b1'), defi('brasDroit-Ronce', 'victoire', 'b2'), defi('chef-Ronce', 'victoire', 'b3'), [{ type: 'engager', famille: 'Astre' }], defi('cadet-Astre', 'victoire', 'b4')];
    for (const ev of [[], ...etapes]) {
      e = run(e, ev).etat;
      const col = collectionDe(e.registre);
      let d: DeckAv = e.deck;
      for (let k = 0; k < 200; k++) {
        const i = Math.floor(r() * 16);
        const choix = choixPourCase(d, col, i);
        expect(choix).toContain(d.cartes[i]);
        d = remplacerCase(d, col, i, choix[Math.floor(r() * choix.length)]!);
        expect(validerDeckAv(d, col)).toEqual([]);
        expect(d.cartes.map(rangDe)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]);
      }
    }
  });

  it('Techniques : deux au plus, seulement apprises ; retirer puis remettre', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }]).etat;
    const col = collectionDe(e.registre);
    expect(e.deck.techniques).toEqual(['Recentrage', 'Dissipation']);
    let d = basculerTechnique(e.deck, col, 'Sondage');
    expect(d.techniques).toEqual(['Dissipation', 'Sondage']);
    d = basculerTechnique(d, col, 'Sondage');
    expect(d.techniques).toEqual(['Dissipation']);
    expect(validerDeckAv(d, col).map((p) => p.code)).toContain('techniques');
    const inconnue = TECHNIQUE_IDS.find((t) => !col.techniques.includes(t))!;
    expect(basculerTechnique(d, col, inconnue)).toBe(d);
  });
});

describe('M10-C — écran Collection (vue dérivée du registre)', () => {
  it('au départ : seize neutres, rien de familial, chaque carte dit comment l’obtenir', () => {
    const v = vueCollection(nouvelleAventure(AT));
    expect(v.neutres.map((n) => [n.possedees, n.dansDeck])).toEqual([[4, 4], [4, 4], [4, 4], [4, 4]]);
    expect(v.compte).toEqual({ possedees: 0, total: 36 });
    const cendre = v.familles.find((f) => f.famille === 'Cendre')!;
    expect(cendre.basics.every((b) => !b.possedee && /affiliation de la Cendre/.test(b.texte))).toBe(true);
    expect(cendre.variantes.map((x) => x.texte)).toEqual([
      'Gagner l’Épreuve du quartier de la Cendre (trois victoires d’affilée)',
      'Gagner la Joute de la maison de la Cendre',
      'Battre Tessa, cadette de la Cendre',
      'Battre Kaï, la Braise du quai, bras droit de la Cendre',
    ]);
    expect(cendre.signature.texte).toBe('Battre Bran, le Premier Feu, chef de la Cendre');
    expect(v.techniques.filter((t) => t.possedee).map((t) => t.id)).toEqual(['Sondage', 'Recentrage']);
  });

  it('chaque possession porte l’origine de son gain ; « dans le deck » suit le deck', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Astre' }, ...ROLES.flatMap((r, i) => defi(figureDe('Astre', r).id, 'victoire', `c${i}`))]).etat;
    const v = vueCollection(e);
    const astre = v.familles.find((f) => f.famille === 'Astre')!;
    expect(astre.basics.every((b) => b.possedee && b.texte === 'Affiliation de l’Astre')).toBe(true);
    expect(astre.variantes.filter((x) => x.possedee).map((x) => [x.texte, x.dansDeck])).toEqual([[`Victoire contre ${figureDe('Astre', 'cadet').nom}`, true], [`Victoire contre ${figureDe('Astre', 'brasDroit').nom}`, true]]);
    expect([astre.signature.possedee, astre.signature.texte, astre.signature.dansDeck]).toEqual([true, 'Victoire contre Halvard', true]);
    expect(v.compte.possedees).toBe(4 + 2 + 1);
    expect(v.neutres.map((n) => n.dansDeck)).toEqual([3, 3, 3, 3]);
    for (const g of e.registre) expect(origineGain(g)).not.toBe(g.source);
  });
});

describe('M10-C — parcours complet d’une famille d’accueil (test paramétré, les quatre familles)', () => {
  for (const f of FAMILIES) {
    it(`${f} : défaites sans effet, variantes III et IV aux lieutenants, Signature au chef, revanches sans gain, deck légal après chaque gain`, () => {
      const lieutenants = FIGURES.filter((x) => x.famille === f && x.role !== 'chef');
      const legal = (e: AventureEtat, gains: string[]) => {
        if (gains.length) expect(validerDeckAv(e.deck, collectionDe(e.registre)), gains.join(',')).toEqual([]);
        expect(controlerEtat(e)).toEqual([]);
        // jamais plus d'une Signature équipée ; les variantes ne viennent que des lieutenants (ou des compétitions)
        expect(deckMoteur(e.deck).filter((c) => c.startsWith('sig-')).length).toBeLessThanOrEqual(1);
        for (const k of gains.filter((x) => x.startsWith('variante:'))) expect(lieutenants.some((x) => x.enjeu.kind === 'variante' && `variante:${x.enjeu.defId}` === k)).toBe(true);
      };
      let r = run(prologue(), [{ type: 'confirmer', famille: f }], legal);
      expect(r.gains.sort()).toEqual([`basics:${f}`, `technique:${r.etat.deck.techniques[1]}`].sort());
      let e = r.etat;
      for (const role of ROLES) {
        const fig = figureDe(f, role);
        // défaite puis abandon : rien n'est gagné, le défi reste ouvert, les PV montent seulement pour la défaite
        r = run(e, [...defi(fig.id, 'defaite', `${fig.id}-1`), ...defi(fig.id, 'abandon', `${fig.id}-2`)], legal);
        expect(r.gains).toEqual([]);
        expect(statutDefi(r.etat, fig).ouvert).toBe(true);
        // victoire : l'enjeu, une fois
        r = run(r.etat, defi(fig.id, 'victoire', `${fig.id}-3`), legal);
        expect(r.gains).toEqual([fig.enjeu.kind === 'variante' ? `variante:${fig.enjeu.defId}` : `signature:${f}`]);
        // revanche gagnée : registre inchangé
        const avant = JSON.stringify(r.etat.registre);
        r = run(r.etat, defi(fig.id, 'victoire', `${fig.id}-4`), legal);
        expect(r.gains).toEqual([]);
        expect(JSON.stringify(r.etat.registre)).toBe(avant);
        e = r.etat;
      }
      expect(e.deck.signature).toBe(f);
      expect(e.familles[f]).toBe('chef');
      expect(vueCollection(e).compte.possedees).toBe(7);
      // le duel contre le chef, Signature en jeu des deux côtés au besoin, se joue jusqu'au bout
      const cfg = duelFigure(figureDe(f, 'chef').id, e, 77, true).config;
      const m = new Match(cfg, { p1: { profile: PROFILES.equilibre!, seed: 1 }, p2: { profile: PROFILES.offensif!, seed: 2 } });
      for (let t = 0; m.state.phase !== 'ENDED' && t < 400; t++) { m.stepAi(); if (m.state.phase === 'RESOLVED') m.nextTurn(); }
      expect(m.state.phase).toBe('ENDED');
    });
  }

  it('reprise d’un duel de lieutenant fermé en cours : sauvegarde relue, rejeu vérifié, même empreinte, duel mené à son terme', () => {
    class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }, ...defi('cadet-Voile', 'victoire', 'v1'), { type: 'lancerDefi', figure: 'brasDroit-Voile' }]).etat;
    const cfg = duelFigure('brasDroit-Voile', e, 4242, false).config;
    const ai = { p1: { profile: PROFILES.equilibre!, seed: 11 }, p2: { profile: PROFILES.lecteur ?? PROFILES.offensif!, seed: 12 } };
    const m = new Match(cfg, ai);
    for (let t = 0; t < 5; t++) { m.stepAi(); if (m.state.phase === 'RESOLVED') m.nextTurn(); }
    expect(m.state.phase).not.toBe('ENDED');
    const mem = new Mem();
    const st = new MagasinAventure(mem, () => new Date(AT));
    const s = nouvelleSauvegarde(new Date(AT), 'Ana', 9);
    s.etat = e;
    s.duel = { id: 'v2', rencontre: 'brasDroit-Voile', seed: 4242, startedAt: AT, rules: m.state.rules, catalog: CATALOG_AVENTURE, config: cfg, commands: structuredClone(m.commands), hash: m.hash(), turn: m.state.turn, pret: false };
    expect(st.ecrire(s)).toEqual({ ok: true });
    // fermeture : le jeu relit la sauvegarde
    const l = st.charger();
    expect(l.status).toBe('ok');
    if (l.status !== 'ok') return;
    const d = l.save.duel!;
    expect(verifierDuel(d)).toEqual({ ok: true });
    const repris = new Match(d.config, ai);
    for (const c of d.commands) repris.submit(c);
    expect(repris.hash()).toBe(d.hash);
    for (let t = 0; repris.state.phase !== 'ENDED' && t < 400; t++) { repris.stepAi(); if (repris.state.phase === 'RESOLVED') repris.nextTurn(); }
    expect(repris.state.phase).toBe('ENDED');
    // l'issue se consigne comme pour un duel joué d'une traite : variante IV à la victoire seulement
    const issue = repris.state.winner === 'p1' ? 'victoire' : 'defaite';
    const fin = appliquer(l.save.etat, { type: 'duelStructurant', figure: 'brasDroit-Voile', issue, duel: d.id }, AT);
    expect(fin.gains.map((g) => g.key)).toEqual(issue === 'victoire' ? ['variante:Voile-4-mirage'] : []);
  });
});

describe('M10-C — identités V2 des chefs', () => {
  it('chaque chef a son kit V2 et sa personnalité ; les figures des chefs les portent ; le duel standard ne les tire jamais', () => {
    for (const p of CHEF_PERSONALITIES) {
      expect(kitV2(p.id)).toBeTruthy();
      expect(personalityById(p.id)).toBe(p);
    }
    for (const f of FAMILIES) {
      const chef = figureDe(f, 'chef');
      expect(chef.apparence).toBe(`chef-${f.toLowerCase()}`);
      expect(personalityById(chef.apparence)?.family).toBe(f);
    }
    expect(CHEF_PERSONALITIES.map((p) => p.name).sort()).toEqual(FAMILIES.map((f) => figureDe(f, 'chef').nom).sort());
    expect(PERSONALITIES.some((p) => p.id.startsWith('chef-'))).toBe(false);
    expect(isNeutre('chef-cendre')).toBe(false);
  });
});

export type { Family };
