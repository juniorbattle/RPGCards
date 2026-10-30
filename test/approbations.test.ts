import { describe, expect, it } from 'vitest';
// @ts-expect-error module d'outillage en JavaScript (tools/), sans déclaration de types
import { appliquer } from '../tools/m09-approbations.mjs';

// M09 — approbations du responsable (AGENTS, « Images de la ville ») : les manifestes du jeu et les fiches de provenance
// suivent le registre `art-src/approbations.json` (image et empreinte) ; aucun drapeau `approved` n'est posé à la main.
describe('approbations des images de la ville', () => {
  it('les manifestes et les fiches suivent le registre (aucun écart)', () => {
    const r = appliquer({ verifier: true });
    expect(r.ecarts).toEqual([]);
    // 20 planches (A1, passe 104), les 12 feuilles des PNJ (passe 128) et les 4 façades des quartiers ajoutés (passe 130 ;
    // l’Observatoire, retraité en passe 134 (Astre brodé), approuvé de nouveau en passe 135) ; 7 feuilles des PNJ retraitées
    // en passe 138 (yeux), approuvées de nouveau en passe 139 ; la feuille de Halvard recolorée (manteau ocre de l'Astre,
    // ADR 046, 2026-10-27), approuvée de nouveau sur son ordre en passe 155
    expect(r.images).toBe(67);
    expect(r.approuvees).toBeGreaterThan(0);
    // hache toutes les images de la ville : délai large sous la charge du passage complet (passe 125)
  }, 30000);
});
