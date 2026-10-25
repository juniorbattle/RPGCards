/**
 * Reprise de M09 (2026-10-20) — **la ville en rangs** : le Parvis et les Ruelles en quatre rangs, la Grande Cour (V5),
 * même grammaire que le Quai (`rangs.ts`). Pour chaque îlot : grammaire conforme ; rang 1 identique à l'îlot d'aujourd'hui
 * (ses portes, sorties et points d'apparition gardent leur place) ; chaque rang et chaque place atteints depuis l'arrivée
 * et depuis chaque sortie (parcours du plan à 25 cm) ; chemins lumineux et balises sur le pavé praticable ; le cœur de
 * chaque quartier ouvert sur la Grande Cour, et la Grande Cour sur les trois cœurs.
 */
import { describe, expect, it } from 'vitest';
import { COUR_RANGS, GRANDE_COUR, PLAN_COUR } from '../src/ville/grandeCour';
import { ILOTS, ILOTS_RANGS, ilotDef, QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';
import { PLACE_FANAL, PLAN_PORT, PORT_RANGS } from '../src/ville/placeFanal';
import { HAUTE_RANGS, PLAN_HAUTE, VILLE_HAUTE } from '../src/ville/villeHaute';
import { blocked, type Ilot, type Vec2 } from '../src/ville/monde';
import { PARVIS } from '../src/ville/parvis';
import { PARVIS_PROFOND, PARVIS_RANGS, PLAN_PARVIS } from '../src/ville/parvisRangs';
import { PLAN_QUAI, QUAI_RANGS } from '../src/ville/quaiProfond';
import { checkRangs, rangAt, type PlanRangs, type QuartierRangs } from '../src/ville/rangs';
import { RUELLES } from '../src/ville/ruelles';
import { PLAN_RUELLES, RUELLES_PROFOND, RUELLES_RANGS } from '../src/ville/ruellesRangs';

/** Cases praticables atteintes depuis un point (parcours du plan à 25 cm). */
function reach(ilot: Ilot, from: Vec2): (p: Vec2) => boolean {
  const b = ilot.bounds;
  const h = 0.25;
  const nx = Math.round((b.x1 - b.x0) / h) + 1; const nz = Math.round((b.z1 - b.z0) / h) + 1;
  const seen = new Uint8Array(nx * nz);
  const cell = (p: Vec2) => [Math.round((p.x - b.x0) / h), Math.round((p.z - b.z0) / h)] as const;
  const at = (i: number, k: number): Vec2 => ({ x: b.x0 + i * h, z: b.z0 + k * h });
  const start = cell(from);
  const todo: [number, number][] = [[start[0], start[1]]];
  seen[start[1] * nx + start[0]] = 1;
  while (todo.length) {
    const [i, k] = todo.pop()!;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const a = i + di; const c = k + dk;
      if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a]) continue;
      if (blocked(ilot, at(a, c))) continue;
      seen[c * nx + a] = 1;
      todo.push([a, c]);
    }
  }
  return (p) => { const [i, k] = cell(p); return seen[k * nx + i] === 1; };
}

const QUARTIERS: readonly [IlotId, QuartierRangs, PlanRangs][] = [
  ['quai', QUAI_RANGS, PLAN_QUAI], ['parvis', PARVIS_RANGS, PLAN_PARVIS], ['ruelles', RUELLES_RANGS, PLAN_RUELLES], ['cour', COUR_RANGS, PLAN_COUR],
  ['port', PORT_RANGS, PLAN_PORT], ['haute', HAUTE_RANGS, PLAN_HAUTE],
];

describe('la ville en rangs : grammaire et parcours', () => {
  it.each(QUARTIERS)('%s : grammaire conforme ; chaque rang, chaque place et chaque sortie atteints depuis l’arrivée', (id, q, plan) => {
    expect(checkRangs(q)).toEqual([]);
    const def = ILOTS_RANGS[id];
    const ilot = def.ilot;
    const ok = reach(ilot, ilot.spawns.arrivee!);
    // le milieu de chaque rang et le fond de chaque place (à 1 m de sa façade), entre le mobilier
    for (const r of plan.rangs) {
      const mid = { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 };
      const near = [0, 0.6, -0.6, 1.4, -1.4, 2.4, -2.4, 3.6, -3.6].map((dx) => ({ x: mid.x + dx, z: mid.z })).find((p) => !blocked(ilot, p));
      expect(near && ok(near), `${id}/${r.id}`).toBe(true);
      if (r.place) {
        const p = [0, 1, -1, 2, -2].map((dx) => ({ x: (r.place!.x0 + r.place!.x1) / 2 + dx, z: r.place!.z0 + 1 })).find((x) => !blocked(ilot, x));
        expect(p && ok(p), `${id}/${r.place.id}`).toBe(true);
      }
    }
    // chaque point d'apparition (portes, sorties, spots, personnages) est praticable et relié à l'arrivée
    for (const [k, sp] of Object.entries(ilot.spawns)) {
      expect(blocked(ilot, sp), `${id}/${k}`).toBe(false);
      expect(ok(sp), `${id}/${k} relié`).toBe(true);
    }
    // les blocs ne sont pas praticables : le milieu de chaque bande, hors de ses passages et de sa place
    for (const b of plan.bandes) {
      const x = [0, 3, -3, 6, -6].find((v) => !b.passages.some(([a, c]) => v > a - 0.5 && v < c + 0.5) && !plan.rangs.some((r) => r.place && v > r.place.x0 && v < r.place.x1 && b.z0 < r.place.z1 && b.z1 > r.place.z0));
      if (x !== undefined) expect(blocked(ilot, { x, z: (b.z0 + b.z1) / 2 }), `${id} bande ${b.n}`).toBe(true);
    }
  });

  it.each(QUARTIERS)('%s : chemins lumineux et balises sur le pavé praticable, du premier rang au cœur', (id, q, plan) => {
    const def = ILOTS_RANGS[id];
    expect(def.chemins?.length).toBeGreaterThan(0);
    for (const s of def.chemins!) {
      for (let t = 0; t <= 1; t += 0.1) {
        const p = { x: s.x0 + (s.x1 - s.x0) * t, z: s.z0 + (s.z1 - s.z0) * t };
        expect(blocked(def.ilot, p, 0.05), `${id} ${JSON.stringify(s)} à ${t.toFixed(1)}`).toBe(false);
      }
    }
    const n = q.bandes.reduce((s, b) => s + b.passages.length, 0);
    const balises = def.ilot.zones.filter((z) => z.id.startsWith('balise-'));
    expect(balises).toHaveLength(2 * n);
    for (const z of balises) {
      const a = z.area as { x0: number; x1: number; z0: number; z1: number };
      const c = { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 };
      expect(blocked(def.ilot, c), `${id}/${z.id}`).toBe(false);
      expect(rangAt(plan, c), `${id}/${z.id}`).toBeGreaterThan(0);
    }
  });
});

describe('la ville en rangs : rang 1 identique à la ville d’aujourd’hui', () => {
  it.each([['parvis', PARVIS, PARVIS_PROFOND], ['ruelles', RUELLES, RUELLES_PROFOND]] as const)('%s : portes, sorties et points d’apparition gardent leur place ; rang 1 aux mêmes bornes', (id, avant, apres) => {
    const r1 = (id === 'parvis' ? PLAN_PARVIS : PLAN_RUELLES).rangs[0]!;
    expect([r1.x0, r1.z0, r1.x1, r1.z1]).toEqual([avant.bounds.x0, avant.bounds.z0, avant.bounds.x1, avant.bounds.z1]);
    for (const z of avant.zones.filter((x) => x.kind !== 'parler')) {
      expect(apres.zones.find((x) => x.id === z.id), `${id}/${z.id}`).toEqual(z);
    }
    for (const [k, sp] of Object.entries(avant.spawns)) expect(apres.spawns[k], `${id}/${k}`).toEqual(sp);
    // ce qui était praticable au rang 1 l'est encore (personnages de la démo mis à part : mêmes places)
    const b = avant.bounds;
    for (let x = b.x0 + 0.5; x < b.x1; x += 0.5) for (let z = b.z0 + 0.4; z < b.z1; z += 0.5) {
      if (!blocked(avant, { x, z })) expect(blocked(apres, { x, z }), `${id} (${x}, ${z})`).toBe(false);
    }
  });
});

describe('la Grande Cour (V5) : au cœur de la ville', () => {
  it('une place profonde (≈ 32 × 16 m) au rang 1, la Maison du Tournoi au fond, le Belvédère derrière', () => {
    const r1 = PLAN_COUR.rangs[0]!;
    expect(r1.x1 - r1.x0).toBe(32);
    expect(r1.z1 - r1.z0).toBe(16);
    expect(PLAN_COUR.rangs.map((r) => r.nom)).toEqual(['rang 1', 'le Belvédère']);
    expect(GRANDE_COUR.zones.map((z) => z.id)).toEqual(expect.arrayContaining(['monument', 'estrade', 'tableau', 'belvedere']));
  });

  it('les cœurs des trois quartiers s’ouvrent sur la Grande Cour, qui s’ouvre sur eux ; la ville d’aujourd’hui n’y mène pas', () => {
    for (const id of ['quai', 'parvis', 'ruelles'] as const) {
      const def = ILOTS_RANGS[id];
      const z = def.ilot.zones.find((x) => x.id === 'sortie-cour')!;
      expect(z.kind).toBe('sortie');
      // la sortie est au cœur (le dernier rang)
      const a = z.area as { x0: number; x1: number; z0: number; z1: number };
      const plan = QUARTIERS.find((q) => q[0] === id)![2];
      expect(rangAt(plan, { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 }), id).toBe(plan.rangs.length);
      expect(def.exits['sortie-cour']).toEqual({ to: 'cour', spawn: `sortie-${id}` });
      expect(Object.values(ILOTS_RANGS.cour.exits)).toContainEqual({ to: id, spawn: 'sortie-cour' });
      expect(Object.values(ILOTS[id].exits).some((e) => (e.to as string) === 'cour')).toBe(false);
    }
  });
});

describe('les quartiers ajoutés (deuxième reprise de M09, ADR 028) : la Place du Fanal et la Ville haute', () => {
  it('fermés par défaut : aucune sortie vers eux, la ville en rangs d’origine telle quelle', () => {
    expect(QUARTIERS_AJOUTES).toEqual(['port', 'haute']);
    for (const id of ['quai', 'parvis', 'ruelles', 'cour'] as const) {
      const d = ilotDef(id, true);
      const vers = Object.values(d.exits).map((e) => e.to);
      expect(vers.some((t) => QUARTIERS_AJOUTES.includes(t)), id).toBe(false);
      expect(d.ilot.zones.some((z) => z.id === 'sortie-port' || z.id === 'sortie-haute'), id).toBe(false);
    }
    // la ville d'aujourd'hui n'y mène jamais, ouverts ou non
    for (const id of ['quai', 'parvis', 'ruelles'] as const) expect(Object.values(ilotDef(id, false, new Set(QUARTIERS_AJOUTES)).exits).some((e) => QUARTIERS_AJOUTES.includes(e.to))).toBe(false);
  });

  it('ouverts : le bout ouest de la cour de la Chapelle mène à la Place du Fanal, celui du Belvédère à la Ville haute, et retour', () => {
    const ouverts = new Set<IlotId>(QUARTIERS_AJOUTES);
    const quai = ilotDef('quai', true, ouverts);
    const cour = ilotDef('cour', true, ouverts);
    expect(quai.exits['sortie-port']).toEqual({ to: 'port', spawn: 'sortie-quai' });
    expect(cour.exits['sortie-haute']).toEqual({ to: 'haute', spawn: 'sortie-cour' });
    // la sortie est au bout ouest du dernier rang (cœur du Quai) et du Belvédère
    const zq = quai.ilot.zones.find((z) => z.id === 'sortie-port')!.area as { x0: number; z0: number; x1: number; z1: number };
    expect(rangAt(PLAN_QUAI, { x: (zq.x0 + zq.x1) / 2, z: (zq.z0 + zq.z1) / 2 })).toBe(PLAN_QUAI.rangs.length);
    expect(zq.x0).toBe(PLAN_QUAI.rangs[PLAN_QUAI.rangs.length - 1]!.x0);
    const zc = cour.ilot.zones.find((z) => z.id === 'sortie-haute')!.area as { x0: number; z0: number; x1: number; z1: number };
    expect(rangAt(PLAN_COUR, { x: (zc.x0 + zc.x1) / 2, z: (zc.z0 + zc.z1) / 2 })).toBe(2);
    // retours, et leurs points d'apparition praticables et reliés à l'arrivée de l'îlot d'origine
    expect(ILOTS_RANGS.port.exits['sortie-quai']).toEqual({ to: 'quai', spawn: 'sortie-port' });
    expect(ILOTS_RANGS.haute.exits['sortie-cour']).toEqual({ to: 'cour', spawn: 'sortie-haute' });
    for (const [d, k] of [[quai, 'sortie-port'], [cour, 'sortie-haute']] as const) {
      const sp = d.ilot.spawns[k]!;
      expect(blocked(d.ilot, sp), k).toBe(false);
      expect(reach(d.ilot, d.ilot.spawns.arrivee!)(sp), k).toBe(true);
    }
    expect([PLACE_FANAL.name, VILLE_HAUTE.name]).toEqual(['la Place du Fanal', 'la Ville haute']);
  });
});

describe('la ville en rangs dans la démo (décision P1 du responsable)', () => {
  it('chaque personnage et chaque passant de la ville en rangs a une personnalité (la démo les fait parler)', async () => {
    const { personalityOf } = await import('../src/product/encounters');
    for (const d of Object.values(ILOTS_RANGS)) {
      for (const n of [...d.npcs, ...d.ambient]) expect(() => personalityOf(n.id), `${d.id}/${n.id}`).not.toThrow();
    }
  });
});

describe('la ville en rangs dans l’aventure : noms des lieux', () => {
  it('chaque îlot porte son nom seul (sans la mention de laboratoire « en rangs »)', async () => {
    const { ilotAventure } = await import('../src/aventure/ilots');
    const noms = (['quai', 'parvis', 'ruelles', 'cour'] as const).map((id) => ilotAventure(id, [], true).ilot.name);
    expect(noms).toEqual(['le Quai', 'le Parvis de l’arène', 'les Ruelles', 'la Grande Cour']);
  });
});
