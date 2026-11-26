import {
  downscaleBase64Image,
  fitWithin,
  rotateBase64Image,
} from '../image-rotation';

/**
 * Create a small non-square test JPEG as raw base64 using the browser Canvas API.
 * Returns a 4×2 red image so rotation visibly swaps dimensions.
 */
function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = `data:image/jpeg;base64,${base64}`;
  });
}

function createTestJpegBase64(width = 4, height = 2): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
}

/** Fully transparent PNG; loadImage sniffs the real type, so the JPEG data URL prefix is fine. */
function createTransparentPngBase64(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

async function centerPixel(base64: string): Promise<number[]> {
  const img = await loadImage(base64);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const x = Math.floor(img.naturalWidth / 2);
  const y = Math.floor(img.naturalHeight / 2);
  return Array.from(ctx.getImageData(x, y, 1, 1).data);
}

function expectWhite(pixel: number[]): void {
  pixel.slice(0, 3).forEach((channel) => expect(channel).toBeGreaterThan(245));
}

describe('rotateBase64Image', () => {
  let testBase64: string;

  beforeAll(() => {
    testBase64 = createTestJpegBase64();
  });

  [90, 270].forEach((degrees) => {
    it(`should swap dimensions of a 4×2 image to 2×4 and return raw base64 when rotated by ${degrees}°`, async () => {
      const result = await rotateBase64Image(testBase64, degrees as 90 | 270);
      expect(result).toBeTruthy();
      expect(result).not.toContain('data:image/jpeg;base64,');

      const img = await loadImage(result);

      expect(img.naturalWidth).toBe(2);
      expect(img.naturalHeight).toBe(4);
    });
  });

  it('turns transparent pixels white instead of black', async () => {
    const result = await rotateBase64Image(
      createTransparentPngBase64(4, 2),
      90,
    );

    expectWhite(await centerPixel(result));
  });

  it('should reject with an error when given invalid base64', async () => {
    await expectAsync(
      rotateBase64Image('not-a-valid-image!!!', 90),
    ).toBeRejectedWithError('Failed to load image');
  });
});

describe('fitWithin', () => {
  it('scales the longer edge down to the limit and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 2560)).toEqual({ width: 2560, height: 1920 });
    expect(fitWithin(3000, 4000, 2560)).toEqual({ width: 1920, height: 2560 });
  });

  it('never enlarges a small image', () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 });
  });

  it('keeps at least one pixel on a very thin image', () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe('downscaleBase64Image', () => {
  it('shrinks an image whose longer edge is above the limit', async () => {
    const result = await downscaleBase64Image(createTestJpegBase64(40, 20), 10);

    const img = await loadImage(result);
    expect(img.naturalWidth).toBe(10);
    expect(img.naturalHeight).toBe(5);
  });

  it('turns transparent pixels white instead of black', async () => {
    const result = await downscaleBase64Image(
      createTransparentPngBase64(40, 20),
      10,
    );

    expectWhite(await centerPixel(result));
  });

  it('returns a small image unchanged', async () => {
    const small = createTestJpegBase64(4, 2);

    expect(await downscaleBase64Image(small, 10)).toBe(small);
  });

  it('rejects an image that cannot be decoded', async () => {
    await expectAsync(
      downscaleBase64Image('not-a-valid-image!!!', 10),
    ).toBeRejectedWithError('Failed to load image');
  });
});
