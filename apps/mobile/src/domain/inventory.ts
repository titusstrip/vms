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
  LocationColor,
  Movement,
  StorageLocation,
  isLocationColor,
} from './types';

export const MAX_MOVEMENTS = 1000;
export const CARTON_PREFIX = 'CTN-';
/** Longueur maximale des textes libres (contenu, description). */
export const MAX_TEXT_LENGTH = 200;

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

/**
 * Écritures équivalentes d'un même code-barres. Un code UPC-A (12 chiffres)
 * est aussi un EAN-13 commençant par 0 : selon le lecteur, le même carton
 * peut être lu sous l'une ou l'autre forme.
 */
export function codeVariants(code: string): string[] {
  if (/^\d{12}$/.test(code)) {
    return [code, `0${code}`];
  }
  if (/^0\d{12}$/.test(code)) {
    return [code, code.slice(1)];
  }
  return [code];
}

export type ExistingCode =
  | { kind: 'carton'; carton: Carton }
  | { kind: 'location'; location: StorageLocation };

/** Carton ou emplacement déjà enregistré sous ce code-barres (ou une écriture équivalente). */
export function findExistingCode(state: InventoryState, raw: string): ExistingCode | null {
  for (const code of codeVariants(normalizeCode(raw))) {
    if (state.locations[code]) {
      return { kind: 'location', location: state.locations[code] };
    }
    if (state.cartons[code]) {
      return { kind: 'carton', carton: state.cartons[code] };
    }
  }
  return null;
}

/** Cartons portant cette référence produit (plusieurs cartons d'un même produit sont possibles). */
export function cartonsWithReference(state: InventoryState, raw: string): Carton[] {
  const wanted = normalizeCode(raw);
  if (!wanted) {
    return [];
  }
  return Object.values(state.cartons)
    .filter((carton) => normalizeCode(carton.reference) === wanted)
    .sort(byCode);
}

function assertCodeIsFree(state: InventoryState, code: string): void {
  const existing = findExistingCode(state, code);
  if (existing?.kind === 'carton') {
    throw new DomainError(`Le code-barres « ${code} » est déjà relié à la fiche ${cartonTitle(existing.carton)}.`);
  }
  if (existing?.kind === 'location') {
    throw new DomainError(`Le code « ${code} » est déjà utilisé par un emplacement.`);
  }
}

function cleanInput(text: string | undefined): string {
  return (text ?? '').trim().slice(0, MAX_TEXT_LENGTH);
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

/** Premier numéro attribué aux étiquettes d'emplacement (toujours 5 chiffres). */
export const FIRST_LOCATION_NUMBER = 10001;
const LAST_LOCATION_NUMBER = 99999;

/** Prochain numéro à 5 chiffres libre pour le code-barres d'un emplacement. */
export function nextLocationCode(state: InventoryState): string {
  let max = FIRST_LOCATION_NUMBER - 1;
  for (const code of Object.keys(state.locations)) {
    if (/^\d{5}$/.test(code)) {
      max = Math.max(max, Number(code));
    }
  }
  let candidate = max + 1;
  while (candidate <= LAST_LOCATION_NUMBER && findExistingCode(state, String(candidate))) {
    candidate += 1;
  }
  if (candidate > LAST_LOCATION_NUMBER) {
    throw new DomainError('Tous les numéros d\'emplacement à 5 chiffres sont utilisés.');
  }
  return String(candidate);
}

/** Nom d'emplacement saisi : majuscules, sans espaces superflus, 24 caractères au plus. */
function validateLocationName(raw: string): string {
  const name = normalizeCode(raw);
  if (!name) {
    throw new DomainError("Le nom de l'emplacement est obligatoire.");
  }
  if (name.length > MAX_CODE_LENGTH) {
    throw new DomainError(`Le nom de l'emplacement ne doit pas dépasser ${MAX_CODE_LENGTH} caractères.`);
  }
  return name;
}

export function findLocationByName(state: InventoryState, raw: string): StorageLocation | null {
  const wanted = normalizeCode(raw);
  if (!wanted) {
    return null;
  }
  return Object.values(state.locations).find((location) => location.name === wanted) ?? null;
}

/** Nom à afficher pour un code d'emplacement (le code lui-même si l'emplacement a disparu). */
export function locationName(state: InventoryState, code: string): string {
  return state.locations[code]?.name ?? code;
}

export interface LocationInput {
  /** Nom lisible, ex. « A-01-2 ». Par défaut, le code-barres fourni. */
  name?: string;
  /** Code-barres existant à réutiliser ; sinon un numéro à 5 chiffres est généré. */
  code?: string;
  label?: string;
  color?: LocationColor | null;
}

export function addLocation(state: InventoryState, input: LocationInput, now: string): InventoryState {
  const name = validateLocationName(input.name ?? input.code ?? '');
  if (findLocationByName(state, name)) {
    throw new DomainError(`L'emplacement « ${name} » existe déjà.`);
  }
  const code = input.code ? validateCode(input.code) : nextLocationCode(state);
  assertCodeIsFree(state, code);
  const location: StorageLocation = {
    code,
    name,
    label: cleanInput(input.label),
    color: input.color ?? null,
    createdAt: now,
  };
  return { ...state, locations: { ...state.locations, [code]: location } };
}

export function updateLocation(
  state: InventoryState,
  code: string,
  changes: { label?: string; color?: LocationColor | null },
): InventoryState {
  const location = state.locations[code];
  if (!location) {
    throw new DomainError(`Emplacement « ${code} » introuvable.`);
  }
  const updated: StorageLocation = {
    ...location,
    label: changes.label !== undefined ? cleanInput(changes.label) : location.label,
    color: changes.color !== undefined ? changes.color : location.color,
  };
  return { ...state, locations: { ...state.locations, [code]: updated } };
}

export interface LocationSeriesInput {
  /** Nom de l'allée ou de l'étagère, ex. « A ». */
  aisle: string;
  /** Nombre de travées (colonnes). */
  bays: number;
  /** Nombre de niveaux par travée. */
  levels: number;
  /** Couleur commune à toute la série. */
  color?: LocationColor | null;
}

/** Noms d'une série d'emplacements, ex. A-01-1, A-01-2, A-02-1… */
export function locationSeriesNames(input: LocationSeriesInput): string[] {
  const aisle = validateLocationName(input.aisle);
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
      codes.push(validateLocationName(`${aisle}-${String(bay).padStart(2, '0')}-${level}`));
    }
  }
  return codes;
}

/** Crée une série d'emplacements (noms créés en retour) ; ceux qui existent déjà sont ignorés. */
export function addLocationSeries(
  state: InventoryState,
  input: LocationSeriesInput,
  now: string,
): { state: InventoryState; created: string[] } {
  const created: string[] = [];
  let next = state;
  for (const name of locationSeriesNames(input)) {
    if (findLocationByName(next, name)) {
      continue;
    }
    next = addLocation(next, { name, color: input.color }, now);
    created.push(name);
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
  reference?: string;
  name?: string;
  quantity?: number | null;
  locationCode?: string | null;
}

export function addCarton(state: InventoryState, input: CartonInput, now: string): InventoryState {
  const code = validateCode(input.code);
  assertCodeIsFree(state, code);
  const carton: Carton = {
    code,
    reference: cleanInput(input.reference),
    name: cleanInput(input.name),
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
  changes: { reference?: string; name?: string; quantity?: number | null },
  now: string,
): InventoryState {
  const carton = state.cartons[code];
  if (!carton) {
    throw new DomainError(`Carton « ${code} » introuvable.`);
  }
  const updated: Carton = {
    ...carton,
    reference: changes.reference !== undefined ? cleanInput(changes.reference) : carton.reference,
    name: changes.name !== undefined ? cleanInput(changes.name) : carton.name,
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

/** Ce qu'on affiche pour désigner un carton : sa référence produit, sinon son code-barres. */
export function cartonTitle(carton: Carton): string {
  return carton.reference || carton.code;
}

/** Carton dont la référence produit correspond exactement, s'il est unique. */
export function findCartonByReference(state: InventoryState, raw: string): Carton | null {
  const matches = cartonsWithReference(state, raw);
  return matches.length === 1 ? matches[0] : null;
}

/** Recherche dans la référence, le nom, le code-barres et l'emplacement. */
export function searchCartons(state: InventoryState, query: string): Carton[] {
  const terms = query.toUpperCase().split(/\s+/).filter(Boolean);
  return Object.values(state.cartons)
    .filter((carton) => {
      const place = carton.locationCode ? `${carton.locationCode} ${locationName(state, carton.locationCode)}` : '';
      const haystack = `${carton.code} ${carton.reference} ${carton.name} ${place}`.toUpperCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort(byCode);
}

export function searchLocations(state: InventoryState, query: string): StorageLocation[] {
  const terms = query.toUpperCase().split(/\s+/).filter(Boolean);
  return Object.values(state.locations)
    .filter((location) => {
      const haystack = `${location.code} ${location.name} ${location.label}`.toUpperCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
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

/** Taille maximale acceptée pour un fichier de sauvegarde. */
export const MAX_BACKUP_BYTES = 5_000_000;

const INVALID_BACKUP = "Le fichier n'est pas une sauvegarde valide.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : '';
}

function cleanDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function cleanCodeOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? normalizeCode(value) : null;
}

/**
 * Relit un état sauvegardé. Le contenu est traité comme non fiable : chaque
 * champ est revalidé et reconstruit, rien n'est recopié tel quel. Lève une
 * DomainError si le fichier n'est pas exploitable.
 */
export function parseState(json: string): InventoryState {
  if (json.length > MAX_BACKUP_BYTES) {
    throw new DomainError('Le fichier de sauvegarde est trop volumineux.');
  }
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new DomainError(INVALID_BACKUP);
  }
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.cartons) || !isRecord(data.locations)) {
    throw new DomainError(INVALID_BACKUP);
  }
  const epoch = new Date(0).toISOString();

  const locations: Record<string, StorageLocation> = {};
  for (const raw of Object.values(data.locations)) {
    if (!isRecord(raw) || typeof raw.code !== 'string') {
      throw new DomainError(INVALID_BACKUP);
    }
    const code = validateCode(raw.code);
    locations[code] = {
      code,
      // Les premières versions utilisaient le code lui-même comme nom.
      name: normalizeCode(cleanText(raw.name)).slice(0, MAX_CODE_LENGTH) || code,
      label: cleanText(raw.label),
      color: isLocationColor(raw.color) ? raw.color : null,
      createdAt: cleanDate(raw.createdAt, epoch),
    };
  }

  const cartons: Record<string, Carton> = {};
  for (const raw of Object.values(data.cartons)) {
    if (!isRecord(raw) || typeof raw.code !== 'string') {
      throw new DomainError(INVALID_BACKUP);
    }
    const code = validateCode(raw.code);
    if (locations[code]) {
      throw new DomainError(INVALID_BACKUP);
    }
    // Un carton ne doit jamais pointer vers un emplacement disparu.
    const target = cleanCodeOrNull(raw.locationCode);
    const createdAt = cleanDate(raw.createdAt, epoch);
    cartons[code] = {
      code,
      reference: cleanText(raw.reference),
      // Les premières sauvegardes rangeaient le nom du produit dans « description ».
      name: cleanText(raw.name ?? raw.description),
      quantity:
        typeof raw.quantity === 'number' && Number.isFinite(raw.quantity) && raw.quantity >= 0
          ? raw.quantity
          : null,
      locationCode: target && locations[target] ? target : null,
      createdAt,
      updatedAt: cleanDate(raw.updatedAt, createdAt),
    };
  }

  const movements: Movement[] = [];
  for (const raw of Array.isArray(data.movements) ? data.movements.slice(0, MAX_MOVEMENTS) : []) {
    if (!isRecord(raw) || typeof raw.cartonCode !== 'string' || !cartons[normalizeCode(raw.cartonCode)]) {
      continue;
    }
    const at = cleanDate(raw.at, epoch);
    movements.push({
      id: typeof raw.id === 'string' ? raw.id.slice(0, 100) : `${at}-${movements.length}`,
      cartonCode: normalizeCode(raw.cartonCode),
      from: cleanCodeOrNull(raw.from),
      to: cleanCodeOrNull(raw.to),
      at,
    });
  }

  let labelSettings = DEFAULT_LABEL_SETTINGS;
  if (isRecord(data.labelSettings)) {
    const { widthMm, heightMm } = data.labelSettings;
    if (typeof widthMm === 'number' && typeof heightMm === 'number') {
      try {
        labelSettings = updateLabelSettings(createEmptyState(), { widthMm, heightMm }).labelSettings;
      } catch {
        labelSettings = DEFAULT_LABEL_SETTINGS;
      }
    }
  }

  return { version: 1, cartons, locations, movements, labelSettings };
}
