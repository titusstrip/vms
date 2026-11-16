import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { QUIET_ZONE_MODULES, code128Svg, encodeCode128, encodeSymbols, isEncodable } from './code128';

describe('Code 128', () => {
  it('encode en jeu B avec la clé de contrôle attendue', () => {
    // Clé = (104 + 48×1 + 42×2 + 42×3 + 17×4 + 18×5 + 19×6 + 35×7) mod 103 = 55.
    assert.deepEqual(encodeSymbols('PJJ123C'), [104, 48, 42, 42, 17, 18, 19, 35, 55, 106]);
  });

  it('compacte les références numériques paires en jeu C', () => {
    assert.deepEqual(encodeSymbols('123456'), [105, 12, 34, 56, 44, 106]);
  });

  it('garde le jeu B pour un nombre impair de chiffres', () => {
    assert.equal(encodeSymbols('12345')[0], 104);
  });

  it('produit 11 modules par symbole, 13 pour le stop, plus les zones de silence', () => {
    const { bars, totalModules } = encodeCode128('A-01-2');
    const symbols = 1 + 6 + 1; // départ + données + clé
    assert.equal(totalModules, symbols * 11 + 13 + 2 * QUIET_ZONE_MODULES);
    assert.equal(bars[0].x, QUIET_ZONE_MODULES);
    assert.equal(bars.length, symbols * 3 + 4);
  });

  it('refuse les caractères non encodables', () => {
    assert.equal(isEncodable('ÉTAGÈRE'), false);
    assert.equal(isEncodable(''), false);
    assert.throws(() => encodeSymbols('é'));
  });

  it('génère un SVG autonome', () => {
    const svg = code128Svg('CTN-000001');
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('<rect'));
  });
});
