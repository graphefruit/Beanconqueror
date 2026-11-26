const JPEG_PREFIX = /^data:image\/jpeg;base64,/;

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = 'data:image/jpeg;base64,' + base64;
  });
}

// JPEG has no alpha channel: without a white background, transparent pixels turn black.
function whiteCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }
  return { canvas, ctx };
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.92).replace(JPEG_PREFIX, '');
}

/**
 * Size that keeps the aspect ratio and fits the longer edge into maxEdge.
 * Never enlarges.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Shrink a base64-encoded image so its longer edge is at most maxEdge.
 * Returns the input unchanged when it is already small enough.
 *
 * @param base64 Raw base64 string (no data URL prefix)
 * @returns Raw base64 JPEG (no data URL prefix)
 */
export async function downscaleBase64Image(
  base64: string,
  maxEdge: number,
): Promise<string> {
  const img = await loadImage(base64);
  const { width, height } = fitWithin(img.width, img.height, maxEdge);
  if (width === img.width && height === img.height) {
    return base64;
  }
  const { canvas, ctx } = whiteCanvas(width, height);
  ctx?.drawImage(img, 0, 0, width, height);
  return canvasToBase64(canvas);
}

/**
 * Rotate a base64-encoded image by the given degrees using the Canvas API.
 *
 * @param base64 Raw base64 string (no data URL prefix)
 * @param degrees Clockwise rotation: 90 or 270
 * @returns Rotated image as raw base64 string (no data URL prefix)
 */
export async function rotateBase64Image(
  base64: string,
  degrees: 90 | 270,
): Promise<string> {
  const img = await loadImage(base64);
  const { canvas, ctx } = whiteCanvas(img.height, img.width);
  ctx?.translate(canvas.width / 2, canvas.height / 2);
  ctx?.rotate((degrees * Math.PI) / 180);
  ctx?.drawImage(img, -img.width / 2, -img.height / 2);
  return canvasToBase64(canvas);
}
