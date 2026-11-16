import { buildLabelsHtml, labelSizeInPoints } from './labels';

describe('étiquettes', () => {
  it('convertit les millimètres en points', () => {
    expect(labelSizeInPoints({ widthMm: 50, heightMm: 30 })).toEqual({ width: 142, height: 85 });
  });

  it('génère une page par étiquette au format demandé', () => {
    const html = buildLabelsHtml(
      [
        { code: 'A-01-1', title: 'Emplacement' },
        { code: 'CTN-000001', title: 'Vis <M4> & écrous' },
      ],
      { widthMm: 62, heightMm: 29 },
    );
    expect(html).toContain('size: 62mm 29mm');
    expect(html.match(/<section class="label">/g)).toHaveLength(2);
    expect(html).toContain('Vis &lt;M4&gt; &amp; écrous');
  });
});
