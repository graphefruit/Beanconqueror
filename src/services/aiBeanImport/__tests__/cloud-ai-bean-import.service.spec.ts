import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { UIAlert } from '../../uiAlert';
import { UILog } from '../../uiLog';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { CameraOcrService } from '../camera-ocr.service';
import { CloudAIBeanImportService } from '../cloud-ai-bean-import.service';
import { CloudFieldExtractionService } from '../cloud-field-extraction.service';
import { OcrMetadataService } from '../ocr-metadata.service';

/** What a provider answers to a wrong key, quoted in the message. */
const PROVIDER_ANSWER =
  '{"error":{"message":"Incorrect API key provided: sk-abc123","org":"org-42"}}';

describe('CloudAIBeanImportService', () => {
  let service: CloudAIBeanImportService;
  let uiLog: { error: jasmine.Spy };

  beforeEach(() => {
    uiLog = { error: jasmine.createSpy('error') };
    const providerError = Object.assign(
      new Error(`Cloud LLM API error (401): ${PROVIDER_ANSWER}`),
      { status: 401 },
    );
    TestBed.configureTestingModule({
      providers: [
        CloudAIBeanImportService,
        { provide: UILog, useValue: uiLog },
        {
          provide: UIAlert,
          useValue: jasmine.createSpyObj('UIAlert', {
            hideLoadingSpinner: Promise.resolve(),
            setLoadingSpinnerMessage: undefined,
          }),
        },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
        { provide: UISettingsStorage, useValue: {} },
        {
          provide: OcrMetadataService,
          useValue: {
            enrichWithLayoutMultiPass: () => ({ enrichedText: 'label' }),
          },
        },
        {
          provide: CloudFieldExtractionService,
          useValue: {
            extractAllFields: () => Promise.reject(providerError),
          },
        },
        {
          provide: CameraOcrService,
          useValue: {
            captureAndOcr: () => Promise.resolve({ ocrResult: {} }),
            ocrFromPhotoPaths: () => Promise.resolve({ ocrResults: [{}] }),
          },
        },
      ],
    });
    service = TestBed.inject(CloudAIBeanImportService);
  });

  it('logs a failure of the provider with its status, not its answer', async () => {
    await expectAsync(
      service.captureAndExtractBeanData(),
    ).toBeRejectedWithError(
      `[cloud_api] Cloud LLM API error (401): ${PROVIDER_ANSWER}`,
    );

    expect(uiLog.error.calls.allArgs()).toEqual([
      ['Cloud AI Bean Import error at step [cloud_api]', 'Error (status 401)'],
    ]);
  });

  it('logs a failure with several photos the same way', async () => {
    await expectAsync(
      service.extractBeanDataFromImages(['photo.jpg'], true),
    ).toBeRejectedWithError(
      `[cloud_api] Cloud LLM API error (401): ${PROVIDER_ANSWER}`,
    );

    expect(uiLog.error.calls.allArgs()).toEqual([
      [
        'Cloud AI Multi-Photo Import error at step [cloud_api]',
        'Error (status 401)',
      ],
    ]);
  });
});
