import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addCarton, addLocation, createEmptyState } from './inventory';
import { EMPTY_SCAN_CONTEXT, handleScan } from './scanFlow';

const NOW = '2026-01-01T10:00:00.000Z';

function seeded() {
  let state = createEmptyState();
  state = addLocation(state, { code: 'A-01-1' }, NOW);
  state = addLocation(state, { code: 'A-01-2' }, NOW);
  state = addCarton(state, { code: 'CTN-1' }, NOW);
  state = addCarton(state, { code: 'CTN-2', reference: 'REF-VIS' }, NOW);
  return state;
}

describe('enchaînement des scans', () => {
  it('carton puis emplacement : range le carton et repart de zéro', () => {
    const first = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'ctn-1', NOW);
    assert.equal(first.outcome.kind, 'carton-selected');
    assert.equal(first.context.pendingCarton, 'CTN-1');

    const second = handleScan(first.state, first.context, 'A-01-1', NOW);
    assert.partialDeepStrictEqual(second.outcome, { kind: 'carton-placed', from: null, to: 'A-01-1' });
    assert.equal(second.state.cartons['CTN-1'].locationCode, 'A-01-1');
    assert.deepEqual(second.context, EMPTY_SCAN_CONTEXT);
  });

  it('emplacement puis cartons : rangement en série', () => {
    const location = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'A-01-2', NOW);
    assert.equal(location.outcome.kind, 'location-selected');

    const one = handleScan(location.state, location.context, 'CTN-1', NOW);
    const two = handleScan(one.state, one.context, 'CTN-2', NOW);
    assert.equal(two.state.cartons['CTN-1'].locationCode, 'A-01-2');
    assert.equal(two.state.cartons['CTN-2'].locationCode, 'A-01-2');
    assert.equal(two.context.activeLocation, 'A-01-2');
  });

  it('signale un carton déjà en place sans créer de mouvement', () => {
    const location = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'A-01-2', NOW);
    const placed = handleScan(location.state, location.context, 'CTN-1', NOW);
    const again = handleScan(placed.state, placed.context, 'CTN-1', NOW);
    assert.equal(again.outcome.kind, 'carton-already-there');
    assert.equal(again.state.movements.length, 1);
  });

  it('un second carton remplace le carton en attente', () => {
    const first = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'CTN-1', NOW);
    const second = handleScan(first.state, first.context, 'CTN-2', NOW);
    assert.equal(second.context.pendingCarton, 'CTN-2');
    assert.equal(second.state.movements.length, 0);
  });

  it('accepte la référence produit saisie à la place du code-barres', () => {
    const selected = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'ref-vis', NOW);
    assert.equal(selected.context.pendingCarton, 'CTN-2');
    const placed = handleScan(selected.state, selected.context, 'A-01-1', NOW);
    assert.equal(placed.state.cartons['CTN-2'].locationCode, 'A-01-1');
  });

  it('retrouve la fiche existante au lieu de proposer un doublon (EAN-13 / UPC-A)', () => {
    const state = addCarton(seeded(), { code: '036000291452', reference: 'SODA', locationCode: 'A-01-1' }, NOW);
    const result = handleScan(state, EMPTY_SCAN_CONTEXT, '0036000291452', NOW);
    assert.equal(result.outcome.kind, 'carton-selected');
    assert.equal(result.outcome.kind === 'carton-selected' && result.outcome.carton.locationCode, 'A-01-1');
  });

  it('accepte le nom d’un emplacement tapé à la place de son numéro', () => {
    const state = addLocation(seeded(), { name: 'Quai' }, NOW);
    const selected = handleScan(state, EMPTY_SCAN_CONTEXT, 'CTN-1', NOW);
    const placed = handleScan(selected.state, selected.context, 'quai', NOW);
    assert.equal(placed.state.cartons['CTN-1'].locationCode, '10001');
    assert.equal(handleScan(state, EMPTY_SCAN_CONTEXT, '10001', NOW).outcome.kind, 'location-selected');
  });

  it('laisse le contexte intact pour un code inconnu ou vide', () => {
    const first = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'CTN-1', NOW);
    const unknown = handleScan(first.state, first.context, '3760001234567', NOW);
    assert.deepEqual(unknown.outcome, { kind: 'unknown', code: '3760001234567' });
    assert.deepEqual(unknown.context, first.context);
    assert.equal(handleScan(first.state, first.context, '  ', NOW).outcome.kind, 'empty');
  });
});
