import { foldSearchText } from '../fold-search-text';

describe('foldSearchText', () => {
  it('ignores case and accents', () => {
    expect(foldSearchText('José')).toBe('jose');
    expect(foldSearchText('CAFÉ')).toBe('cafe');
    expect(foldSearchText('Rösterei Süd')).toBe('rosterei sud');
    expect(foldSearchText('Ñuñoa Çà')).toBe('nunoa ca');
  });

  it('treats composed and decomposed accents alike', () => {
    expect(foldSearchText('José')).toBe(foldSearchText('José'));
  });

  it('keeps letters that have no accent to remove', () => {
    expect(foldSearchText('Straße Øst Æble Łódź')).toBe('straße øst æble łodz');
  });

  it('keeps Hangul syllables and voiced kana whole', () => {
    expect(foldSearchText('각')).toBe('각');
    expect(foldSearchText('ガ')).toBe('ガ');
    expect(foldSearchText('각').includes(foldSearchText('가'))).toBeFalse();
  });

  it('returns an empty text unchanged', () => {
    expect(foldSearchText('')).toBe('');
  });
});
