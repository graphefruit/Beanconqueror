import { TestBed } from '@angular/core/testing';

// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { ShareWeb } from '@capacitor/share/dist/esm/web';
import { TranslateService } from '@ngx-translate/core';

import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { ShareService } from './share-service.service';

const LOGS = [{ level: 'INFO', message: 'Started', params: [] }];
const SHARED_FILE = {
  path: 'share/Beanconqueror_logs_1700000000000.json',
  fullpath: 'file:///cache/share/Beanconqueror_logs_1700000000000.json',
};

describe('ShareService', () => {
  let service: ShareService;
  let uiAlert: jasmine.SpyObj<
    Pick<UIAlert, 'showConfirmWithYesNoTranslation' | 'copyLogfiles'>
  >;
  let fileHelper: jasmine.SpyObj<
    Pick<UIFileHelper, 'clearShareDirectory' | 'writeFileForSharing'>
  >;
  let share: jasmine.Spy;
  let uiLog: {
    getLogs: () => unknown[];
    error: jasmine.Spy;
    info: jasmine.Spy;
  };

  function setup(answer: 'YES' | 'NO'): void {
    uiAlert = jasmine.createSpyObj('UIAlert', [
      'showConfirmWithYesNoTranslation',
      'copyLogfiles',
    ]);
    uiAlert.showConfirmWithYesNoTranslation.and.resolveTo(answer);
    uiAlert.copyLogfiles.and.resolveTo();
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
      ],
    });
    service = TestBed.inject(ShareService);
  }

  afterEach(() => jasmine.clock().uninstall());

  describe('sharing the log', () => {
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
