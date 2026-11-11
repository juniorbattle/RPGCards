/**
 * Le lancement du jeu (ordre du responsable, 2026-11-01) : l'adresse nue ouvre l'aventure ; le jeu standard et les outils
 * de QA gardent leur chemin. Fiche de clôture (E3) : la démo est retirée, les scénarios et le duel direct exigent `qa=1`.
 */
import { describe, expect, it } from 'vitest';
import { readParams } from '../src/app/params';

describe('lancement', () => {
  it('l’adresse nue ouvre l’aventure, même avec un réglage d’affichage', () => {
    for (const q of ['', '?relief=0', '?son=1']) expect(readParams(q).aventure, q).toBe(true);
  });
  it('le jeu standard et la QA restent accessibles (scénarios et duel direct sous `qa=1`)', () => {
    for (const q of ['?standard=1', '?qa=1', '?qa=1&aiDelay=0', '?qa=1&autostart=1', '?qa=1&scenario=signature-annonce']) expect(readParams(q).aventure, q).toBe(false);
  });
  it('fiche de clôture (E3) : sans `qa=1`, la démo, le duel direct et les scénarios n’ouvrent rien : l’aventure', () => {
    for (const q of ['?demo=1', '?autostart=1', '?scenario=signature-annonce']) expect(readParams(q).aventure, q).toBe(true);
  });
  it('`aventure=1` force l’aventure, QA comprise', () => {
    expect(readParams('?aventure=1&qa=1').aventure).toBe(true);
  });
});
