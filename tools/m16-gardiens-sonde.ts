// M16 — places libres autour de chaque point gardé (1,1 à 1,4 m, huit directions) pour son gardien.
import { blocked, zonesAt } from '../src/ville/monde';
import { QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';
import { ilotNu } from '../src/aventure/ilots';
import { POINTS_COLLECTE } from '../src/aventure/collecteDonnees';
const ouverts = new Set<IlotId>(QUARTIERS_AJOUTES);
for (const p of POINTS_COLLECTE.filter((x) => x.gardien)) {
  const ilot = ilotNu(p.ilot, true, ouverts);
  const ok: string[] = [];
  for (const r of [1.1, 1.25, 1.4]) for (let a = 0; a < 8; a++) {
    const q = { x: +(p.at.x + Math.cos((a * Math.PI) / 4) * r).toFixed(2), z: +(p.at.z + Math.sin((a * Math.PI) / 4) * r).toFixed(2) };
    if (!blocked(ilot, q, 0.45) && !zonesAt(ilot, q).length) ok.push(`(${q.x}, ${q.z})`);
  }
  console.log(p.id, ok.join(' '));
}
