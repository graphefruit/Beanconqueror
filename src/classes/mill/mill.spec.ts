import { Mill } from './mill';

describe('Mill', () => {
  it('sets defaults in constructor', () => {
    const mill = new Mill();
    expect(mill.name).toBe('');
    expect(mill.finished).toBe(false);
  });

  it('initializes from object', () => {
    const mill = new Mill();
    mill.initializeByObject({ name: 'Test Mill' } as any);
    expect(mill.name).toBe('Test Mill');
  });

  it('detects photos', () => {
    const mill = new Mill();
    expect(mill.hasPhotos()).toBe(false);
    mill.attachments = ['photo'];
    expect(mill.hasPhotos()).toBe(true);
  });
});
