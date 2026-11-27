import { photoPathCandidates } from './photo-path';

describe('photoPathCandidates', () => {
  it('leaves out a leading slash', () => {
    expect(photoPathCandidates('/photo.jpg', false)).toEqual(['photo.jpg']);
    expect(photoPathCandidates('/photo.jpg', true)).toEqual(['photo.jpg']);
    expect(photoPathCandidates('beans/photo.jpg', false)).toEqual([
      'beans/photo.jpg',
    ]);
  });

  it('tries iOS photos without the Cloud folder first, then as stored', () => {
    expect(photoPathCandidates('Cloud/photo.jpg', true)).toEqual([
      'photo.jpg',
      'Cloud/photo.jpg',
    ]);
    expect(photoPathCandidates('/Cloud/photo.jpg', true)).toEqual([
      'photo.jpg',
      'Cloud/photo.jpg',
    ]);
  });

  it('tries Cloud paths elsewhere as stored first, then without the Cloud folder', () => {
    expect(photoPathCandidates('Cloud/photo.jpg', false)).toEqual([
      'Cloud/photo.jpg',
      'photo.jpg',
    ]);
    expect(photoPathCandidates('/Cloud/photo.jpg', false)).toEqual([
      'Cloud/photo.jpg',
      'photo.jpg',
    ]);
  });

  it('only cleans a Cloud folder at the start', () => {
    expect(photoPathCandidates('beans/Cloud/photo.jpg', true)).toEqual([
      'beans/Cloud/photo.jpg',
    ]);
    expect(photoPathCandidates('Cloudy/photo.jpg', true)).toEqual([
      'Cloudy/photo.jpg',
    ]);
  });

  it('uses absolute file URIs as they are', () => {
    const uri = 'file:///var/mobile/Containers/Data/Cloud/photo.jpg';
    expect(photoPathCandidates(uri, true)).toEqual([uri]);
    expect(photoPathCandidates(uri, false)).toEqual([uri]);
  });
});
