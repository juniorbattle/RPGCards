/**
 * M09 V5 — **la Grande Cour** (ADR 028, C1 à C3 ; reprise de M09, 2026-10-20) : le nouvel îlot au cœur de la ville, où
 * l'on se retrouve et d'où partent les rues. Même grammaire que les quartiers (`rangs.ts`) : son rang 1 est la place
 * elle-même, profonde (≈ 32 × 16 m), vivante (monument des Quatre Voies au centre, estrade de duels publics, tableau des
 * annonces du Tournoi, étals, foule) ; la Maison du Tournoi la ferme au fond, percée de deux passages vers le Belvédère,
 * d'où l'on voit la ville haute. Les cœurs des trois quartiers s'y ouvrent : les Ruelles à l'ouest, le Parvis à l'est, le
 * Quai par l'escalier du premier plan (la balustrade de la terrasse).
 *
 *   rang 1 : la Grande Cour (z de −12 à 4) ; sorties ouest, est et, au premier plan, l'escalier vers le Quai ;
 *   bande 1 (8 m) : la Maison du Tournoi et ses ailes à arcades, deux passages à ses bouts ;
 *   rang 2 : le Belvédère (5 m) : une terrasse fermée par une balustrade, la ville haute au-delà.
 * Elle n'existe qu'en diorama : on n'y entre que dans la ville en rangs (laboratoire ; aventure quand tous les plans des
 * quartiers en rangs sont admis). Mêmes conventions que `quai.ts`.
 */
import type { Disc, Ilot, Vec2, Zone } from './monde';
import { NPC_RADIUS, TALK_RADIUS, type IlotNpc } from './quai';
import { balisesRangs, cheminsRangs, ilotRangs, objet, planRangs, spotsRangs, zonesBalises, type MeubleRang, type QuartierRangs } from './rangs';

export const COUR_RANGS: QuartierRangs = {
  rang1: { zFond: -12, zAvant: 4, x0: -16, x1: 16 },
  decor: { x0: -34, x1: 34 },
  bandes: [{ profondeur: 8, passages: [[-15.4, -12.8], [12.8, 15.4]] }],
  ruelles: [{ id: 'belvedere', nom: 'le Belvédère', x0: -15.9, x1: 15.9, profondeur: 5 }],
};
export const PLAN_COUR = planRangs(COUR_RANGS);
export const BALISES_COUR = balisesRangs(PLAN_COUR, 'la Grande Cour');
/** Le cœur du Belvédère : au milieu de sa balustrade. */
export const COEUR_COUR: Vec2 = { x: 0, z: -22.6 };
export const CHEMINS_COUR = cheminsRangs(PLAN_COUR, COEUR_COUR);
const BELVEDERE = PLAN_COUR.rangs[1]!;
/** Escalier vers le Quai : ouverture de la balustrade du premier plan (m, en x). */
export const ESCALIER: readonly [number, number] = [-1.6, 1.6];

/** Mobilier de la place (objets du lot des villes, `villes-objets`, et du kit des rangs). */
export const MEUBLES_COUR: readonly MeubleRang[] = [
  objet('monument', 'monument', 0, -3.0, 4.2, 3.0),
  objet('estrade', 'estrade', -7.5, -8.0, 6.4, 3.0),
  { ...objet('estrade-brasero-o', 'brasero', -11.6, -8.2, 1.2, 1.2), rect: null },
  { ...objet('estrade-brasero-e', 'brasero', -3.4, -8.2, 1.2, 1.2), rect: null },
  objet('tableau', 'tableau', 9.0, -11.4, 2.6, 0.6),
  objet('cour-banc', 'banc', 4.2, -11.2, 3.6, 0.8),
  objet('etal-ouest', 'etal', -10.5, -3.6, 4.0, 1.4),
  objet('etal-est', 'etal', 11.0, -4.6, 4.0, 1.4),
  objet('belvedere-banc', 'banc', -7.0, -24.2, 3.6, 0.8),
];
const BRASEROS: readonly Vec2[] = [{ x: -11.6, z: -8.8 }, { x: -3.4, z: -8.8 }];
/** Lampadaires : deux au bord de la terrasse, deux au Belvédère. */
export const LAMPES_COUR: readonly Vec2[] = [{ x: -6.5, z: 3.6 }, { x: 6.5, z: 3.6 }, { x: -3.5, z: -20.4 }, { x: 3.5, z: -20.4 }];

/** La foule de la place (gabarits validés, ADR 023) ; M10-E y posera la guide et les défis de la ville. */
export const NPCS_COUR: readonly IlotNpc[] = [
  { id: 'pnj-marchande-25', at: { x: 11.4, z: -2.6 }, facing: 'gauche', role: 'guide' },
  { id: 'pnj-docker-27', at: { x: -5.0, z: -6.2 }, facing: 'gauche', role: 'guide' },
  { id: 'pnj-joueuse-31', at: { x: 7.6, z: -9.8 }, facing: 'droite', role: 'guide' },
  { id: 'pnj-commis-33', at: { x: 3.2, z: 0.8 }, facing: 'gauche', role: 'guide' },
];

export const GRANDE_COUR: Ilot = ilotRangs(PLAN_COUR, {
  id: 'cour',
  name: 'la Grande Cour',
  rects: MEUBLES_COUR.flatMap((m) => (m.rect ? [m.rect] : [])),
  discs: [
    ...BRASEROS.map((b): Disc => ({ ...b, r: 0.6 })),
    ...LAMPES_COUR.map((p): Disc => ({ ...p, r: 0.16 })),
    ...NPCS_COUR.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    { id: 'sortie-ruelles', kind: 'sortie', label: 'Descendre vers les Ruelles', target: 'ruelles', area: { x0: -16, z0: -7, x1: -15.1, z1: -3 } },
    { id: 'sortie-parvis', kind: 'sortie', label: 'Descendre vers le Parvis de l’arène', target: 'parvis', area: { x0: 15.1, z0: -7, x1: 16, z1: -3 } },
    { id: 'sortie-quai', kind: 'sortie', label: 'Descendre vers le Quai', target: 'quai', area: { x0: ESCALIER[0] + 0.2, z0: 3.1, x1: ESCALIER[1] - 0.2, z1: 4 } },
    { id: 'monument', kind: 'info', label: 'Le monument des Quatre Voies', area: { x0: -3.2, z0: -6.4, x1: 3.2, z1: -1.8 } },
    { id: 'estrade', kind: 'info', label: 'L’estrade des duels', area: { x0: -10.8, z0: -8.2, x1: -4.2, z1: -6.6 } },
    { id: 'tableau', kind: 'info', label: 'Le tableau des annonces', area: { x0: 7.6, z0: -11.4, x1: 10.4, z1: -10.2 } },
    ...spotsRangs(PLAN_COUR, { x0: -4, z0: BELVEDERE.z0, x1: 4, z1: BELVEDERE.z0 + 2.5 }),
    ...zonesBalises(BALISES_COUR),
    ...NPCS_COUR.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: 0, z: 2.4, face: 'dos' },
    'sortie-quai': { x: 0, z: 2.4, face: 'dos' },
    'sortie-ruelles': { x: -14.4, z: -5, face: 'droite' },
    'sortie-parvis': { x: 14.4, z: -5, face: 'gauche' },
    monument: { x: 0, z: -1.2, face: 'dos' },
    belvedere: { x: 0, z: -22, face: 'dos' },
    ...Object.fromEntries(NPCS_COUR.map((n) => [`npc-${n.id}`, n.facing === 'face'
      ? { x: n.at.x, z: n.at.z + 1.0, face: 'dos' as const }
      : { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
});
