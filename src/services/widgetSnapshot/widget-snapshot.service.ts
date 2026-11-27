import { inject, Service } from '@angular/core';

import { App } from '@capacitor/app';

import { AppEventType } from '../../enums/appEvent/appEvent';
import { Widget } from '../../native/widget-plugin';
import { buildWidgetSnapshot } from '../../stores/brews/widget-snapshot';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UILog } from '../uiLog';

const DELAY_AFTER_LAST_CHANGE_MS = 3000;

/**
 * Hands the home screen widgets a new snapshot a few seconds after the stored
 * data last changed, so that a series of saves, as an import, leads to one
 * snapshot. Only after a save: a snapshot from data that was just read could
 * be one of a database the system has lost.
 */
@Service()
export class WidgetSnapshotService {
  private readonly eventQueue = inject(EventQueueService);
  private readonly brewStorage = inject(UIBrewStorage);
  private readonly beanStorage = inject(UIBeanStorage);
  private readonly uiLog = inject(UILog);
  private readonly widget = Widget;

  private timer: ReturnType<typeof setTimeout> | undefined;
  private written: string | undefined;

  public start(): void {
    const writeNow = () => {
      clearTimeout(this.timer);
      this.timer = undefined;
      void this.write();
    };
    this.eventQueue.on(AppEventType.STORAGE_CHANGED).subscribe(() => {
      clearTimeout(this.timer);
      this.timer = setTimeout(writeNow, DELAY_AFTER_LAST_CHANGE_MS);
    });
    // The timer may never fire once the app is in the background.
    const writeIfWaiting = () => {
      if (this.timer !== undefined) {
        writeNow();
      }
    };
    void App.addListener('pause', writeIfWaiting);
    void App.addListener('appStateChange', (_state) => {
      if (!_state.isActive) {
        writeIfWaiting();
      }
    });
  }

  private async write(): Promise<void> {
    try {
      // While a collection is read again, as after an import, this waits;
      // one that could not be read gives no snapshot, the last one stays.
      await Promise.all([
        this.brewStorage.storageReady(),
        this.beanStorage.storageReady(),
      ]);
    } catch {
      this.uiLog.log('Widget snapshot skipped: data not read');
      return;
    }
    const snapshot = JSON.stringify(
      buildWidgetSnapshot(
        this.brewStorage.getRawEntries(),
        this.beanStorage.getRawEntries(),
        Date.now(),
      ),
    );
    if (snapshot === this.written) {
      return;
    }
    try {
      await this.widget.setSnapshot({ snapshot });
      await this.widget.reload();
      this.written = snapshot;
    } catch (ex) {
      this.uiLog.error('Widget snapshot not written', ex?.message);
    }
  }
}
