import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_BACKUP_BYTES,
  MAX_TEXT_LENGTH,
  addCarton,
  addLocation,
  addLocationSeries,
  cartonTitle,
  cartonsAt,
  createEmptyState,
  cartonsWithReference,
  findCartonByReference,
  findExistingCode,
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
  updateLocation,
  validateCode,
} from './inventory';
import { DomainError } from './types';

const NOW = '2026-01-01T10:00:00.000Z';
const LATER = '2026-01-02T10:00:00.000Z';

function seeded() {
  let state = createEmptyState();
  state = addLocation(state, { code: 'a-01-1', label: 'Fond gauche' }, NOW);
  state = addLocation(state, { code: 'A-01-2' }, NOW);
  state = addCarton(state, { code: 'ctn-000001', reference: 'hdmi-2m', name: 'Câbles HDMI', quantity: 20 }, NOW);
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

  it('met à jour nom et quantité, refuse une quantité négative', () => {
    const state = updateCarton(seeded(), 'CTN-000001', { name: ' Câbles ', quantity: null }, LATER);
    assert.partialDeepStrictEqual(state.cartons['CTN-000001'], { name: 'Câbles', quantity: null });
    assert.throws(() => updateCarton(state, 'CTN-000001', { quantity: -1 }, LATER), DomainError);
  });

  it('tronque les textes trop longs', () => {
    const state = addCarton(seeded(), { code: 'X1', name: 'x'.repeat(500) }, NOW);
    assert.equal(state.cartons.X1.name.length, MAX_TEXT_LENGTH);
  });

  it('supprime un carton et son historique', () => {
    let state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    state = removeCarton(state, 'CTN-000001');
    assert.equal(state.cartons['CTN-000001'], undefined);
    assert.equal(state.movements.length, 0);
  });

  it('recherche par référence, nom ou emplacement', () => {
    const state = moveCarton(seeded(), 'CTN-000001', 'A-01-1', NOW);
    assert.equal(searchCartons(state, 'hdmi').length, 1);
    assert.equal(searchCartons(state, 'a-01').length, 1);
    assert.equal(searchCartons(state, 'hdmi a-02').length, 0);
    assert.equal(searchCartons(state, '').length, 1);
  });
});

describe('fiche produit et couleurs', () => {
  it('retrouve un carton par sa référence produit, sans tenir compte de la casse', () => {
    const state = seeded();
    assert.equal(findCartonByReference(state, ' HDMI-2M ')?.code, 'CTN-000001');
    assert.equal(findCartonByReference(state, 'inconnue'), null);
    assert.equal(cartonTitle(state.cartons['CTN-000001']), 'hdmi-2m');
    assert.equal(searchCartons(state, 'hdmi-2').length, 1);
  });

  it('ne tranche pas quand deux cartons partagent la même référence', () => {
    const state = addCarton(seeded(), { code: 'CTN-2', reference: 'HDMI-2M' }, NOW);
    assert.equal(findCartonByReference(state, 'hdmi-2m'), null);
  });

  it('attribue une couleur aux emplacements, à l’unité, en série ou après coup', () => {
    let state = addLocation(createEmptyState(), { code: 'B-1', color: 'blue' }, NOW);
    assert.equal(state.locations['B-1'].color, 'blue');
    state = addLocationSeries(state, { aisle: 'C', bays: 1, levels: 2, color: 'green' }, NOW).state;
    assert.equal(state.locations['C-01-2'].color, 'green');
    state = updateLocation(state, 'B-1', { color: null, label: ' Quai ' });
    assert.partialDeepStrictEqual(state.locations['B-1'], { color: null, label: 'Quai' });
  });

  it('relit les anciennes sauvegardes (nom dans « description », pas de couleur)', () => {
    const old = JSON.stringify({
      version: 1,
      locations: { 'A-1': { code: 'A-1', label: '', createdAt: NOW } },
      cartons: { 'CTN-1': { code: 'CTN-1', description: 'Vis M4', quantity: 3, locationCode: 'A-1' } },
    });
    const state = parseState(old);
    assert.partialDeepStrictEqual(state.cartons['CTN-1'], { name: 'Vis M4', reference: '' });
    assert.equal(state.locations['A-1'].color, null);
  });

  it('ignore une couleur inconnue dans une sauvegarde', () => {
    const bad = JSON.stringify({ version: 1, cartons: {}, locations: { a: { code: 'A-1', color: 'javascript:1' } } });
    assert.equal(parseState(bad).locations['A-1'].color, null);
  });
});

describe('codes-barres déjà enregistrés', () => {
  it('reconnaît un même code lu en UPC-A (12 chiffres) ou en EAN-13 (0 devant)', () => {
    const state = addCarton(seeded(), { code: '036000291452', reference: 'SODA' }, NOW);
    const found = findExistingCode(state, '0036000291452');
    assert.equal(found?.kind === 'carton' && found.carton.code, '036000291452');
    assert.throws(() => addCarton(state, { code: '0036000291452' }, NOW), /déjà relié à la fiche SODA/);
  });

  it('distingue carton, emplacement et code inconnu', () => {
    const state = seeded();
    assert.equal(findExistingCode(state, 'ctn-000001')?.kind, 'carton');
    assert.equal(findExistingCode(state, 'a-01-1')?.kind, 'location');
    assert.equal(findExistingCode(state, 'INCONNU'), null);
  });

  it('liste les cartons d’une même référence produit', () => {
    const state = addCarton(seeded(), { code: 'CTN-2', reference: 'hdmi-2m' }, NOW);
    assert.deepEqual(cartonsWithReference(state, 'HDMI-2M').map((c) => c.code), ['CTN-000001', 'CTN-2']);
    assert.deepEqual(cartonsWithReference(state, ''), []);
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
    assert.deepEqual(Object.keys(state.locations['A-01-1']).sort(), ['code', 'color', 'createdAt', 'label']);
    assert.equal(state.locations['A-01-1'].label, '');
    assert.equal(Object.getPrototypeOf(state.cartons), Object.prototype);
    assert.equal(state.cartons['CTN-1'].name.length, MAX_TEXT_LENGTH);
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
