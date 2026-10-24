// Avenant M10-A (AV-08, ARB-M10-09) — calibrage des paliers de decks adverses et des PV du joueur, par simulation IA
// contre IA sur le moteur réel (neutres compris). Le joueur suit la trame principale de l'aventure pour chacune des quatre
// familles d'accueil (prologue, cadet, bras droit, chef ; puis les trois autres familles ; puis le Championnat), avec le
// deck que la machine d'états de l'aventure lui donne à chaque étape (`src/aventure/aventure.ts`) :
//   - « direct » : aucun duel facultatif (PV au plus bas) ;
//   - « entraîné » : pour chaque famille, l'Épreuve du quartier (3 duels, variante I) et deux duels de rue avant le cadet,
//     la Joute (variante II) avant le chef, soit 6 combats de plus par famille.
// Les adversaires sont ceux de `src/aventure/paliers.ts` (`adversaire` : deck selon le niveau du joueur, PV, profil d'IA).
// Le joueur est joué par l'IA « équilibré » : un ordre de grandeur, pas une mesure du plaisir de jeu.
// Usage : npx tsx tools/m10a-paliers.ts [duels par famille et par étape] [sortie.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import type { GameConfig } from '../src/game/model/types';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { siegeAventure, type DeckAv } from '../src/aventure/deck';
import { adversaire, COMPOSITION, PROFIL_ROLE, pvJoueur, PV_ADVERSE, PV_DEPART, PV_PAR_COMBAT, type RoleAdverse } from '../src/aventure/paliers';
import { personalityById } from '../src/presentation/personalities';
import { figureDe, ROLES } from '../src/aventure/modele';
import { collectionDe } from '../src/aventure/registre';
import { ajouter, resume, statsVides, type StatsClash } from './v33-stats';

const N = Number(process.argv[2] ?? 60);
/** `LQV_ETAPES=cadet-1,chef-1` : ne simule que ces étapes (les autres sont seulement traversées). */
const SEULES = (process.env.LQV_ETAPES ?? '').split(',').filter(Boolean);
const OUT = process.argv[3];
const AT = '2026-10-20T12:00:00.000Z';
const F0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const apply = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => { const r = appliquer(x, ev, AT); if (r.refus) throw new Error(`${ev.type} : ${r.refus}`); return r.etat; }, e);

interface Etape { cle: string; titre: string; role: RoleAdverse; famille: Family | null; apres: Evenement[]; maison?: Family }

/** Trame principale pour une famille d'accueil F1 (puis les trois autres dans l'ordre du catalogue). */
function trame(f1: Family): Etape[] {
  const ordre = [f1, ...FAMILIES.filter((f) => f !== f1)];
  const out: Etape[] = [{ cle: 'prologue', titre: 'Prologue — Kaï', role: 'prologue', famille: null, apres: [{ type: 'duelPrologue', issue: 'victoire', faits: F0 }, { type: 'confirmer', famille: f1 }] }];
  ordre.forEach((f, i) => {
    const n = i + 1;
    if (i > 0) out[out.length - 1]!.apres.push({ type: 'engager', famille: f });
    for (const r of ROLES) {
      const fig = figureDe(f, r);
      out.push({ cle: `${r}-${n}`, titre: `Famille ${n} — ${r === 'brasDroit' ? 'bras droit' : r}`, role: r, famille: f, maison: f, apres: [{ type: 'lancerDefi', figure: fig.id }, { type: 'duelStructurant', figure: fig.id, issue: 'victoire', duel: `${fig.id}` }] });
    }
  });
  out.push({ cle: 'poule', titre: 'Championnat — poule (chefs)', role: 'championnat', famille: 'Ronce', apres: [] });
  out.push({ cle: 'miroir', titre: 'Championnat — Miroir (Kaï)', role: 'championnat', famille: 'Cendre', apres: [] });
  out.push({ cle: 'finale', titre: 'Championnat — Finale (Ysolde)', role: 'finale', famille: 'Astre', apres: [] });
  return out;
}

const epreuve = (f: Family): Evenement[] => [1, 2, 3].map((i) => ({ type: 'epreuve', famille: f, issue: 'victoire', duel: `e${f}${i}` }) as Evenement);
const joute = (f: Family): Evenement => ({ type: 'joute', famille: f, issue: 'victoire', duel: `j${f}` });
const ligne = (d: DeckAv) => {
  const n = d.cartes.filter((c) => c.startsWith('neutre-')).length;
  const v = d.cartes.filter((c) => !c.startsWith('neutre-') && !c.endsWith('-basic')).length;
  return `${n} N + ${16 - n} fam. (${v} var.)${d.signature ? ' + Sig.' : ''}`;
};

/** Duels de série : `n` duels du joueur contre l'adversaire ; victoires et tours. */
function serie(deckJ: DeckAv, pvJ: number, role: RoleAdverse, famille: Family | null, niveau: number, graine: number, stats: StatsClash): { w: number; tours: number; adv: ReturnType<typeof adversaire> } {
  const adv = adversaire(role, famille, niveau);
  // profil propre du personnage (bras droits) : celui de sa personnalité, comme en jeu
  const profil = adv.profil ?? personalityById(figureDe(famille!, 'brasDroit').apparence)!.aiProfile;
  let w = 0; let tours = 0;
  for (let s = 1; s <= N; s++) {
    const cfg: GameConfig = { seed: graine + 97 * s, players: { p1: siegeAventure(deckJ, 'p1', pvJ), p2: siegeAventure(adv.deck, 'p2', adv.pv) } };
    const m = autoplay(cfg, 200, [PROFILES.equilibre!, PROFILES[profil]!]);
    if (m.state.winner === 'p1') w++;
    tours += m.state.turn;
    ajouter(stats, m);
  }
  return { w, tours, adv: { ...adv, profil } };
}

type Voie = 'direct' | 'entraine';
interface Ligne { stats: Record<Voie, StatsClash>; titre: string; adv: string; palier: string; pvAdv: number; profil: string; deck: Partial<Record<Voie, string>>; pv: Record<Voie, number[]>; v: Record<Voie, number>; d: Record<Voie, number>; t: Record<Voie, number> }
const lignes = new Map<string, Ligne>();
function mesurer(cle: string, titre: string, voie: Voie, e: AventureEtat, combats: number, role: RoleAdverse, famille: Family | null, f1: Family): void {
  const niveau = collectionDe(e.registre).basics.length;
  const pvJ = pvJoueur(combats);
  const stats = lignes.get(cle)?.stats ?? { direct: statsVides(), entraine: statsVides() };
  const r = serie(e.deck, pvJ, role, famille, niveau, 9000 + FAMILIES.indexOf(f1) * 7 + (voie === 'entraine' ? 3 : 0), stats[voie]);
  const l: Ligne = lignes.get(cle) ?? ({ stats, titre, adv: r.adv.texte, palier: r.adv.palier, pvAdv: r.adv.pv, profil: role === 'brasDroit' ? 'propre au personnage' : r.adv.profil, deck: {}, pv: { direct: [], entraine: [] }, v: { direct: 0, entraine: 0 }, d: { direct: 0, entraine: 0 }, t: { direct: 0, entraine: 0 } } as Ligne);
  l.deck[voie] = ligne(e.deck); l.pv[voie].push(pvJ); l.v[voie] += r.w; l.d[voie] += N; l.t[voie] += r.tours;
  lignes.set(cle, l);
}
const t0 = Date.now();
for (const voie of ['direct', 'entraine'] as const) {
  for (const f1 of FAMILIES) {
    let e = apply(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }]);
    let combats = 0;
    for (const et of trame(f1)) {
      // duels facultatifs de la voie entraînée, mesurés aussi (lignes à part) : Épreuve et rue avant le cadet, Joute et
      // défi du rival avant le chef
      const n = et.cle.split('-')[1];
      const facultatif = (cle: string, titre: string, role: RoleAdverse, famille: Family | null, fois: number) => {
        if (!SEULES.length || SEULES.includes(cle)) mesurer(cle, titre, 'entraine', e, combats, role, famille, f1);
        combats += fois;
      };
      if (voie === 'entraine' && et.maison && et.cle.startsWith('cadet')) {
        facultatif(`epreuve-${n}`, `Famille ${n} — Épreuve (×3, facultative)`, 'epreuve', et.maison, 3);
        e = apply(e, epreuve(et.maison));
        facultatif(`rue-${n}`, `Famille ${n} — duel de rue (×2, facultatif)`, 'rue', et.maison, 2);
      }
      if (voie === 'entraine' && et.maison && et.cle.startsWith('chef')) {
        facultatif(`joute-${n}`, `Famille ${n} — Joute (facultative)`, 'joute', et.maison, 1);
        e = apply(e, [joute(et.maison)]);
        if (n === '1' || n === '3') facultatif(`rival-${n}`, `Kaï, défi facultatif (famille ${n}, non compté dans les PV)`, 'rival', 'Cendre', 0);
      }
      if (!SEULES.length || SEULES.includes(et.cle)) mesurer(et.cle, et.titre, voie, e, combats, et.role, et.famille, f1);
      e = apply(e, et.apres);
      combats += et.cle === 'poule' ? 3 : 1;
    }
  }
}
const pct = (l: Ligne, v: Voie) => (l.d[v] ? `${(100 * l.v[v] / l.d[v]).toFixed(1)} %` : '—');
const pvTxt = (xs: number[]) => (!xs.length ? '—' : Math.min(...xs) === Math.max(...xs) ? String(xs[0]) : `${Math.min(...xs)}–${Math.max(...xs)}`);
const tours = (l: Ligne) => { const v: Voie = l.d.direct ? 'direct' : 'entraine'; return (l.t[v] / l.d[v]).toFixed(1); };
console.log(`PV du joueur : ${PV_DEPART} + ${PV_PAR_COMBAT} par combat ; ${N} duels par famille d'accueil et par étape (×4 familles) ; ${Math.round((Date.now() - t0) / 1000)} s`);
console.log(`PV adverses par rôle et niveau : ${JSON.stringify(PV_ADVERSE)} ; IA par rôle : ${JSON.stringify(PROFIL_ROLE)}`);
console.log('| Étape | Adversaire (palier : deck au niveau du joueur) | PV adv. | IA adv. | Deck du joueur (direct) | PV joueur (direct) | Victoires (direct) | PV joueur (entraîné) | Victoires (entraîné) | Tours |');
console.log('|---|---|---:|---|---|---:|---:|---:|---:|---:|');
for (const l of lignes.values()) console.log(`| ${l.titre} | ${l.palier} : ${l.adv} | ${l.pvAdv} | ${l.profil} | ${l.deck.direct ?? l.deck.entraine} | ${pvTxt(l.pv.direct)} | ${pct(l, 'direct')} | ${pvTxt(l.pv.entraine)} | ${pct(l, 'entraine')} | ${tours(l)} |`);
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  const head = execSync('git rev-parse --short HEAD').toString().trim();
  writeFileSync(OUT, JSON.stringify({ commit: head, duelsParFamilleEtEtape: N, pv: { depart: PV_DEPART, parCombat: PV_PAR_COMBAT }, pvAdverses: PV_ADVERSE, profils: PROFIL_ROLE, composition: COMPOSITION, lignes: [...lignes.values()].map(({ stats, ...l }) => ({ ...l, statsClash: { direct: stats.direct.duels ? resume(stats.direct) : null, entraine: stats.entraine.duels ? resume(stats.entraine) : null } })) }, null, 1) + '\n');
}
