import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_BACKUP_BYTES,
  MAX_TEXT_LENGTH,
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
    assert.equal(normalizeCode('  ctn-12 \n'), 'CTN-12');
  });

  it('refuse les codes vides, accentués ou trop longs', () => {
    assert.throws(() => validateCode('   '), DomainError);
    assert.throws(() => validateCode('étagère'), DomainError);
    assert.throws(() => validateCode('X'.repeat(25)), DomainError);
  });
});

describe('emplacements', () => {
  it('refuse un code déjà utilisé, par un emplacement ou un carton', () => {
    const state = seeded();
    assert.throws(() => addLocation(state, { code: 'A-01-1' }, NOW), DomainError);
    assert.throws(() => addLocation(state, { code: 'CTN-000001' }, NOW), DomainError);
  });

  it('crée une série en ignorant les emplacements existants', () => {
    const { state, created } = addLocationSeries(seeded(), { aisle: 'a', bays: 2, levels: 2 }, NOW);
    assert.deepEqual(created, ['A-02-1', 'A-02-2']);
    assert.equal(Object.keys(state.locations).length, 4);
  });

  it('libère les cartons quand un emplacement est supprimé', () => {
    let state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    state = removeLocation(state, 'A-01-1', LATER);
    assert.equal(state.locations['A-01-1'], undefined);
    assert.equal(state.cartons['CTN-000001'].locationCode, null);
  });
});

describe('cartons', () => {
  it('range un carton et garde l’historique', () => {
    let state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    state = moveCarton(state, 'CTN-000001', 'A-01-2', LATER);
    assert.equal(state.cartons['CTN-000001'].locationCode, 'A-01-2');
    assert.equal(cartonsAt(state, 'A-01-1').length, 0);
    assert.equal(cartonsAt(state, 'A-01-2').length, 1);
    assert.deepEqual(
      movementsOf(state, 'CTN-000001').map((m) => [m.from, m.to]),
      [
        ['A-01-1', 'A-01-2'],
        [null, 'A-01-1'],
      ],
    );
  });

  it('ne crée pas de mouvement si le carton est déjà en place', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    assert.equal(moveCarton(state, 'CTN-000001', 'A-01-1', LATER), state);
  });

  it('refuse un emplacement inconnu', () => {
    assert.throws(() => moveCarton(seeded(), 'CTN-000001', 'Z-99-9', NOW), DomainError);
    assert.throws(() => addCarton(seeded(), { code: 'X1', locationCode: 'Z-99-9' }, NOW), DomainError);
  });

  it('peut créer un carton directement dans un emplacement', () => {
    const state = addCarton(seeded(), { code: 'X1', locationCode: 'a-01-2' }, NOW);
    assert.equal(state.cartons.X1.locationCode, 'A-01-2');
  });

  it('propose la référence automatique suivante', () => {
    assert.equal(nextCartonCode(createEmptyState()), 'CTN-000001');
    assert.equal(nextCartonCode(seeded()), 'CTN-000002');
  });

  it('met à jour description et quantité, refuse une quantité négative', () => {
    const state = updateCarton(seeded(), 'CTN-000001', { description: ' Câbles ', quantity: null }, LATER);
    assert.partialDeepStrictEqual(state.cartons['CTN-000001'], { description: 'Câbles', quantity: null });
    assert.throws(() => updateCarton(state, 'CTN-000001', { quantity: -1 }, LATER), DomainError);
  });

  it('tronque les textes trop longs', () => {
    const state = addCarton(seeded(), { code: 'X1', description: 'x'.repeat(500) }, NOW);
    assert.equal(state.cartons.X1.description.length, MAX_TEXT_LENGTH);
  });

  it('supprime un carton et son historique', () => {
    let state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    state = removeCarton(state, 'CTN-000001');
    assert.equal(state.cartons['CTN-000001'], undefined);
    assert.equal(state.movements.length, 0);
  });

  it('recherche par référence, description ou emplacement', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    assert.equal(searchCartons(state, 'hdmi').length, 1);
    assert.equal(searchCartons(state, 'a-01').length, 1);
    assert.equal(searchCartons(state, 'hdmi a-02').length, 0);
    assert.equal(searchCartons(state, '').length, 1);
  });
});

describe('sauvegarde', () => {
  it('fait un aller-retour sans perte', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    assert.deepEqual(parseState(serializeState(state)), state);
  });

  it('refuse un contenu invalide ou trop volumineux', () => {
    assert.throws(() => parseState('pas du json'), DomainError);
    assert.throws(() => parseState('{"version":2}'), DomainError);
    assert.throws(() => parseState('[]'), DomainError);
    assert.throws(() => parseState(' '.repeat(MAX_BACKUP_BYTES + 1)), DomainError);
  });

  it('détache les cartons dont l’emplacement n’existe plus', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    const broken = JSON.parse(serializeState(state));
    delete broken.locations['A-01-1'];
    assert.equal(parseState(JSON.stringify(broken)).cartons['CTN-000001'].locationCode, null);
  });

  it('revalide chaque champ d’un fichier non fiable', () => {
    // La clé « __proto__ » est injectée dans le texte : un littéral JS la traiterait à part.
    const hostile = JSON.stringify({
      version: 1,
      locations: { x: { code: 'a-01-1', label: 42, extra: '<script>' } },
      cartons: {
        PROTO_KEY: { code: 'ctn-1', description: 'x'.repeat(999), quantity: 'beaucoup', locationCode: 'A-01-1' },
      },
      movements: [{ cartonCode: 'INCONNU' }, 'n’importe quoi', { cartonCode: 'CTN-1', to: 'A-01-1', at: 'hier' }],
      labelSettings: { widthMm: 99999, heightMm: 30 },
    }).replace('"PROTO_KEY"', '"__proto__"');
    const state = parseState(hostile);
    assert.deepEqual(Object.keys(state.locations), ['A-01-1']);
    assert.deepEqual(Object.keys(state.locations['A-01-1']).sort(), ['code', 'createdAt', 'label']);
    assert.equal(state.locations['A-01-1'].label, '');
    assert.equal(Object.getPrototypeOf(state.cartons), Object.prototype);
    assert.equal(state.cartons['CTN-1'].description.length, MAX_TEXT_LENGTH);
    assert.equal(state.cartons['CTN-1'].quantity, null);
    assert.equal(state.cartons['CTN-1'].locationCode, 'A-01-1');
    assert.equal(state.movements.length, 1);
    assert.deepEqual(state.labelSettings, { widthMm: 50, heightMm: 30 });
  });

  it('refuse une sauvegarde contenant un code non imprimable', () => {
    const bad = JSON.stringify({ version: 1, locations: {}, cartons: { a: { code: 'é<script>' } } });
    assert.throws(() => parseState(bad), DomainError);
  });
});
