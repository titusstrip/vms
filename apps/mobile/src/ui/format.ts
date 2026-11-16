import { Movement } from '../domain/types';

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function describeMovement(movement: Movement): string {
  if (movement.to === null) {
    return `Sorti de ${movement.from}`;
  }
  return movement.from ? `${movement.from} → ${movement.to}` : `Rangé en ${movement.to}`;
}

/** Lit un nombre saisi au clavier ; chaîne vide → null, saisie invalide → NaN. */
export function parseNumberInput(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  return trimmed === '' ? null : Number(trimmed);
}
