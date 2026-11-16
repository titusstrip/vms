import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLabelsHtml, cartonLabel, labelSizeInPoints } from './labels';

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
