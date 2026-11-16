import { inject, Service } from '@angular/core';

import { App } from '@capacitor/app';

import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../queueService/queue-service.service';
import { UILog } from '../uiLog';

const DELAY_AFTER_LAST_CHANGE_MS = 3000;

/**
 * Writes the automatic backups a few seconds after the stored data last
 * changed. Only one run writes at a time: changes that come while it writes
 * lead to exactly one more run after it.
 */
@Service()
export class AutomaticBackupService {
  private readonly eventQueue = inject(EventQueueService);
  private readonly uiLog = inject(UILog);

  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private runAgain = false;

  /**
   * `_save` resolves or rejects once nothing is written anymore.
   */
  public start(_platformName: string, _save: () => Promise<unknown>): void {
    const saveNow = () => {
      clearTimeout(this.timer);
      this.timer = undefined;
      void this.run(_platformName, _save);
    };
    this.eventQueue.on(AppEventType.STORAGE_CHANGED).subscribe(() => {
      clearTimeout(this.timer);
      this.timer = setTimeout(saveNow, DELAY_AFTER_LAST_CHANGE_MS);
    });
    // The timer may never fire once the app is in the background.
    void App.addListener('pause', () => {
      if (this.timer !== undefined) {
        saveNow();
      }
    });
  }

  private async run(
    _platformName: string,
    _save: () => Promise<unknown>,
  ): Promise<void> {
    if (this.running) {
      this.runAgain = true;
      return;
    }
    this.running = true;
    try {
      do {
        this.runAgain = false;
        this.uiLog.log(_platformName + ' - Start to export ZIP file');
        try {
          await _save();
        } catch (ex) {
          this.uiLog.error('Automatic backup failed', ex);
        }
      } while (this.runAgain);
    } finally {
      this.running = false;
    }
  }
}
