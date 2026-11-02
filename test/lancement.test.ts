/**
 * Le lancement du jeu (ordre du responsable, 2026-11-01) : l'adresse nue ouvre l'aventure ; le jeu standard, la démo, les
 * scénarios et les outils de QA gardent leur chemin.
 */
import { describe, expect, it } from 'vitest';
import { readParams } from '../src/app/params';

describe('lancement', () => {
  it('l’adresse nue ouvre l’aventure, même avec un réglage d’affichage', () => {
    for (const q of ['', '?relief=0', '?son=1']) expect(readParams(q).aventure, q).toBe(true);
  });
  it('le jeu standard, la démo, les scénarios et la QA restent accessibles', () => {
    for (const q of ['?standard=1', '?demo=1', '?qa=1', '?qa=1&aiDelay=0', '?autostart=1', '?scenario=signature-annonce']) expect(readParams(q).aventure, q).toBe(false);
  });
  it('`aventure=1` force l’aventure, QA comprise', () => {
    expect(readParams('?aventure=1&qa=1').aventure).toBe(true);
  });
});
