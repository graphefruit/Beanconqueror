import { createAIBeanImportError } from '../../../services/aiBeanImport/ai-bean-import-error';
import { BeansPage } from '../beans.page';

/** The message a failed request of the provider ends in, with its answer. */
const MESSAGE =
  '[cloud_api] Cloud LLM API error (401): {"error":"Incorrect API key sk-abc123"}';

interface CloudImports {
  aiImportBeanCloud(): Promise<void>;
  aiImportBeanMultiCloud(): Promise<void>;
}

describe('BeansPage cloud AI import failures', () => {
  let page: CloudImports;
  let uiLog: { warn: jasmine.Spy };
  let showMessage: jasmine.Spy;

  beforeEach(() => {
    const failure = createAIBeanImportError(
      MESSAGE,
      'cloud_api',
      Object.assign(new Error('provider'), { status: 401 }),
    );
    uiLog = { warn: jasmine.createSpy('warn') };
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    const modal = {
      present: () => Promise.resolve(),
      onDidDismiss: () =>
        Promise.resolve({
          role: 'confirm',
          data: { photoPaths: ['photo.jpg'], attachPhotos: true },
        }),
    };
    page = Object.assign(Object.create(BeansPage.prototype), {
      uiLog,
      uiAnalytics: { trackEvent: () => undefined },
      uiAlert: {
        showMessage,
        showLoadingSpinner: () => Promise.resolve(),
        hideLoadingSpinner: () => Promise.resolve(),
      },
      modalController: { create: () => Promise.resolve(modal) },
      cloudAiBeanImportService: {
        checkReadiness: () => ({ ready: true }),
        captureAndExtractBeanData: () => Promise.reject(failure),
        extractBeanDataFromImages: () => Promise.reject(failure),
      },
    }) as CloudImports;
  });

  it('shows the whole message but logs only the status of a photo import', async () => {
    await page.aiImportBeanCloud();

    expect(showMessage).toHaveBeenCalledOnceWith(
      MESSAGE,
      'ERROR_OCCURED',
      undefined,
      true,
    );
    expect(uiLog.warn.calls.allArgs()).toEqual([
      ['Cloud AI bean import error', 'Error (status 401)'],
    ]);
  });

  it('shows the whole message but logs only the status of an import of several photos', async () => {
    await page.aiImportBeanMultiCloud();

    expect(showMessage).toHaveBeenCalledOnceWith(
      MESSAGE,
      'ERROR_OCCURED',
      undefined,
      true,
    );
    expect(uiLog.warn.calls.allArgs()).toEqual([
      ['Cloud AI bean import (multi) error', 'Error (status 401)'],
    ]);
  });
});
