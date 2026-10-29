// Apparence du protagoniste (passe 165) : identifiants, feuilles par silhouette, reconnaissance de la peau, des cheveux et
// des yeux sur les deux feuilles, repeinte, et sauvegarde compatible (apparence facultative).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPARENCE_DEFAUT, CHEVEUX, PEAUX, YEUX, apparenceValable, codeApparence, estOrigine, feuilleSilhouette, idJoueur, lireCode, lireIdJoueur } from '../src/ville/apparence';
import { sheetKeys } from '../src/ville/spritesExternes';
import { CHEVEUX as C_CHEVEUX, IRIS, PEAU, classerTeintes, repeindre } from '../src/ville/teintes';
import { nouvelleSauvegarde, validerSauvegarde } from '../src/aventure/sauvegarde';
import { lirePng } from './png';

const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));

/** Feuille en pixels d'art (centre des blocs agrandis). */
function art(id: string) {
  const e = man.sprites[id];
  const im = lirePng(`public/sprites/${e.file}`);
  const [cw, ch] = e.cell as [number, number];
  const w = cw * 5;
  const h = ch * 3;
  const px = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = ((j * e.scale + 1) * im.width + i * e.scale + 1) * 4;
    px.set(im.data.subarray(k, k + 4), (j * w + i) * 4);
  }
  return { f: { px, w, h }, cw, ch };
}

describe('apparence du protagoniste : identifiants', () => {
  it('apparence d’origine : identifiant historique ; sinon un code de quatre signes', () => {
    expect(idJoueur('Cendre')).toBe('player-Cendre');
    expect(idJoueur('gris', APPARENCE_DEFAUT.a)).toBe('player-gris');
    expect(idJoueur('Voile', { silhouette: 'b', peau: 4, cheveux: 3, yeux: 1 })).toBe('player-Voile@b431');
    expect(idJoueur('Astre', APPARENCE_DEFAUT.b)).toBe('player-Astre@b200');
    for (const a of [APPARENCE_DEFAUT.a, APPARENCE_DEFAUT.b, { silhouette: 'a' as const, peau: 5, cheveux: CHEVEUX.length - 1, yeux: YEUX.length - 1 }]) {
      expect(lireCode(codeApparence(a))).toEqual(a);
      expect(lireIdJoueur(idJoueur('Ronce', a))).toEqual({ tenue: 'Ronce', apparence: a });
    }
    expect(lireIdJoueur('player-Cendre')).toEqual({ tenue: 'Cendre', apparence: APPARENCE_DEFAUT.a });
    expect(lireIdJoueur('pnj-docker-3')).toBeNull();
    expect(lireIdJoueur('player-Cendre@z000')).toBeNull();
    expect(lireCode(`a${PEAUX.length}00`)).toBeNull();
    expect(apparenceValable({ silhouette: 'c', peau: 0, cheveux: 0, yeux: 0 })).toBe(false);
    expect(estOrigine(APPARENCE_DEFAUT.b)).toBe(false);
  });

  it('chaque silhouette a sa feuille ; la B n’est pas approuvée sans ordre du responsable', () => {
    expect(sheetKeys('player-Cendre')).toEqual(['player-Cendre', 'player']);
    expect(sheetKeys('player-gris@b431')).toEqual(['player-gris@b431', 'player-b']);
    expect(feuilleSilhouette('a')).toBe('player');
    expect(man.sprites['player-b'].approved).toBe(true);
  });
});

describe('apparence du protagoniste : teintes reconnues et repeintes', () => {
  for (const id of ['player', 'player-b']) {
    it(`${id} : peau, cheveux et iris dans chaque case ; la boucle de ceinture reste dorée`, () => {
      const { f, cw, ch } = art(id);
      const cls = classerTeintes(f, cw, ch);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        const n = [0, 0, 0, 0];
        for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) n[cls[(r * ch + j) * f.w + c * cw + i]!]!++;
        expect(n[C_CHEVEUX], `cheveux, rangée ${r}, colonne ${c}`).toBeGreaterThan(150);
        expect(n[PEAU], `peau, rangée ${r}, colonne ${c}`).toBeGreaterThan(r === 1 ? 10 : 60);
        if (r === 0) expect(n[IRIS], `iris de face, colonne ${c}`).toBeGreaterThan(2);
        if (r === 1) expect(n[IRIS], `pas d’iris de dos, colonne ${c}`).toBe(0);
      }
      // la boucle (de face, au milieu de la figure, à hauteur de ceinture) n'est jamais prise pour de la peau
      for (let c = 0; c < 5; c++) for (let j = 40; j < 60; j++) for (let i = 26; i < 38; i++) {
        const k = j * f.w + c * cw + i;
        const [R, G, B] = [f.px[k * 4]!, f.px[k * 4 + 1]!, f.px[k * 4 + 2]!];
        if (R > 130 && G > 95 && R > B + 40) expect(cls[k], `boucle, colonne ${c} (${i}, ${j})`).not.toBe(PEAU);
      }
    });
  }

  it('repeinte : seuls les pixels reconnus changent, chacun sur un ton de la rampe choisie', () => {
    const { f, cw, ch } = art('player-b');
    const avant = f.px.slice();
    const cls = classerTeintes(f, cw, ch);
    const peau = PEAUX[5]!;
    const cheveux = CHEVEUX[9]!;
    repeindre(f, cls, { peau, cheveux, yeux: YEUX[1] });
    const hex = (p: number) => `#${[0, 1, 2].map((k) => f.px[p * 4 + k]!.toString(16).padStart(2, '0')).join('')}`;
    for (let p = 0; p < cls.length; p++) {
      if (!cls[p]) { expect(f.px.subarray(p * 4, p * 4 + 4)).toEqual(avant.subarray(p * 4, p * 4 + 4)); continue; }
      const rampe = cls[p] === PEAU ? [peau.deep, peau.shade, peau.base, peau.hi] : cls[p] === C_CHEVEUX ? [cheveux.deep, cheveux.shade, cheveux.base, cheveux.hi] : [YEUX[1]!.deep, YEUX[1]!.iris, YEUX[1]!.light];
      expect(rampe).toContain(hex(p));
    }
  });
});

describe('apparence du protagoniste : sauvegarde', () => {
  it('facultative et contrôlée ; une aventure existante (sans apparence) reste valable', () => {
    const t = new Date('2026-10-29T12:00:00Z');
    const ancienne = nouvelleSauvegarde(t, 'Duelliste', 5);
    expect(ancienne.profil.apparence).toBeUndefined();
    expect(validerSauvegarde(ancienne)).toEqual([]);
    expect(nouvelleSauvegarde(t, 'Duelliste', 5, APPARENCE_DEFAUT.a).profil.apparence).toBeUndefined();
    const b = nouvelleSauvegarde(t, 'Duelliste', 5, { silhouette: 'b', peau: 4, cheveux: 3, yeux: 1 });
    expect(b.profil.apparence).toEqual({ silhouette: 'b', peau: 4, cheveux: 3, yeux: 1 });
    expect(validerSauvegarde(b)).toEqual([]);
    expect(validerSauvegarde({ ...b, profil: { ...b.profil, apparence: { silhouette: 'b', peau: 99, cheveux: 0, yeux: 0 } } })).toContain('profil.apparence invalide');
  });
});
