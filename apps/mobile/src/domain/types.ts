/** Modèle de données de l'inventaire. Les codes (références) servent d'identifiants. */

export interface StorageLocation {
  /** Code scanné sur l'étiquette de l'emplacement, ex. « A-01-2 ». */
  code: string;
  /** Description libre, ex. « Étagère du fond, niveau 2 ». */
  label: string;
  createdAt: string;
}

export interface Carton {
  /** Référence du carton, encodée dans son code-barres. */
  code: string;
  description: string;
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
