import { StorageClass } from './storageClass';

describe('StorageClass', () => {
  it('sets default values', () => {
    const storage = new StorageClass();
    expect(storage.addedDate).toBe(0);
    expect(storage.updatedDate).toBe(0);
    expect(storage.version).toBe('');
  });
});
