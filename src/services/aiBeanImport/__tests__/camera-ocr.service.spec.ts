// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import type {
  DetectTextOptions,
  TextRecognitionPlugin,
} from '@beanconqueror/text-recognition';
import { CameraWeb } from '@capacitor/camera/dist/esm/web';

import { OCR_MAX_IMAGE_EDGE } from '../../../data/ai-import/ai-import-constants';
import { CameraOcrService } from '../camera-ocr.service';

/** Noisy JPEG, so its base64 passes the minimum length check for photos. */
function createPhotoBase64(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  for (let x = 0; x < width; x += 10) {
    ctx.fillStyle = `rgb(${(x * 7) % 255}, ${(x * 13) % 255}, ${(x * 3) % 255})`;
    ctx.fillRect(x, 0, 10, height);
  }
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

function imageSize(base64: string): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
    image.onerror = () => reject(new Error('not an image'));
    image.src = `data:image/jpeg;base64,${base64}`;
  });
}

const box = { left: 0, top: 0, right: 10, bottom: 10 };

describe('CameraOcrService', () => {
  it('logs only the start of the text read from a label', async () => {
    const label = 'Roastery Example, Ethiopia Guji, washed. '.repeat(10);
    const log = jasmine.createSpy('log');
    spyOn(CameraWeb.prototype, 'getPhoto').and.resolveTo({
      base64String: 'aW1hZ2U=',
      format: 'jpeg',
      saved: false,
    });
    const service = Object.assign(Object.create(CameraOcrService.prototype), {
      uiLog: { log },
      uiAlert: {
        showLoadingSpinner: () => Promise.resolve(),
        setLoadingSpinnerMessage: () => undefined,
      },
      uiImage: { checkCameraPermission: () => Promise.resolve(true) },
      translate: { instant: (key: string) => key },
      ocrWithRotations: () =>
        Promise.resolve({ primary: { text: label }, rotated: [] }),
    }) as CameraOcrService;

    const result = await service.captureAndOcr();

    expect(result.rawText).toBe(label);
    expect(log.calls.allArgs()).toEqual([
      [
        `CameraOcr: OCR extracted text: ${label.slice(0, 100)}… (${label.length} chars)`,
      ],
    ]);
  });

  describe('ocrFromPhotoPaths', () => {
    let detectText: jasmine.Spy<TextRecognitionPlugin['detectText']>;
    let error: jasmine.Spy;
    let service: CameraOcrService;
    const photo = createPhotoBase64(OCR_MAX_IMAGE_EDGE + 40, 20);

    beforeEach(() => {
      detectText = jasmine.createSpy('detectText');
      error = jasmine.createSpy('error');
      service = Object.assign(Object.create(CameraOcrService.prototype), {
        uiLog: { log: () => undefined, error },
        uiAlert: { setLoadingSpinnerMessage: () => undefined },
        translate: { instant: (key: string) => key },
        uiFileHelper: {
          readInternalFileAsBase64: () => Promise.resolve(photo),
        },
        textRecognition: { detectText },
      }) as CameraOcrService;
    });

    it('recognises the downscaled photo upright and turned both ways', async () => {
      const sizes: [number, number][] = [];
      detectText.and.callFake(async ({ base64Image }: DetectTextOptions) => {
        sizes.push(await imageSize(base64Image));
        return {
          text: sizes.length === 2 ? 'side' : 'front',
          blocks: [
            {
              text: 'front',
              boundingBox: box,
              recognizedLanguage: 'en',
              lines: [],
            },
          ],
        };
      });

      const result = await service.ocrFromPhotoPaths(['photo.jpg']);

      expect(sizes).toEqual([
        [OCR_MAX_IMAGE_EDGE, 20],
        [20, OCR_MAX_IMAGE_EDGE],
        [20, OCR_MAX_IMAGE_EDGE],
      ]);
      const { primary, rotated } = result.ocrResults[0];
      expect(primary.blocks).toEqual([
        {
          text: 'front',
          boundingBox: box,
          recognizedLanguage: 'en',
          lines: [],
        },
      ]);
      expect(rotated.map((r) => r.text)).toEqual(['side', 'front']);
      expect(result.rawTexts).toEqual(['front\nside\nfront']);
    });

    it('drops rotated passes without text and logs failed ones', async () => {
      detectText.and.returnValues(
        Promise.resolve({ text: 'front', blocks: [] }),
        Promise.resolve({ text: ' ', blocks: [] }),
        Promise.reject(new Error('native failure')),
      );

      const result = await service.ocrFromPhotoPaths(['photo.jpg']);

      expect(result.ocrResults[0].rotated).toEqual([]);
      expect(error).toHaveBeenCalledOnceWith(
        'CameraOcr: Rotated 270° pass failed: native failure',
      );
    });

    it('skips a photo the plugin cannot read', async () => {
      detectText.and.rejectWith(new Error('Unable to decode image'));

      const result = await service.ocrFromPhotoPaths(['photo.jpg']);

      expect(result).toEqual({ ocrResults: [], rawTexts: [] });
      expect(error).toHaveBeenCalledOnceWith(
        'CameraOcr: OCR failed for photo 1: Unable to decode image',
      );
    });
  });
});
