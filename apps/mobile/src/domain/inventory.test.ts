import {
  addCarton,
  addLocation,
  addLocationSeries,
  cartonsAt,
  createEmptyState,
  moveCarton,
  movementsOf,
  nextCartonCode,
  normalizeCode,
  parseState,
  removeCarton,
  removeLocation,
  searchCartons,
  serializeState,
  updateCarton,
  validateCode,
} from './inventory';
import { DomainError } from './types';

const NOW = '2026-01-01T10:00:00.000Z';
const LATER = '2026-01-02T10:00:00.000Z';

function seeded() {
  let state = createEmptyState();
  state = addLocation(state, { code: 'a-01-1', label: 'Fond gauche' }, NOW);
  state = addLocation(state, { code: 'A-01-2' }, NOW);
  state = addCarton(state, { code: 'ctn-000001', description: 'Câbles HDMI', quantity: 20 }, NOW);
  return state;
}

describe('codes', () => {
  it('normalise en majuscules sans espaces superflus', () => {
    expect(normalizeCode('  ctn-12 \n')).toBe('CTN-12');
  });

  it('refuse les codes vides, accentués ou trop longs', () => {
    expect(() => validateCode('   ')).toThrow(DomainError);
    expect(() => validateCode('étagère')).toThrow(DomainError);
    expect(() => validateCode('X'.repeat(25))).toThrow(DomainError);
  });
});

describe('emplacements', () => {
  it('refuse un code déjà utilisé, par un emplacement ou un carton', () => {
    const state = seeded();
    expect(() => addLocation(state, { code: 'A-01-1' }, NOW)).toThrow(DomainError);
    expect(() => addLocation(state, { code: 'CTN-000001' }, NOW)).toThrow(DomainError);
  });

  it('crée une série en ignorant les emplacements existants', () => {
    const { state, created } = addLocationSeries(seeded(), { aisle: 'a', bays: 2, levels: 2 }, NOW);
    expect(created).toEqual(['A-02-1', 'A-02-2']);
    expect(Object.keys(state.locations)).toHaveLength(4);
  });

  it('libère les cartons quand un emplacement est supprimé', () => {
    let state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    state = removeLocation(state, 'A-01-1', LATER);
    expect(state.locations['A-01-1']).toBeUndefined();
    expect(state.cartons['CTN-000001'].locationCode).toBeNull();
  });
});

describe('cartons', () => {
  it('range un carton et garde l’historique', () => {
    let state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    state = moveCarton(state, 'CTN-000001', 'A-01-2', LATER);
    expect(state.cartons['CTN-000001'].locationCode).toBe('A-01-2');
    expect(cartonsAt(state, 'A-01-1')).toHaveLength(0);
    expect(cartonsAt(state, 'A-01-2')).toHaveLength(1);
    expect(movementsOf(state, 'CTN-000001').map((m) => [m.from, m.to])).toEqual([
      ['A-01-1', 'A-01-2'],
      [null, 'A-01-1'],
    ]);
  });

  it('ne crée pas de mouvement si le carton est déjà en place', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    expect(moveCarton(state, 'CTN-000001', 'A-01-1', LATER)).toBe(state);
  });

  it('refuse un emplacement inconnu', () => {
    expect(() => moveCarton(seeded(), 'CTN-000001', 'Z-99-9', NOW)).toThrow(DomainError);
    expect(() => addCarton(seeded(), { code: 'X1', locationCode: 'Z-99-9' }, NOW)).toThrow(DomainError);
  });

  it('peut créer un carton directement dans un emplacement', () => {
    const state = addCarton(seeded(), { code: 'X1', locationCode: 'a-01-2' }, NOW);
    expect(state.cartons.X1.locationCode).toBe('A-01-2');
  });

  it('propose la référence automatique suivante', () => {
    expect(nextCartonCode(createEmptyState())).toBe('CTN-000001');
    expect(nextCartonCode(seeded())).toBe('CTN-000002');
  });

  it('met à jour description et quantité, refuse une quantité négative', () => {
    const state = updateCarton(seeded(), 'CTN-000001', { description: ' Câbles ', quantity: null }, LATER);
    expect(state.cartons['CTN-000001']).toMatchObject({ description: 'Câbles', quantity: null });
    expect(() => updateCarton(state, 'CTN-000001', { quantity: -1 }, LATER)).toThrow(DomainError);
  });

  it('supprime un carton et son historique', () => {
    let state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    state = removeCarton(state, 'CTN-000001');
    expect(state.cartons['CTN-000001']).toBeUndefined();
    expect(state.movements).toHaveLength(0);
  });

  it('recherche par référence, description ou emplacement', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    expect(searchCartons(state, 'hdmi')).toHaveLength(1);
    expect(searchCartons(state, 'a-01')).toHaveLength(1);
    expect(searchCartons(state, 'hdmi a-02')).toHaveLength(0);
    expect(searchCartons(state, '')).toHaveLength(1);
  });
});

describe('sauvegarde', () => {
  it('fait un aller-retour sans perte', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    expect(parseState(serializeState(state))).toEqual(state);
  });

  it('refuse un contenu invalide', () => {
    expect(() => parseState('pas du json')).toThrow(DomainError);
    expect(() => parseState('{"version":2}')).toThrow(DomainError);
  });

  it('détache les cartons dont l’emplacement n’existe plus', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    const broken = JSON.parse(serializeState(state));
    delete broken.locations['A-01-1'];
    expect(parseState(JSON.stringify(broken)).cartons['CTN-000001'].locationCode).toBeNull();
  });
});
