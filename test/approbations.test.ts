import { describe, expect, it } from 'vitest';
// @ts-expect-error module d'outillage en JavaScript (tools/), sans déclaration de types
import { appliquer } from '../tools/m09-approbations.mjs';

// M09 — approbations du responsable (AGENTS, « Images de la ville ») : les manifestes du jeu et les fiches de provenance
// suivent le registre `art-src/approbations.json` (image et empreinte) ; aucun drapeau `approved` n'est posé à la main.
describe('approbations des images de la ville', () => {
  it('les manifestes et les fiches suivent le registre (aucun écart)', () => {
    const r = appliquer({ verifier: true });
    expect(r.ecarts).toEqual([]);
    expect(r.images).toBe(20);
    expect(r.approuvees).toBeGreaterThan(0);
  });
});
