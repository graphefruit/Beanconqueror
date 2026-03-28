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

  it('should produce a non-empty base64 string when rotated by 90°', async () => {
    const result = await rotateBase64Image(testBase64, 90);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should produce a non-empty base64 string when rotated by 270°', async () => {
    const result = await rotateBase64Image(testBase64, 270);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should not contain the data:image/jpeg;base64, prefix in the output', async () => {
    const result = await rotateBase64Image(testBase64, 90);
    expect(result).not.toContain('data:image/jpeg;base64,');
  });

  it('should reject with an error when given invalid base64', async () => {
    await expectAsync(
      rotateBase64Image('not-a-valid-image!!!', 90),
    ).toBeRejectedWithError('Failed to load image for rotation');
  });
});
