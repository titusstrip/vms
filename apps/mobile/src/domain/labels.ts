/** Génération des étiquettes à imprimer : une étiquette par page, au format du rouleau. */
import { code128Svg } from './code128';
import { Carton, LabelSettings, StorageLocation } from './types';

export interface LabelItem {
  code: string;
  /** Ligne principale au-dessus du code-barres (référence produit ou type d'étiquette). */
  title: string;
  /** Ligne secondaire facultative (nom du produit, description de l'emplacement). */
  subtitle?: string;
}

export interface LabelPreset {
  name: string;
  widthMm: number;
  heightMm: number;
}

export const LABEL_PRESETS: LabelPreset[] = [
  { name: '40 × 30', widthMm: 40, heightMm: 30 },
  { name: '50 × 30', widthMm: 50, heightMm: 30 },
  { name: '62 × 29', widthMm: 62, heightMm: 29 },
  { name: '100 × 50', widthMm: 100, heightMm: 50 },
  { name: '100 × 150', widthMm: 100, heightMm: 150 },
];

const POINTS_PER_MM = 72 / 25.4;

/** Taille de page en points typographiques, unité attendue par le système d'impression. */
export function labelSizeInPoints(settings: LabelSettings): { width: number; height: number } {
  return {
    width: Math.round(settings.widthMm * POINTS_PER_MM),
    height: Math.round(settings.heightMm * POINTS_PER_MM),
  };
}

export function cartonLabel(carton: Carton): LabelItem {
  if (carton.reference) {
    return { code: carton.code, title: carton.reference, subtitle: carton.name };
  }
  return { code: carton.code, title: carton.name || 'Carton' };
}

export function locationLabel(location: StorageLocation): LabelItem {
  return { code: location.code, title: 'Emplacement', subtitle: location.label };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Document HTML imprimable contenant une étiquette par page. */
export function buildLabelsHtml(items: LabelItem[], settings: LabelSettings): string {
  const { widthMm, heightMm } = settings;
  // Les textes sont proportionnels à la hauteur pour rester lisibles sur tous les formats.
  const base = Math.min(heightMm, widthMm * 0.6);
  const titleSize = Math.max(1.8, base * 0.1);
  const codeSize = Math.max(2.2, base * 0.14);
  const margin = Math.max(1, base * 0.05);
  const labels = items
    .map(
      (item) =>
        `<section class="label">` +
        `<div class="title">${escapeHtml(item.title)}</div>` +
        (item.subtitle ? `<div class="subtitle">${escapeHtml(item.subtitle)}</div>` : '') +
        `<div class="bars">${code128Svg(item.code)}</div>` +
        `<div class="code">${escapeHtml(item.code)}</div>` +
        `</section>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: Helvetica, Arial, sans-serif; }
  .label {
    width: ${widthMm}mm; height: ${heightMm}mm; padding: ${margin}mm;
    display: flex; flex-direction: column; align-items: stretch;
    overflow: hidden; page-break-after: always; break-after: page;
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  .title, .subtitle {
    font-size: ${titleSize}mm; line-height: 1.2; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .title { font-weight: 700; }
  .bars { flex: 1; min-height: 0; margin: ${margin * 0.6}mm 0; }
  .bars svg { display: block; width: 100%; height: 100%; }
  .code {
    font-size: ${codeSize}mm; line-height: 1.1; font-weight: 700; text-align: center;
    letter-spacing: 0.04em; white-space: nowrap; overflow: hidden;
  }
</style>
</head>
<body>${labels}</body>
</html>`;
}
