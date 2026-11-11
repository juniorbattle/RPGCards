/**
 * Lot de correction de clôture (passe 228) — livraison : version 0.18.0 d'une seule source (E1) ; démo et `?cartes=v1`
 * retirées, crochets de test réservés à `?qa=1` (E3) ; version livrée sans sourcemaps, Three.js à part (E4) ; captures
 * régénérées et `.env*` hors du suivi (E5).
 */
import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { readParams } from '../src/app/params';
import { GAME_VERSION } from '../src/product/version';
import config from '../vite.config';

beforeAll(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window ??= { setTimeout, clearTimeout, addEventListener: () => {}, location: { search: '' } };
  g.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
});

describe('E1 — une seule version', () => {
  it('0.18.0, lue de package.json', () => {
    expect(GAME_VERSION).toBe('0.18.0');
    expect(JSON.parse(readFileSync('package.json', 'utf8')).version).toBe(GAME_VERSION);
  });
});

describe('E3 — restes de développement', () => {
  it('la démo et `?cartes=v1` sont retirées', () => {
    expect(existsSync('src/ville/demo.ts')).toBe(false);
    expect(JSON.parse(readFileSync('package.json', 'utf8')).scripts['qa:demo']).toBeUndefined();
    const p = readParams('?demo=1&cartes=v1') as unknown as Record<string, unknown>;
    expect(p.demo).toBeUndefined();
    expect(p.cartes).toBeUndefined();
    expect(p.aventure).toBe(true);
  });
  it('sans `?qa=1`, les crochets de test (graine, duel direct, scénario, galerie) ne s’ouvrent pas ; avec, si', () => {
    const sans = readParams('?seed=5&autostart=1&scenario=signature-annonce&gallery=1');
    expect(sans.seed).toBe(20261016);
    expect(sans.autostart).toBe(false);
    expect(sans.scenario).toBeNull();
    expect(sans.gallery).toBe(false);
    expect(sans.aventure).toBe(true);
    const avec = readParams('?qa=1&seed=5&autostart=1&scenario=signature-annonce&gallery=1');
    expect(avec.seed).toBe(5);
    expect(avec.autostart).toBe(true);
    expect(avec.scenario).toBe('signature-annonce');
    expect(avec.gallery).toBe(true);
    expect(avec.aventure).toBe(false);
  });
});

describe('E4 et E5 — version livrée, suivi', () => {
  it('sans sourcemaps, Three.js dans son propre fichier', () => {
    const b = (config as { build?: { sourcemap?: unknown; rollupOptions?: { output?: { manualChunks?: (id: string) => string | undefined } } } }).build!;
    expect(b.sourcemap).toBe(false);
    const chunk = b.rollupOptions!.output!.manualChunks!;
    expect(chunk('C:/x/node_modules/three/build/three.module.js')).toBe('three');
    expect(chunk('C:/x/src/main.ts')).toBeUndefined();
  });
  it('.gitignore : les captures régénérées (sauf les planches) et tout `.env*`', () => {
    const g = readFileSync('.gitignore', 'utf8');
    expect(g).toMatch(/^screenshots\/qa\/\*\*\/\*\.png$/m);
    expect(g).toMatch(/^!screenshots\/qa\/\*\*\/planche\*\.png$/m);
    expect(g).toMatch(/^\.env$/m);
    expect(g).toMatch(/^\.env\.\*$/m);
  });
});
