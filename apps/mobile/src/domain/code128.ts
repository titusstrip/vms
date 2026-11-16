/**
 * Encodeur Code 128 (jeux B et C), le format 1D standard en logistique :
 * lisible par toutes les douchettes, terminaux d'entrepôt et caméras de téléphone.
 */

/** Largeurs barre/espace de chaque symbole (valeurs 0 à 105), puis le symbole Stop (106). */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_B = 104;
const START_C = 105;
const STOP = 106;

/** Zone de silence obligatoire de part et d'autre du code, en modules. */
export const QUIET_ZONE_MODULES = 10;

/** Longueur maximale raisonnable pour tenir sur une petite étiquette. */
export const MAX_CODE_LENGTH = 24;

/** Vrai si le texte ne contient que des caractères encodables (ASCII imprimable). */
export function isEncodable(text: string): boolean {
  return text.length > 0 && /^[\x20-\x7e]+$/.test(text);
}

/** Valeurs des symboles (départ, données, clé de contrôle, stop) pour un texte. */
export function encodeSymbols(text: string): number[] {
  if (!isEncodable(text)) {
    throw new Error(`Texte non encodable en Code 128 : « ${text} »`);
  }
  const useSetC = text.length >= 4 && text.length % 2 === 0 && /^\d+$/.test(text);
  const symbols: number[] = [];
  if (useSetC) {
    symbols.push(START_C);
    for (let i = 0; i < text.length; i += 2) {
      symbols.push(Number(text.slice(i, i + 2)));
    }
  } else {
    symbols.push(START_B);
    for (const char of text) {
      symbols.push(char.charCodeAt(0) - 32);
    }
  }
  const checksum = symbols.reduce((sum, value, index) => sum + value * Math.max(index, 1), 0) % 103;
  symbols.push(checksum, STOP);
  return symbols;
}

export interface BarcodeBar {
  /** Position de la barre, en modules, zone de silence incluse. */
  x: number;
  width: number;
}

export interface BarcodeGeometry {
  bars: BarcodeBar[];
  /** Largeur totale en modules, zones de silence incluses. */
  totalModules: number;
}

/** Géométrie des barres noires, prête à être dessinée (écran ou impression). */
export function encodeCode128(text: string): BarcodeGeometry {
  const bars: BarcodeBar[] = [];
  let x = QUIET_ZONE_MODULES;
  for (const symbol of encodeSymbols(text)) {
    const pattern = PATTERNS[symbol];
    for (let i = 0; i < pattern.length; i += 1) {
      const width = Number(pattern[i]);
      if (i % 2 === 0) {
        bars.push({ x, width });
      }
      x += width;
    }
  }
  return { bars, totalModules: x + QUIET_ZONE_MODULES };
}

/** Code-barres en SVG autonome, étiré à la taille de son conteneur (pour l'impression). */
export function code128Svg(text: string): string {
  const { bars, totalModules } = encodeCode128(text);
  const rects = bars.map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="1"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} 1" ` +
    `preserveAspectRatio="none" shape-rendering="crispEdges" fill="#000">${rects}</svg>`
  );
}
