import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLabelsHtml, cartonLabel, formatLabelSize, labelSizeInPoints, locationLabel } from './labels';

describe('étiquettes', () => {
  it('convertit les millimètres en points', () => {
    assert.deepEqual(labelSizeInPoints({ widthMm: 50, heightMm: 30 }), { width: 142, height: 85 });
  });

  it('génère une page par étiquette au format demandé', () => {
    const html = buildLabelsHtml(
      [
        { code: 'A-01-1', title: 'Emplacement' },
        { code: 'CTN-000001', title: 'Vis <M4> & écrous' },
      ],
      { widthMm: 62, heightMm: 29 },
    );
    assert.ok(html.includes('size: 62mm 29mm'));
    assert.equal(html.match(/<section class="label">/g)?.length, 2);
  });

  it('imprime la référence produit puis le nom sur l’étiquette d’un carton', () => {
    const carton = {
      code: 'CTN-000001',
      reference: 'HDMI-2M',
      name: 'Câbles HDMI',
      quantity: null,
      locationCode: null,
      createdAt: '',
      updatedAt: '',
    };
    assert.deepEqual(cartonLabel(carton), { code: 'CTN-000001', title: 'HDMI-2M', subtitle: 'Câbles HDMI' });
    assert.deepEqual(cartonLabel({ ...carton, reference: '' }), { code: 'CTN-000001', title: 'Câbles HDMI' });
  });

  it('imprime le nom de l’emplacement au-dessus de son numéro à 5 chiffres', () => {
    const location = { code: '10001', name: 'A-01-1', label: 'Fond', color: null, createdAt: '' };
    assert.deepEqual(locationLabel(location), { code: '10001', title: 'A-01-1', subtitle: 'Fond' });
    assert.equal(formatLabelSize({ widthMm: 62, heightMm: 29 }), '62 × 29 mm');
  });

  it('échappe le HTML des textes saisis ou scannés', () => {
    const html = buildLabelsHtml(
      [{ code: '<B>"X"&', title: '<script>alert(1)</script>' }],
      { widthMm: 50, heightMm: 30 },
    );
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('&lt;B&gt;&quot;X&quot;&amp;'));
  });
});
