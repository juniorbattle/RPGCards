import { describe, expect, it } from 'vitest';
import { CLE_MOUVEMENT, ecrireMouvementReduit, lireMouvementReduit } from '../src/aventure/cinematiques';

// 2026-11-03 : le mouvement réduit de l'aventure est son propre réglage, non par défaut (Windows aux animations coupées
// annonçait « mouvement réduit » au navigateur, et l'aventure se jouait sans fondu ni travelling)
const memoire = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };

describe('réglage du mouvement réduit de l’aventure', () => {
  it('non par défaut, quel que soit le système', () => {
    expect(lireMouvementReduit(memoire())).toBe(false);
    expect(lireMouvementReduit(null)).toBe(false);
  });
  it('se mémorise dans ce navigateur', () => {
    const st = memoire();
    expect(ecrireMouvementReduit(st, true)).toBe(true);
    expect(st.m.get(CLE_MOUVEMENT)).toBe('reduit');
    expect(lireMouvementReduit(st)).toBe(true);
    ecrireMouvementReduit(st, false);
    expect(lireMouvementReduit(st)).toBe(false);
  });
  it('un stockage refusé ne casse rien', () => {
    const refuse = { getItem: () => { throw new Error('refusé'); }, setItem: () => { throw new Error('refusé'); } };
    expect(lireMouvementReduit(refuse)).toBe(false);
    expect(ecrireMouvementReduit(refuse, true)).toBe(false);
  });
});
