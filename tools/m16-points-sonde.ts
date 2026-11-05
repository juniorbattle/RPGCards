// M16 — sonde des emplacements possibles pour les points de collecte : pour chaque quartier de la ville en rangs, des
// positions praticables (marge 0,6 m), accessibles à pied depuis l'arrivée, hors de toute zone d'interaction (marge
// 0,8 m) et à 1,8 m au moins de toute place de personnage connue ; triées par distance de marche depuis l'arrivée.
// Usage : npx tsx tools/m16-points-sonde.ts [îlot]
import { blocked, zonesAt, type Ilot } from '../src/ville/monde';
import { QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';
import { ilotNu } from '../src/aventure/ilots';
import { RENCONTRES } from '../src/aventure/directeur';
import { FIGURES, KAI_PROLOGUE } from '../src/aventure/modele';

const OUVERTS = new Set<IlotId>(QUARTIERS_AJOUTES);
const ILOTS: IlotId[] = (process.argv[2] ? [process.argv[2]] : ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute']) as IlotId[];
const PAS = 0.25;

function places(id: IlotId): Array<{ x: number; z: number }> {
  const out: Array<{ x: number; z: number }> = [];
  for (const r of RENCONTRES) for (const l of r.lieux) if (l.ilot === id) out.push(l.at);
  for (const f of FIGURES) if (f.ilot === id) out.push(f.at);
  if (KAI_PROLOGUE.ilot === id) out.push(KAI_PROLOGUE.at);
  return out;
}

function enZone(ilot: Ilot, p: { x: number; z: number }): boolean {
  for (const dx of [-0.8, 0, 0.8]) for (const dz of [-0.8, 0, 0.8]) if (zonesAt(ilot, { x: p.x + dx, z: p.z + dz }).length) return true;
  return false;
}

for (const id of ILOTS) {
  const ilot = ilotNu(id, true, OUVERTS);
  const b = ilot.bounds;
  const dep = ilot.spawns.arrivee ?? Object.values(ilot.spawns)[0]!;
  // parcours en largeur sur la grille (accessibilité, distance de marche)
  const cle = (i: number, j: number) => `${i},${j}`;
  const toP = (i: number, j: number) => ({ x: b.x0 + i * PAS, z: b.z0 + j * PAS });
  const nx = Math.ceil((b.x1 - b.x0) / PAS);
  const nz = Math.ceil((b.z1 - b.z0) / PAS);
  const dist = new Map<string, number>();
  const i0 = Math.round((dep.x - b.x0) / PAS);
  const j0 = Math.round((dep.z - b.z0) / PAS);
  const file: Array<[number, number]> = [[i0, j0]];
  dist.set(cle(i0, j0), 0);
  while (file.length) {
    const [i, j] = file.shift()!;
    const d = dist.get(cle(i, j))!;
    for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ii = i + a; const jj = j + c;
      if (ii < 0 || jj < 0 || ii > nx || jj > nz || dist.has(cle(ii, jj))) continue;
      if (blocked(ilot, toP(ii, jj))) continue;
      dist.set(cle(ii, jj), d + PAS);
      file.push([ii, jj]);
    }
  }
  const pl = places(id);
  const cands: Array<{ x: number; z: number; d: number }> = [];
  for (const [k, d] of dist) {
    const [i, j] = k.split(',').map(Number) as [number, number];
    if (i % 4 || j % 4) continue; // une position par mètre
    const p = toP(i, j);
    if (blocked(ilot, p, 0.6) || enZone(ilot, p)) continue;
    if (pl.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1.8)) continue;
    cands.push({ ...p, d });
  }
  cands.sort((a, c) => a.d - c.d);
  // un échantillon réparti : quantiles de la distance de marche
  const n = cands.length;
  const pris = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.99].map((q) => cands[Math.min(n - 1, Math.floor(q * n))]).filter(Boolean);
  console.log(`\n${id} (${ilot.name}) — arrivée ${dep.x.toFixed(1)},${dep.z.toFixed(1)} — ${n} positions ; bornes x ${b.x0}..${b.x1}, z ${b.z0}..${b.z1}`);
  for (const c of pris) console.log(`  x ${c!.x.toFixed(2)}  z ${c!.z.toFixed(2)}  marche ${c!.d.toFixed(1)} m`);
}
