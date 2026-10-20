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

  it('M09 V3, passe 49 : les trois îlots ont le cadrage et les personnages du Quai validé', async () => {
    const { ILOTS } = await import('../src/ville/ilots');
    const { WALKER_H } = await import('../src/ville/sprites');
    for (const id of ['quai', 'parvis', 'ruelles'] as const) {
      expect(ILOTS[id].rig).toEqual(ILOTS.quai.rig);
      expect(ILOTS[id].rig?.pitch).toBeGreaterThanOrEqual(5);
      expect(ILOTS[id].rig?.pitch).toBeLessThanOrEqual(20);
      expect(ILOTS[id].walkerH).toBeGreaterThan(WALKER_H);
      expect(ILOTS[id].walkerH).toBe(ILOTS.quai.walkerH);
    }
  });

  it('M09 V3, direction D (ADR 026) étendue au Parvis et aux Ruelles (passe 49) : les trois îlots sont rendus à l’encre', async () => {
    const { ILOTS } = await import('../src/ville/ilots');
    for (const id of ['quai', 'parvis', 'ruelles'] as const) expect(ILOTS[id].style).toBe('encre');
  });

  it('M09 V3 : flou de profondeur et reflets dans chaque îlot ; la bande jouable reste nette (personnages, lampadaires)', async () => {
    const { ILOTS } = await import('../src/ville/ilots');
    const quai = await import('../src/ville/quai');
    const parvis = await import('../src/ville/parvis');
    const ruelles = await import('../src/ville/ruelles');
    const cases = [
      { id: 'quai' as const, front: quai.QUAY_Z, back: quai.FACADE_Z, pts: [...quai.NPCS.map((n) => n.at), ...quai.LAMPS] },
      { id: 'parvis' as const, front: parvis.P_FRONT_Z, back: parvis.P_FACADE_Z, pts: [...parvis.P_NPCS.map((n) => n.at), ...parvis.P_LAMPS, ...parvis.BRAZIERS] },
      { id: 'ruelles' as const, front: ruelles.R_EDGE_Z, back: ruelles.R_FACADE_Z, pts: [...ruelles.R_NPCS.map((n) => n.at), ...ruelles.R_LAMPS] },
    ];
    for (const c of cases) {
      const dof = ILOTS[c.id].dof!;
      expect(dof.nearZ).toBeGreaterThan(c.front);
      expect(dof.farZ).toBeLessThan(c.back);
      for (const p of c.pts) expect(p.z).toBeLessThan(dof.nearZ);
      expect(dof.farAmt).toBeGreaterThan(0);
      expect(dof.farAmt).toBeLessThanOrEqual(1);
      expect(ILOTS[c.id].reflets?.proxyZ).toBe(c.back);
      // l'îlot entier tient dans la bande nette (de son bord avant au pied des façades)
      expect(ILOTS[c.id].ilot.bounds.z1).toBeLessThan(dof.nearZ);
      expect(ILOTS[c.id].ilot.bounds.z0).toBeGreaterThan(dof.farZ);
    }
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

describe('ville : feuilles de personnages (ADR 027, contrat v2)', () => {
  const v1 = { file: 'player-Cendre.png', sha256: 'a'.repeat(64), cell: [96, 160] as [number, number], cols: 5, rows: 3, source: 'Aseprite 1.3, joueur.aseprite', approved: false };
  const v2 = { ...v1, file: 'player.png', scale: 2, anchor: [48, 152] as [number, number], figureH: 148, recolor: ['tenue' as const, 'accent' as const], fiche: 'art-src/sprites/player/fiche.json' };

  it('contrat v1 toujours accepté : fichier, empreinte, grille de l’atlas, provenance et statut', async () => {
    const { checkManifestEntry, specOf } = await import('../src/ville/spritesExternes');
    expect(checkManifestEntry('player-Cendre', v1, 1)).toEqual([]);
    expect(checkManifestEntry('x', null, 1)).toHaveLength(1);
    expect(checkManifestEntry('x', { ...v1, file: '../hors.png' }, 1).join()).toMatch(/fichier/);
    expect(checkManifestEntry('x', { ...v1, sha256: 'xyz' }, 1).join()).toMatch(/SHA-256/);
    expect(checkManifestEntry('x', { ...v1, cell: [64, 64] }, 1).join()).toMatch(/cellule/);
    expect(checkManifestEntry('x', { ...v1, cols: 4 }, 1).join()).toMatch(/grille/);
    expect(checkManifestEntry('x', { ...v1, source: '' }, 1).join()).toMatch(/provenance/);
    expect(checkManifestEntry('x', { ...v1, approved: undefined }, 1).join()).toMatch(/approbation/);
    // v1 : échelle 1, ancrage et figure de l'atlas par code, ni teinte ni fiche
    expect(specOf(v1, 1)).toEqual({ scale: 1, anchor: [48, 152], figureH: 148, recolor: [] });
  });

  it('contrat v2 : échelle 1, 1,5 ou 2, ancrage et hauteur de figure dans la case, teintes connues, fiche de provenance', async () => {
    const { checkManifestEntry, specOf, sheetSize } = await import('../src/ville/spritesExternes');
    expect(checkManifestEntry('player', v2, 2)).toEqual([]);
    expect(specOf(v2, 2)).toEqual({ scale: 2, anchor: [48, 152], figureH: 148, recolor: ['tenue', 'accent'] });
    // une entrée v1 dans un manifeste v2 n'est pas complète (échelle, ancrage, figure, fiche)
    expect(checkManifestEntry('x', v1, 2).join()).toMatch(/échelle.*ancrage.*fiche/s);
    expect(checkManifestEntry('x', { ...v2, scale: 3 }, 2).join()).toMatch(/échelle/);
    expect(checkManifestEntry('x', { ...v2, anchor: [0, 152] }, 2).join()).toMatch(/ancrage/);
    expect(checkManifestEntry('x', { ...v2, anchor: [48, 170] }, 2).join()).toMatch(/ancrage/);
    expect(checkManifestEntry('x', { ...v2, figureH: 156 }, 2).join()).toMatch(/figure/);
    expect(checkManifestEntry('x', { ...v2, figureH: 40 }, 2).join()).toMatch(/figure/);
    expect(checkManifestEntry('x', { ...v2, anchor: [50, 158], figureH: 156 }, 2)).toEqual([]);
    expect(checkManifestEntry('x', { ...v2, recolor: ['tenue', 'tenue'] }, 2).join()).toMatch(/teintes/);
    expect(checkManifestEntry('x', { ...v2, recolor: ['cape'] }, 2).join()).toMatch(/teintes/);
    expect(checkManifestEntry('x', { ...v2, fiche: 'ailleurs/fiche.json' }, 2).join()).toMatch(/fiche/);
    expect(sheetSize(1)).toEqual([480, 480]);
    expect(sheetSize(1.5)).toEqual([720, 720]);
    expect(sheetSize(2)).toEqual([960, 960]);
  });

  it('le contrat est celui de l’atlas par code (grille, ancrage, figure) ; l’atlas par code se déclare à l’échelle 1,5', async () => {
    const { SHEET_CELL, SHEET_COLS, SHEET_ROWS, DEFAULT_ANCHOR, DEFAULT_FIGURE_H } = await import('../src/ville/spritesExternes');
    const { CELL_W, CELL_H, COLS, ROWS, ATLAS_SCALE, CODE_SPEC } = await import('../src/ville/sprites');
    expect([CELL_W, CELL_H, COLS, ROWS]).toEqual([...SHEET_CELL, SHEET_COLS, SHEET_ROWS]);
    expect(CODE_SPEC).toEqual({ scale: ATLAS_SCALE, anchor: DEFAULT_ANCHOR, figureH: DEFAULT_FIGURE_H, recolor: [] });
  });

  it('clés du manifeste : identifiant exact, puis feuille commune du joueur ou du gabarit de PNJ', async () => {
    const { sheetKeys } = await import('../src/ville/spritesExternes');
    expect(sheetKeys('player-Voile')).toEqual(['player-Voile', 'player']);
    expect(sheetKeys('pnj-docker-9')).toEqual(['pnj-docker-9', 'pnj-docker']);
    expect(sheetKeys('braise')).toEqual(['braise']);
  });

  it('approbation (C2) : hors QA, une feuille non approuvée est refusée ; en QA elle passe, signalée ; `sprites=code` force l’atlas par code', async () => {
    const { admit, spritePolicy } = await import('../src/ville/spritesExternes');
    expect(spritePolicy(false, null)).toBe('approuvees');
    expect(spritePolicy(false, 'code')).toBe('approuvees');
    expect(spritePolicy(true, null)).toBe('qa');
    expect(spritePolicy(true, 'externes')).toBe('qa');
    expect(spritePolicy(true, 'code')).toBe('code');
    expect(spritePolicy(true, 'approuvees')).toBe('approuvees');
    expect(admit('approuvees', false)).toEqual({ ok: false, unapproved: true });
    expect(admit('approuvees', true)).toEqual({ ok: true, unapproved: false });
    expect(admit('qa', false)).toEqual({ ok: true, unapproved: true });
    expect(admit('code', true).ok).toBe(false);
  });

  it('recoloration (C5) : tons clés réservés distincts ; couleurs cibles du joueur par famille, des PNJ par graine', async () => {
    const { RECOLOR_SLOTS, keyColor } = await import('../src/ville/spritesExternes');
    const { recolorTargets } = await import('../src/ville/sprites');
    const { FAMILY_PALETTE } = await import('../src/art/palette');
    const { npcLook } = await import('../src/presentation/npcs');
    expect(keyColor('tenue', 0)).toBe('#400040');
    expect(keyColor('tenue', 3)).toBe('#ff00ff');
    expect(keyColor('peau', 2)).toBe('#bf0000');
    const keys = RECOLOR_SLOTS.flatMap((s) => [0, 1, 2, 3].map((l) => keyColor(s, l)));
    expect(new Set(keys).size).toBe(keys.length);
    const c = recolorTargets('player-Cendre');
    const v = recolorTargets('player-Voile');
    expect(c.tenue!.base).toBe(FAMILY_PALETTE.Cendre.mid);
    expect(v.tenue!.base).toBe(FAMILY_PALETTE.Voile.mid);
    expect(v.accent!.base).toBe(FAMILY_PALETTE.Voile.accent);
    expect(c.peau).toEqual(v.peau);
    const d1 = recolorTargets('pnj-docker-1');
    expect(d1.peau).toEqual(npcLook('pnj-docker-1')!.skin);
    expect(d1.tenue).toEqual(npcLook('pnj-docker-1')!.cloth);
    expect(d1.accent).toBeUndefined();
    expect(recolorTargets('pnj-docker-9')).toEqual(recolorTargets('pnj-docker-9'));
  });
});

describe('ville : feuilles en pixel art (ADR 028, A2 : contrat v3)', () => {
  const v2 = { file: 'player.png', sha256: 'a'.repeat(64), cell: [96, 160] as [number, number], cols: 5, rows: 3, scale: 2, anchor: [48, 152] as [number, number], figureH: 148, recolor: ['tenue' as const], source: 'QA', fiche: 'art-src/sprites/player/fiche.json', approved: false };
  const px = { ...v2, pixel: true, cell: [48, 80] as [number, number], scale: 3, anchor: [24, 76] as [number, number], figureH: 72 };

  it('v3 : grille d’art déclarée (16 × 24 à 96 × 160), agrandissement entier, ancrage et figure en px d’art ; v1 et v2 toujours acceptés', async () => {
    const { checkManifestEntry, specOf, sheetSize } = await import('../src/ville/spritesExternes');
    expect(checkManifestEntry('player', px, 3)).toEqual([]);
    // un manifeste v3 accepte aussi les entrées lisses du contrat v2 ; un manifeste v2 refuse le pixel art
    expect(checkManifestEntry('player', v2, 3)).toEqual([]);
    expect(checkManifestEntry('player', v2, 2)).toEqual([]);
    expect(checkManifestEntry('player', px, 2).join()).toMatch(/contrat v3/);
    expect(specOf(px, 3)).toEqual({ scale: 3, anchor: [24, 76], figureH: 72, recolor: ['tenue'], cell: [48, 80], pixel: true });
    expect(specOf(v2, 3)).toEqual({ scale: 2, anchor: [48, 152], figureH: 148, recolor: ['tenue'] });
    expect(sheetSize(3, [48, 80])).toEqual([720, 720]);
    expect(sheetSize(1, [32, 48])).toEqual([160, 144]);
    // agrandissement entier seulement, de 1 à 8 ; grille d'art en px entiers dans les bornes
    expect(checkManifestEntry('x', { ...px, scale: 1.5 }, 3).join()).toMatch(/agrandissement/);
    expect(checkManifestEntry('x', { ...px, scale: 9 }, 3).join()).toMatch(/agrandissement/);
    expect(checkManifestEntry('x', { ...px, cell: [12, 80] }, 3).join()).toMatch(/grille d'art/);
    expect(checkManifestEntry('x', { ...px, cell: [48.5, 80] }, 3).join()).toMatch(/grille d'art/);
    expect(checkManifestEntry('x', { ...px, cell: [96, 170] }, 3).join()).toMatch(/grille d'art/);
    // la plus grande feuille admise : 480 × 8 = 3840 px de côté
    expect(checkManifestEntry('x', { ...px, cell: [96, 160], anchor: [48, 152], figureH: 148, scale: 8 }, 3)).toEqual([]);
    // ancrage et figure lus dans la grille d'art
    expect(checkManifestEntry('x', { ...px, anchor: [50, 76] }, 3).join()).toMatch(/ancrage.*48×80/);
    expect(checkManifestEntry('x', { ...px, figureH: 30 }, 3).join()).toMatch(/figure/);
    expect(checkManifestEntry('x', { ...px, pixel: 'oui' }, 3).join()).toMatch(/pixel/);
  });

  it('panneau tiré de la feuille : la figure vaut la hauteur de référence, les pieds à l’origine, quelle que soit la grille', async () => {
    const { walkerPanel, CODE_SPEC, WALKER_H } = await import('../src/ville/sprites');
    for (const spec of [CODE_SPEC, { scale: 3, anchor: [24, 76] as const, figureH: 72, recolor: [], cell: [48, 80] as const, pixel: true }, { scale: 2, anchor: [20, 46] as const, figureH: 44, recolor: [], cell: [40, 48] as const, pixel: true }]) {
      const { geo, ax } = walkerPanel(spec);
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const [cw, ch] = spec.cell ?? [96, 160];
      const unit = (bb.max.y - bb.min.y) / ch;
      // pieds (ancrage) à y = 0 ; sommet de la figure à WALKER_H ; rapport de la case conservé
      // (géométrie en flottants 32 bits)
      expect(bb.min.y + (ch - spec.anchor[1]) * unit).toBeCloseTo(0, 6);
      expect(spec.figureH * unit).toBeCloseTo(WALKER_H, 6);
      expect((bb.max.x - bb.min.x) / (bb.max.y - bb.min.y)).toBeCloseTo(cw / ch, 6);
      expect(ax).toBeCloseTo((0.5 - spec.anchor[0] / cw) * (bb.max.x - bb.min.x), 6);
      geo.dispose();
    }
  });
});

describe('ville : plans de décor (ADR 028, B2 : diorama de plans peints)', () => {
  const plate = (o: Record<string, unknown> = {}) => ({
    file: 'facades.png', sha256: 'b'.repeat(64), size: [3072, 1024], at: [0, 0, -3], width: 48, orient: 'face', order: 3, blend: 'decoupe',
    source: 'QA', fiche: 'art-src/decors/quai-facades/fiche.json', approved: false, ...o,
  });
  const ilot = (plans: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ plans, ...extra });

  it('contrôle d’un plan : fichier, empreinte, dimensions, pose au monde, ordre, mélange, parts d’éclairage et de brume, fiche, statut', async () => {
    const { checkPlate } = await import('../src/ville/decors');
    expect(checkPlate('quai/facades', plate())).toEqual([]);
    expect(checkPlate('x', plate({ orient: 'sol', blend: 'fondu', lit: 0.4, fog: 0 }))).toEqual([]);
    expect(checkPlate('x', null)).toHaveLength(1);
    expect(checkPlate('x', plate({ file: '../hors.png' })).join()).toMatch(/fichier/);
    expect(checkPlate('x', plate({ sha256: 'nope' })).join()).toMatch(/SHA-256/);
    expect(checkPlate('x', plate({ size: [5000, 1024] })).join()).toMatch(/dimensions/);
    expect(checkPlate('x', plate({ size: [1024.5, 1024] })).join()).toMatch(/dimensions/);
    expect(checkPlate('x', plate({ at: [0, 0] })).join()).toMatch(/position/);
    expect(checkPlate('x', plate({ width: 0 })).join()).toMatch(/largeur/);
    expect(checkPlate('x', plate({ orient: 'biais' })).join()).toMatch(/orientation/);
    expect(checkPlate('x', plate({ order: 1.5 })).join()).toMatch(/ordre/);
    expect(checkPlate('x', plate({ blend: 'additif' })).join()).toMatch(/mélange/);
    expect(checkPlate('x', plate({ lit: 2 })).join()).toMatch(/éclairage/);
    expect(checkPlate('x', plate({ fog: -1 })).join()).toMatch(/brume/);
    expect(checkPlate('x', plate({ fiche: 'art-src/sprites/x/fiche.json' })).join()).toMatch(/fiche/);
    expect(checkPlate('x', plate({ approved: 'oui' })).join()).toMatch(/approbation/);
  });

  it('contrôle d’un diorama : 1 à 8 plans, ordres uniques et d’arrière en avant, lumières, budget GPU', async () => {
    const { checkIlotDecor, DECOR_MAX_PLATES } = await import('../src/ville/decors');
    const ok = ilot({ ciel: plate({ file: 'ciel.png', at: [0, -2, -60], width: 200, order: 0, blend: 'fondu', fog: 0 }), facades: plate(), eau: plate({ file: 'eau.png', orient: 'sol', at: [0, -1.15, 8], order: 5 }) }, { lumieres: [{ at: [-13, 3.4, 2.95], color: 'Astre', intensity: 2.2, radius: 9, halo: 1.6 }, { at: [7, 2.5, -2.9], color: [1, 0.5, 0.2], intensity: 1, radius: 6 }], sol: true });
    expect(checkIlotDecor('quai', ok)).toEqual([]);
    expect(checkIlotDecor('quai', ilot({})).join()).toMatch(/0 plans/);
    const many = Object.fromEntries(Array.from({ length: DECOR_MAX_PLATES + 1 }, (_, i) => [`p${i}`, plate({ order: i, at: [0, 0, -50 + i] })]));
    expect(checkIlotDecor('quai', ilot(many)).join()).toMatch(new RegExp(`${DECOR_MAX_PLATES + 1} plans`));
    expect(checkIlotDecor('quai', ilot({ a: plate(), b: plate({ at: [0, 0, 4] }) })).join()).toMatch(/ordre 3 partagé/);
    // un plan plus lointain dessiné après un plan plus proche : refusé
    expect(checkIlotDecor('quai', ilot({ loin: plate({ at: [0, 0, -20], order: 4 }), pres: plate({ at: [0, 0, 2], order: 1 }) })).join()).toMatch(/plus lointain.*dessiné après/);
    // même profondeur : l'ordre départage, sans contradiction
    expect(checkIlotDecor('quai', ilot({ a: plate({ order: 1 }), b: plate({ order: 2 }) }))).toEqual([]);
    expect(checkIlotDecor('quai', ilot({ 'pl/an': plate() })).join()).toMatch(/identifiant/);
    expect(checkIlotDecor('quai', ilot({ a: plate() }, { lumieres: [{ at: [0, 0, 0], color: 'rose', intensity: 1, radius: 5 }] })).join()).toMatch(/couleur/);
    expect(checkIlotDecor('quai', ilot({ a: plate() }, { lumieres: Array.from({ length: 17 }, () => ({ at: [0, 0, 0], color: 'ambre', intensity: 1, radius: 5 })) })).join()).toMatch(/16 au plus/);
    expect(checkIlotDecor('quai', ilot({ a: plate() }, { sol: 'oui' })).join()).toMatch(/sol/);
    // budget : 3 plans de 4096 × 4096 dépassent les 160 Mo de mémoire GPU
    const big = Object.fromEntries(Array.from({ length: 3 }, (_, i) => [`p${i}`, plate({ size: [4096, 4096], order: i, at: [0, 0, -50 + i] })]));
    expect(checkIlotDecor('quai', ilot(big)).join()).toMatch(/mémoire GPU/);
    expect(checkIlotDecor('quai', null).join()).toMatch(/illisible/);
    expect(checkIlotDecor('quai', { plans: [] }).join()).toMatch(/plans/);
  });

  it('passe 60 : cadrage propre au diorama et brumes du moteur entre les plans, contrôlés', async () => {
    const { checkIlotDecor, DECOR_MAX_MISTS } = await import('../src/ville/decors');
    const base = ilot({ a: plate() });
    expect(checkIlotDecor('quai', { ...base, camera: { pitch: 6, distance: 25, fov: 42, aimY: 4.8, minX: -6, maxX: 6 } })).toEqual([]);
    expect(checkIlotDecor('quai', { ...base, camera: { distance: 25 } })).toEqual([]);
    expect(checkIlotDecor('quai', { ...base, camera: { pitch: 45 } }).join()).toMatch(/cadrage invalide/);
    expect(checkIlotDecor('quai', { ...base, camera: { minX: 5, maxX: -5 } }).join()).toMatch(/cadrage invalide/);
    expect(checkIlotDecor('quai', { ...base, camera: null }).join()).toMatch(/cadrage invalide/);
    const mist = [120, 10, 0, 6, -9, 0.3, 0.008, [5, 1.2]];
    expect(checkIlotDecor('quai', { ...base, brumes: [mist] })).toEqual([]);
    expect(checkIlotDecor('quai', { ...base, brumes: [[120, 10, 0, 6, -9, 1.5, 0.008, [5, 1.2]]] }).join()).toMatch(/brumes/);
    expect(checkIlotDecor('quai', { ...base, brumes: [[120, 10, 0, 6, -9, 0.3, 0.008]] }).join()).toMatch(/brumes/);
    expect(checkIlotDecor('quai', { ...base, brumes: Array.from({ length: DECOR_MAX_MISTS + 1 }, () => mist) }).join()).toMatch(/brumes/);
    // ton facultatif des brumes (clarté, de 0,5 à 4) et voile atmosphérique des plans (0 à 1)
    expect(checkIlotDecor('quai', { ...base, brumes: [[...mist, 2.2]] })).toEqual([]);
    expect(checkIlotDecor('quai', { ...base, brumes: [[...mist, 9]] }).join()).toMatch(/brumes/);
    expect(checkIlotDecor('quai', ilot({ a: plate({ voile: 0.5 }) }))).toEqual([]);
    expect(checkIlotDecor('quai', ilot({ a: plate({ voile: 1.5 }) })).join()).toMatch(/voile atmosphérique/);
  });

  it('pose au monde : plan de face posé sur son bas, plan couché centré ; ordre de dessin d’arrière en avant', async () => {
    const { plateRect, platesInOrder, plateGpuBytes } = await import('../src/ville/decors');
    expect(plateRect({ at: [2, 0.5, -3], width: 48, size: [3072, 1024], orient: 'face' })).toEqual({ center: [2, 0.5 + 8, -3], w: 48, h: 16, orient: 'face' });
    expect(plateRect({ at: [0, -1.15, 8], width: 64, size: [2048, 256], orient: 'sol' })).toEqual({ center: [0, -1.15, 8], w: 64, h: 8, orient: 'sol' });
    const e = ilot({ b: plate({ order: 4 }), a: plate({ order: 1 }), c: plate({ order: 2 }) }) as never;
    expect(platesInOrder(e).map(([id]) => id)).toEqual(['a', 'c', 'b']);
    expect(plateGpuBytes([3072, 1024])).toBe(Math.round(3072 * 1024 * 4 * 4 / 3));
  });

  it('admission tout ou rien : hors QA, un seul plan non approuvé refuse l’îlot ; en QA il passe, nommé ; `decors=code` garde le décor par code', async () => {
    const { decideIlot, decorPolicy } = await import('../src/ville/decors');
    expect(decorPolicy(false, 'code')).toBe('approuvees');
    expect(decorPolicy(true, 'code')).toBe('code');
    const all = ilot({ ciel: plate({ order: 0, at: [0, 0, -60], approved: true }), facades: plate({ approved: true }) });
    const one = ilot({ ciel: plate({ order: 0, at: [0, 0, -60], approved: true }), facades: plate({ approved: false }) });
    expect(decideIlot('approuvees', 'quai', all)).toEqual({ ok: true, unapproved: [], issues: [] });
    const refused = decideIlot('approuvees', 'quai', one);
    expect(refused.ok).toBe(false);
    expect(refused.issues.join()).toMatch(/quai\/facades : plan non approuvé/);
    expect(decideIlot('qa', 'quai', one)).toEqual({ ok: true, unapproved: ['quai/facades'], issues: [] });
    expect(decideIlot('code', 'quai', all)).toEqual({ ok: false, unapproved: [], issues: [] });
    // non conforme : refusé dans toutes les politiques, avec la raison et le décor par code gardé
    const bad = decideIlot('qa', 'quai', ilot({ a: plate({ sha256: 'x' }) }));
    expect(bad.ok).toBe(false);
    expect(bad.issues.join(' | ')).toMatch(/SHA-256.*décor par code gardé/);
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
