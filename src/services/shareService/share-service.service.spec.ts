import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { ShareWeb } from '@capacitor/share/dist/esm/web';
import { TranslateService } from '@ngx-translate/core';

import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { isShareCancelled, ShareService } from './share-service.service';

const LOGS = [{ level: 'INFO', message: 'Started', params: [] }];
const SHARED_FILE = {
  path: 'sharefile.json',
  fullpath: 'file:///sharefile.json',
};

describe('ShareService', () => {
  let service: ShareService;
  let uiAlert: jasmine.SpyObj<
    Pick<UIAlert, 'showConfirmWithYesNoTranslation' | 'copyLogfiles'>
  >;
  let fileHelper: jasmine.SpyObj<
    Pick<
      UIFileHelper,
      | 'writeExternalFileFromBase64ForSharing'
      | 'writeInternalFileFromBase64'
      | 'deleteExternalSharedFile'
      | 'deleteInternalFile'
    >
  >;
  let share: jasmine.Spy;
  let uiLog: { getLogs: () => unknown[]; error: jasmine.Spy };

  function setup(platform: 'android' | 'ios', answer: 'YES' | 'NO'): void {
    uiAlert = jasmine.createSpyObj('UIAlert', [
      'showConfirmWithYesNoTranslation',
      'copyLogfiles',
    ]);
    uiAlert.showConfirmWithYesNoTranslation.and.resolveTo(answer);
    uiAlert.copyLogfiles.and.resolveTo();
    fileHelper = jasmine.createSpyObj('UIFileHelper', [
      'writeExternalFileFromBase64ForSharing',
      'writeInternalFileFromBase64',
      'deleteExternalSharedFile',
      'deleteInternalFile',
    ]);
    fileHelper.writeExternalFileFromBase64ForSharing.and.resolveTo(SHARED_FILE);
    fileHelper.writeInternalFileFromBase64.and.resolveTo(SHARED_FILE);
    fileHelper.deleteExternalSharedFile.and.resolveTo();
    fileHelper.deleteInternalFile.and.resolveTo();
    share = spyOn(ShareWeb.prototype, 'share').and.resolveTo({});
    uiLog = { getLogs: () => LOGS, error: jasmine.createSpy('error') };

    TestBed.configureTestingModule({
      providers: [
        ShareService,
        { provide: UIAlert, useValue: uiAlert },
        { provide: UIFileHelper, useValue: fileHelper },
        { provide: UILog, useValue: uiLog },
        {
          provide: Platform,
          useValue: { is: (name: string) => name === platform },
        },
        { provide: TranslateService, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
      ],
    });
    service = TestBed.inject(ShareService);
  }

  describe('sharing the log', () => {
    it('asks first and shares nothing when the user cancels', async () => {
      setup('android', 'NO');

      await service.shareLogs();

      expect(uiAlert.showConfirmWithYesNoTranslation).toHaveBeenCalledOnceWith(
        'SHARE_LOGS_HINT',
        'SHARE_LOGS_TITLE',
        'SHARE',
        'CANCEL',
        true,
      );
      expect(
        fileHelper.writeExternalFileFromBase64ForSharing,
      ).not.toHaveBeenCalled();
      expect(share).not.toHaveBeenCalled();
    });

    it('shares the log as a JSON file after the user agreed and removes the file', async () => {
      setup('android', 'YES');

      await service.shareLogs();

      const [dataUrl, name] =
        fileHelper.writeExternalFileFromBase64ForSharing.calls.mostRecent()
          .args;
      expect(name).toBe('sharefile.json');
      expect(dataUrl).toMatch(/^data:application\/json;base64,/);
      expect(JSON.parse(atob(dataUrl.split(',')[1]))).toEqual(LOGS);
      expect(share).toHaveBeenCalledOnceWith({ url: SHARED_FILE.fullpath });
      expect(fileHelper.deleteExternalSharedFile).toHaveBeenCalledOnceWith(
        SHARED_FILE.path,
      );
    });

    it('shows the log as text when it cannot be turned into a file', async () => {
      setup('android', 'YES');
      spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function (
        this: FileReader,
      ) {
        this.onerror(new ProgressEvent('error') as ProgressEvent<FileReader>);
      });

      await service.shareLogs();

      expect(uiAlert.copyLogfiles).toHaveBeenCalledTimes(1);
      expect(share).not.toHaveBeenCalled();
    });

    for (const platform of ['android', 'ios'] as const) {
      it(`shows the log as text when the file cannot be written on ${platform}`, async () => {
        setup(platform, 'YES');
        fileHelper.writeExternalFileFromBase64ForSharing.and.rejectWith(
          new Error('disk full'),
        );
        fileHelper.writeInternalFileFromBase64.and.rejectWith(
          new Error('disk full'),
        );

        await service.shareLogs();

        expect(uiAlert.copyLogfiles).toHaveBeenCalledTimes(1);
        expect(share).not.toHaveBeenCalled();
      });
    }

    it('does not show the log as text when the user cancels the share dialog', async () => {
      setup('android', 'YES');
      share.and.rejectWith(new Error('Share canceled'));

      await service.shareLogs();

      expect(uiAlert.copyLogfiles).not.toHaveBeenCalled();
    });
  });

  describe('sharing a file', () => {
    it('removes the file when the share dialog fails or is cancelled', async () => {
      setup('android', 'YES');
      share.and.rejectWith(new Error('Share canceled'));

      await service.shareFile(
        'Beanconqueror_logs',
        'data:application/json;base64,e30=',
      );

      expect(fileHelper.deleteExternalSharedFile).toHaveBeenCalledOnceWith(
        SHARED_FILE.path,
      );
    });

    it('uses the internal directory on iOS and removes the file there', async () => {
      setup('ios', 'YES');
      share.and.rejectWith(new Error('Share canceled'));

      await service.shareFile(
        'Beanconqueror_logs',
        'data:application/json;base64,e30=',
      );

      expect(fileHelper.writeInternalFileFromBase64).toHaveBeenCalledTimes(1);
      expect(fileHelper.deleteInternalFile).toHaveBeenCalledOnceWith(
        SHARED_FILE.path,
      );
    });

    it('does not fail when the file cannot be removed', async () => {
      setup('android', 'YES');
      fileHelper.deleteExternalSharedFile.and.rejectWith(new Error('gone'));

      await expectAsync(
        service.shareFile(
          'Beanconqueror_logs',
          'data:application/json;base64,e30=',
        ),
      ).toBeResolved();
      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('sharing a stored file', () => {
    const URI = 'file:///data/pre-import/backup.zip';

    it('opens the share dialog for the file', async () => {
      setup('android', 'YES');

      expect(await service.shareStoredFile(URI)).toBeTrue();

      expect(share).toHaveBeenCalledOnceWith({ url: URI });
      expect(uiLog.error).not.toHaveBeenCalled();
    });

    it('counts a closed dialog as shared and logs nothing', async () => {
      setup('ios', 'YES');
      share.and.rejectWith(new Error('Share canceled'));

      expect(await service.shareStoredFile(URI)).toBeTrue();

      expect(uiLog.error).not.toHaveBeenCalled();
    });

    it('resolves false and logs when the file could not be shared', async () => {
      setup('android', 'YES');
      share.and.rejectWith(new Error('Unsupported url'));

      expect(await service.shareStoredFile(URI)).toBeFalse();

      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Whether sharing was cancelled', () => {
  it('holds for the cancel of the native dialogs and of the browser', () => {
    expect(isShareCancelled(new Error('Share canceled'))).toBeTrue();
    expect(
      isShareCancelled(new DOMException('cancelled', 'AbortError')),
    ).toBeTrue();
  });

  it('does not hold for other errors', () => {
    for (const error of [
      new Error('Unsupported url'),
      undefined,
      null,
      'Share canceled',
    ]) {
      expect(isShareCancelled(error)).withContext(String(error)).toBeFalse();
    }
  });
});
