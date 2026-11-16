import { QUIET_ZONE_MODULES, code128Svg, encodeCode128, encodeSymbols, isEncodable } from './code128';

describe('Code 128', () => {
  it('encode en jeu B avec la clé de contrôle attendue', () => {
    // Clé = (104 + 48×1 + 42×2 + 42×3 + 17×4 + 18×5 + 19×6 + 35×7) mod 103 = 55.
    expect(encodeSymbols('PJJ123C')).toEqual([104, 48, 42, 42, 17, 18, 19, 35, 55, 106]);
  });

  it('compacte les références numériques paires en jeu C', () => {
    expect(encodeSymbols('123456')).toEqual([105, 12, 34, 56, 44, 106]);
  });

  it('garde le jeu B pour un nombre impair de chiffres', () => {
    expect(encodeSymbols('12345')[0]).toBe(104);
  });

  it('produit 11 modules par symbole, 13 pour le stop, plus les zones de silence', () => {
    const { bars, totalModules } = encodeCode128('A-01-2');
    const symbols = 1 + 6 + 1; // départ + données + clé
    expect(totalModules).toBe(symbols * 11 + 13 + 2 * QUIET_ZONE_MODULES);
    expect(bars[0].x).toBe(QUIET_ZONE_MODULES);
    expect(bars).toHaveLength(symbols * 3 + 4);
  });

  it('refuse les caractères non encodables', () => {
    expect(isEncodable('ÉTAGÈRE')).toBe(false);
    expect(isEncodable('')).toBe(false);
    expect(() => encodeSymbols('é')).toThrow();
  });

  it('génère un SVG autonome', () => {
    const svg = code128Svg('CTN-000001');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<rect');
  });
});
