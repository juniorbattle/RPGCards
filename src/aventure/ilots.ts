/**
 * M10-A/B — îlots de la ville pour l'aventure : les îlots M09 tels quels (décor, sol, sorties, portes, cadrage, passants,
 * diorama et feuilles soumis à leurs approbations), dont on retire SEULEMENT les personnages de la démo pour y poser ceux
 * du directeur des rencontres. Aucune donnée de M09 n'est modifiée : on dérive des copies (M09 en pause). Pur.
 *
 * ARB-M10-12 (décision du responsable) : **le Quai de l'aventure est le Quai en quatre rangs** du laboratoire (passes 62
 * à 68 : rue Haute et place de la Halle, ruelle des Lanternes et placette du Puits, cour de la Chapelle), réutilisé tel
 * quel. Il n'existe qu'en diorama d'images générées : tant que ses plans ne sont pas admis (hors QA : approuvés par le
 * responsable, A2 puis A1), l'ancien Quai en bande, dessiné par code, sert de secours (`quaiRangs` faux).
 */
import type { Disc, Ilot, Zone } from '../ville/monde';
import { ilotDef, type IlotDef, type IlotId } from '../ville/ilots';
import type { IlotNpc } from '../ville/quai';
import type { Pose } from './directeur';

/** Rayon d'un personnage (obstacle) et de sa zone « parler » (mêmes valeurs que les îlots M09). */
const NPC_R = 0.32;
const TALK = 1.35;

/** L'îlot M09 d'origine : dans la ville en rangs (`quaiRangs`), l'îlot en rangs ; sinon celui d'aujourd'hui (secours). */
export const ilotBase = (id: IlotId, quaiRangs = false): IlotDef => ilotDef(id, quaiRangs);

/** L'îlot M09 sans ses personnages de démo (obstacles, zones « parler », points d'apparition devant eux). */
export function ilotNu(id: IlotId, quaiRangs = false): Ilot {
  const d = ilotBase(id, quaiRangs);
  const at = new Set(d.npcs.map((n) => `${n.at.x},${n.at.z}`));
  return {
    ...d.ilot,
    discs: d.ilot.discs.filter((c) => !at.has(`${c.x},${c.z}`)),
    zones: d.ilot.zones.filter((z) => z.kind !== 'parler'),
    spawns: Object.fromEntries(Object.entries(d.ilot.spawns).filter(([k]) => !k.startsWith('npc-'))),
  };
}

/** Point d'apparition devant un personnage, dans sa zone de dialogue (même règle que les îlots M09). */
function devant(p: Pose): { x: number; z: number; face: 'dos' | 'gauche' | 'droite' } {
  if (p.facing === 'face' || p.facing === 'dos') return { x: p.at.x, z: p.at.z + 1.0, face: 'dos' };
  return { x: p.at.x + (p.facing === 'gauche' ? -1.0 : 1.0), z: p.at.z + 0.2, face: p.facing === 'gauche' ? 'droite' : 'gauche' };
}

/** Définition d'îlot de l'aventure : l'îlot M09 nu + les personnages posés par le directeur. */
export function ilotAventure(id: IlotId, poses: readonly Pose[], quaiRangs = false): IlotDef {
  const d = ilotBase(id, quaiRangs);
  const nu = ilotNu(id, quaiRangs);
  const npcs: IlotNpc[] = poses.map((p) => ({ id: p.apparence, at: p.at, facing: p.facing, role: p.genre === 'structurante' ? 'rival' : 'duel' }));
  const ilot: Ilot = {
    ...nu,
    // les îlots en rangs du laboratoire portent une mention (« le Quai (en rangs, preuve) ») : dans l'aventure, leur nom seul
    name: d.ilot.name.replace(/ \([^)]*\)$/, ''),
    discs: [...nu.discs, ...poses.map((p): Disc => ({ ...p.at, r: NPC_R }))],
    // la cible d'une zone « parler » est l'identifiant de la RENCONTRE (le produit décide, la ville ne lit rien)
    zones: [...nu.zones, ...poses.map((p): Zone => ({ id: `npc-${p.id}`, kind: 'parler', label: `Parler à ${p.nom}`, target: p.id, area: { x: p.at.x, z: p.at.z, r: TALK } }))],
    spawns: { ...nu.spawns, ...Object.fromEntries(poses.map((p) => [`npc-${p.id}`, devant(p)])) },
  };
  return { ...d, ilot, npcs };
}
