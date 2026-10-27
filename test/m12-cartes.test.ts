/**
 * M12 (contrat 1, ADR 044) — la conception des cartes : un motif par effet, des résumés et des libellés pour tous les
 * effets et déclenchements, des icônes et des sceaux tracés par code ; le dessin d'avant intact (`?cartes=v1` : mêmes
 * clés, donc mêmes pixels ; les Basics et les neutres identiques dans les deux dessins) ; tracé déterministe, exécuté sur
 * un contexte factice qui enregistre les appels (le canvas n'existe pas sous Node).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { CATALOG, EFFECTS, NEUTRAL_CATALOG, type EffectId, type EffectTrigger } from '../src/game/catalog/cards';
import { EFFECT_SUMMARY, keywordsIn, TRIGGER_LABEL, TRIGGER_SHORT } from '../src/game/catalog/cardText';
import { TECHNIQUE_IDS } from '../src/game/catalog/techniques';
import { artKey, drawCardArt, setCardArtVersion } from '../src/art/cardArt';
import { EFFECT_MOTIFS } from '../src/art/cardMotifs';
import { techniqueSeal, triggerIcon } from '../src/presentation/effectIcons';

/** Contexte 2D factice : chaque appel et chaque affectation est noté ; les dégradés acceptent leurs arrêts. */
function fakeCtx(): { ctx: CanvasRenderingContext2D; log: string[] } {
  const log: string[] = [];
  const grad = { addColorStop: (o: number, c: string) => { log.push(`stop ${o.toFixed(3)} ${c}`); } };
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(_t, k: string) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return (...a: number[]) => { log.push(`${k} ${a.map((x) => x.toFixed(2)).join(',')}`); return grad; };
      if (k in target) return target[k];
      return (...a: unknown[]) => { log.push(`${k} ${a.map((x) => (typeof x === 'number' ? x.toFixed(2) : String(x))).join(',')}`); };
    },
    set(_t, k: string, v) { target[k] = v; log.push(`${k}=${typeof v === 'object' ? 'objet' : String(v)}`); return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, log };
}

afterEach(() => setCardArtVersion('v2'));

describe('M12 — la conception des cartes', () => {
  it('un motif propre à chacun des 20 effets (16 variantes et 4 Signatures)', () => {
    expect(Object.keys(EFFECT_MOTIFS).sort()).toEqual(Object.keys(EFFECTS).sort());
  });

  it('un résumé d’une ligne pour chaque effet, court ; un libellé pour chaque déclenchement', () => {
    for (const id of Object.keys(EFFECTS) as EffectId[]) {
      expect(EFFECT_SUMMARY[id], id).toBeTruthy();
      expect(EFFECT_SUMMARY[id].length, id).toBeLessThanOrEqual(80);
      expect(EFFECT_SUMMARY[id], id).not.toMatch(/[a-zé]·[a-z]/i);
    }
    const triggers = new Set(Object.values(EFFECTS).map((e) => e.trigger));
    for (const t of triggers) {
      expect(TRIGGER_LABEL[t as EffectTrigger]).toBeTruthy();
      expect(TRIGGER_SHORT[t as EffectTrigger]).toBeTruthy();
    }
  });

  it('icônes de déclenchement et sceaux des Techniques : des chemins SVG, aucune image', () => {
    for (const t of ['primary-reveal', 'secondary-reveal', 'use-rank', 'use-damage', 'use-interfere', 'signature'] as const) {
      const s = triggerIcon(t);
      expect(s.startsWith('<svg')).toBe(true);
      expect(s).not.toMatch(/<image|href=|url\(/);
    }
    for (const t of TECHNIQUE_IDS) expect(techniqueSeal(t)).toMatch(/^<svg[\s\S]*<path/);
  });

  it('mots-clés : ceux qu’un texte emploie, expliqués', () => {
    const k = keywordsIn(EFFECTS.emprise.text).map((x) => x.mot);
    expect(k).toContain('Repousser');
    expect(k).toContain('Garde');
    expect(keywordsIn(EFFECTS.ferveur.text).map((x) => x.mot)).toContain('Insight');
  });

  it('dessin d’avant intact : mêmes clés (donc mêmes tirages) ; Basics et neutres identiques dans les deux dessins', () => {
    for (const id of [...Object.keys(CATALOG), ...Object.keys(NEUTRAL_CATALOG)]) {
      expect(artKey(id, 7, 'v1')).toBe(`7|${id}`);
      const def = CATALOG[id] ?? NEUTRAL_CATALOG[id]!;
      if (!def.effect || def.family === null) expect(artKey(id, 7, 'v2'), id).toBe(`7|${id}`);
      else expect(artKey(id, 7, 'v2'), id).toBe(`7|${id}|m12`);
    }
  });

  it('chaque carte se trace sans erreur, de façon déterministe ; v1 et v2 ne diffèrent que pour les cartes à motif', () => {
    for (const id of [...Object.keys(CATALOG), ...Object.keys(NEUTRAL_CATALOG)]) {
      const a = fakeCtx();
      const b = fakeCtx();
      drawCardArt(a.ctx, id, 7, 'v2');
      drawCardArt(b.ctx, id, 7, 'v2');
      expect(a.log.length, id).toBeGreaterThan(20);
      expect(a.log, id).toEqual(b.log);
      const c = fakeCtx();
      drawCardArt(c.ctx, id, 7, 'v1');
      const def = CATALOG[id] ?? NEUTRAL_CATALOG[id]!;
      if (def.effect && def.family) expect(c.log, id).not.toEqual(a.log);
      else expect(c.log, id).toEqual(a.log);
    }
  });

  it('aucun texte tracé dans les motifs (même rendu dans la page et dans le worker)', () => {
    for (const id of Object.keys(CATALOG)) {
      if (!CATALOG[id]!.effect) continue;
      const a = fakeCtx();
      drawCardArt(a.ctx, id, 7, 'v2');
      expect(a.log.some((l) => l.startsWith('fillText') || l.startsWith('strokeText')), id).toBe(false);
    }
  });
});
