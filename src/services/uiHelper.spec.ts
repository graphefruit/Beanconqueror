import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { Platform } from '@ionic/angular';

import { Settings } from '../classes/settings/settings';
import { UIAlert } from './uiAlert';
import { UIFileHelper } from './uiFileHelper';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIToast } from './uiToast';

class MockPlatform {
  ready() {
    return Promise.resolve('READY');
  }
}

class MockDomSanitizer {}

class MockUIFileHelper {
  exportFileToDefaultDirectory() {
    return Promise.resolve();
  }
}

class MockUILog {
  log() {}
  error() {}
}

class MockUIAlert {
  showMessage(msg: string, title?: string) {}
}

class MockUIToast {
  showInfoToastBottom() {}
}

class MockUISettingsStorage {
  getSettings() {
    const s = new Settings();
    s.date_format = 'YYYY-MM-DD';
    return s;
  }
}

describe('UIHelper', () => {
  let service: UIHelper;
  let mockAlert: MockUIAlert;
  let mockToast: MockUIToast;
  let mockLog: MockUILog;

  beforeEach(() => {
    mockAlert = new MockUIAlert();
    mockToast = new MockUIToast();
    mockLog = new MockUILog();

    TestBed.configureTestingModule({
      providers: [
        UIHelper,
        { provide: Platform, useClass: MockPlatform },
        { provide: DomSanitizer, useClass: MockDomSanitizer },
        { provide: UIFileHelper, useClass: MockUIFileHelper },
        { provide: UILog, useValue: mockLog },
        { provide: UIAlert, useValue: mockAlert },
        { provide: UIToast, useValue: mockToast },
      ],
    });
    service = TestBed.inject(UIHelper);

    // Mock UISettingsStorage since it uses a singleton pattern
    spyOn(UISettingsStorage, 'getInstance').and.returnValue(
      new MockUISettingsStorage() as any,
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Core Functionality', () => {
    it('generateUUID should return a valid string', () => {
      const uuid = UIHelper.generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBeGreaterThan(10);
    });

    it('generateShortUUID should return a 6 chars string', () => {
      const uuid = service.generateShortUUID();
      expect(uuid.length).toBe(6);
    });

    it('setActualAppState and isActualAppStateActive', () => {
      service.setActualAppState(false);
      expect(service.isActualAppStateActive()).toBeFalse();
      service.setActualAppState(true);
      expect(service.isActualAppStateActive()).toBeTrue();
    });

    it('jsonToArray should return Uint8Array', () => {
      const result = UIHelper.jsonToArray({ test: 123 });
      expect(result instanceof Uint8Array).toBeTrue();
    });

    it('getUnixTimestamp (static and instance) should return number', () => {
      expect(typeof UIHelper.getUnixTimestamp()).toBe('number');
      expect(typeof service.getUnixTimestamp()).toBe('number');
    });

    it('cloneData should deep clone object', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = service.cloneData(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('copyData should shallow copy object or array', () => {
      const obj = { a: 1 };
      const copyObj = service.copyData(obj);
      expect(copyObj).toEqual(obj);
      expect(copyObj).not.toBe(obj);

      const arr = [1, 2, 3];
      const copyArr = service.copyData(arr);
      expect(copyArr).toEqual(arr);
      expect(copyArr).not.toBe(arr);

      expect(service.copyData(undefined)).toBeUndefined();
    });

    it('showAlert should call uiAlert.showMessage', () => {
      spyOn(mockAlert, 'showMessage');
      service.showAlert('Msg', 'Title');
      expect(mockAlert.showMessage).toHaveBeenCalledWith('Msg', 'Title');
    });
  });

  describe('Time and Date formatting', () => {
    it('isToday should return true for current time', () => {
      const now = service.getUnixTimestamp();
      expect(service.isToday(now)).toBeTrue();
    });

    it('formateDatestr should format string dates', () => {
      const result = service.formateDatestr('2026-03-05', 'YYYY-MM-DD');
      expect(result).toBe('2026-03-05');
    });

    it('formateDatestr with default format', () => {
      const result = service.formateDatestr('2026-03-05');
      // mock returns date_format = 'YYYY-MM-DD', default falls back to ', HH:mm:ss'
      expect(result).toContain('2026-03-05');
    });

    it('formatTimeNumber should format number dates', () => {
      const result = service.formatTimeNumber(
        new Date('2026-03-05').getTime(),
        'YYYY',
      );
      expect(result).toBe('2026');
    });

    it('formateDate should format unix dates', () => {
      const now = service.getUnixTimestamp();
      const result = service.formateDate(now, 'YYYY');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formatSeconds should return formatted string or 0 on error', () => {
      expect(service.formatSeconds(120, 'mm:ss')).toBe('02:00');
      expect(service.formatSeconds(undefined, null)).toBe(0);
    });

    it('formatSecondsAndMilliseconds should return correctly', () => {
      expect(service.formatSecondsAndMilliseconds(5, 500, 'ss.SSS')).toBe(
        '05.500',
      );
      expect(
        service.formatSecondsAndMilliseconds(undefined, undefined, null),
      ).toBe(0);
    });

    it('getActualTimeWithMilliseconds returns something', () => {
      expect(service.getActualTimeWithMilliseconds().length).toBeGreaterThan(0);
    });

    it('timeDifference should calculate distances', () => {
      const secondsAgo = service.getUnixTimestamp() - 3600; // 1 hour ago
      const diff = service.timeDifference(secondsAgo);
      expect(diff.HOURS).toBe(1);
      expect(diff.MINUTES).toBe(60);
      expect(diff.SECONDS).toBeCloseTo(3600, -1);
    });
  });

  describe('Encoding & Utilities', () => {
    it('toFixedIfNecessary should limit decimals or return 0', () => {
      expect(service.toFixedIfNecessary('5.1234', 2)).toBe(5.12);
      expect(service.toFixedIfNecessary('invalid', 2)).toBe(0);
    });

    it('encode and decode strings properly', () => {
      const array = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
      const encoded = service.encode(array);
      const decoded = service.decode(encoded);
      expect(encoded).toBe('aGVsbG8='); // base64 of "hello"
      expect(decoded.length).toBe(5);
      expect(decoded[0]).toBe(104);
    });

    it('convertToNumber', () => {
      expect(service.convertToNumber('')).toBe('' as any);
      expect(service.convertToNumber('5,5')).toBe(5.5);
      expect(service.convertToNumber('5.5')).toBe(5.5);
    });
  });

  describe('Hardware / Native', () => {
    it('attachOnPlatformReady should resolve', async () => {
      const status = await service.attachOnPlatformReady();
      expect(status).toBe('READY');
    });

    it('isBeanconqurorAppReady should resolve immediately if loaded', fakeAsync(() => {
      service.setAppReady(1);
      let isReady = false;
      service.isBeanconqurorAppReady().then(() => (isReady = true));
      tick();
      expect(isReady).toBeTrue();
    }));

    it('isBeanconqurorAppReady should poll if not loaded', fakeAsync(() => {
      service.setAppReady(-1);
      let isReady = false;

      service.isBeanconqurorAppReady().then(() => (isReady = true));
      tick(100);
      expect(isReady).toBeFalse();

      service.setAppReady(2);
      tick(100);
      expect(isReady).toBeTrue();

      discardPeriodicTasks();
    }));
  });

  describe('Exception safety', () => {
    it('deviceKeepAwake and allowSleepAgain do not crash', () => {
      expect(() => {
        service.deviceKeepAwake();
        service.deviceAllowSleepAgain();
      }).not.toThrow();
    });
  });
});
