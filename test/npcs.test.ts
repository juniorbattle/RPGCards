import { describe, expect, it } from 'vitest';
import {
  NPC_CLOTHS, NPC_HAIRS, NPC_SKINS, NPC_TEMPLATE_IDS, NPC_TEMPLATES, isNpcId, npcId, npcIdentity, npcLook, parseNpcId,
} from '../src/presentation/npcs';
import { PERSONALITIES, isSignatureRival, personalityById, personalityFor } from '../src/presentation/personalities';
import { kitV2 } from '../src/scene/v2';
import { PROFILES } from '../src/game/ai/policy';
import { applyOutcome, encounterStatus, newProgress } from '../src/product/progression';
import { ENCOUNTERS, TOWN_DUELS, encounterConfig, sheetOf } from '../src/product/encounters';
import { STARTER_COLLECTION, STARTER_DECK } from '../src/product/collection';
import { newSave, validateSave, type DuelSummary } from '../src/product/save';

// M08 C3 : duellistes PNJ de la ville — gabarits génériques et variations subtiles déterministes par graine.
describe('PNJ de la ville : identifiants', () => {
  it('`pnj-<gabarit>-<graine>` seulement', () => {
    expect(parseNpcId('pnj-docker-7')).toEqual({ template: 'docker', seed: 7 });
    expect(npcId('commis', 12)).toBe('pnj-commis-12');
    for (const bad of ['pnj-docker', 'pnj-inconnu-3', 'docker-3', 'pnj-docker--1', 'pnj-docker-1a', 'braise', '']) expect(isNpcId(bad)).toBe(false);
    expect(isSignatureRival('braise')).toBe(true);
    expect(isSignatureRival('pnj-docker-1')).toBe(false);
  });
});

describe('PNJ de la ville : apparence déterministe et subtile', () => {
  const ids = NPC_TEMPLATE_IDS.flatMap((t) => Array.from({ length: 24 }, (_, s) => npcId(t, s + 1)));

  it('même identifiant → même apparence et même identité de jeu (déterminisme)', () => {
    for (const id of ids) {
      expect(npcLook(id)).toEqual(npcLook(id));
      expect(npcIdentity(id)).toEqual(npcIdentity(id));
    }
    // Valeurs figées : un changement de tirage changerait l’apparence de PNJ déjà rencontrés.
    expect(npcLook('pnj-docker-1')).toMatchObject({ cut: 'courte', accessory: 'aucun', skin: NPC_SKINS[0], hair: NPC_HAIRS[1], cloth: NPC_CLOTHS[5] });
    expect(npcIdentity('pnj-docker-1')).toMatchObject({ name: 'Théo', family: 'Voile', techniques: ['Lecture', 'Ancrage'] });
  });

  it('chaque gabarit garde sa structure (forme du visage, coupes, accessoires et tenue de son gabarit)', () => {
    for (const id of ids) {
      const L = npcLook(id)!;
      const t = NPC_TEMPLATES[L.template];
      expect(L.face).toBe(t.face);
      expect(t.cuts).toContain(L.cut);
      expect(t.accessories).toContain(L.accessory);
      expect(NPC_SKINS).toContain(L.skin);
      expect(NPC_HAIRS).toContain(L.hair);
      expect(NPC_CLOTHS).toContain(L.cloth);
    }
  });

  it('12 graines consécutives couvrent toutes les coupes et tous les accessoires d’un gabarit', () => {
    for (const t of NPC_TEMPLATE_IDS) {
      const looks = Array.from({ length: 12 }, (_, s) => npcLook(npcId(t, s + 1))!);
      expect(new Set(looks.map((l) => l.cut)).size).toBe(NPC_TEMPLATES[t].cuts.length);
      expect(new Set(looks.map((l) => l.accessory)).size).toBe(NPC_TEMPLATES[t].accessories.length);
      expect(new Set(looks.map((l) => `${l.cut}|${l.accessory}`)).size).toBe(12);
    }
  });

  it('des couleurs variées d’un individu à l’autre (peau, cheveux, tenue)', () => {
    const looks = ids.map((id) => npcLook(id)!);
    expect(new Set(looks.map((l) => l.skin)).size).toBe(NPC_SKINS.length);
    expect(new Set(looks.map((l) => l.hair)).size).toBe(NPC_HAIRS.length);
    expect(new Set(looks.map((l) => l.cloth)).size).toBe(NPC_CLOTHS.length);
  });
});

describe('PNJ de la ville : personnalité et profil de jeu', () => {
  it('personnalité dérivée de l’identifiant : prénom du gabarit, Signature, deux Techniques ordinaires, profil générique', () => {
    for (const t of NPC_TEMPLATE_IDS) for (let s = 1; s <= 12; s++) {
      const p = personalityById(npcId(t, s))!;
      expect(p.npc).toBe(t);
      expect(NPC_TEMPLATES[t].names).toContain(p.name);
      expect(p.techniques).toHaveLength(2);
      expect(new Set(p.techniques).size).toBe(2);
      for (const x of p.techniques) expect(['Lecture', 'Ancrage', 'Sondage', 'Recentrage']).toContain(x);
      expect(['novice', 'timide']).toContain(p.aiProfile);
      expect(PROFILES[p.aiProfile]).toBeDefined();
      expect(personalityById(npcId(t, s))).toBe(p); // en cache : même objet
    }
  });

  it('les rivaux signatures restent inchangés ; un PNJ peut être imposé en QA (`rival=pnj-…`)', () => {
    expect(PERSONALITIES.map((p) => p.id)).toEqual(['braise', 'ronce', 'voile', 'astre']);
    expect(personalityFor(202, 'pnj-commis-5').id).toBe('pnj-commis-5');
    expect(personalityFor(202, 'pnj-inconnu-5').id).toBe(personalityFor(202, null).id);
  });

  it('profils génériques moins exigeants que les rivaux (moins de Techniques et de mémoire)', () => {
    for (const k of ['novice', 'timide']) {
      expect(PROFILES[k]!.techniqueRate).toBeLessThan(PROFILES.equilibre!.techniqueRate);
      expect(PROFILES[k]!.memoryWeight).toBeLessThan(PROFILES.equilibre!.memoryWeight);
    }
  });

  it('un seul modèle V2 pour le duel et le portrait de chaque PNJ', () => {
    expect(kitV2('pnj-joueuse-9')?.id).toBe('pnj-joueuse-9');
    expect(kitV2('pnj-joueuse-9')).toBe(kitV2('pnj-joueuse-9'));
    expect(kitV2('pnj-inconnu-9')).toBeNull();
  });
});

describe('Duels de la ville (rencontres de prototype)', () => {
  const town = ENCOUNTERS.filter((e) => e.kind === 'town');

  it('une rencontre par duelliste de TOWN_DUELS, ouverte d’emblée, fiche de difficulté basse', () => {
    expect(town.map((e) => e.rival)).toEqual([...TOWN_DUELS]);
    for (const e of town) {
      expect(encounterStatus(e, newProgress()).open).toBe(true);
      const r = sheetOf(e.rival);
      expect(r).toMatchObject({ hp: 60, variants: [], difficulty: 1 });
      expect(r.style.length).toBeGreaterThan(10);
      const cfg = encounterConfig(e, STARTER_DECK, 4242);
      expect(cfg.players.p2).toMatchObject({ hp: 60, variants: [], techniques: personalityById(e.rival)!.techniques, signature: personalityById(e.rival)!.family });
    }
  });

  it('une victoire contre un PNJ ne débloque rien et laisse la progression intacte (sauvegarde valide)', () => {
    const e = town[0]!;
    const save = newSave(new Date('2026-10-18T12:00:00.000Z'), 'Test', 7, STARTER_DECK);
    const sum: DuelSummary = { id: 'd1', encounterId: e.id, rival: e.rival, seed: 1, signature: 'Cendre', outcome: 'victory', turns: 9, dealt: 60, taken: 20, hp: { me: 70, opp: 0 }, overtime: 0, at: '2026-10-18T12:00:00.000Z' };
    const r = applyOutcome(save.collection, save.progress, sum);
    expect(r).toMatchObject({ unlocked: [], series: null });
    expect(r.progress).toEqual(save.progress);
    expect(r.collection).toEqual(STARTER_COLLECTION);
    save.history.push(sum);
    save.collection = r.collection;
    save.progress = r.progress;
    expect(validateSave(save)).toEqual([]);
  });
});
