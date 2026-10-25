// Avenant V3.3 (la Garde réduit sans annuler) — mesures d'équilibre du mode Duel standard, avant / après, par simulation IA
// contre IA sur le moteur pur : (1) la configuration par défaut (`npm run sim`), (2) un corpus varié (quatre Signatures,
// variantes, paires de profils d'IA), (3) chaque rencontre du jeu (Tournoi du Quai, duels libres des rivaux, duels de la
// ville) avec le deck de départ du joueur, joué par l'IA « équilibré » contre le profil du rival. Taux de victoire du
// joueur (p1), longueur des duels, part des Gardes jouées, issue des Clashes Assaut contre Garde.
// L'aventure et le Championnat : `tools/m10a-paliers.ts` (mêmes statistiques par ligne).
// Usage : npx tsx tools/v33-equilibre.ts [duels par ligne] [sortie.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { FAMILIES } from '../src/game/catalog/cards';
import { PROFILES } from '../src/game/ai/policy';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';
import type { GameConfig, PlayerId } from '../src/game/model/types';
import { ENCOUNTERS, encounterConfig, personalityOf } from '../src/product/encounters';
import { STARTER_DECK } from '../src/product/collection';
import { ajouter, resume, statsVides, type StatsClash } from './v33-stats';

const N = Number(process.argv[2] ?? 200);
/** `LQV_ORDRE=adversaire` : l’adversaire (p2) verrouille en premier, comme le rival du jeu (avenant 08, S-07.3). */
const ORDRE: PlayerId[] = process.env.LQV_ORDRE === 'adversaire' ? ['p2', 'p1'] : ['p1', 'p2'];
const OUT = process.argv[3];
const t0 = Date.now();
const lignes: Array<{ ligne: string; victoiresP1: string; stats: Record<string, string | number> }> = [];
const noter = (ligne: string, s: StatsClash, w: number) => {
  lignes.push({ ligne, victoiresP1: `${(100 * w / s.duels).toFixed(1)} %`, stats: resume(s) });
};

// 1. Configuration par défaut (Cendre « toutes variantes » contre Ronce « toutes variantes », équilibré contre offensif).
{
  const s = statsVides(); let w = 0;
  for (let seed = 1; seed <= N; seed++) { const m = autoplay({ ...DEFAULT_CONFIG, seed }, 200, undefined, ORDRE); ajouter(s, m); if (m.state.winner === 'p1') w++; }
  noter('Défaut : Cendre contre Ronce, équilibré contre offensif', s, w);
}

// 2. Corpus varié : 16 paires de Signatures, variantes « toutes » ou « aucune », profils d'IA tournants.
{
  const PROFILS = Object.keys(PROFILES);
  const s = statsVides(); let w = 0;
  const parFamille = Object.fromEntries(FAMILIES.map((f) => [f, { s: statsVides(), w: 0 }]));
  for (let i = 0; i < N * 4; i++) {
    const f1 = FAMILIES[i % 4]!; const f2 = FAMILIES[Math.floor(i / 4) % 4]!;
    const cfg: GameConfig = { seed: 31001 + i, players: {
      p1: { name: 'A', hp: 90, signature: f1, variants: i % 2 ? 'all' : 'none', techniques: ['Lecture', 'Ancrage'] },
      p2: { name: 'B', hp: 90, signature: f2, variants: Math.floor(i / 2) % 2 ? 'all' : 'none', techniques: ['Sondage', 'Rupture'] } } };
    const m = autoplay(cfg, 200, [PROFILES[PROFILS[i % PROFILS.length]!]!, PROFILES[PROFILS[(i * 7 + 3) % PROFILS.length]!]!], ORDRE);
    ajouter(s, m); ajouter(parFamille[f1]!.s, m);
    if (m.state.winner === 'p1') { w++; parFamille[f1]!.w++; }
  }
  noter('Corpus varié (16 paires de Signatures, profils tournants)', s, w);
  for (const f of FAMILIES) noter(`Corpus varié — p1 en ${f}`, parFamille[f]!.s, parFamille[f]!.w);
}

// 3. Rencontres du jeu : deck de départ du joueur (PV 90), IA « équilibré », contre la fiche et le profil du rival.
// Une même fiche (manche du Tournoi et duel libre du même rival) n'est mesurée qu'une fois.
const vus = new Set<string>();
for (const enc of ENCOUNTERS) {
  if (vus.has(enc.rival)) continue;
  vus.add(enc.rival);
  const prof = personalityOf(enc.rival).aiProfile;
  const s = statsVides(); let w = 0;
  for (let k = 1; k <= N; k++) {
    const m = autoplay(encounterConfig(enc, STARTER_DECK, 52001 + 31 * k), 200, [PROFILES.equilibre!, PROFILES[prof]!], ORDRE);
    ajouter(s, m); if (m.state.winner === 'p1') w++;
  }
  noter(`${personalityOf(enc.rival).name} (${enc.kind === 'town' ? 'duel de la ville' : 'rival'}, ${prof})`, s, w);
}

const sec = Math.round((Date.now() - t0) / 1000);
console.log(`${N} duels par ligne (corpus : ${N * 4}) ; ${sec} s`);
console.log('| Ligne | Victoires p1 | Tours | Gardes jouées | Clashes A/G | A/G : Garde gagne | A/G : Assaut blesse | A/G : absorption totale | Dégâts de base par Assaut vainqueur |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const l of lignes) {
  const s = l.stats;
  console.log(`| ${l.ligne} | ${l.victoiresP1} | ${s.toursMoyens} | ${s.partGardes} | ${s.partAG} | ${s.agGardeGagne} | ${s.agAssautBlesse} | ${s.agAbsorptionTotale} | ${s.degatsBaseParAssautVainqueur} |`);
}
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  const head = execSync('git rev-parse --short HEAD').toString().trim();
  writeFileSync(OUT, JSON.stringify({ commit: head, ordre: ORDRE, duelsParLigne: N, secondes: sec, lignes }, null, 1) + '\n');
}
