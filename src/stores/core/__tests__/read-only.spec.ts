import { freezeInDev, toPlainData } from '../read-only';

class Point {
  public x = 1;
  public y: number | undefined = undefined;
  public tags = [new Tag()];

  public length(): number {
    return this.x;
  }
}

class Tag {
  public label = 'tag';
}

describe('toPlainData', () => {
  it('copies class instances into plain objects and arrays', () => {
    const point = new Point();

    const plain = toPlainData(point);

    expect(plain).not.toBe(point);
    expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(plain.tags[0])).toBe(Object.prototype);
    expect(Array.isArray(plain.tags)).toBeTrue();
    expect(plain.tags).not.toBe(point.tags);
    expect('length' in plain).toBeFalse();
  });

  it('keeps the fields and their values, also undefined ones', () => {
    const plain = toPlainData(new Point());

    expect(plain).toEqual(
      jasmine.objectContaining({ x: 1, tags: [{ label: 'tag' }] }),
    );
    expect(Object.keys(plain)).toContain('y');
  });

  it('keeps values that are no objects', () => {
    expect(toPlainData(null)).toBeNull();
    expect(toPlainData('text')).toBe('text');
    expect(toPlainData(2)).toBe(2);
  });
});

describe('freezeInDev', () => {
  it('freezes the value and everything in it during tests', () => {
    const value = { nested: { list: [{ name: 'a' }] } };

    const frozen = freezeInDev(value);

    expect(frozen).toBe(value);
    expect(Object.isFrozen(value)).toBeTrue();
    expect(Object.isFrozen(value.nested)).toBeTrue();
    expect(Object.isFrozen(value.nested.list)).toBeTrue();
    expect(Object.isFrozen(value.nested.list[0])).toBeTrue();
    expect(() => {
      value.nested.list[0].name = 'b';
    }).toThrowError(TypeError);
  });

  it('leaves values that are no objects as they are', () => {
    expect(freezeInDev(null)).toBeNull();
    expect(freezeInDev(3)).toBe(3);
  });
});
