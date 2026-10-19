// M09 — logique pure de la ville : déplacement, collisions, zones, cohérence de l'îlot du Quai.
import { describe, expect, it } from 'vitest';
import {
  RUN_SPEED, WALKER_RADIUS, WALK_SPEED, activeZone, blocked, nearestFree, newWalker, slide, stepWalker, validateIlot, zonesAt,
  type Ilot, type Walker,
} from '../src/ville/monde';
import { FACADE_Z, NPCS, QUAI, QUAY_Z, STALL } from '../src/ville/quai';

const box: Ilot = {
  id: 't', name: 'test', bounds: { x0: -5, z0: -5, x1: 5, z1: 5 },
  rects: [{ x0: 1, z0: -1, x1: 2, z1: 1 }], discs: [{ x: -2, z: 0, r: 0.5 }],
  zones: [{ id: 'p', kind: 'porte', label: 'Entrer', area: { x0: 3, z0: -1, x1: 5, z1: 1 }, target: 'x' }, { id: 'n', kind: 'parler', label: 'Parler', area: { x: 0, z: 3, r: 1 } }],
  spawns: { a: { x: 0, z: 0 } },
};
const run = (ilot: Ilot, w: Walker, dir: { x: number; z: number }, seconds: number, slowly = false) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) w = stepWalker(ilot, w, { dir, slow: slowly }, 1 / 60);
  return w;
};

describe('ville : collisions', () => {
  it('un mur rectangulaire arrête le personnage à son rayon', () => {
    const w = run(box, newWalker({ x: 0, z: 0 }), { x: 1, z: 0 }, 2);
    expect(w.pos.x).toBeLessThanOrEqual(1 - WALKER_RADIUS + 1e-6);
    expect(w.pos.x).toBeGreaterThan(1 - WALKER_RADIUS - 0.06);
    expect(blocked(box, w.pos)).toBe(false);
  });

  it('glisse le long du mur au lieu de coller (mouvement en diagonale)', () => {
    const w = run(box, newWalker({ x: 0, z: 0 }), { x: 1, z: 1 }, 1.2);
    expect(w.pos.z).toBeGreaterThan(1.5);
  });

  it('ne traverse jamais un obstacle, même à grande vitesse (sous-pas)', () => {
    const p = slide(box, { x: 0, z: 0 }, 10, 0);
    expect(p.x).toBeLessThan(1);
  });

  it('un disque (lampadaire) bloque aussi', () => {
    const w = run(box, newWalker({ x: 0, z: 0 }), { x: -1, z: 0 }, 2);
    expect(w.pos.x).toBeGreaterThanOrEqual(-2 + 0.5 + WALKER_RADIUS - 1e-6);
  });

  it('reste dans la zone praticable', () => {
    const w = run(box, newWalker({ x: 0, z: 0 }), { x: 0, z: -1 }, 5);
    expect(w.pos.z).toBeGreaterThanOrEqual(-5 + WALKER_RADIUS - 1e-6);
  });
});

describe('ville : déplacement', () => {
  it('vitesse de course et de marche atteintes, direction normalisée', () => {
    const w = run(box, newWalker({ x: -4, z: -4 }), { x: 0, z: 1 }, 1);
    expect(Math.hypot(w.vel.x, w.vel.z)).toBeCloseTo(RUN_SPEED, 1);
    const s = run(box, newWalker({ x: -4, z: -4 }), { x: 0, z: 1 }, 1, true);
    expect(Math.hypot(s.vel.x, s.vel.z)).toBeCloseTo(WALK_SPEED, 1);
    const d = run(box, newWalker({ x: -4, z: -4 }), { x: 1, z: 1 }, 0.5);
    expect(Math.hypot(d.vel.x, d.vel.z)).toBeLessThanOrEqual(RUN_SPEED + 1e-6);
  });

  it('orientation : face / dos / gauche / droite selon la direction', () => {
    expect(run(box, newWalker({ x: -4, z: 0 }), { x: 0, z: 1 }, 0.3).facing).toBe('face');
    expect(run(box, newWalker({ x: -4, z: 0 }), { x: 0, z: -1 }, 0.3).facing).toBe('dos');
    expect(run(box, newWalker({ x: -4, z: -3 }), { x: 1, z: 0 }, 0.3).facing).toBe('droite');
    expect(run(box, newWalker({ x: 4, z: -3 }), { x: -1, z: 0 }, 0.3).facing).toBe('gauche');
  });

  it('contre un mur, on ne « court » pas sur place (phase du pas figée, immobile)', () => {
    let w = run(box, newWalker({ x: 0, z: 0 }), { x: 1, z: 0 }, 2);
    w = run(box, w, { x: 1, z: 0 }, 0.5);
    expect(w.moving).toBe(false);
  });

  it('clic au sol : va vers la destination et s’y arrête', () => {
    let w = newWalker({ x: -4, z: -4 });
    for (let i = 0; i < 240; i++) w = stepWalker(box, w, { dir: { x: 0, z: 0 }, target: { x: -4, z: 2 } }, 1 / 60);
    expect(Math.hypot(w.pos.x + 4, w.pos.z - 2)).toBeLessThan(0.1);
    expect(w.moving).toBe(false);
  });

  it('déterministe : mêmes entrées, même trajectoire', () => {
    const a = run(box, newWalker({ x: -3, z: -3 }), { x: 0.7, z: 0.4 }, 3);
    const b = run(box, newWalker({ x: -3, z: -3 }), { x: 0.7, z: 0.4 }, 3);
    expect(a).toEqual(b);
  });
});

describe('ville : zones', () => {
  it('porte et PNJ détectés, le plus proche d’abord', () => {
    expect(activeZone(box, { x: 4, z: 0 })?.id).toBe('p');
    expect(activeZone(box, { x: 0, z: 2.5 })?.id).toBe('n');
    expect(activeZone(box, { x: -4, z: -4 })).toBeNull();
    expect(zonesAt(box, { x: 0, z: 3 }).map((z) => z.id)).toEqual(['n']);
  });

  it('destination cliquée dans un obstacle : point praticable le plus proche', () => {
    const p = nearestFree(box, { x: 1.5, z: 0 })!;
    expect(blocked(box, p)).toBe(false);
    expect(Math.hypot(p.x - 1.5, p.z)).toBeLessThan(1);
  });
});

describe('ville : îlot du Quai', () => {
  it('cohérent : apparitions praticables, chaque zone atteignable', () => {
    expect(validateIlot(QUAI)).toEqual([]);
  });

  it('l’étal et les PNJ bloquent ; la rue entre façades et quai est praticable', () => {
    expect(blocked(QUAI, { x: (STALL.x0 + STALL.x1) / 2, z: (STALL.z0 + STALL.z1) / 2 })).toBe(true);
    for (const n of NPCS) expect(blocked(QUAI, n.at)).toBe(true);
    expect(blocked(QUAI, { x: -8, z: 0 })).toBe(false);
    expect(QUAI.bounds.z0).toBe(FACADE_Z);
    expect(QUAI.bounds.z1).toBe(QUAY_Z);
  });

  it('de l’arrivée, on peut marcher jusqu’à la porte de la salle de jeu, puis jusqu’au Fanal', () => {
    const goal = (z: string) => QUAI.zones.find((x) => x.id === z)!;
    let w = newWalker(QUAI.spawns.arrivee!);
    const walkTo = (t: { x: number; z: number }, zone: string) => {
      for (let i = 0; i < 60 * 20 && activeZone(QUAI, w.pos)?.id !== zone; i++) {
        const dx = t.x - w.pos.x; const dz = t.z - w.pos.z;
        w = stepWalker(QUAI, w, { dir: { x: dx, z: dz } }, 1 / 60);
      }
      return zonesAt(QUAI, w.pos).some((x) => x.id === zone);
    };
    expect(walkTo({ x: -6.75, z: -2.4 }, goal('porte-salle').id)).toBe(true);
    // contourne l'étal en passant par le milieu de la rue
    walkTo({ x: 0, z: 0.3 }, '__aucune__');
    expect(walkTo({ x: 7.2, z: -2.4 }, goal('porte-fanal').id)).toBe(true);
  });
});

describe('ville : caméra frontale (ADR 024)', () => {
  it('cadrage pur : depuis l’eau (+z), au-dessus, regard vers les façades, ≈ 12° sous l’horizontale', async () => {
    const { RIGS, framingFor, CAMERA_IDS } = await import('../src/ville/cameras');
    expect(CAMERA_IDS).toEqual(['frontale']);
    const f = framingFor(RIGS.frontale, { x: 0, z: 0 });
    expect(f.pos.z).toBeGreaterThan(QUAY_Z + 5);
    expect(f.pos.y).toBeGreaterThan(f.aim.y);
    const pitch = Math.atan2(f.pos.y - f.aim.y, f.pos.z - f.aim.z) * 180 / Math.PI;
    expect(pitch).toBeCloseTo(RIGS.frontale.pitch, 6);
    expect(framingFor(RIGS.frontale, { x: 0, z: 0 })).toEqual(f);
  });

  it('suit le personnage en x, bornée aux limites de l’îlot ; presque fixe en profondeur', async () => {
    const { RIGS, framingFor } = await import('../src/ville/cameras');
    const p = RIGS.frontale;
    expect(framingFor(p, { x: 5, z: 0 }).aim.x).toBe(5);
    expect(framingFor(p, { x: 18, z: 0 }).aim.x).toBe(p.maxX);
    expect(framingFor(p, { x: -18, z: 0 }).aim.x).toBe(p.minX);
    const dz = framingFor(p, { x: 0, z: 3 }).aim.z - framingFor(p, { x: 0, z: -3 }).aim.z;
    expect(dz).toBeCloseTo(6 * p.followZ, 6);
  });

  it('M09 V3 : réglages par l’URL (`rig=`), valeurs hors bornes ignorées ; l’URL l’emporte sur l’îlot', async () => {
    const { parseRig, createRig, RIGS } = await import('../src/ville/cameras');
    expect(parseRig(null)).toBeNull();
    expect(parseRig('')).toBeNull();
    expect(parseRig('abc')).toBeNull();
    expect(parseRig('7,18.5,39,3.05')).toEqual({ pitch: 7, distance: 18.5, fov: 39, aimY: 3.05 });
    expect(parseRig('45,18,90,3')).toEqual({ distance: 18, aimY: 3 });
    expect(parseRig('9')).toEqual({ pitch: 9 });
    const rig = createRig('frontale', { minX: -4, maxX: 4 }, { pitch: 7, fov: 39 }, { fov: 33 }, null);
    expect(rig.params).toMatchObject({ pitch: 7, fov: 33, distance: RIGS.frontale.distance, minX: -4, maxX: 4 });
    expect(RIGS.frontale.fov).toBe(33);
  });

  it('M09 V3 : le Quai a son cadrage et ses personnages plus grands ; le Parvis et les Ruelles gardent les leurs', async () => {
    const { ILOTS } = await import('../src/ville/ilots');
    const { WALKER_H } = await import('../src/ville/sprites');
    expect(ILOTS.quai.rig?.pitch).toBeGreaterThanOrEqual(5);
    expect(ILOTS.quai.rig?.pitch).toBeLessThanOrEqual(20);
    expect(ILOTS.quai.walkerH).toBeGreaterThan(WALKER_H);
    expect(ILOTS.parvis.rig).toBeUndefined();
    expect(ILOTS.ruelles.rig).toBeUndefined();
    expect(ILOTS.parvis.walkerH).toBeUndefined();
    expect(ILOTS.ruelles.walkerH).toBeUndefined();
  });
});

describe('ville : îlot et produit', () => {
  it('chaque défi d’un personnage de l’îlot est une rencontre du produit, jouée dans la rue (le Quai)', async () => {
    const { encounterById } = await import('../src/product/encounters');
    for (const n of NPCS.filter((x) => x.encounter)) {
      const e = encounterById(n.encounter!);
      expect(e, n.encounter).toBeTruthy();
      expect(e!.rival).toBe(n.id);
      expect(e!.venue).toBe('rue');
    }
  });
});

describe('ville : démo du Quai (logique pure)', () => {
  it('objectif : guide, puis docker, puis manches du Tournoi, puis le Quai libre', async () => {
    const { demoObjective } = await import('../src/ville/objectifs');
    const { newProgress } = await import('../src/product/progression');
    const p = newProgress();
    expect(demoObjective({ progress: p, history: [], guide: false })).toMatch(/^Parlez à .*, la marchande/);
    expect(demoObjective({ progress: p, history: [], guide: true })).toMatch(/^Défiez .*, le docker/);
    // une défaite contre le docker ne compte pas
    expect(demoObjective({ progress: p, history: [{ encounterId: 'ville-pnj-docker-1', outcome: 'defeat' }], guide: true })).toMatch(/^Défiez/);
    expect(demoObjective({ progress: p, history: [{ encounterId: 'ville-pnj-docker-1', outcome: 'victory' }], guide: true })).toMatch(/manche 1 : Kaï/);
    expect(demoObjective({ progress: { ...p, series: { step: 1, completed: 0 } }, history: [], guide: true })).toMatch(/manche 2 : Maëlle/);
    expect(demoObjective({ progress: { ...p, series: { step: 3, completed: 1 } }, history: [], guide: true })).toMatch(/^Le Quai est à vous/);
  });

  it('portes : la salle ouvre la manche suivante du Tournoi (puis Sélène), le Fanal Maëlle, l’arène Orin', async () => {
    const { doorEncounter } = await import('../src/ville/objectifs');
    const { newProgress, encounterStatus } = await import('../src/product/progression');
    const { encounterById } = await import('../src/product/encounters');
    const p = newProgress();
    expect(doorEncounter('salle', p)).toBe('quai-1');
    expect(encounterStatus(encounterById('quai-1')!, p).open).toBe(true);
    expect(doorEncounter('salle', { ...p, series: { step: 2, completed: 0 } })).toBe('quai-3');
    expect(doorEncounter('salle', { ...p, series: { step: 3, completed: 1 } })).toBe('libre-voile');
    expect(doorEncounter('fanal', p)).toBe('libre-ronce');
    expect(encounterStatus(encounterById('libre-ronce')!, p).open).toBe(false); // Maëlle à rencontrer d'abord
    expect(doorEncounter('arene', p)).toBe('libre-astre');
    expect(doorEncounter('ruelles', p)).toBeNull();
  });
});

describe('ville : îlots et liaisons', () => {
  it('le Parvis de l’arène est cohérent ; Orin et la joueuse sont des rencontres du produit', async () => {
    const { PARVIS, P_NPCS } = await import('../src/ville/parvis');
    const { encounterById } = await import('../src/product/encounters');
    expect(validateIlot(PARVIS)).toEqual([]);
    for (const n of P_NPCS) expect(encounterById(n.encounter!)?.rival).toBe(n.id);
  });

  it('chaque sortie mène à un îlot existant, sur un point d’apparition praticable, et réciproquement', async () => {
    const { ILOTS } = await import('../src/ville/ilots');
    for (const def of Object.values(ILOTS)) {
      for (const [zone, exit] of Object.entries(def.exits)) {
        const z = def.ilot.zones.find((x) => x.id === zone);
        expect(z?.kind, `${def.id}/${zone}`).toBe('sortie');
        const to = ILOTS[exit.to];
        const sp = to.ilot.spawns[exit.spawn];
        expect(sp, `${exit.to}/${exit.spawn}`).toBeTruthy();
        expect(blocked(to.ilot, sp!)).toBe(false);
        // retour possible
        expect(Object.values(to.exits).some((e) => e.to === def.id)).toBe(true);
      }
      for (const a of def.ambient) {
        expect(a.x0).toBeLessThan(a.x1);
        expect(blocked(def.ilot, { x: (a.x0 + a.x1) / 2, z: a.z }, 0.05)).toBe(false);
      }
    }
  });
});

describe('ville : points d’apparition devant les personnages', () => {
  it('chaque « npc-<id> » est praticable et DANS la zone de dialogue du personnage (E y fonctionne)', async () => {
    const { ILOTS } = await import('../src/ville/ilots');
    for (const def of Object.values(ILOTS)) {
      for (const n of def.npcs) {
        const sp = def.ilot.spawns[`npc-${n.id}`];
        expect(sp, `${def.id}/${n.id}`).toBeTruthy();
        expect(blocked(def.ilot, sp!), `${def.id}/${n.id} bloqué`).toBe(false);
        expect(activeZone(def.ilot, sp!)?.id, `${def.id}/${n.id}`).toBe(`npc-${n.id}`);
      }
    }
  });
});

describe('ville : feuilles de sprites externes (préparation Aseprite, inactive par défaut)', () => {
  it('le contrôle de manifeste exige fichier, empreinte, grille de l’atlas, provenance et statut', async () => {
    const { checkManifestEntry } = await import('../src/ville/spritesExternes');
    const exp = { cell: [96, 160] as [number, number], cols: 5, rows: 3 };
    const ok = { file: 'player-Cendre.png', sha256: 'a'.repeat(64), cell: [96, 160], cols: 5, rows: 3, source: 'Aseprite 1.3, joueur.aseprite', approved: false };
    expect(checkManifestEntry('player-Cendre', ok, exp)).toEqual([]);
    expect(checkManifestEntry('x', null, exp)).toHaveLength(1);
    expect(checkManifestEntry('x', { ...ok, file: '../hors.png' }, exp).join()).toMatch(/fichier/);
    expect(checkManifestEntry('x', { ...ok, sha256: 'xyz' }, exp).join()).toMatch(/SHA-256/);
    expect(checkManifestEntry('x', { ...ok, cell: [64, 64] }, exp).join()).toMatch(/cellule/);
    expect(checkManifestEntry('x', { ...ok, cols: 4 }, exp).join()).toMatch(/grille/);
    expect(checkManifestEntry('x', { ...ok, source: '' }, exp).join()).toMatch(/provenance/);
    expect(checkManifestEntry('x', { ...ok, approved: undefined }, exp).join()).toMatch(/approbation/);
  });
});

describe('ville : premier plan de la frontale', () => {
  it('aucun lampadaire du quai devant une porte (à moins de 1,5 m en x)', async () => {
    const { LAMPS, FACADES } = await import('../src/ville/quai');
    for (const f of FACADES) if (f.door !== null) for (const l of LAMPS) expect(Math.abs(l.x - f.door), `${f.id}`).toBeGreaterThan(1.5);
  });
});

describe('ville : les Ruelles', () => {
  it('îlot cohérent, relié au Quai dans les deux sens ; Sélène y propose son duel libre', async () => {
    const { RUELLES, R_NPCS } = await import('../src/ville/ruelles');
    const { ILOTS } = await import('../src/ville/ilots');
    const { encounterById } = await import('../src/product/encounters');
    expect(validateIlot(RUELLES)).toEqual([]);
    expect(ILOTS.quai.exits['sortie-ruelles']?.to).toBe('ruelles');
    expect(ILOTS.ruelles.exits['sortie-quai']?.to).toBe('quai');
    expect(encounterById(R_NPCS[0]!.encounter!)?.rival).toBe('voile');
  });
});
