import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { LogLevel } from '../../../../enums/logs/log-level';
import { LogEntry } from '../../../../interfaces/log/log-entry';
import { ShareService } from '../../../../services/shareService/share-service.service';
import { UILog } from '../../../../services/uiLog';
import { LogTextComponent } from '../log-text/log-text.component';
import { LogComponent } from '../log.component';

function entry(_message: string): LogEntry {
  return {
    level: LogLevel.LOG,
    message: _message,
    timestamp: '01.01.2026 10:00:00:000',
    params: [],
  };
}

/** A log whose earlier sessions arrive once loadEarlier() resolves. */
function fakeLog(): Pick<UILog, 'getLogs' | 'loadEarlier'> {
  const logs = [entry('Now')];
  return {
    getLogs: () => logs,
    loadEarlier: () => {
      logs.unshift(entry('Yesterday'));
      return Promise.resolve();
    },
  };
}

function settled(): Promise<void> {
  return new Promise((_resolve) => setTimeout(_resolve));
}

describe('Opening the log', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LogComponent,
        LogTextComponent,
        { provide: UILog, useValue: fakeLog() },
        { provide: ShareService, useValue: {} },
        { provide: ModalController, useValue: {} },
      ],
    });
  });

  it('shows the entries of earlier sessions on the log page', async () => {
    const component = TestBed.inject(LogComponent);

    component.ngOnInit();
    await settled();

    expect(component.logs.map((_entry) => _entry.message)).toEqual([
      'Yesterday',
      'Now',
    ]);
  });

  it('shows the entries of earlier sessions in the log text', async () => {
    const component = TestBed.inject(LogTextComponent);

    component.ngOnInit();
    await settled();

    expect(
      (JSON.parse(component.logString) as LogEntry[]).map(
        (_entry) => _entry.message,
      ),
    ).toEqual(['Yesterday', 'Now']);
  });

  it('shows the current session in the log text while earlier ones load', () => {
    const component = TestBed.inject(LogTextComponent);

    component.ngOnInit();

    expect(
      (JSON.parse(component.logString) as LogEntry[]).map(
        (_entry) => _entry.message,
      ),
    ).toEqual(['Now']);
  });
});
