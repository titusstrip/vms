/**
 * Règles métier de l'inventaire : fonctions pures qui prennent un état et
 * renvoient un nouvel état (ou lèvent une DomainError affichable).
 */
import { MAX_CODE_LENGTH, isEncodable } from './code128';
import {
  Carton,
  DomainError,
  InventoryState,
  LabelSettings,
  Movement,
  StorageLocation,
} from './types';

export const MAX_MOVEMENTS = 1000;
export const CARTON_PREFIX = 'CTN-';

export const DEFAULT_LABEL_SETTINGS: LabelSettings = { widthMm: 50, heightMm: 30 };

export function createEmptyState(): InventoryState {
  return {
    version: 1,
    cartons: {},
    locations: {},
    movements: [],
    labelSettings: DEFAULT_LABEL_SETTINGS,
  };
}

/** Forme canonique d'un code saisi ou scanné : sans espaces autour, en majuscules. */
export function normalizeCode(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Normalise et valide un code destiné à être imprimé en code-barres. */
export function validateCode(raw: string): string {
  const code = normalizeCode(raw);
  if (!code) {
    throw new DomainError('La référence est obligatoire.');
  }
  if (!isEncodable(code)) {
    throw new DomainError(
      'La référence ne doit contenir que des lettres sans accent, chiffres et symboles simples (- _ . /).',
    );
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new DomainError(`La référence ne doit pas dépasser ${MAX_CODE_LENGTH} caractères.`);
  }
  return code;
}

function assertCodeIsFree(state: InventoryState, code: string): void {
  if (state.cartons[code]) {
    throw new DomainError(`La référence « ${code} » est déjà utilisée par un carton.`);
  }
  if (state.locations[code]) {
    throw new DomainError(`La référence « ${code} » est déjà utilisée par un emplacement.`);
  }
}

function parseQuantity(quantity: number | null | undefined): number | null {
  if (quantity === null || quantity === undefined) {
    return null;
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new DomainError('La quantité doit être un nombre positif.');
  }
  return quantity;
}

// --- Emplacements -----------------------------------------------------------

export function addLocation(
  state: InventoryState,
  input: { code: string; label?: string },
  now: string,
): InventoryState {
  const code = validateCode(input.code);
  assertCodeIsFree(state, code);
  const location: StorageLocation = { code, label: (input.label ?? '').trim(), createdAt: now };
  return { ...state, locations: { ...state.locations, [code]: location } };
}

export interface LocationSeriesInput {
  /** Nom de l'allée ou de l'étagère, ex. « A ». */
  aisle: string;
  /** Nombre de travées (colonnes). */
  bays: number;
  /** Nombre de niveaux par travée. */
  levels: number;
}

/** Codes d'une série d'emplacements, ex. A-01-1, A-01-2, A-02-1… */
export function locationSeriesCodes(input: LocationSeriesInput): string[] {
  const aisle = validateCode(input.aisle);
  const { bays, levels } = input;
  if (!Number.isInteger(bays) || bays < 1 || bays > 99) {
    throw new DomainError('Le nombre de travées doit être compris entre 1 et 99.');
  }
  if (!Number.isInteger(levels) || levels < 1 || levels > 9) {
    throw new DomainError('Le nombre de niveaux doit être compris entre 1 et 9.');
  }
  const codes: string[] = [];
  for (let bay = 1; bay <= bays; bay += 1) {
    for (let level = 1; level <= levels; level += 1) {
      codes.push(validateCode(`${aisle}-${String(bay).padStart(2, '0')}-${level}`));
    }
  }
  return codes;
}

/** Crée une série d'emplacements ; ceux qui existent déjà sont ignorés. */
export function addLocationSeries(
  state: InventoryState,
  input: LocationSeriesInput,
  now: string,
): { state: InventoryState; created: string[] } {
  const created: string[] = [];
  let next = state;
  for (const code of locationSeriesCodes(input)) {
    if (next.locations[code]) {
      continue;
    }
    next = addLocation(next, { code }, now);
    created.push(code);
  }
  return { state: next, created };
}

/** Supprime un emplacement ; les cartons qui s'y trouvaient deviennent « non rangés ». */
export function removeLocation(state: InventoryState, code: string, now: string): InventoryState {
  if (!state.locations[code]) {
    throw new DomainError(`Emplacement « ${code} » introuvable.`);
  }
  let next = state;
  for (const carton of cartonsAt(state, code)) {
    next = moveCarton(next, carton.code, null, now);
  }
  const locations = { ...next.locations };
  delete locations[code];
  return { ...next, locations };
}

// --- Cartons ----------------------------------------------------------------

export interface CartonInput {
  code: string;
  description?: string;
  quantity?: number | null;
  locationCode?: string | null;
}

export function addCarton(state: InventoryState, input: CartonInput, now: string): InventoryState {
  const code = validateCode(input.code);
  assertCodeIsFree(state, code);
  const carton: Carton = {
    code,
    description: (input.description ?? '').trim(),
    quantity: parseQuantity(input.quantity),
    locationCode: null,
    createdAt: now,
    updatedAt: now,
  };
  const next = { ...state, cartons: { ...state.cartons, [code]: carton } };
  const target = input.locationCode ? normalizeCode(input.locationCode) : '';
  return target ? moveCarton(next, code, target, now) : next;
}

export function updateCarton(
  state: InventoryState,
  code: string,
  changes: { description?: string; quantity?: number | null },
  now: string,
): InventoryState {
  const carton = state.cartons[code];
  if (!carton) {
    throw new DomainError(`Carton « ${code} » introuvable.`);
  }
  const updated: Carton = {
    ...carton,
    description: changes.description !== undefined ? changes.description.trim() : carton.description,
    quantity: changes.quantity !== undefined ? parseQuantity(changes.quantity) : carton.quantity,
    updatedAt: now,
  };
  return { ...state, cartons: { ...state.cartons, [code]: updated } };
}

export function removeCarton(state: InventoryState, code: string): InventoryState {
  if (!state.cartons[code]) {
    throw new DomainError(`Carton « ${code} » introuvable.`);
  }
  const cartons = { ...state.cartons };
  delete cartons[code];
  return { ...state, cartons, movements: state.movements.filter((m) => m.cartonCode !== code) };
}

/** Range un carton dans un emplacement (ou le sort du stock rangé si `to` vaut null). */
export function moveCarton(
  state: InventoryState,
  cartonCode: string,
  to: string | null,
  now: string,
): InventoryState {
  const carton = state.cartons[cartonCode];
  if (!carton) {
    throw new DomainError(`Carton « ${cartonCode} » introuvable.`);
  }
  if (to !== null && !state.locations[to]) {
    throw new DomainError(`Emplacement « ${to} » introuvable.`);
  }
  if (carton.locationCode === to) {
    return state;
  }
  const movement: Movement = {
    id: `${now}-${cartonCode}-${state.movements.length}`,
    cartonCode,
    from: carton.locationCode,
    to,
    at: now,
  };
  return {
    ...state,
    cartons: { ...state.cartons, [cartonCode]: { ...carton, locationCode: to, updatedAt: now } },
    movements: [movement, ...state.movements].slice(0, MAX_MOVEMENTS),
  };
}

/** Prochaine référence automatique libre, ex. « CTN-000042 ». */
export function nextCartonCode(state: InventoryState): string {
  let max = 0;
  for (const code of Object.keys(state.cartons)) {
    const match = /^CTN-(\d+)$/.exec(code);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  let candidate = max + 1;
  while (state.locations[formatCartonCode(candidate)]) {
    candidate += 1;
  }
  return formatCartonCode(candidate);
}

function formatCartonCode(sequence: number): string {
  return `${CARTON_PREFIX}${String(sequence).padStart(6, '0')}`;
}

// --- Lectures ---------------------------------------------------------------

/** Tri « naturel » : A-2 avant A-10. */
function byCode<T extends { code: string }>(a: T, b: T): number {
  return a.code.localeCompare(b.code, 'fr', { numeric: true });
}

export function cartonsAt(state: InventoryState, locationCode: string): Carton[] {
  return Object.values(state.cartons)
    .filter((carton) => carton.locationCode === locationCode)
    .sort(byCode);
}

/** Recherche dans la référence, la description et l'emplacement. */
export function searchCartons(state: InventoryState, query: string): Carton[] {
  const terms = query.toUpperCase().split(/\s+/).filter(Boolean);
  return Object.values(state.cartons)
    .filter((carton) => {
      const haystack = `${carton.code} ${carton.description} ${carton.locationCode ?? ''}`.toUpperCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort(byCode);
}

export function searchLocations(state: InventoryState, query: string): StorageLocation[] {
  const terms = query.toUpperCase().split(/\s+/).filter(Boolean);
  return Object.values(state.locations)
    .filter((location) => {
      const haystack = `${location.code} ${location.label}`.toUpperCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort(byCode);
}

export function movementsOf(state: InventoryState, cartonCode: string): Movement[] {
  return state.movements.filter((movement) => movement.cartonCode === cartonCode);
}

export function updateLabelSettings(state: InventoryState, settings: LabelSettings): InventoryState {
  const { widthMm, heightMm } = settings;
  const valid = (value: number) => Number.isFinite(value) && value >= 15 && value <= 300;
  if (!valid(widthMm) || !valid(heightMm)) {
    throw new DomainError("Les dimensions de l'étiquette doivent être comprises entre 15 et 300 mm.");
  }
  return { ...state, labelSettings: { widthMm, heightMm } };
}

// --- Sauvegarde -------------------------------------------------------------

export function serializeState(state: InventoryState): string {
  return JSON.stringify(state);
}

/** Relit un état sauvegardé ; lève une DomainError si le contenu n'est pas exploitable. */
export function parseState(json: string): InventoryState {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new DomainError("Le fichier n'est pas une sauvegarde valide.");
  }
  const candidate = data as Partial<InventoryState> | null;
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    candidate.version !== 1 ||
    typeof candidate.cartons !== 'object' ||
    typeof candidate.locations !== 'object' ||
    !candidate.cartons ||
    !candidate.locations
  ) {
    throw new DomainError("Le fichier n'est pas une sauvegarde valide.");
  }
  const locations = candidate.locations;
  const cartons: Record<string, Carton> = {};
  for (const carton of Object.values(candidate.cartons)) {
    // Un carton ne doit jamais pointer vers un emplacement disparu.
    const locationCode = carton.locationCode && locations[carton.locationCode] ? carton.locationCode : null;
    cartons[carton.code] = { ...carton, locationCode };
  }
  return {
    version: 1,
    cartons,
    locations,
    movements: Array.isArray(candidate.movements) ? candidate.movements.slice(0, MAX_MOVEMENTS) : [],
    labelSettings: candidate.labelSettings ?? DEFAULT_LABEL_SETTINGS,
  };
}
