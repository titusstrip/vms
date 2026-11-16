/** Modèle de données de l'inventaire. Les codes (références) servent d'identifiants. */

/** Couleurs proposées pour repérer visuellement une zone ou une allée. */
export const LOCATION_COLORS = [
  { key: 'red', name: 'Rouge', hex: '#D92D20' },
  { key: 'orange', name: 'Orange', hex: '#F79009' },
  { key: 'yellow', name: 'Jaune', hex: '#EAC54F' },
  { key: 'green', name: 'Vert', hex: '#12B76A' },
  { key: 'teal', name: 'Turquoise', hex: '#0E9384' },
  { key: 'blue', name: 'Bleu', hex: '#2E90FA' },
  { key: 'purple', name: 'Violet', hex: '#7A5AF8' },
  { key: 'pink', name: 'Rose', hex: '#EE46BC' },
] as const;

export type LocationColor = (typeof LOCATION_COLORS)[number]['key'];

export function isLocationColor(value: unknown): value is LocationColor {
  return LOCATION_COLORS.some((color) => color.key === value);
}

export interface StorageLocation {
  /** Valeur du code-barres de l'étiquette : un numéro à 5 chiffres généré automatiquement. */
  code: string;
  /** Nom lisible de l'emplacement, ex. « A-01-2 ». */
  name: string;
  /** Description libre, ex. « Étagère du fond, niveau 2 ». */
  label: string;
  /** Couleur de repérage, ou null si aucune. */
  color: LocationColor | null;
  createdAt: string;
}

/** Fiche produit d'un carton, retrouvée en scannant son code-barres. */
export interface Carton {
  /** Valeur du code-barres collé sur le carton (identifiant technique). */
  code: string;
  /** Référence produit (référence interne ou fournisseur), affichée en priorité. */
  reference: string;
  /** Nom du produit. */
  name: string;
  quantity: number | null;
  /** Emplacement actuel, ou null si le carton n'est pas rangé. */
  locationCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  cartonCode: string;
  from: string | null;
  to: string | null;
  at: string;
}

export interface LabelSettings {
  widthMm: number;
  heightMm: number;
}

export interface InventoryState {
  version: 1;
  cartons: Record<string, Carton>;
  locations: Record<string, StorageLocation>;
  /** Historique, du plus récent au plus ancien. */
  movements: Movement[];
  labelSettings: LabelSettings;
}

/** Erreur métier dont le message (en français) peut être affiché tel quel. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
