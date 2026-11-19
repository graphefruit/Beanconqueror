// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { CameraWeb } from '@capacitor/camera/dist/esm/web';

import { CameraOcrService } from '../camera-ocr.service';

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
});
