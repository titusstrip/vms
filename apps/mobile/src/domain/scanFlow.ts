/**
 * Enchaînement des scans. Deux gestes sont reconnus, dans n'importe quel ordre :
 *  - carton puis emplacement : range ce carton ;
 *  - emplacement puis cartons : range chaque carton scanné dans cet emplacement
 *    (rangement en série), jusqu'à remise à zéro.
 */
import { findCartonByReference, findExistingCode, moveCarton, normalizeCode } from './inventory';
import { Carton, InventoryState, StorageLocation } from './types';

export interface ScanContext {
  /** Carton en attente d'un emplacement. */
  pendingCarton: string | null;
  /** Emplacement actif pour le rangement en série. */
  activeLocation: string | null;
}

export const EMPTY_SCAN_CONTEXT: ScanContext = { pendingCarton: null, activeLocation: null };

export type ScanOutcome =
  | { kind: 'empty' }
  | { kind: 'unknown'; code: string }
  | { kind: 'carton-selected'; carton: Carton }
  | { kind: 'location-selected'; location: StorageLocation }
  | { kind: 'carton-placed'; carton: Carton; from: string | null; to: string }
  | { kind: 'carton-already-there'; carton: Carton; location: string };

export interface ScanResult {
  state: InventoryState;
  context: ScanContext;
  outcome: ScanOutcome;
}

export function handleScan(
  state: InventoryState,
  context: ScanContext,
  rawCode: string,
  now: string,
): ScanResult {
  const code = normalizeCode(rawCode);
  if (!code) {
    return { state, context, outcome: { kind: 'empty' } };
  }

  // Un code déjà enregistré est toujours reconnu, même lu sous une écriture équivalente.
  const existing = findExistingCode(state, code);
  if (existing?.kind === 'location') {
    const { location } = existing;
    if (context.pendingCarton && state.cartons[context.pendingCarton]) {
      return place(state, EMPTY_SCAN_CONTEXT, context.pendingCarton, location.code, now);
    }
    return {
      state,
      context: { pendingCarton: null, activeLocation: location.code },
      outcome: { kind: 'location-selected', location },
    };
  }

  // À défaut de code-barres connu, une référence produit saisie à la main désigne aussi le carton.
  const carton = existing?.kind === 'carton' ? existing.carton : findCartonByReference(state, code);
  if (carton) {
    if (context.activeLocation && state.locations[context.activeLocation]) {
      return place(state, context, carton.code, context.activeLocation, now);
    }
    return {
      state,
      context: { pendingCarton: carton.code, activeLocation: null },
      outcome: { kind: 'carton-selected', carton },
    };
  }

  return { state, context, outcome: { kind: 'unknown', code } };
}

function place(
  state: InventoryState,
  nextContext: ScanContext,
  cartonCode: string,
  locationCode: string,
  now: string,
): ScanResult {
  const before = state.cartons[cartonCode];
  if (before.locationCode === locationCode) {
    return {
      state,
      context: nextContext,
      outcome: { kind: 'carton-already-there', carton: before, location: locationCode },
    };
  }
  const nextState = moveCarton(state, cartonCode, locationCode, now);
  return {
    state: nextState,
    context: nextContext,
    outcome: {
      kind: 'carton-placed',
      carton: nextState.cartons[cartonCode],
      from: before.locationCode,
      to: locationCode,
    },
  };
}
