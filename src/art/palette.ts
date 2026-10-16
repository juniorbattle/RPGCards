/**
 * Palettes SÉMANTIQUES PROVISOIRES (non validées comme direction artistique).
 * Remplaçables en un seul point. Les familles se distinguent aussi par symbole et motif.
 */
import type { Family, Rarity } from '../game/catalog/cards';

export interface FamilyPalette {
  deep: string;
  mid: string;
  light: string;
  accent: string;
  glow: string;
  ink: string;
  /** Couleur numérique pour Three.js. */
  hex: number;
}

export const FAMILY_PALETTE: Record<Family, FamilyPalette> = {
  Cendre: { deep: '#1d0905', mid: '#7a2410', light: '#d0541f', accent: '#ffb347', glow: '#ff7a2e', ink: '#fff1e0', hex: 0xff6a2a },
  Voile: { deep: '#0b0b1f', mid: '#2f2d6e', light: '#5d63c4', accent: '#a8e6ff', glow: '#8fb8ff', ink: '#eef2ff', hex: 0x7f8cff },
  Ronce: { deep: '#06140b', mid: '#1d4a29', light: '#3f8a46', accent: '#d4ec7a', glow: '#8fdc6a', ink: '#effbe4', hex: 0x6fd66a },
  Astre: { deep: '#070a24', mid: '#1b2a6b', light: '#3a63c9', accent: '#ffe08a', glow: '#ffd36b', ink: '#fff9e6', hex: 0xffcf5a },
};

export const RARITY_FRAME: Record<Rarity, { a: string; b: string; label: string }> = {
  Basic: { a: '#6d6a66', b: '#a9a49c', label: 'Basic' },
  Uncommon: { a: '#3f6b4c', b: '#9fd1a4', label: 'Peu commune' },
  Rare: { a: '#2d5b9a', b: '#a6cdfa', label: 'Rare' },
  Epic: { a: '#5a2b8f', b: '#d2a6ff', label: 'Épique' },
  Legendary: { a: '#8a5a12', b: '#ffe08a', label: 'Légendaire' },
  Signature: { a: '#7a1f6e', b: '#ffd0f4', label: 'Signature ∞' },
};
