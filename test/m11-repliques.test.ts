/**
 * M11-C — le système de répliques (`docs/m11/04_DIALOGUES_ET_NARRATION.md`, ADR 040) : choix déterministe, la plus
 * spécifique d'abord, jamais deux fois de suite la même ; variantes pour les situations fréquentes ; forme de tout le
 * catalogue (longueur d'une bulle, épicène, aucun point médian).
 */
import { describe, expect, it } from 'vitest';
import type { Family } from '../src/game/catalog/cards';
import { CATALOGUE, choisir, LONGUEUR_MAX, memoireVide, texteDe, voixDe, type Chapitre, type Contexte } from '../src/aventure/repliques';
import { TEMPERAMENTS } from '../src/aventure/temperaments';
import { GUETTEURS } from '../src/aventure/vue';
import type { IlotId } from '../src/ville/ilots';

const ctx = (o: Partial<Contexte> = {}): Contexte => ({ moment: 'vue', chapitre: 'II', voie: 'Ronce', temperament: 'franc', joues: 0, victoires: 0, defaites: 0, dernier: null, chefs: 1, cheffe: true, ...o });
const CHAPITRES: Chapitre[] = ['prologue', 'I', 'II', 'III', 'IV', 'V', 'titre'];
const VOIES: Array<Family | null> = [null, 'Cendre', 'Voile', 'Ronce', 'Astre'];
const ILOTS: IlotId[] = ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute'];

describe('M11-C — forme du catalogue', () => {
  it('chaque réplique tient dans une bulle (240 caractères), sans point médian ni forme genrée du joueur, quel que soit le contexte', () => {
    const interdits = [/[a-zé]·[a-z]/i, /\bun duelliste\b/i, /\bce duelliste\b/i, /\breconnue?\b/i, /meilleur duelliste/i, /\bseul ou seule\b/i, /\b(tu es|vous êtes|t’es)\s+(prêt|battu|fatigué|seul|perdu)\b/i];
    let n = 0;
    for (const lignes of Object.values(CATALOGUE)) for (const r of lignes) for (const ch of CHAPITRES) for (const voie of VOIES) for (const chefs of [0, 1, 3]) {
      const t = texteDe(r, ctx({ chapitre: ch, voie, chefs, cheffe: chefs === 1 }));
      expect(t.length, r.id).toBeLessThanOrEqual(LONGUEUR_MAX);
      expect(t.trim().length, r.id).toBeGreaterThan(10);
      for (const re of interdits) expect(re.test(t), `${r.id} : ${re}`).toBe(false);
      n++;
    }
    expect(n).toBeGreaterThan(1000);
  });
  it('identifiants uniques dans chaque voix', () => {
    for (const [voix, lignes] of Object.entries(CATALOGUE)) expect(new Set(lignes.map((r) => r.id)).size, voix).toBe(lignes.length);
  });
});

describe('M11-C — choix des répliques', () => {
  it('déterministe : même graine, même mémoire, même réplique', () => {
    const a = choisir('rue-docker', ctx(), memoireVide(), 7)!;
    const b = choisir('rue-docker', ctx(), memoireVide(), 7)!;
    expect(a.replique.id).toBe(b.replique.id);
  });
  it('jamais deux fois de suite la même, pour chaque guetteur, chaque tempérament, chaque moment (200 tirages)', () => {
    for (const id of GUETTEURS) for (const t of TEMPERAMENTS) for (const moment of ['vue', 'parole'] as const) {
      let memo = memoireVide();
      let avant = '';
      const vus = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const r = choisir(id, ctx({ temperament: t, moment, chapitre: 'III', ilot: 'quai' }), memo, 11)!;
        expect(r.replique.id, `${id}/${t}/${moment}`).not.toBe(avant);
        avant = r.replique.id;
        memo = r.memo;
        vus.add(avant);
      }
      expect(vus.size, `${id}/${t}/${moment}`).toBeGreaterThanOrEqual(2);
    }
  });
  it('au moins trois répliques pour les situations fréquentes (rue par tempérament, membres, rumeurs par chapitre)', () => {
    for (const t of TEMPERAMENTS) for (const moment of ['vue', 'parole'] as const) {
      const n = CATALOGUE.docker!.filter((r) => r.quand?.moment?.includes(moment) && r.quand?.temperament?.includes(t) && !r.quand.dernier && !r.quand.ilot && !r.quand.chapitre).length;
      expect(n, `${t}/${moment}`).toBeGreaterThanOrEqual(3);
    }
    for (const f of ['Cendre', 'Voile', 'Ronce', 'Astre']) for (const m of ['vue', 'parole']) expect(CATALOGUE[`membre-${f}`]!.filter((r) => r.quand?.moment?.length === 1 && r.quand.moment[0] === m).length).toBeGreaterThanOrEqual(3);
    for (const ch of ['I', 'II', 'V', 'titre'] as Chapitre[]) expect(CATALOGUE.rumeur!.filter((r) => r.quand?.chapitre?.includes(ch) && !r.quand.ilot).length).toBeGreaterThanOrEqual(3);
  });
  it('la plus spécifique l’emporte : revanche, rumeur locale, Kaï selon l’issue du dernier duel', () => {
    expect(choisir('rue-commis', ctx({ dernier: 'victoire', joues: 1 }), memoireVide(), 3)!.replique.id).toMatch(/^rue-revanche-v/);
    expect(choisir('rumeur-port', ctx({ moment: 'rumeur', chapitre: 'V', ilot: 'port' }), memoireVide(), 3)!.replique.id).toBe('rumeur-port-V');
    expect(choisir('kai', ctx({ moment: 'rival', chapitre: 'III', dernier: 'defaite', joues: 2 }), memoireVide(), 3)!.replique.id).toBe('kai-K3-perdu');
    expect(choisir('kai', ctx({ moment: 'rival', chapitre: 'I', voie: 'Cendre' }), memoireVide(), 3)!.replique.id).toBe('kai-K1-cendre');
    expect(choisir('kai', ctx({ moment: 'rival', chapitre: 'I', voie: 'Voile' }), memoireVide(), 3)!.texte).toMatch(/le Voile/);
  });
  it('chaque locuteur du jeu a une voix et une réplique dans chaque chapitre où il parle', () => {
    for (const id of GUETTEURS) for (const ch of ['I', 'II', 'III', 'IV', 'V'] as Chapitre[]) for (const il of ILOTS) expect(choisir(id, ctx({ chapitre: ch, ilot: il }), memoireVide(), 1), `${id}/${ch}/${il}`).not.toBeNull();
    for (const ch of CHAPITRES) expect(choisir('rumeur-quai', ctx({ moment: 'rumeur', chapitre: ch }), memoireVide(), 1)).not.toBeNull();
    for (const ch of ['I', 'II', 'III', 'IV', 'V', 'titre'] as Chapitre[]) expect(choisir('kai', ctx({ moment: 'rival', chapitre: ch }), memoireVide(), 1), ch).not.toBeNull();
    for (const id of ['cadet-Ronce', 'brasDroit-Voile', 'chef-Astre']) for (const t of ['franc', 'ruse', 'agressif', 'calculateur'] as const) {
      const r = choisir(id, ctx({ moment: 'revanche', temperament: t }), memoireVide(), 1);
      if (voixDe(id) !== 'figure-chef' && !CATALOGUE[voixDe(id)]!.some((x) => x.quand?.temperament?.includes(t))) continue;
      expect(r, `${id}/${t}`).not.toBeNull();
    }
  });
});
