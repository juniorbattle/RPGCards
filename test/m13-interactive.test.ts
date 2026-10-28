/**
 * M13 — la musique qui suit le jeu (contrat `docs/m13/02_MUSIQUE_INTERACTIVE.md`) : ponctuations voicées dans l'accord qui
 * sonne, grille de chaque passage, dynamique par section. Pur, sans Web Audio.
 */
import { describe, expect, it } from 'vitest';
import { dynamiques, passage, VERSIONS, type VersionId } from '../src/son/musique/catalogue';
import type { Evenement } from '../src/son/musique/generateurs';
import { ponctuation, type PonctuationId } from '../src/son/musique/ponctuations';
import { accord, dansAccord, pc } from '../src/son/musique/theorie';

const FRAPPES = new Set(['ride', 'cloche', 'crash', 'charley', 'charley-ferme', 'gc', 'cc', 'cc-balai', 'balai', 'rim']);
const IDS: PonctuationId[] = ['gagne', 'perdu', 'signature', 'prolongation', 'fin'];

describe('M13 — ponctuations', () => {
  it('chaque note à hauteur est une note (ou une tension) de l\'accord qui sonne, quel que soit l\'accord ; la basse joue sa basse', () => {
    for (const sym of ['Fmaj7', 'Gm7', 'C7', 'D7b9', 'Bbm7', 'Eb7', 'Am7', 'C7sus4', 'Dbmaj7', 'F/A', 'Bm7b5']) {
      const a = accord(sym);
      for (const id of IDS) {
        const p = ponctuation(id, sym);
        expect(p.duree).toBeGreaterThan(0);
        for (const e of p.ev) {
          expect(e.t).toBeGreaterThanOrEqual(0);
          expect(e.t + e.d).toBeLessThanOrEqual(p.duree + 1e-9);
          expect(e.droit).toBe(true);
          if (FRAPPES.has(e.instr)) continue;
          if (e.instr === 'basse') { expect(pc(e.m)).toBe(a.basse); expect(e.m).toBeLessThanOrEqual(44); continue; }
          expect(dansAccord(a, e.m, true), `${id} ${sym} ${e.m}`).toBe(true);
        }
      }
    }
  });
  it('couleurs : le Clash gagné sonne dans l\'aigu, le Clash perdu dans le grave ; la fin étouffe sa cymbale', () => {
    const haut = (ev: Evenement[]) => Math.min(...ev.filter((e) => !FRAPPES.has(e.instr) && e.instr !== 'basse').map((e) => e.m));
    const bas = (ev: Evenement[]) => Math.max(...ev.filter((e) => !FRAPPES.has(e.instr) && e.instr !== 'basse').map((e) => e.m));
    expect(haut(ponctuation('gagne', 'Fmaj7').ev)).toBeGreaterThanOrEqual(72);
    expect(bas(ponctuation('perdu', 'Fmaj7').ev)).toBeLessThanOrEqual(60);
    expect(ponctuation('fin', 'C7').ev.some((e) => e.instr === 'crash' && e.etouffe)).toBe(true);
    expect(ponctuation('prolongation', 'C7').ev.filter((e) => e.instr === 'cc').length).toBe(4);
  });
});

describe('M13 — grilles et dynamique', () => {
  it('chaque passage donne sa grille (levée comprise) ; elle couvre le passage sans trou', () => {
    for (const id of Object.keys(VERSIONS) as VersionId[]) {
      const v = VERSIONS[id];
      for (const p of v.intro ? [-1, 0, 1] : [0, 1]) {
        const { acc, duree } = passage(v, p, 1);
        expect(acc.length, `${id} ${p}`).toBeGreaterThan(0);
        let t = 0;
        for (const a of acc) { expect(a.t).toBeCloseTo(t, 6); t += a.d; }
        expect(t).toBeCloseTo(duree, 6);
      }
    }
  });
  it('dynamique par section : chaque note prend le facteur de sa section, bornée à 1', () => {
    const ev: Evenement[] = [0, 8, 16, 24, 31].map((t) => ({ t, d: 1, instr: 'piano', m: 60, v: 0.6 }));
    const r = dynamiques(ev, [0, 8, 16, 24], [0.5, 1, 2, 1.1]);
    expect(r.map((e) => +e.v.toFixed(3))).toEqual([0.3, 0.6, 1, 0.66, 0.66]);
  });
  it('le titre respire : les notes du pont plus fortes en moyenne que celles du premier A', () => {
    const { ev } = passage(VERSIONS['I-1'], 0, 3);
    const moy = (a: number, b: number) => { const xs = ev.filter((e) => e.t >= a && e.t < b && !FRAPPES.has(e.instr)); return xs.reduce((s, e) => s + e.v, 0) / xs.length; };
    expect(moy(64, 96)).toBeGreaterThan(moy(0, 32));
  });
});
