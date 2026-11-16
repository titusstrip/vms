import { addCarton, addLocation, createEmptyState } from './inventory';
import { EMPTY_SCAN_CONTEXT, handleScan } from './scanFlow';

const NOW = '2026-01-01T10:00:00.000Z';

function seeded() {
  let state = createEmptyState();
  state = addLocation(state, { code: 'A-01-1' }, NOW);
  state = addLocation(state, { code: 'A-01-2' }, NOW);
  state = addCarton(state, { code: 'CTN-1' }, NOW);
  state = addCarton(state, { code: 'CTN-2' }, NOW);
  return state;
}

describe('enchaînement des scans', () => {
  it('carton puis emplacement : range le carton et repart de zéro', () => {
    const first = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'ctn-1', NOW);
    expect(first.outcome.kind).toBe('carton-selected');
    expect(first.context.pendingCarton).toBe('CTN-1');

    const second = handleScan(first.state, first.context, 'A-01-1', NOW);
    expect(second.outcome).toMatchObject({ kind: 'carton-placed', from: null, to: 'A-01-1' });
    expect(second.state.cartons['CTN-1'].locationCode).toBe('A-01-1');
    expect(second.context).toEqual(EMPTY_SCAN_CONTEXT);
  });

  it('emplacement puis cartons : rangement en série', () => {
    const location = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'A-01-2', NOW);
    expect(location.outcome.kind).toBe('location-selected');

    const one = handleScan(location.state, location.context, 'CTN-1', NOW);
    const two = handleScan(one.state, one.context, 'CTN-2', NOW);
    expect(two.state.cartons['CTN-1'].locationCode).toBe('A-01-2');
    expect(two.state.cartons['CTN-2'].locationCode).toBe('A-01-2');
    expect(two.context.activeLocation).toBe('A-01-2');
  });

  it('signale un carton déjà en place sans créer de mouvement', () => {
    const location = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'A-01-2', NOW);
    const placed = handleScan(location.state, location.context, 'CTN-1', NOW);
    const again = handleScan(placed.state, placed.context, 'CTN-1', NOW);
    expect(again.outcome.kind).toBe('carton-already-there');
    expect(again.state.movements).toHaveLength(1);
  });

  it('un second carton remplace le carton en attente', () => {
    const first = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'CTN-1', NOW);
    const second = handleScan(first.state, first.context, 'CTN-2', NOW);
    expect(second.context.pendingCarton).toBe('CTN-2');
    expect(second.state.movements).toHaveLength(0);
  });

  it('laisse le contexte intact pour un code inconnu ou vide', () => {
    const first = handleScan(seeded(), EMPTY_SCAN_CONTEXT, 'CTN-1', NOW);
    const unknown = handleScan(first.state, first.context, '3760001234567', NOW);
    expect(unknown.outcome).toEqual({ kind: 'unknown', code: '3760001234567' });
    expect(unknown.context).toEqual(first.context);
    expect(handleScan(first.state, first.context, '  ', NOW).outcome.kind).toBe('empty');
  });
});
