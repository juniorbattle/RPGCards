/**
 * M10-B — logique PURE du mode Aventure (prototype `?aventure=1`) : ADR 029 (choix libre, quatre voies atteignables,
 * refus sans impasse), ADR 030 (16 neutres), ADR 031 (Basics à la confirmation ou à l'engagement, variantes aux
 * lieutenants, Signature au chef, gains uniques, une Signature équipée), sauvegarde à part, directeur des rencontres.
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import { autoplay } from '../src/game/match';
import { appliquer, chapitre, controlerEtat, defisOuverts, nouvelleAventure, peutConfirmer, premierEmissaire, statutDefi, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { deckDepart, equiperSignature, equiperVersion, integrerBasics, standardLegal, validerDeckAv, versStandard } from '../src/aventure/deck';
import { battre, conclure, decider, MAX_FACULTATIVES, nouveauDirecteur, poses, RENCONTRES } from '../src/aventure/directeur';
import { faitsPublics } from '../src/aventure/faits';
import { emissaire, figureDe, FIGURES, isNeutre, ROLES } from '../src/aventure/modele';
import { objectif, quetes } from '../src/aventure/quetes';
import { accorder, collectionDe, gainVariante } from '../src/aventure/registre';
import { APPARENCES, duelChampionnat, duelEpreuve, duelFacultatif, duelFigure, duelJoute, duelPrologue } from '../src/aventure/rencontres';
import { manche, statutFinale, statutJoute, statutPoule } from '../src/aventure/competitions';
import { CLE_AVENTURE, CLE_SECOURS, MagasinAventure, nouvelleSauvegarde, validerSauvegarde } from '../src/aventure/sauvegarde';
import { SAVE_KEY } from '../src/product/save';
import { personalityById } from '../src/presentation/personalities';
import { blocked } from '../src/ville/monde';
import { ilotAventure, ilotNu } from '../src/aventure/ilots';
import { createGame } from '../src/game/engine/engine';

const AT = '2026-10-20T12:00:00.000Z';
const FAITS0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };

function run(e: AventureEtat, evs: Evenement[]): { etat: AventureEtat; gains: string[]; refus: string[] } {
  const gains: string[] = [];
  const refus: string[] = [];
  for (const ev of evs) {
    const r = appliquer(e, ev, AT);
    e = r.etat;
    gains.push(...r.gains.map((g) => g.key));
    if (r.refus) refus.push(r.refus);
  }
  return { etat: e, gains, refus };
}

const prologue = (issue: 'victoire' | 'defaite' = 'victoire'): AventureEtat =>
  run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue, faits: FAITS0 }]).etat;

/** Gagne contre les trois figures d'une famille (cadet, bras droit, chef). */
const conquerir = (f: Family, n0 = 0): Evenement[] => ROLES.flatMap((r, i) => {
  const id = figureDe(f, r).id;
  return [{ type: 'lancerDefi', figure: id } as Evenement, { type: 'duelStructurant', figure: id, issue: 'victoire', duel: `d${n0 + i}` } as Evenement];
});

describe('M10-B — départ (ADR 030)', () => {
  it('16 neutres : quatre par Rang, sans famille ; deck de départ légal sans Signature', () => {
    const e = nouvelleAventure(AT);
    const col = collectionDe(e.registre);
    expect(col.neutres).toEqual({ 1: 4, 2: 4, 3: 4, 4: 4 });
    expect(col.basics).toEqual([]);
    expect(col.signatures).toEqual([]);
    expect(col.techniques).toEqual(['Sondage', 'Recentrage']);
    expect(e.deck.cartes).toHaveLength(16);
    expect(e.deck.cartes.every(isNeutre)).toBe(true);
    expect(e.deck.signature).toBeNull();
    expect(validerDeckAv(e.deck, col)).toEqual([]);
    expect(FAMILIES.every((f) => e.familles[f] === 'inconnue')).toBe(true);
  });
});

describe('M10-B — prologue et choix libre (ADR 029)', () => {
  it('le duel public, gagné OU perdu, fait remarquer et inviter par les quatre familles', () => {
    for (const issue of ['victoire', 'defaite'] as const) {
      const e = prologue(issue);
      expect(FAMILIES.every((f) => e.familles[f] === 'invite')).toBe(true);
      expect(e.affiliation).toBeNull();
      expect(collectionDe(e.registre).basics).toEqual([]);
      expect(e.premier).not.toBeNull();
    }
  });

  it('premier émissaire selon les seuls faits publics', () => {
    expect(premierEmissaire({ assautsGagnes: 4, gardesGagnees: 1, interferencesReussies: 0 })).toBe('Cendre');
    expect(premierEmissaire({ assautsGagnes: 1, gardesGagnees: 3, interferencesReussies: 1 })).toBe('Ronce');
    expect(premierEmissaire({ assautsGagnes: 1, gardesGagnees: 3, interferencesReussies: 2 })).toBe('Voile');
    expect(premierEmissaire(FAITS0)).toBe('Astre');
  });

  it('les quatre voies sont atteignables, chacune donnant SES quatre Basics à la confirmation seulement', () => {
    for (const f of FAMILIES) {
      const before = prologue();
      expect(peutConfirmer(nouvelleAventure(AT), f).ok).toBe(false); // jamais avant l'invitation
      const r = appliquer(before, { type: 'confirmer', famille: f }, AT);
      expect(r.refus).toBeUndefined();
      expect(r.etat.affiliation).toBe(f);
      expect(r.etat.familles[f]).toBe('affilie');
      expect(FAMILIES.filter((x) => x !== f).every((x) => r.etat.familles[x] === 'invite')).toBe(true);
      expect(r.gains.map((g) => g.key)).toContain(`basics:${f}`);
      const col = collectionDe(r.etat.registre);
      expect(col.basics).toEqual([f]);
      // une neutre de chaque Rang remplacée par la Basic du même Rang (A-5) : 12 neutres + 4 Basics, deck légal
      expect(r.etat.deck.cartes.filter(isNeutre)).toHaveLength(12);
      expect(r.etat.deck.cartes.filter((c) => c.startsWith(`${f}-`))).toEqual([1, 2, 3, 4].map((n) => `${f}-${n}-basic`));
      expect(validerDeckAv(r.etat.deck, col)).toEqual([]);
      expect(controlerEtat(r.etat)).toEqual([]);
    }
  });

  it('Différer et Chercher ne donnent rien ; refuser tout laisse les invitations ouvertes, sans impasse', () => {
    const e = run(prologue('defaite'), [{ type: 'scene', id: 'P6' }, { type: 'rencontre', personne: emissaire('Voile').id }, { type: 'visite', lieu: 'ruelles' }]).etat;
    expect(collectionDe(e.registre).basics).toEqual([]);
    expect(FAMILIES.every((f) => peutConfirmer(e, f).ok)).toBe(true);
    expect(objectif(e)).toMatch(/choisissez votre voie/);
  });

  it('confirmer deux fois ne donne rien de plus (idempotence)', () => {
    const r = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }, { type: 'confirmer', famille: 'Ronce' }, { type: 'confirmer', famille: 'Voile' }]);
    expect(r.gains.filter((k) => k.startsWith('basics:'))).toEqual(['basics:Ronce']);
    expect(r.refus).toHaveLength(2);
    expect(r.etat.affiliation).toBe('Ronce');
  });

  it('rejouer le fait du duel public (reprise) ne change rien', () => {
    const e = prologue();
    expect(appliquer(e, { type: 'duelPrologue', issue: 'defaite', faits: { assautsGagnes: 9, gardesGagnees: 0, interferencesReussies: 0 } }, AT).etat).toEqual(e);
  });
});

describe('M10-B/C — ascension (ADR 031)', () => {
  it('variantes seulement aux victoires contre les lieutenants, Signature seulement au chef, revanche sans duplication', () => {
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }]).etat;
    expect(defisOuverts(e).map((f) => f.id)).toEqual(['cadet-Cendre']);
    expect(statutDefi(e, figureDe('Cendre', 'chef')).ouvert).toBe(false);
    // défaite : rien, le défi reste ouvert
    let r = run(e, [{ type: 'lancerDefi', figure: 'cadet-Cendre' }, { type: 'duelStructurant', figure: 'cadet-Cendre', issue: 'defaite', duel: 'a1' }]);
    expect(r.gains).toEqual([]);
    expect(statutDefi(r.etat, figureDe('Cendre', 'cadet')).ouvert).toBe(true);
    // victoire : variante III
    r = run(r.etat, [{ type: 'lancerDefi', figure: 'cadet-Cendre' }, { type: 'duelStructurant', figure: 'cadet-Cendre', issue: 'victoire', duel: 'a2' }]);
    expect(r.gains).toEqual(['variante:Cendre-3-ferveur']);
    // revanche gagnée : rien
    r = run(r.etat, [{ type: 'lancerDefi', figure: 'cadet-Cendre' }, { type: 'duelStructurant', figure: 'cadet-Cendre', issue: 'victoire', duel: 'a3' }]);
    expect(r.gains).toEqual([]);
    r = run(r.etat, [{ type: 'lancerDefi', figure: 'brasDroit-Cendre' }, { type: 'duelStructurant', figure: 'brasDroit-Cendre', issue: 'victoire', duel: 'a4' }]);
    expect(r.gains).toEqual(['variante:Cendre-4-contrecoup']);
    expect(collectionDe(r.etat.registre).signatures).toEqual([]);
    r = run(r.etat, [{ type: 'lancerDefi', figure: 'chef-Cendre' }, { type: 'duelStructurant', figure: 'chef-Cendre', issue: 'victoire', duel: 'a5' }]);
    expect(r.gains).toEqual(['signature:Cendre']);
    e = r.etat;
    expect(e.familles.Cendre).toBe('chef');
    expect(e.deck.signature).toBe('Cendre');
    expect(chapitre(e)).toBe('voies');
    expect(controlerEtat(e)).toEqual([]);
  });

  it('un duel non lancé ne compte pas ; une variante sans ses Basics est refusée', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }]).etat;
    expect(appliquer(e, { type: 'duelStructurant', figure: 'cadet-Voile', issue: 'victoire', duel: 'x' }, AT).refus).toBeTruthy();
    expect(accorder(e.registre, gainVariante('Astre-3-relance', 'x', AT)).refus).toMatch(/cartes de base/);
  });

  it('même séquence pour les quatre familles prises comme famille d’accueil, puis les trois autres : deck au format standard', () => {
    for (const f of FAMILIES) {
      let r = run(prologue(), [{ type: 'confirmer', famille: f }, ...conquerir(f)]);
      expect(r.refus).toEqual([]);
      const autres = FAMILIES.filter((x) => x !== f);
      // entrer, parler, visiter n'engagent pas ; le défi officiel est explicite (ADR 031 §4)
      r = run(r.etat, [{ type: 'visite', lieu: autres[0]! }, { type: 'rencontre', personne: figureDe(autres[0]!, 'cadet').id }]);
      expect(collectionDe(r.etat.registre).basics).toEqual([f]);
      for (const [i, x] of autres.entries()) {
        r = run(r.etat, [{ type: 'engager', famille: x }, { type: 'engager', famille: x }, ...conquerir(x, 10 * (i + 1))]);
        expect(r.gains.filter((k) => k === `basics:${x}`)).toHaveLength(1);
      }
      const e = r.etat;
      const col = collectionDe(e.registre);
      expect(col.basics).toHaveLength(4);
      expect(col.signatures).toHaveLength(4);
      expect(col.variantes).toHaveLength(8);
      expect(e.deck.cartes.some(isNeutre)).toBe(false);
      expect(e.deck.signature).toBe(f); // une seule équipée : la première gagnée, jusqu'à ce que le joueur change
      expect(versStandard(e.deck)).not.toBeNull();
      expect(standardLegal(e.deck, col)).toBe(true);
      expect(chapitre(e)).toBe('championnat');
      expect(controlerEtat(e)).toEqual([]);
      const ids = e.registre.map((g) => g.key);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('les autres familles ne s’engagent qu’après la Signature de la famille d’accueil (A-6, proposé)', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Astre' }]).etat;
    expect(appliquer(e, { type: 'engager', famille: 'Ronce' }, AT).refus).toMatch(/chef de l’Astre/);
  });

  it('changement d’affiliation avant le premier lieutenant, sans perte ni double remise (P-N6, proposé)', () => {
    let r = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }, { type: 'changer', famille: 'Voile' }]);
    expect(r.refus).toEqual([]);
    expect(r.etat.affiliation).toBe('Voile');
    expect(collectionDe(r.etat.registre).basics).toEqual(['Voile', 'Ronce'].sort((a, b) => FAMILIES.indexOf(a as Family) - FAMILIES.indexOf(b as Family)));
    expect(validerDeckAv(r.etat.deck, collectionDe(r.etat.registre))).toEqual([]);
    r = run(r.etat, [{ type: 'lancerDefi', figure: 'cadet-Voile' }, { type: 'changer', famille: 'Astre' }]);
    expect(r.refus).toHaveLength(1);
    // l'ancienne famille, défiée plus tard, ne redonne pas ses Basics
    r = run(r.etat, [...conquerir('Voile').slice(2), { type: 'duelStructurant', figure: 'cadet-Voile', issue: 'victoire', duel: 'z' }]);
    r = run(r.etat, [...conquerir('Voile'), { type: 'engager', famille: 'Ronce' }]);
    expect(r.gains.includes('basics:Ronce')).toBe(false);
    expect(r.etat.familles.Ronce).toBe('defiee');
  });

  it('une seule Signature équipée ; une variante remplace la Basic de son identité', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }, ...conquerir('Cendre')]).etat;
    const col = collectionDe(e.registre);
    let d = equiperVersion(e.deck, 'Cendre-3-ferveur');
    expect(d.cartes.filter((c) => c.startsWith('Cendre-3'))).toEqual(['Cendre-3-ferveur']);
    expect(validerDeckAv(d, col)).toEqual([]);
    d = equiperSignature(d, 'Voile');
    expect(validerDeckAv(d, col).map((p) => p.code)).toContain('signature');
    expect(validerDeckAv({ ...d, signature: null }, col)).toEqual([]);
  });

  it('R-AV : refuse 3 cartes d’un Rang, une identité en double, une variante non possédée', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }]).etat;
    const col = collectionDe(e.registre);
    const bad = [...e.deck.cartes];
    bad[bad.indexOf('neutre-1')] = 'neutre-2';
    expect(validerDeckAv({ ...e.deck, cartes: bad }, col).map((p) => p.code)).toContain('rang');
    const dup = integrerBasics(deckDepart(), 'Ronce');
    const d2 = { ...dup, cartes: dup.cartes.map((c) => (c === 'neutre-3' ? 'Ronce-3-entrave' : c)) };
    expect(validerDeckAv(d2, col).map((p) => p.code)).toEqual(expect.arrayContaining(['double', 'non-possedee']));
  });
});

describe('M10-B — quêtes dérivées', () => {
  it('objectif et journal suivent les faits, sans quête échouée', () => {
    const e0 = nouvelleAventure(AT);
    expect(objectif(e0)).toMatch(/Kaï/);
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Astre' }]).etat;
    expect(objectif(e)).toMatch(/Mira/);
    const q = quetes(e);
    expect(q[0]!.etapes.every((x) => x.faite)).toBe(true);
    expect(q[1]!.id).toBe('maison:Astre');
  });
});

describe('M10-B — sauvegarde à part (A-9)', () => {
  class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

  it('aller-retour exact, copie de secours, sauvegarde du jeu jamais touchée', () => {
    const mem = new Mem();
    mem.setItem(SAVE_KEY, '{"profil":"standard intact"}');
    const st = new MagasinAventure(mem, () => new Date(AT));
    const s = nouvelleSauvegarde(new Date(AT), 'Ana', 42);
    expect(st.ecrire(s)).toEqual({ ok: true });
    s.etat = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }]).etat;
    expect(st.ecrire(s)).toEqual({ ok: true });
    const l = st.charger();
    expect(l.status).toBe('ok');
    if (l.status === 'ok') expect(l.save).toEqual(JSON.parse(JSON.stringify(s)));
    expect(mem.getItem(CLE_SECOURS)).not.toBeNull();
    expect(mem.getItem(SAVE_KEY)).toBe('{"profil":"standard intact"}');
  });

  it('illisible → mise à l’écart possible, secours proposé ; version future refusée ; incohérence refusée à l’écriture', () => {
    const mem = new Mem();
    const st = new MagasinAventure(mem);
    const s = nouvelleSauvegarde(new Date(AT), 'Ana', 1);
    st.ecrire(s);
    st.ecrire({ ...s, compteur: 1 });
    mem.setItem(CLE_AVENTURE, '{oups');
    const l = st.charger();
    expect(l.status).toBe('illisible');
    if (l.status === 'illisible') expect(l.secours).not.toBeNull();
    mem.setItem(CLE_AVENTURE, JSON.stringify({ schema: 'aventure/9' }));
    expect(st.charger().status).toBe('future');
    const triche = structuredClone(s);
    triche.etat.deck.signature = 'Cendre';
    expect(st.ecrire(triche).ok).toBe(false);
    expect(validerSauvegarde(triche).join(' ')).toMatch(/Signature/);
  });

  it('reprise après chaque étape : recharger puis rejouer le même fait ne change rien', () => {
    let e = nouvelleAventure(AT);
    const evs: Evenement[] = [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: FAITS0 }, { type: 'confirmer', famille: 'Ronce' }, { type: 'lancerDefi', figure: 'cadet-Ronce' }, { type: 'duelStructurant', figure: 'cadet-Ronce', issue: 'victoire', duel: 'd1' }];
    for (const ev of evs) {
      e = appliquer(e, ev, AT).etat;
      const back = JSON.parse(JSON.stringify(e)) as AventureEtat;
      expect(appliquer(back, ev, AT).gains).toEqual([]);
    }
  });
});

describe('M10-B — directeur des rencontres', () => {
  it('déterministe, sérialisable, au plus deux facultatives par îlot, aucune avant le duel public', () => {
    const e0 = nouvelleAventure(AT);
    const d0 = nouveauDirecteur(7);
    expect(decider(d0, e0, 'quai').poses.map((p) => p.id)).toEqual(['kai-prologue']);
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }]).etat;
    let d = d0;
    for (let i = 0; i < 12; i++) {
      const a = decider(d, e, 'quai');
      const b = decider(JSON.parse(JSON.stringify(d)), e, 'quai');
      expect(a).toEqual(b);
      expect(a.poses.filter((p) => p.genre === 'facultative' || p.genre === 'rival').length).toBeLessThanOrEqual(MAX_FACULTATIVES);
      d = battre(a.directeur);
      const act = d.actives.quai?.[0];
      if (act) d = conclure(d, act.id, true);
    }
  });

  it('le rival au plus une fois par chapitre ; un refus ne change pas la progression', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }]).etat;
    let d = nouveauDirecteur(3);
    let vu = 0;
    for (let i = 0; i < 40; i++) {
      for (const il of ['quai', 'parvis', 'ruelles'] as const) {
        const r = decider(d, e, il);
        d = r.directeur;
        if (r.poses.some((p) => p.id === 'rival-kai')) { vu++; d = conclure(d, 'rival-kai', true); }
      }
      d = battre(d);
    }
    expect(vu).toBe(1);
    expect(conclure(d, 'rue-docker', false).refuses['rue-docker']).toBe(1);
  });

  it('relire les poses ne tire rien', () => {
    const e = prologue();
    const d = decider(nouveauDirecteur(9), e, 'quai').directeur;
    expect(poses(d, e, 'quai')).toEqual(poses(d, e, 'quai'));
    expect(JSON.stringify(d)).toBe(JSON.stringify(decider(nouveauDirecteur(9), e, 'quai').directeur));
  });
});

describe('M10-B — données (personnages, places, duels)', () => {
  it('chaque apparence a une personnalité ; chaque personnage se tient sur un sol praticable', () => {
    for (const a of APPARENCES) expect(personalityById(a), a).not.toBeNull();
    for (const r of RENCONTRES) for (const l of r.lieux) expect(blocked(ilotNu(l.ilot), l.at, 0.32), `${r.id} @ ${l.ilot}`).toBe(false);
    for (const f of FIGURES) expect(f.enjeu.kind === 'signature' || f.enjeu.defId.startsWith(`${f.famille}-`)).toBe(true);
  });

  it('îlot de l’aventure : décor M09 intact, personnages de la démo retirés, ceux du directeur posés et abordables', () => {
    const e = prologue();
    const p = decider(nouveauDirecteur(5), e, 'quai').poses;
    const d = ilotAventure('quai', p);
    expect(d.npcs.map((n) => n.id).sort()).toEqual([...new Set(p.map((x) => x.apparence))].sort());
    for (const x of p) {
      const sp = d.ilot.spawns[`npc-${x.id}`]!;
      expect(blocked(d.ilot, sp)).toBe(false);
      expect(d.ilot.zones.some((z) => z.target === x.id && z.kind === 'parler')).toBe(true);
    }
    expect(d.ilot.zones.filter((z) => z.kind === 'sortie').length).toBe(2);
    expect(d.build).toBeTypeOf('function');
  });

  it('les duels du prototype sont des configurations ordinaires du moteur (deck de prêt), jouables jusqu’au bout', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }]).etat;
    const cfgs = [duelPrologue(11).config, duelFigure('cadet-Voile', e.deck, 12, false).config, duelFigure('chef-Astre', e.deck, 13, false).config, duelFacultatif('rival-kai', e.deck, 14).config];
    for (const c of cfgs) {
      expect(() => createGame(c)).not.toThrow();
      const m = autoplay(c);
      expect(m.state.phase).toBe('ENDED');
      const f = faitsPublics(m.events);
      expect(f.assautsGagnes + f.gardesGagnees).toBeGreaterThan(0);
    }
    expect(duelPrologue(1).config.players.p1).toEqual({ ...duelPrologue(1).config.players.p2, name: 'Vous' });
  });
});

describe('M10-D/E en avance — compétitions facultatives et Championnat (proposés)', () => {
  const conquis = (): AventureEtat => {
    let r = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }, ...conquerir('Cendre')]);
    for (const [i, x] of (['Voile', 'Ronce', 'Astre'] as Family[]).entries()) r = run(r.etat, [{ type: 'engager', famille: x }, ...conquerir(x, 10 * (i + 1))]);
    return r.etat;
  };

  it('Épreuve du quartier : fermée sans les Basics ; une défaite remet la série à zéro ; trois victoires : variante I, une seule fois', () => {
    let e = prologue();
    expect(appliquer(e, { type: 'epreuve', famille: 'Ronce', issue: 'victoire', duel: 'x' }, AT).refus).toBeTruthy();
    e = run(e, [{ type: 'confirmer', famille: 'Ronce' }]).etat;
    let r = run(e, [{ type: 'epreuve', famille: 'Ronce', issue: 'victoire', duel: 'e1' }, { type: 'epreuve', famille: 'Ronce', issue: 'victoire', duel: 'e2' }, { type: 'epreuve', famille: 'Ronce', issue: 'defaite', duel: 'e3' }]);
    expect(r.etat.competitions.epreuves.Ronce).toEqual({ etape: 0, gagnee: false });
    expect(r.gains).toEqual([]);
    r = run(r.etat, [1, 2, 3].map((i) => ({ type: 'epreuve', famille: 'Ronce', issue: 'victoire', duel: `f${i}` }) as Evenement));
    expect(r.gains).toEqual(['variante:Ronce-1-racine']);
    r = run(r.etat, [1, 2, 3].map((i) => ({ type: 'epreuve', famille: 'Ronce', issue: 'victoire', duel: `g${i}` }) as Evenement));
    expect(r.gains).toEqual([]);
  });

  it('Joute de la maison : après le bras droit, sous contrainte de deck ; variante II une seule fois', () => {
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }]).etat;
    expect(appliquer(e, { type: 'joute', famille: 'Ronce', issue: 'victoire', duel: 'j' }, AT).refus).toBeTruthy();
    e = run(e, conquerir('Ronce').slice(0, 4)).etat;
    expect(statutJoute(e.competitions, e.vaincues, 'Ronce', e.deck).ouvert).toBe(true); // 4 cartes Ronce dans le deck
    expect(statutJoute(e.competitions, e.vaincues, 'Ronce', { ...e.deck, cartes: e.deck.cartes.map((c) => (c.startsWith('Ronce-1') || c.startsWith('Ronce-2') ? `neutre-${c[6]}` : c)) }).ouvert).toBe(false);
    const r = run(e, [{ type: 'joute', famille: 'Ronce', issue: 'victoire', duel: 'j1' }, { type: 'joute', famille: 'Ronce', issue: 'victoire', duel: 'j2' }]);
    expect(r.gains).toEqual(['variante:Ronce-2-ecaille']);
  });

  it('les seize variantes sont atteignables (lieutenants III et IV, Épreuves I, Joutes II), sans duplication', () => {
    let e = conquis();
    for (const f of FAMILIES) {
      e = run(e, [1, 2, 3].map((i) => ({ type: 'epreuve', famille: f, issue: 'victoire', duel: `${f}${i}` }) as Evenement)).etat;
      e = run(e, [{ type: 'joute', famille: f, issue: 'victoire', duel: `j${f}` }]).etat;
    }
    const col = collectionDe(e.registre);
    expect(col.variantes).toHaveLength(16);
    expect(new Set(e.registre.map((g) => g.key)).size).toBe(e.registre.length);
  });

  it('Championnat : fermé avant les quatre chefs ; poule à Signatures distinctes ; Miroir ; Finale en deux manches gagnantes', () => {
    const avant = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }, ...conquerir('Cendre')]).etat;
    expect(appliquer(avant, { type: 'championnat', manche: 'poule', chef: 'Voile', signature: 'Cendre', issue: 'victoire' }, AT).refus).toBeTruthy();
    let e = conquis();
    expect(chapitre(e)).toBe('championnat');
    expect(statutPoule(e.competitions, 'Voile', 'Cendre').ouvert).toBe(true);
    e = run(e, [{ type: 'championnat', manche: 'poule', chef: 'Voile', signature: 'Cendre', issue: 'victoire' }]).etat;
    expect(statutPoule(e.competitions, 'Ronce', 'Cendre').ouvert).toBe(false); // même Signature : refusée
    e = run(e, [
      { type: 'championnat', manche: 'poule', chef: 'Ronce', signature: 'Ronce', issue: 'defaite' },
      { type: 'championnat', manche: 'poule', chef: 'Ronce', signature: 'Voile', issue: 'victoire' },
      { type: 'championnat', manche: 'poule', chef: 'Astre', signature: 'Astre', issue: 'victoire' },
    ]).etat;
    expect(manche(e.competitions)).toBe('miroir');
    e = run(e, [{ type: 'championnat', manche: 'miroir', signature: 'Astre', issue: 'victoire' }]).etat;
    expect(manche(e.competitions)).toBe('finale');
    expect(statutFinale(e.competitions, 'Astre').ouvert).toBe(true);
    e = run(e, [{ type: 'championnat', manche: 'finale', signature: 'Astre', issue: 'defaite' }]).etat;
    expect(statutFinale(e.competitions, 'Astre').ouvert).toBe(false); // changer de Signature entre deux manches
    e = run(e, [{ type: 'championnat', manche: 'finale', signature: 'Voile', issue: 'defaite' }]).etat;
    expect(e.competitions.championnat.finale).toEqual([]); // deux manches perdues : la finale recommence, sans perte
    e = run(e, [{ type: 'championnat', manche: 'finale', signature: 'Voile', issue: 'victoire' }, { type: 'championnat', manche: 'finale', signature: 'Ronce', issue: 'victoire' }]).etat;
    expect(e.competitions.championnat.titre).toBe(true);
    expect(chapitre(e)).toBe('champion');
    expect(objectif(e)).toMatch(/meilleur duelliste/);
    // aucune carte gagnée au Championnat
    expect(collectionDe(e.registre)).toEqual(collectionDe(conquis().registre));
  });

  it('duels des compétitions et du Championnat : configurations ordinaires du moteur, jouables', () => {
    const e = conquis();
    for (const c of [duelEpreuve('Voile', 0, e.deck, 1, false).config, duelJoute('Astre', e.deck, 2, false).config, duelChampionnat('poule', e.deck, 3, 'Ronce').config, duelChampionnat('miroir', e.deck, 4).config, duelChampionnat('finale', e.deck, 5).config]) {
      expect(autoplay(c).state.phase).toBe('ENDED');
    }
  });
});
