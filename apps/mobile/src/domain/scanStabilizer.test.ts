import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScanStabilizer } from './scanStabilizer';

const OPTIONS = { knownReads: 3, unknownReads: 6, windowMs: 1200, pauseMs: 1500, releaseMs: 2000 };

/** Simule des lectures espacées de 100 ms et renvoie les codes validés. */
function feed(stabilizer: ScanStabilizer, start: number, codes: string[], known: (code: string) => boolean) {
  const accepted: string[] = [];
  codes.forEach((code, index) => {
    const result = stabilizer.push(code, start + index * 100, known(code));
    if (result) {
      accepted.push(result);
    }
  });
  return accepted;
}

describe('stabilisation des lectures caméra', () => {
  it('valide un code connu après trois lectures identiques, une seule fois', () => {
    const stabilizer = new ScanStabilizer(OPTIONS);
    const accepted = feed(stabilizer, 0, Array(30).fill('CTN-1'), () => true);
    assert.deepEqual(accepted, ['CTN-1']);
  });

  it('ignore les lectures erronées qui changent à chaque image', () => {
    const stabilizer = new ScanStabilizer(OPTIONS);
    const noise = ['1234', '1284', '7234', '1239', '0234', '1234', '9999', '1230', '4321', '1111'];
    assert.deepEqual(feed(stabilizer, 0, noise, () => false), []);
  });

  it('retient le code connu quand plusieurs codes-barres sont visibles', () => {
    const stabilizer = new ScanStabilizer(OPTIONS);
    const mixed = ['EAN-A', 'CTN-1', 'EAN-B', 'CTN-1', 'EAN-A', 'CTN-1', 'EAN-B'];
    assert.deepEqual(feed(stabilizer, 0, mixed, (code) => code === 'CTN-1'), ['CTN-1']);
  });

  it('exige davantage de lectures pour un code inconnu', () => {
    const stabilizer = new ScanStabilizer(OPTIONS);
    assert.deepEqual(feed(stabilizer, 0, Array(5).fill('NEW'), () => false), []);
    assert.equal(stabilizer.push('NEW', 500, false), 'NEW');
  });

  it('ne compte pas des lectures trop espacées', () => {
    const stabilizer = new ScanStabilizer(OPTIONS);
    assert.equal(stabilizer.push('CTN-1', 0, true), null);
    assert.equal(stabilizer.push('CTN-1', 2000, true), null);
    assert.equal(stabilizer.push('CTN-1', 4000, true), null);
  });

  it('marque une pause après validation, puis accepte un autre code', () => {
    const stabilizer = new ScanStabilizer(OPTIONS);
    feed(stabilizer, 0, Array(3).fill('CTN-1'), () => true);
    assert.equal(stabilizer.isPaused(300), true);
    assert.deepEqual(feed(stabilizer, 300, Array(5).fill('A-01-1'), () => true), []);
    assert.equal(stabilizer.isPaused(1800), false);
    assert.deepEqual(feed(stabilizer, 1800, Array(3).fill('A-01-1'), () => true), ['A-01-1']);
  });

  it('relit le même code seulement après qu’il a quitté le champ', () => {
    const stabilizer = new ScanStabilizer(OPTIONS);
    feed(stabilizer, 0, Array(3).fill('CTN-1'), () => true);
    // Resté devant l'objectif pendant 5 s : jamais revalidé.
    assert.deepEqual(feed(stabilizer, 300, Array(50).fill('CTN-1'), () => true), []);
    // Retiré plus de 2 s, puis présenté à nouveau.
    assert.deepEqual(feed(stabilizer, 8000, Array(3).fill('CTN-1'), () => true), ['CTN-1']);
  });
});
