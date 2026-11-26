import { toTextDetectionResult } from '../text-detection';

const box = { left: 1, top: 2, right: 30, bottom: 12 };

describe('toTextDetectionResult', () => {
  it('keeps text, boxes, languages and the order of blocks, lines and elements', () => {
    const raw = {
      text: 'Big Title\nsmall',
      blocks: [
        {
          text: 'Big Title',
          boundingBox: box,
          recognizedLanguage: 'en',
          cornerPoints: null,
          lines: [
            {
              text: 'Big Title',
              boundingBox: box,
              recognizedLanguage: 'en',
              elements: [
                { text: 'Big', boundingBox: box, recognizedLanguage: 'en' },
                { text: 'Title', boundingBox: box, recognizedLanguage: 'en' },
              ],
            },
          ],
        },
        { text: 'small', boundingBox: box, recognizedLanguage: '', lines: [] },
      ],
    };

    const result = toTextDetectionResult(raw);

    expect(result).toEqual({
      text: 'Big Title\nsmall',
      blocks: [
        {
          text: 'Big Title',
          boundingBox: box,
          recognizedLanguage: 'en',
          lines: [
            {
              text: 'Big Title',
              boundingBox: box,
              recognizedLanguage: 'en',
              elements: [
                { text: 'Big', boundingBox: box, recognizedLanguage: 'en' },
                { text: 'Title', boundingBox: box, recognizedLanguage: 'en' },
              ],
            },
          ],
        },
        { text: 'small', boundingBox: box, recognizedLanguage: '', lines: [] },
      ],
    });
  });

  it('drops entries without a usable box but keeps the full text', () => {
    const result = toTextDetectionResult({
      text: 'kept',
      blocks: [
        { text: 'no box', lines: [] },
        { text: 'NaN', boundingBox: { ...box, top: Number.NaN }, lines: [] },
        { text: 'string', boundingBox: { ...box, left: '1' }, lines: [] },
        null,
        {
          text: 'ok',
          boundingBox: box,
          lines: [
            { text: 'line without box', elements: [] },
            { text: 'line', boundingBox: box, elements: [{ text: 'e' }] },
          ],
        },
      ],
    });

    expect(result.text).toBe('kept');
    expect(result.blocks.map((b) => b.text)).toEqual(['ok']);
    expect(result.blocks[0].lines.map((l) => l.text)).toEqual(['line']);
    expect(result.blocks[0].lines[0].elements).toEqual([]);
  });

  it('fills missing text, language and lists with empty values', () => {
    const result = toTextDetectionResult({
      text: 42,
      blocks: [{ boundingBox: box, lines: 'none' }],
    });

    expect(result).toEqual({
      text: '',
      blocks: [
        { text: '', boundingBox: box, recognizedLanguage: '', lines: [] },
      ],
    });
  });

  [undefined, null, 'text', 7].forEach((raw) => {
    it(`returns an empty result for ${String(raw)}`, () => {
      expect(toTextDetectionResult(raw)).toEqual({ text: '', blocks: [] });
    });
  });

  it('returns no blocks when blocks is not a list', () => {
    expect(toTextDetectionResult({ text: 'a', blocks: {} })).toEqual({
      text: 'a',
      blocks: [],
    });
  });
});
