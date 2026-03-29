/**
 * Rotate a base64-encoded image by the given degrees using the Canvas API.
 *
 * @param base64 Raw base64 string (no data URL prefix)
 * @param degrees Clockwise rotation: 90 or 270
 * @returns Rotated image as raw base64 string (no data URL prefix)
 */
export function rotateBase64Image(
  base64: string,
  degrees: 90 | 270,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.height;
      canvas.height = img.width;
      ctx?.translate(canvas.width / 2, canvas.height / 2);
      ctx?.rotate((degrees * Math.PI) / 180);
      ctx?.drawImage(img, -img.width / 2, -img.height / 2);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ''));
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = 'data:image/jpeg;base64,' + base64;
  });
}
