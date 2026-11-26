import { TestBed } from '@angular/core/testing';

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
  path: 'share/Beanconqueror_logs_1700000000000.json',
  fullpath: 'file:///cache/share/Beanconqueror_logs_1700000000000.json',
};

describe('ShareService', () => {
  let service: ShareService;
  let uiAlert: jasmine.SpyObj<
    Pick<
      UIAlert,
      | 'showConfirmWithYesNoTranslation'
      | 'copyLogfiles'
      | 'withLoadingSpinner'
      | 'isLoadingSpinnerShown'
    >
  >;
  /** Whether the loading spinner is shown, as the work in it sees it. */
  let spinnerShown: boolean;
  let fileHelper: jasmine.SpyObj<
    Pick<UIFileHelper, 'clearShareDirectory' | 'writeFileForSharing'>
  >;
  let share: jasmine.Spy;
  let uiLog: {
    getLogs: () => unknown[];
    error: jasmine.Spy;
    writeToFile: jasmine.Spy;
    info: jasmine.Spy;
  };
  let flush: jasmine.Spy;

  function setup(answer: 'YES' | 'NO'): void {
    uiAlert = jasmine.createSpyObj('UIAlert', [
      'showConfirmWithYesNoTranslation',
      'copyLogfiles',
      'withLoadingSpinner',
      'isLoadingSpinnerShown',
    ]);
    uiAlert.showConfirmWithYesNoTranslation.and.resolveTo(answer);
    uiAlert.isLoadingSpinnerShown.and.returnValue(false);
    spinnerShown = false;
    uiAlert.copyLogfiles.and.callFake(() => {
      expect(spinnerShown).withContext('spinner over the log text').toBe(false);
      return Promise.resolve();
    });
    uiAlert.withLoadingSpinner.and.callFake(async (_action) => {
      spinnerShown = true;
      try {
        return await _action();
      } finally {
        spinnerShown = false;
      }
    });
    fileHelper = jasmine.createSpyObj('UIFileHelper', [
      'clearShareDirectory',
      'writeFileForSharing',
    ]);
    fileHelper.clearShareDirectory.and.resolveTo();
    fileHelper.writeFileForSharing.and.resolveTo(SHARED_FILE);
    share = spyOn(ShareWeb.prototype, 'share').and.resolveTo({});
    uiLog = {
      getLogs: () => LOGS,
      error: jasmine.createSpy('error'),
      writeToFile: jasmine.createSpy('writeToFile').and.resolveTo(),
      info: jasmine.createSpy('info'),
    };

    TestBed.configureTestingModule({
      providers: [
        ShareService,
        { provide: UIAlert, useValue: uiAlert },
        { provide: UIFileHelper, useValue: fileHelper },
        { provide: UILog, useValue: uiLog },
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

  afterEach(() => jasmine.clock().uninstall());

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
    let getPlatform: jasmine.Spy;
    let writeFile: jasmine.Spy;

    beforeEach(() => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      getPlatform = spyOn(Capacitor, 'getPlatform').and.returnValue('android');
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
      setup('YES');
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
      expect(fileHelper.writeFileForSharing).not.toHaveBeenCalled();
      expect(uiAlert.copyLogfiles).not.toHaveBeenCalled();
    });

    it('shows and announces a loading message from the answer until the share dialog closes', async () => {
      setup('YES');
      uiLog.writeToFile.and.callFake(() => {
        expect(spinnerShown).toBe(true);
        return Promise.resolve();
      });
      share.and.callFake(() => {
        expect(spinnerShown).toBe(true);
        return Promise.resolve({});
      });

      await service.shareLogs();

      expect(uiAlert.withLoadingSpinner).toHaveBeenCalledOnceWith(
        jasmine.any(Function),
        'SHARE_LOGS_PREPARING',
      );
      expect(uiAlert.showConfirmWithYesNoTranslation).toHaveBeenCalledBefore(
        uiAlert.withLoadingSpinner,
      );
      expect(share).toHaveBeenCalledTimes(1);
      expect(spinnerShown).toBe(false);
    });

    it('keeps a loading dialog that offers to share the logs while its step hangs', async () => {
      setup('YES');
      uiAlert.isLoadingSpinnerShown.and.returnValue(true);

      await service.shareLogs();

      expect(uiAlert.withLoadingSpinner).not.toHaveBeenCalled();
      expect(share).toHaveBeenCalledTimes(1);
    });

    it('fetches the native log on iOS before reading the files', async () => {
      setup('YES');
      getPlatform.and.returnValue('ios');
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
      setup('YES');

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
      setup('YES');
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
      setup('YES');
      getPlatform.and.returnValue('ios');
      flush.and.rejectWith(new Error('UNIMPLEMENTED'));

      await service.shareLogs();

      expect(share).toHaveBeenCalledTimes(1);
      expect(share.calls.mostRecent().args[0].files.length).toBe(4);
    });

    it('shares the log in memory when the folder cannot be read', async () => {
      setup('YES');
      readdir.and.rejectWith(new Error('no folder'));

      await service.shareLogs();

      expect(share).toHaveBeenCalledOnceWith({ url: SHARED_FILE.fullpath });
    });

    it('shares the log in memory when there is no log file, else shows it as text', async () => {
      setup('YES');
      readdir.and.resolveTo({ files: [file('other.txt')] });
      fileHelper.writeFileForSharing.and.rejectWith(new Error('disk full'));

      await service.shareLogs();

      expect(fileHelper.writeFileForSharing).toHaveBeenCalledTimes(1);
      expect(uiAlert.copyLogfiles).toHaveBeenCalledTimes(1);
      expect(share).not.toHaveBeenCalled();
    });

    it('shares nothing else when the user cancels the share dialog', async () => {
      setup('YES');
      share.and.rejectWith(new Error('Share canceled'));

      await service.shareLogs();

      expect(share).toHaveBeenCalledTimes(1);
      expect(fileHelper.writeFileForSharing).not.toHaveBeenCalled();
      expect(uiAlert.copyLogfiles).not.toHaveBeenCalled();
    });
  });

  describe('sharing the log in the browser', () => {
    it('asks first and shares nothing when the user cancels', async () => {
      setup('NO');

      await service.shareLogs();

      expect(uiAlert.showConfirmWithYesNoTranslation).toHaveBeenCalledOnceWith(
        'SHARE_LOGS_HINT',
        'SHARE_LOGS_TITLE',
        'SHARE',
        'CANCEL',
        true,
      );
      expect(fileHelper.writeFileForSharing).not.toHaveBeenCalled();
      expect(share).not.toHaveBeenCalled();
      expect(uiAlert.withLoadingSpinner).not.toHaveBeenCalled();
    });

    it('shares the log as a JSON file after the user agreed and keeps the file for the receiving app', async () => {
      setup('YES');
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(1700000000000));

      await service.shareLogs();

      const [dataUrl, name] =
        fileHelper.writeFileForSharing.calls.mostRecent().args;
      expect(name).toBe('Beanconqueror_logs_1700000000000.json');
      expect(dataUrl).toMatch(/^data:application\/json;base64,/);
      expect(JSON.parse(atob(dataUrl.split(',')[1]))).toEqual(LOGS);
      expect(share).toHaveBeenCalledOnceWith({ url: SHARED_FILE.fullpath });
      expect(fileHelper.clearShareDirectory).toHaveBeenCalledBefore(
        fileHelper.writeFileForSharing,
      );
      expect(fileHelper.clearShareDirectory).toHaveBeenCalledTimes(1);
    });

    it('shows the log as text when it cannot be turned into a file', async () => {
      setup('YES');
      spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function (
        this: FileReader,
      ) {
        this.onerror(new ProgressEvent('error') as ProgressEvent<FileReader>);
      });

      await service.shareLogs();

      expect(uiAlert.copyLogfiles).toHaveBeenCalledTimes(1);
      expect(share).not.toHaveBeenCalled();
    });

    it('shows the log as text when the file cannot be written', async () => {
      setup('YES');
      fileHelper.writeFileForSharing.and.rejectWith(new Error('disk full'));

      await service.shareLogs();

      expect(uiAlert.copyLogfiles).toHaveBeenCalledTimes(1);
      expect(share).not.toHaveBeenCalled();
    });

    it('does not show the log as text when the user cancels the share dialog', async () => {
      setup('YES');
      share.and.rejectWith(new Error('Share canceled'));

      await service.shareLogs();

      expect(uiAlert.copyLogfiles).not.toHaveBeenCalled();
      expect(uiLog.error).not.toHaveBeenCalled();
    });
  });

  describe('sharing a file', () => {
    it('names each file uniquely after its kind and time', async () => {
      setup('YES');
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(1700000000000));

      await service.shareFile('', 'data:image/jpeg;base64,AAEC');
      jasmine.clock().tick(1);
      await service.shareFile('', 'data:image/png;base64,AAEC');

      expect(
        fileHelper.writeFileForSharing.calls.allArgs().map(([, name]) => name),
      ).toEqual([
        'Beanconqueror_1700000000000.jpg',
        'Beanconqueror_1700000000001.png',
      ]);
    });

    it('keeps the file when the share dialog is cancelled, so it counts as shared', async () => {
      setup('YES');
      share.and.rejectWith(new Error('Share canceled'));

      expect(
        await service.shareFile(
          'Beanconqueror_logs',
          'data:application/json;base64,e30=',
        ),
      ).toBeTrue();
      expect(fileHelper.clearShareDirectory).toHaveBeenCalledTimes(1);
    });

    it('logs a failed write without the content of the file', async () => {
      setup('YES');
      const failure = new Error('disk full');
      fileHelper.writeFileForSharing.and.rejectWith(failure);
      const dataUrl = 'data:application/json;base64,c2VjcmV0';

      expect(
        await service.shareFile('Beanconqueror_logs', dataUrl),
      ).toBeFalse();
      expect(uiLog.error).toHaveBeenCalledOnceWith(
        'Share - could not write the file',
        failure,
      );
      expect(share).not.toHaveBeenCalled();
    });
  });

  describe('sharing a stored file', () => {
    const URI = 'file:///data/pre-import/backup.zip';

    it('opens the share dialog for the file', async () => {
      setup('YES');

      expect(await service.shareStoredFile(URI)).toBeTrue();

      expect(share).toHaveBeenCalledOnceWith({ url: URI });
      expect(uiLog.error).not.toHaveBeenCalled();
    });

    it('counts a closed dialog as shared and logs nothing', async () => {
      setup('YES');
      share.and.rejectWith(new Error('Share canceled'));

      expect(await service.shareStoredFile(URI)).toBeTrue();

      expect(uiLog.error).not.toHaveBeenCalled();
    });

    it('resolves false and logs when the file could not be shared', async () => {
      setup('YES');
      share.and.rejectWith(new Error('Unsupported url'));

      expect(await service.shareStoredFile(URI)).toBeFalse();

      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('sharing an element as a picture', () => {
    let element: HTMLElement;

    beforeEach(() => {
      setup('YES');
      element = document.createElement('div');
      element.style.cssText =
        'width: 100px; height: 125px; background: #825634';
      document.body.appendChild(element);
    });

    afterEach(() => element.remove());

    it('draws it at the width asked for and shares it as a PNG', async () => {
      expect(await service.shareElementAsImage(element, 1080)).toBeTrue();

      const [dataUrl, name] =
        fileHelper.writeFileForSharing.calls.mostRecent().args;
      expect(name).toMatch(/^Beanconqueror_\d+\.png$/);
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      expect([image.width, image.height]).toEqual([1080, 1350]);
      expect(uiLog.info).toHaveBeenCalledOnceWith(
        jasmine.stringMatching(/^Share - image drawn in \d+ ms, \d+ KB$/),
      );
    });

    it('logs and reports an element it cannot draw, and shares nothing', async () => {
      const broken = { offsetWidth: 100 } as HTMLElement;

      expect(await service.shareElementAsImage(broken, 1080)).toBeFalse();

      expect(uiLog.error).toHaveBeenCalledOnceWith(
        'Share - could not draw the image',
        jasmine.anything(),
      );
      expect(fileHelper.writeFileForSharing).not.toHaveBeenCalled();
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
