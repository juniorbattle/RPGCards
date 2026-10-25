// Avenant 07 (règle V3.3) — tableau avant / après des mesures d'équilibre, mêmes graines : `tools/v33-equilibre.ts`
// (Duel standard, rivaux, duels de la ville) et `tools/m10a-paliers.ts` (aventure, Championnat).
// Usage : node tools/v33-comparer.mjs [dossier avant] [dossier après] > artifacts/qa/v33/comparaison.md
import { readFileSync } from 'node:fs';

const A = process.argv[2] ?? 'artifacts/qa/v33/avant';
const B = process.argv[3] ?? 'artifacts/qa/v33/apres';
const lire = (f) => JSON.parse(readFileSync(f, 'utf8'));
const num = (s) => (s == null || s === '—' ? null : parseFloat(String(s)));
const ecart = (a, b, unite = ' pts') => (a == null || b == null ? '—' : `${b - a >= 0 ? '+' : ''}${(b - a).toFixed(1)}${unite}`);
const pc = (x) => (x == null ? '—' : `${x.toFixed(1)} %`);

const sa = lire(`${A}/standard.json`); const sb = lire(`${B}/standard.json`);
console.log(`## Duel standard (${sa.duelsParLigne} duels par ligne ; avant ${sa.commit}, après ${sb.commit})\n`);
console.log('| Ligne | Victoires p1 avant → après | Écart | Tours avant → après | Gardes jouées avant → après | A/G : Garde gagne avant → après | Dégâts de base par Assaut vainqueur avant → après |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for (const la of sa.lignes) {
  const lb = sb.lignes.find((x) => x.ligne === la.ligne);
  if (!lb) continue;
  const [va, vb] = [num(la.victoiresP1), num(lb.victoiresP1)];
  const [ta, tb] = [la.stats.toursMoyens, lb.stats.toursMoyens];
  console.log(`| ${la.ligne} | ${pc(va)} → ${pc(vb)} | ${ecart(va, vb)} | ${ta} → ${tb} (${ecart(ta, tb, '')}) | ${la.stats.partGardes} → ${lb.stats.partGardes} | ${la.stats.agGardeGagne} → ${lb.stats.agGardeGagne} | ${la.stats.degatsBaseParAssautVainqueur} → ${lb.stats.degatsBaseParAssautVainqueur} |`);
}

const pa = lire(`${A}/paliers.json`); const pb = lire(`${B}/paliers.json`);
console.log(`\n## Aventure et Championnat (${pa.duelsParFamilleEtEtape} duels par famille d'accueil et par étape, ×4 ; avant ${pa.commit}, après ${pb.commit})\n`);
console.log('| Étape | Victoires (direct) avant → après | Écart | Victoires (entraîné) avant → après | Écart | Tours avant → après | Gardes jouées avant → après |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
const taux = (l, v) => (l.d[v] ? (100 * l.v[v]) / l.d[v] : null);
const tours = (l) => { const v = l.d.direct ? 'direct' : 'entraine'; return l.t[v] / l.d[v]; };
for (const la of pa.lignes) {
  const lb = pb.lignes.find((x) => x.titre === la.titre);
  if (!lb) continue;
  const [da, db, ea, eb] = [taux(la, 'direct'), taux(lb, 'direct'), taux(la, 'entraine'), taux(lb, 'entraine')];
  const sA = la.statsClash.direct ?? la.statsClash.entraine; const sB = lb.statsClash.direct ?? lb.statsClash.entraine;
  console.log(`| ${la.titre} | ${pc(da)} → ${pc(db)} | ${ecart(da, db)} | ${pc(ea)} → ${pc(eb)} | ${ecart(ea, eb)} | ${tours(la).toFixed(1)} → ${tours(lb).toFixed(1)} | ${sA.partGardes} → ${sB.partGardes} |`);
}
