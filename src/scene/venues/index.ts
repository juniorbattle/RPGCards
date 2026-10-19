/** Registre des lieux montables (M08 C2, ADR 022). */
import { DEFAULT_VENUE, type VenueId } from '../../presentation/venues';
import { SALLE } from './salle';
import { RUE } from './rue';
import { BAR } from './bar';
import { ARENE } from './arene';
import type { VenueDef } from './types';

export const VENUE_DEFS: Record<VenueId, VenueDef> = { salle: SALLE, rue: RUE, bar: BAR, arene: ARENE };

export function venueDef(id: VenueId | null | undefined): VenueDef {
  return VENUE_DEFS[id ?? DEFAULT_VENUE] ?? VENUE_DEFS[DEFAULT_VENUE];
}

export type { VenueDef, VenueSet } from './types';
