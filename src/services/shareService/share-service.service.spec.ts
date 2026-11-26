import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { AppWeb } from '@capacitor/app/dist/esm/web';
import { Capacitor } from '@capacitor/core';
import { DeviceWeb } from '@capacitor/device/dist/esm/web';
import { FileInfo } from '@capacitor/filesystem';
// The plugin objects are proxies that cannot be spied on; the web
// implementations behind them can.
import { FilesystemWeb } from '@capacitor/filesystem/dist/esm/web';
import { ShareWeb } from '@capacitor/share/dist/esm/web';
import { TranslateService } from '@ngx-translate/core';

import { Settings } from '../../classes/settings/settings';
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
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
  let uiLog: {
    getLogs: () => unknown[];
    error: jasmine.Spy;
    writeToFile: jasmine.Spy;
  };
  let flush: jasmine.Spy;

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
    uiLog = {
      getLogs: () => LOGS,
      error: jasmine.createSpy('error'),
      writeToFile: jasmine.createSpy('writeToFile').and.resolveTo(),
    };

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
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
      ],
    });
    service = TestBed.inject(ShareService);
    flush = jasmine.createSpy('flush').and.resolveTo();
    (service as unknown as { nativeLog: { flush: jasmine.Spy } }).nativeLog = {
      flush,
    };
  }

  function file(_name: string): FileInfo {
    return {
      name: _name,
      type: 'file',
      size: 1,
      ctime: 0,
      mtime: 0,
      uri: `file:///logs/${_name}`,
    };
  }

  describe('sharing the log files in the app', () => {
    const INFO = 'file:///logs/support-info.json';
    let readdir: jasmine.Spy;
    let writeFile: jasmine.Spy;

    beforeEach(() => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      readdir = spyOn(FilesystemWeb.prototype, 'readdir').and.resolveTo({
        files: [
          file('native_20261126_080000000.log'),
          file('log_20261126_080000000.jsonl'),
          file('other.txt'),
          file('log_20261125_080000000.jsonl'),
        ],
      });
      writeFile = spyOn(FilesystemWeb.prototype, 'writeFile').and.resolveTo({
        uri: INFO,
      });
      spyOn(AppWeb.prototype, 'getInfo').and.resolveTo({
        name: 'BeanConqueror',
        id: 'com.beanconqueror.app',
        build: '1',
        version: '9.0.0',
      });
      spyOn(DeviceWeb.prototype, 'getInfo').and.resolveTo({
        name: "Lars' phone",
        model: 'Pixel 8',
        platform: 'android',
        operatingSystem: 'android',
        osVersion: '16',
        manufacturer: 'Google',
        isVirtual: false,
        webViewVersion: '142.0',
      });
    });

    it('writes the log first and shares the log files themselves, sorted', async () => {
      setup('android', 'YES');
      share.and.callFake(() => {
        expect(uiLog.writeToFile).toHaveBeenCalledTimes(1);
        return Promise.resolve({});
      });

      await service.shareLogs();

      expect(readdir).toHaveBeenCalledOnceWith({
        path: 'logs',
        directory: 'LIBRARY_NO_CLOUD',
      });
      expect(share).toHaveBeenCalledOnceWith({
        files: [
          INFO,
          'file:///logs/log_20261125_080000000.jsonl',
          'file:///logs/log_20261126_080000000.jsonl',
          'file:///logs/native_20261126_080000000.log',
        ],
      });
      expect(flush).not.toHaveBeenCalled();
      expect(
        fileHelper.writeExternalFileFromBase64ForSharing,
      ).not.toHaveBeenCalled();
      expect(uiAlert.copyLogfiles).not.toHaveBeenCalled();
    });

    it('fetches the native log on iOS before reading the files', async () => {
      setup('ios', 'YES');
      readdir.and.callFake(() => {
        expect(flush).toHaveBeenCalledTimes(1);
        return Promise.resolve({
          files: [file('log_20261126_080000000.jsonl')],
        });
      });

      await service.shareLogs();

      expect(share).toHaveBeenCalledOnceWith({
        files: [INFO, 'file:///logs/log_20261126_080000000.jsonl'],
      });
    });

    it('puts app, system, device model and Bluetooth settings next to the log', async () => {
      setup('android', 'YES');

      await service.shareLogs();

      const [options] = writeFile.calls.mostRecent().args;
      expect(options).toEqual(
        jasmine.objectContaining({
          path: 'logs/support-info.json',
          directory: 'LIBRARY_NO_CLOUD',
          encoding: 'utf8',
        }),
      );
      const info = JSON.parse(options.data);
      expect(info.app_version).toBe('9.0.0');
      expect(info.model).toBe('Pixel 8');
      expect(info.bluetooth_settings.bluetooth_command_delay).toBe(50);
      expect(options.data).not.toContain("Lars' phone");
    });

    it('still shares the log files when the support info cannot be written', async () => {
      setup('android', 'YES');
      writeFile.and.rejectWith(new Error('disk full'));

      await service.shareLogs();

      expect(share).toHaveBeenCalledOnceWith({
        files: [
          'file:///logs/log_20261125_080000000.jsonl',
          'file:///logs/log_20261126_080000000.jsonl',
          'file:///logs/native_20261126_080000000.log',
        ],
      });
      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });

    it('still shares the files when the native log cannot be fetched', async () => {
      setup('ios', 'YES');
      flush.and.rejectWith(new Error('UNIMPLEMENTED'));

      await service.shareLogs();

      expect(share).toHaveBeenCalledTimes(1);
      expect(share.calls.mostRecent().args[0].files.length).toBe(4);
    });

    it('shares the log in memory when the folder cannot be read', async () => {
      setup('android', 'YES');
      readdir.and.rejectWith(new Error('no folder'));

      await service.shareLogs();

      expect(share).toHaveBeenCalledOnceWith({ url: SHARED_FILE.fullpath });
    });

    it('shares the log in memory when there is no log file, else shows it as text', async () => {
      setup('android', 'YES');
      readdir.and.resolveTo({ files: [file('other.txt')] });
      fileHelper.writeExternalFileFromBase64ForSharing.and.rejectWith(
        new Error('disk full'),
      );

      await service.shareLogs();

      expect(
        fileHelper.writeExternalFileFromBase64ForSharing,
      ).toHaveBeenCalledTimes(1);
      expect(uiAlert.copyLogfiles).toHaveBeenCalledTimes(1);
      expect(share).not.toHaveBeenCalled();
    });

    it('shares nothing else when the user cancels the share dialog', async () => {
      setup('android', 'YES');
      share.and.rejectWith(new Error('Share canceled'));

      await service.shareLogs();

      expect(share).toHaveBeenCalledTimes(1);
      expect(
        fileHelper.writeExternalFileFromBase64ForSharing,
      ).not.toHaveBeenCalled();
      expect(uiAlert.copyLogfiles).not.toHaveBeenCalled();
    });
  });

  describe('sharing the log in the browser', () => {
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
