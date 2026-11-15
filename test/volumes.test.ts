// Essai de profondeur du décor sur la Grande Cour (retour du responsable du 2026-11-14 : bâtiments et accessoires
// « collés/écrasés ») : découpe des escaliers et rampes 3D, normales tirées de la carte des profondeurs, ombre des
// saillies, ombres au sol des rampes ; l'essai ne vaut que pour la Grande Cour et se coupe par l'adresse.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encoder, profCyl, RELIEF_MAX, RELIEF_MIN, reliefDansMorceau, RELIEFS, sommets } from '../src/ville/reliefs';
import { OMBRE_RAMPE, ombresRampe } from '../src/ville/ombres';
import { ILOTS_RANGS } from '../src/ville/ilots';
import { inArea } from '../src/ville/monde';
import {
  bordsLigne, dansPoly, emprisesRampes, flancsRampe, flou, FORMES_ESSAI, formesVolume, ILOTS_ESSAI, metresParPixel, normale, ombrage, OMBRAGE,
  pentes, PENTE_MAX, pointPlan, RAMPES, rampeDansMorceau, sommetRampe, texelsVolume, TROU, volumeActif, type MorceauPlan,
} from '../src/ville/volumes';

type Plan = { file: string; size: [number, number]; uv?: [number, number, number, number]; orient: string; at: [number, number, number]; width: number };
const plans: Record<string, Plan> = {};
for (const f of ['public/decors/manifest.json', 'public/decors/manifest-profondeur.json']) {
  const m = JSON.parse(readFileSync(f, 'utf8')) as { ilots: Record<string, { plans: Record<string, Plan> }> };
  for (const [ilot, e] of Object.entries(m.ilots)) for (const [id, p] of Object.entries(e.plans)) plans[`${ilot}/${id}`] = p;
}
const taille = (file: string) => Object.values(plans).find((p) => p.file === file)?.size;
const morceau = (p: Plan): MorceauPlan => {
  const uv = p.uv ?? [0, 0, 1, 1];
  const h = p.width * (((uv[3] - uv[1]) * p.size[1]) / ((uv[2] - uv[0]) * p.size[0]));
  return { size: p.size, uv, x: p.at[0], y: p.at[1], z: p.at[2], w: p.width, h };
};

describe('essai de profondeur : périmètre', () => {
  it('les six quartiers en rangs ; ?volume=0 et ?relief=0 le coupent', () => {
    expect([...ILOTS_ESSAI].sort()).toEqual(['cour', 'haute', 'parvis', 'port', 'quai', 'ruelles']);
    expect(volumeActif('cour', '')).toBe(true);
    expect(volumeActif('cour', '?ville=1&volume=0')).toBe(false);
    expect(volumeActif('cour', '?relief=0')).toBe(false);
    expect(volumeActif('quai', '')).toBe(true);
    expect(volumeActif('quai', '?volume=0')).toBe(false);
    expect(volumeActif('ruelles', '')).toBe(true);
    expect(volumeActif('haute', '?relief=0')).toBe(false);
    expect(volumeActif('parvis', '?ville=1')).toBe(true);
    expect(volumeActif('inconnu', '')).toBe(false);
  });

  it('les formes d’origine ne changent pas (les autres quartiers gardent le relief de la passe 162)', () => {
    expect(RELIEFS['rangs-frise-a.png']).toHaveLength(5);
    expect(RELIEFS['villes-cour-facades.png']).toHaveLength(13);
    expect(reliefDansMorceau('rangs-frise-a.png', [3989, 834], [0, 0, 0.2, 1])).toBe(false);
    // dans l'essai, la partie gauche de la frise (le côté ouest de la Grande Cour) a ses volumes
    expect(reliefDansMorceau('rangs-frise-a.png', [3989, 834], [0, 0, 0.2, 1], formesVolume('rangs-frise-a.png'))).toBe(true);
  });
});

describe('essai de profondeur : données', () => {
  it('chaque façade peinte des six quartiers a ses volumes (frises, monuments, façades du premier rang et des cœurs)', () => {
    const m = JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8')) as { ilots: Record<string, { plans: Record<string, Plan> }> };
    const facades = new Set<string>();
    for (const ilot of ILOTS_ESSAI) for (const p of Object.values(m.ilots[ilot]!.plans)) if (p.orient === 'face' && /^(rangs-frise|rangs-monuments|villes-|quartiers-)/.test(p.file) && p.file !== 'villes-objets.png') facades.add(p.file);
    expect(facades.size).toBeGreaterThanOrEqual(11);
    for (const file of facades) expect(FORMES_ESSAI[file]?.length ?? 0, file).toBeGreaterThan(8);
  });

  it('volume rond : demi-cercle des bords au centre, symétrique', () => {
    expect(profCyl(0, 1.6, 0)).toBeCloseTo(1.6, 9);
    expect(profCyl(1, 1.6, 0)).toBeCloseTo(1.6, 9);
    expect(profCyl(0.5, 1.6, 0)).toBeCloseTo(0, 9);
    expect(profCyl(0.25, -0.15, -1.2)).toBeCloseTo(profCyl(0.75, -0.15, -1.2), 9);
    // plus bombé qu'une pente droite : au quart, déjà 87 % de l'avancée
    expect(profCyl(0.25, 0, 1)).toBeCloseTo(Math.sqrt(0.75), 9);
  });

  it('formes et découpes dans leur image, profondeurs dans les bornes de la carte', () => {
    for (const file of new Set([...Object.keys(FORMES_ESSAI), ...Object.keys(RAMPES)])) {
      const size = taille(file);
      expect(size, file).toBeDefined();
      for (const f of formesVolume(file)) {
        for (const [x, y] of sommets(f)) {
          expect(x, file).toBeGreaterThanOrEqual(0); expect(x, file).toBeLessThanOrEqual(size![0]);
          expect(y, file).toBeGreaterThanOrEqual(0); expect(y, file).toBeLessThanOrEqual(size![1]);
        }
        for (const d of typeof f.prof === 'number' ? [f.prof] : f.prof) { expect(d).toBeGreaterThanOrEqual(RELIEF_MIN); expect(d).toBeLessThanOrEqual(RELIEF_MAX); }
      }
    }
  });

  it('chaque rampe : palier au-dessus du sol, avancée raisonnable, la découpe ramenée au plan en dernier', () => {
    for (const [file, rs] of Object.entries(RAMPES)) {
      const formes = formesVolume(file);
      for (const r of rs) {
        expect(r.haut).toBeLessThan(r.bas);
        expect(r.saillie).toBeGreaterThan(0.3);
        expect(r.saillie).toBeLessThan(4);
        // le contour descend jusqu'au sol et monte jusqu'au palier
        expect(Math.max(...r.poly.map((q) => q[1]))).toBeGreaterThanOrEqual(r.bas - 1);
        expect(Math.min(...r.poly.map((q) => q[1]))).toBeLessThanOrEqual(r.haut + 2);
        const trou = formes.find((f) => 'poly' in f && f.poly === r.poly);
        expect(trou?.prof, file).toBe(0);
        expect(formes.indexOf(trou!)).toBeGreaterThanOrEqual(formes.length - rs.length);
      }
    }
  });

  it('rangs profonds du Quai : les volées des frises et le perron du Puits ont leur rampe dans leurs plans', () => {
    const dans = (id: string) => { const p = plans[`quai/${id}`]!; return (RAMPES[p.file] ?? []).filter((r) => rampeDansMorceau(r, p.size, p.uv!)).length; };
    // la maison à l'escalier au fond de la rue Haute (frise A) et de la cour de la Chapelle
    expect(dans('fond-rang2--31')).toBe(1);
    expect(dans('fond-rang4--31')).toBe(1);
    // la frise B : la volée en miroir au fond de la ruelle des Lanternes, l'autre sur un flanc
    expect(dans('fond-rang3--31') + dans('fond-rang3-9') + dans('flanc-rang4--31') + dans('flanc-rang2--31')).toBeGreaterThanOrEqual(2);
    expect(dans('fond-placette-puits')).toBe(1);
    // toutes les images des rangs profonds du Quai ont des volumes dans l'essai
    for (const file of ['rangs-frise-a.png', 'rangs-frise-b.png', 'rangs-monuments.png']) expect(FORMES_ESSAI[file]!.length, file).toBeGreaterThan(15);
  });

  it('la maison à l’escalier et l’estrade de la Grande Cour ont leur rampe dans leur plan', () => {
    const maison = plans['cour/fond-rang1-15-1']!;
    const estrade = plans['cour/estrade']!;
    expect(RAMPES[maison.file]!.filter((r) => rampeDansMorceau(r, maison.size, maison.uv!))).toHaveLength(1);
    expect(RAMPES[estrade.file]!.filter((r) => rampeDansMorceau(r, estrade.size, estrade.uv!))).toHaveLength(1);
    // la même image ailleurs (le côté ouest de la Cour) n'a pas la volée dans son morceau
    const ouest = plans['cour/fond-rang1--34-1']!;
    expect(RAMPES[ouest.file]!.some((r) => rampeDansMorceau(r, ouest.size, ouest.uv!))).toBe(false);
  });
});

describe('essai de profondeur : les rampes occupent le sol', () => {
  for (const ilot of [...ILOTS_ESSAI]) {
    it(`${ilot} : les emprises des rampes ne recouvrent ni point d'apparition, ni personnage, ni zone, ni chemin lumineux`, () => {
      const m = JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8')) as { ilots: Record<string, { plans: Record<string, Plan> }> };
      const em = emprisesRampes(Object.entries(m.ilots[ilot]!.plans).map(([id, p]) => ({ ...p, id: `${ilot}/${id}` })));
      expect(em.length).toBeGreaterThan(0);
      const def = ILOTS_RANGS[ilot as keyof typeof ILOTS_RANGS];
      const marge = 0.35;
      const dans = (p: { x: number; z: number }) => em.some((r) => p.x > r.x0 - marge && p.x < r.x1 + marge && p.z > r.z0 - marge && p.z < r.z1 + marge);
      for (const [k, sp] of Object.entries(def.ilot.spawns)) expect(dans(sp), `${ilot} apparition ${k}`).toBe(false);
      for (const n of def.npcs) expect(dans(n.at), `${ilot} PNJ ${n.id}`).toBe(false);
      // chaque zone reste atteignable : un point de sa surface au moins hors des emprises (et de leur marge)
      for (const z of def.ilot.zones) {
        const a = z.area as { x0?: number; x?: number; z0?: number; z?: number; x1?: number; z1?: number; r?: number };
        const [x0, z0, x1, z1] = a.x !== undefined ? [a.x - a.r!, a.z! - a.r!, a.x + a.r!, a.z! + a.r!] : [a.x0!, a.z0!, a.x1!, a.z1!];
        let libre = false;
        for (let i = 0; i <= 10 && !libre; i++) for (let j = 0; j <= 10 && !libre; j++) { const p = { x: x0 + ((x1 - x0) * i) / 10, z: z0 + ((z1 - z0) * j) / 10 }; if (inArea(p, z.area) && !dans(p)) libre = true; }
        expect(libre, `${ilot} zone ${z.id}`).toBe(true);
      }
      for (const c of def.chemins ?? []) for (let t = 0; t <= 1; t += 0.05) {
        const p = { x: c.x0 + (c.x1 - c.x0) * t, z: c.z0 + (c.z1 - c.z0) * t };
        expect(em.some((r) => inArea(p, r)), `${ilot} chemin ${JSON.stringify(c)}`).toBe(false);
      }
      // on passe encore : chaque emprise laisse au moins 1 m libre devant elle dans la zone praticable, ou sort de la zone
      for (const r of em) expect(r.z1 + 1 <= def.ilot.bounds.z1 || r.x0 > def.ilot.bounds.x1 || r.x1 < def.ilot.bounds.x0).toBe(true);
    });
  }
});

describe('essai de profondeur : découpe et rampe', () => {
  const carre: [number, number][] = [[10, 10], [20, 10], [20, 20], [10, 20]];
  it('point dans le polygone', () => {
    expect(dansPoly(15, 15, carre)).toBe(true);
    expect(dansPoly(25, 15, carre)).toBe(false);
    expect(dansPoly(15, 5, carre)).toBe(false);
    expect(bordsLigne(carre, 15)).toEqual([10, 20]);
    expect(bordsLigne(carre, 25)).toBeNull();
  });

  const p = plans['cour/fond-rang1-15-1']!;
  const m = morceau(p);
  const r = RAMPES[p.file]![0]!;

  it('la rampe garde sa place vue de face et avance vers la rue, du palier (contre le mur) à la marche du bas', () => {
    for (const [x, y] of r.poly) {
      const a = pointPlan(m, x, y); const b = sommetRampe(m, r, x, y);
      expect(b[0]).toBeCloseTo(a[0], 9); expect(b[1]).toBeCloseTo(a[1], 9);
      expect(b[2]).toBeGreaterThanOrEqual(m.z - 1e-9);
      expect(b[2]).toBeLessThanOrEqual(m.z + r.saillie + 1e-9);
    }
    expect(sommetRampe(m, r, 1800, r.haut)[2]).toBeCloseTo(m.z, 9);
    expect(sommetRampe(m, r, 1800, r.bas)[2]).toBeCloseTo(m.z + r.saillie, 9);
    expect(sommetRampe(m, r, 1800, r.bas)[1]).toBeCloseTo(m.y, 6);
    // une volée plane : z linéaire en y (pente constante)
    const q1 = sommetRampe(m, r, 1800, 600); const q2 = sommetRampe(m, r, 1800, 700); const q3 = sommetRampe(m, r, 1800, 800);
    expect((q2[2] - q1[2]) / (q2[1] - q1[1])).toBeCloseTo((q3[2] - q2[2]) / (q3[1] - q2[1]), 9);
    // le palier à 4,5 m environ (porte de l'étage), comme sur l'image
    expect((r.bas - r.haut) * metresParPixel(m)).toBeGreaterThan(4);
    expect((r.bas - r.haut) * metresParPixel(m)).toBeLessThan(5);
  });

  it('les flancs : des rideaux verticaux de l’arête de la rampe jusqu’au sol, de part et d’autre', () => {
    const f = flancsRampe(m, r, 12);
    expect(f.map((x) => x.cote)).toEqual(['gauche', 'droite']);
    for (const { cote, quads } of f) {
      expect(quads.length).toBeGreaterThan(8);
      for (const [a, b] of quads) {
        for (const e of [a, b]) {
          expect(e.sol[1]).toBe(m.y);
          expect(e.sol[0]).toBe(e.haut[0]); expect(e.sol[2]).toBe(e.haut[2]);
          expect(e.haut[1]).toBeGreaterThanOrEqual(m.y);
          expect(e.uv[0]).toBeCloseTo(e.haut[2] - m.z, 9);
        }
      }
      const xs = quads.map(([a]) => a.haut[0]);
      const mil = (Math.min(...r.poly.map((q) => q[0])) + Math.max(...r.poly.map((q) => q[0]))) / 2;
      const xMil = pointPlan(m, mil, r.bas)[0];
      if (cote === 'gauche') expect(Math.max(...xs)).toBeLessThan(xMil); else expect(Math.min(...xs)).toBeGreaterThan(xMil);
    }
  });

  it('ombres au sol d’une rampe : son emprise débordée sur les côtés et devant la marche du bas', () => {
    const o = ombresRampe({ x0: 23, x1: 25.5, z0: -12, z1: -9.4, h: 4.5 });
    expect(o).toHaveLength(1);
    const [s] = o;
    expect(s!.kind).toBe('pied');
    expect(s!.x - s!.w / 2).toBeCloseTo(23 - OMBRE_RAMPE.bord, 9);
    expect(s!.x + s!.w / 2).toBeCloseTo(25.5 + OMBRE_RAMPE.bord, 9);
    expect(s!.z - s!.d / 2).toBeCloseTo(-12, 9);
    expect(s!.z + s!.d / 2).toBeCloseTo(-9.4 + OMBRE_RAMPE.avant, 9);
    // une lanterne proche, derrière la rampe vue de la rue : l'ombre portée tombe vers la rue
    const avec = ombresRampe({ x0: 23, x1: 25.5, z0: -12, z1: -9.4, h: 4.5 }, [{ at: [27, 4, -12.5], color: 'ambre', intensity: 3, radius: 9 }]);
    expect(avec.some((x) => x.kind === 'portee')).toBe(true);
  });
});

describe('essai de profondeur : normales et ombre des saillies', () => {
  const W = 40; const H = 40;
  const carte = (f: (x: number, y: number) => number) => { const a = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = f(x, y); return a; };

  it('flou : une carte constante reste constante, la moyenne est gardée', () => {
    const c = flou(carte(() => 0.7), W, H, 3);
    expect(Math.max(...c) - Math.min(...c)).toBeLessThan(1e-6);
    const s = carte((x) => (x < 20 ? 0 : -1));
    const fl = flou(s, W, H, 2);
    expect(fl.reduce((a, b) => a + b, 0) / fl.length).toBeCloseTo(s.reduce((a, b) => a + b, 0) / s.length, 2);
    expect(fl[20 * W + 19]).toBeLessThan(0); expect(fl[20 * W + 19]).toBeGreaterThan(-1);
  });

  it('pentes : un escalier qui vient vers la caméra (bas en saillie) regarde vers le haut ; un mur plat regarde la rue', () => {
    // profondeur de 0 (haut) à −1,5 (bas) : la surface avance en descendant
    const { sx, sy } = pentes(carte((_, y) => (-1.5 * y) / (H - 1)), W, H);
    const i = 20 * W + 20;
    expect(sx[i]).toBeCloseTo(0, 9);
    expect(sy[i]).toBeGreaterThan(0);
    const n = normale(sx[i]!, sy[i]!, 0.05);
    expect(n[1]).toBeGreaterThan(0.3);
    expect(n[2]).toBeGreaterThan(0.3);
    expect(Math.hypot(...n)).toBeCloseTo(1, 9);
    expect(normale(0, 0, 0.05)).toEqual([0, 0, 1]);
  });

  it('normales d’une saillie : ses bords regardent vers l’extérieur (gauche, droite, haut, bas)', () => {
    const balcon = flou(carte((x, y) => (x >= 10 && x < 30 && y >= 15 && y < 25 ? -0.6 : 0)), W, H, 2);
    const { sx, sy } = pentes(balcon, W, H);
    const n = (x: number, y: number) => normale(sx[y * W + x]!, sy[y * W + x]!, 0.035);
    expect(n(10, 20)[0]).toBeLessThan(-0.3);
    expect(n(29, 20)[0]).toBeGreaterThan(0.3);
    expect(n(20, 15)[1]).toBeGreaterThan(0.3);
    expect(n(20, 24)[1]).toBeLessThan(-0.3);
    expect(n(20, 20)[2]).toBeGreaterThan(0.9);
    // un retrait (intérieur) : l'inverse
    const creux = flou(carte((x, y) => (x >= 10 && x < 30 && y >= 15 && y < 25 ? 2 : 0)), W, H, 2);
    const q = pentes(creux, W, H);
    expect(normale(q.sx[20 * W + 10]!, q.sy[20 * W + 10]!, 0.035)[0]).toBeGreaterThan(0.3);
  });

  it('ombre des saillies : sous un balcon le mur est à l’ombre, au-dessus non ; une carte plate est éclairée', () => {
    const mpt = 0.035;
    expect(ombrage(carte(() => 0), W, H, mpt).every((v) => v === 1)).toBe(true);
    const balcon = carte((x, y) => (x >= 10 && x < 30 && y >= 10 && y < 14 ? -0.6 : 0));
    const lit = ombrage(balcon, W, H, mpt);
    expect(lit[16 * W + 20]).toBeLessThan(0.6);
    expect(lit[16 * W + 20]).toBeGreaterThanOrEqual(1 - OMBRAGE.force - 1e-6);
    expect(lit[8 * W + 20]).toBe(1);
    expect(lit[16 * W + 5]).toBe(1);
    // l'ombre s'efface en descendant
    expect(lit[38 * W + 20]!).toBeGreaterThan(lit[16 * W + 20]!);
  });

  it('carte de l’essai : profondeur reprise telle quelle, lignes de bas en haut, pentes centrées, trou assombri', () => {
    const w = 8; const h = 6;
    const profR = new Uint8Array(w * h).fill(encoder(0));
    profR[0] = encoder(-1);
    const trou = new Uint8Array(w * h); trou[(h - 1) * w + 3] = 1;
    const t = texelsVolume(profR, w, h, 0.05, trou);
    expect(t.length).toBe(w * h * 4);
    // la ligne du haut de la carte (y = 0) est la dernière de la texture
    expect(t[((h - 1) * w + 0) * 4]).toBe(encoder(-1));
    expect(t[(0 * w + 5) * 4]).toBe(encoder(0));
    // loin de toute forme : pente nulle (128), éclairé (255)
    expect(t[(2 * w + 6) * 4 + 1]).toBe(128);
    expect(t[(2 * w + 6) * 4 + 2]).toBe(128);
    expect(t[(2 * w + 6) * 4 + 3]).toBe(255);
    // le trou (ligne du bas de la carte, colonne 3) : première ligne de la texture, assombri
    expect(t[(0 * w + 3) * 4 + 3]).toBeLessThanOrEqual(Math.round(TROU * 255));
    expect(PENTE_MAX).toBeGreaterThan(0);
  });
});
