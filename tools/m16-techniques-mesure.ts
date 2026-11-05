// M16 (fiche T5) — mesure IA contre IA des premiers duels de l'aventure avec une seule Technique de chaque côté, contre le
// calendrier d'avant (deux contre deux). Le joueur est joué par l'IA « équilibré », l'adversaire par le profil de son rôle,
// sur le moteur réel, avec les decks que la machine de l'aventure donne (`aventure.ts`, `paliers.ts`, `rencontres.ts`).
// Duels : le prologue contre Kaï ; un duel de rue du chapitre I ; l'Épreuve et le premier cadet de chaque famille d'accueil.
// Usage : npx tsx tools/m16-techniques-mesure.ts [duels par cas] [sortie.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import type { TechniqueId } from '../src/game/catalog/techniques';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import type { GameConfig } from '../src/game/model/types';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { siegeAventure, type DeckAv } from '../src/aventure/deck';
import { adversaire, pvJoueur, type RoleAdverse } from '../src/aventure/paliers';
import { techniquesAdverses } from '../src/aventure/rencontres';

const N = Number(process.argv[2] ?? 200);
const OUT = process.argv[3] ?? 'artifacts/qa/m16/techniques-mesure.json';
const AT = '2026-11-05T12:00:00.000Z';

const apply = (e: AventureEtat, evs: Evenement[]) => evs.reduce((x, ev) => { const r = appliquer(x, ev, AT); if (r.refus) throw new Error(r.refus); return r.etat; }, e);
const prologue = (t?: TechniqueId) => apply(nouvelleAventure(AT, t), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }]);
const affilie = (t: TechniqueId | undefined, f: Family) => apply(prologue(t), [{ type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 2, gardesGagnees: 2, interferencesReussies: 0 } }, { type: 'confirmer', famille: f }]);

type Calendrier = 'avant (2 contre 2)' | 'M16, Sondage (1 contre 1)' | 'M16, Recentrage (1 contre 1)';
const CALENDRIERS: Array<[Calendrier, TechniqueId | undefined]> = [['avant (2 contre 2)', undefined], ['M16, Sondage (1 contre 1)', 'Sondage'], ['M16, Recentrage (1 contre 1)', 'Recentrage']];

function serie(e: AventureEtat, combats: number, role: RoleAdverse, famille: Family | null, niveau: number, graine: number): { v: number; tours: number; tJ: string; tA: string } {
  const adv = adversaire(role, famille, niveau);
  const deckA: DeckAv = { ...adv.deck, techniques: adv.deck.techniques.slice(0, techniquesAdverses(e)) };
  const profil = adv.profil ?? 'equilibre';
  let v = 0; let tours = 0;
  for (let s = 1; s <= N; s++) {
    const cfg: GameConfig = { seed: graine + 131 * s, players: { p1: siegeAventure(e.deck, 'p1', pvJoueur(combats)), p2: siegeAventure(deckA, 'p2', adv.pv) } };
    const m = autoplay(cfg, 200, [PROFILES.equilibre!, PROFILES[profil]!], ['p2', 'p1']);
    if (m.state.winner === 'p1') v++;
    tours += m.state.turn;
  }
  return { v, tours, tJ: e.deck.techniques.join(' + '), tA: deckA.techniques.join(' + ') };
}

interface Ligne { cas: string; calendrier: Calendrier; victoires: number; duels: number; taux: number; tours: number; joueur: string; adversaire: string }
const lignes: Ligne[] = [];
const noter = (cas: string, cal: Calendrier, r: ReturnType<typeof serie>, n = N) => lignes.push({ cas, calendrier: cal, victoires: r.v, duels: n, taux: Math.round((1000 * r.v) / n) / 10, tours: Math.round((10 * r.tours) / n) / 10, joueur: r.tJ, adversaire: r.tA });

const t0 = Date.now();
for (const [cal, t] of CALENDRIERS) {
  noter('prologue — Kaï, cartes grises', cal, serie(prologue(t), 0, 'prologue', null, 1, 1000));
  noter('chapitre I — duel de rue (populace)', cal, serie(affilie(t, 'Cendre'), 1, 'rue', null, 1, 2000));
  for (const f of FAMILIES) {
    const e = affilie(t, f);
    noter(`chapitre I — Épreuve ${f}`, cal, serie(e, 1, 'epreuve', f, 1, 3000 + FAMILIES.indexOf(f) * 17));
    noter(`chapitre I — premier cadet ${f}`, cal, serie(e, 2, 'cadet', f, 1, 4000 + FAMILIES.indexOf(f) * 17));
  }
}
const head = execSync('git rev-parse --short HEAD').toString().trim();
const cas = [...new Set(lignes.map((l) => l.cas))];
const tableau = cas.map((c) => {
  const x = (cal: Calendrier) => lignes.find((l) => l.cas === c && l.calendrier === cal)!;
  const a = x('avant (2 contre 2)'); const s = x('M16, Sondage (1 contre 1)'); const r = x('M16, Recentrage (1 contre 1)');
  return { cas: c, avant: a.taux, sondage: s.taux, recentrage: r.taux, ecartSondage: Math.round((s.taux - a.taux) * 10) / 10, ecartRecentrage: Math.round((r.taux - a.taux) * 10) / 10 };
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ head, duelsParCas: N, secondes: Math.round((Date.now() - t0) / 1000), tableau, lignes }, null, 2));
console.log(`M16 — premiers duels, victoires du joueur (IA « équilibré »), ${N} duels par cas, ${head}`);
console.log('cas'.padEnd(40), 'avant', '  Sondage', '  Recentrage');
for (const l of tableau) console.log(l.cas.padEnd(40), `${l.avant}%`.padStart(6), `${l.sondage}% (${l.ecartSondage >= 0 ? '+' : ''}${l.ecartSondage})`.padStart(16), `${l.recentrage}% (${l.ecartRecentrage >= 0 ? '+' : ''}${l.ecartRecentrage})`.padStart(16));
