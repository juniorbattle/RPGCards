/**
 * M08 C2 (ADR 022) — lieux des duels : registre, gréement fixe, bornes du plan de feux, rencontres, paramètre QA.
 * Le montage du décor (canvas, WebGL) est vérifié dans le navigateur (`tools/c2-lieux.mjs`).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_VENUE, VENUES, VENUE_IDS, isVenueId } from '../src/presentation/venues';
import { VENUE_DEFS, venueDef } from '../src/scene/venues';
import { SALLE } from '../src/scene/venues/salle';
import { STAGING } from '../src/scene/staging';
import { ENCOUNTERS, encounterById } from '../src/product/encounters';
import { readParams } from '../src/app/params';
import { TABLE_TOP } from '../src/scene/world';

describe('lieux : registre', () => {
  it('chaque lieu déclaré a un montage, et chaque montage un lieu déclaré', () => {
    expect(Object.keys(VENUE_DEFS).sort()).toEqual([...VENUE_IDS].sort());
    for (const id of VENUE_IDS) {
      expect(VENUE_DEFS[id].id).toBe(id);
      expect(VENUES[id].id).toBe(id);
      expect(typeof VENUE_DEFS[id].mount).toBe('function');
    }
  });

  it('lieu par défaut : la salle de jeu de cartes (décor historique)', () => {
    expect(DEFAULT_VENUE).toBe('salle');
    expect(VENUES.salle.kind).toBe('Salle de jeu de cartes');
    expect(venueDef(undefined).id).toBe('salle');
    expect(venueDef(null).id).toBe('salle');
    expect(venueDef('nulle-part' as never).id).toBe('salle');
  });

  it('isVenueId ne reconnaît que les lieux construits', () => {
    expect(isVenueId('rue')).toBe(true);
    expect(isVenueId('salle')).toBe(true);
    expect(isVenueId('bar')).toBe(true);
    expect(isVenueId('arene')).toBe(true);
    expect(isVenueId('ville')).toBe(false);
    expect(isVenueId(null)).toBe(false);
  });
});

describe('lieux : gréement fixe et contrat du duel', () => {
  for (const id of VENUE_IDS) {
    const d = VENUE_DEFS[id];
    it(`${id} : exactement quatre lumières pratiques valides`, () => {
      expect(d.practicals).toHaveLength(4);
      for (const p of d.practicals) {
        expect(p.pos).toHaveLength(3);
        expect(p.intensity).toBeGreaterThan(0);
        expect(p.distance).toBeGreaterThan(0);
        expect(['candle', 'lantern', 'none']).toContain(p.flicker);
      }
    });

    it(`${id} : projecteurs du visage et de la table à ±15 % de la salle (la lisibilité du rival est le contrat)`, () => {
      expect(Math.abs(d.key.intensity / SALLE.key.intensity - 1)).toBeLessThanOrEqual(0.15);
      expect(Math.abs(d.stage.intensity / SALLE.stage.intensity - 1)).toBeLessThanOrEqual(0.15);
    });

    it(`${id} : brume linéaire cohérente et halo dans les bornes`, () => {
      expect(d.fog.near).toBeGreaterThan(0);
      expect(d.fog.far).toBeGreaterThan(d.fog.near);
      expect(d.house.intensity).toBeGreaterThan(0);
      expect(d.bloom.strength).toBeGreaterThanOrEqual(0);
      expect(d.bloom.threshold).toBeGreaterThan(0);
    });

    it(`${id} : surcharges des plans de feux hors duel limitées aux écrans connus, jamais au duel`, () => {
      for (const s of Object.keys(d.staging ?? {})) {
        expect(Object.keys(STAGING)).toContain(s);
        expect(s).not.toBe('duel');
      }
    });
  }

  it('salle : plan de feux historique (M07 L3) inchangé', () => {
    expect(SALLE.background).toBe(0x0a0708);
    expect(SALLE.fog).toEqual({ color: 0x232a44, near: 12.5, far: 30 });
    expect(SALLE.house).toEqual({ sky: 0xffd4a4, ground: 0x2a1a14, intensity: 0.62 });
    expect(SALLE.key).toEqual({ color: 0xffe2bc, intensity: 1.75 });
    expect(SALLE.stage).toEqual({ color: 0xffd6a6, intensity: 1.5 });
    expect(SALLE.practicals.map((p) => [...p.pos, p.intensity, p.color, p.distance, p.decay, p.flicker])).toEqual([
      [-3.6, TABLE_TOP + 0.7, -1.9, 2.2, 0xffa458, 8, 1.8, 'candle'],
      [3.6, TABLE_TOP + 0.7, -1.9, 2.2, 0xffa458, 8, 1.8, 'candle'],
      [-5.6, 2.4, -6.4, 3.4, 0xffa458, 8, 1.8, 'candle'],
      [5.6, 2.4, -6.4, 3.4, 0xffa458, 8, 1.8, 'candle'],
    ]);
    expect(SALLE.bloom).toEqual({ strength: 0.3, radius: 0.4, threshold: 1.0 });
  });
});

describe('lieux : rencontres', () => {
  it('chaque rencontre déclare un lieu construit', () => {
    for (const e of ENCOUNTERS) expect(isVenueId(e.venue)).toBe(true);
  });

  it('le Tournoi du Quai reste dans la salle ; un duel libre par nouveau lieu (rue, bar, arène)', () => {
    for (const e of ENCOUNTERS.filter((x) => x.kind === 'series')) expect(e.venue).toBe('salle');
    expect(encounterById('libre-braise')!.venue).toBe('rue');
    expect(encounterById('libre-ronce')!.venue).toBe('bar');
    expect(encounterById('libre-astre')!.venue).toBe('arene');
    expect(encounterById('libre-voile')!.venue).toBe('salle');
  });

  it('chaque lieu construit est joué par au moins une rencontre', () => {
    for (const v of VENUE_IDS) expect(ENCOUNTERS.some((e) => e.venue === v)).toBe(true);
  });
});

describe('lieux : paramètre QA', () => {
  it('`venue` n’est lu qu’en QA, et seulement pour un lieu construit', () => {
    expect(readParams('?qa=1&venue=rue').venue).toBe('rue');
    expect(readParams('?venue=rue').venue).toBeNull();
    expect(readParams('?qa=1&venue=arene').venue).toBe('arene');
    expect(readParams('?qa=1&venue=ville').venue).toBeNull();
    expect(readParams('?qa=1&venueCache=1').venueCache).toBe(1);
    expect(readParams('?venueCache=1').venueCache).toBeNull();
  });
});
