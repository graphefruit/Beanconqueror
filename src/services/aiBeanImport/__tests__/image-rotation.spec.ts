import { rotateBase64Image } from '../image-rotation';

/**
 * Create a small non-square test JPEG as raw base64 using the browser Canvas API.
 * Returns a 4×2 red image so rotation visibly swaps dimensions.
 */
function createTestJpegBase64(width = 4, height = 2): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
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

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load rotated image'));
        image.src = `data:image/jpeg;base64,${result}`;
      });

      expect(img.naturalWidth).toBe(2);
      expect(img.naturalHeight).toBe(4);
    });
  });

  it('should reject with an error when given invalid base64', async () => {
    await expectAsync(
      rotateBase64Image('not-a-valid-image!!!', 90),
    ).toBeRejectedWithError('Failed to load image for rotation');
  });
});
