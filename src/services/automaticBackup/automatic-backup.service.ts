import { inject, Service } from '@angular/core';

import { App } from '@capacitor/app';

import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../queueService/queue-service.service';
import { UILog } from '../uiLog';

const DELAY_AFTER_LAST_CHANGE_MS = 3000;
const RUN_TIME_LIMIT_MS = 5 * 60 * 1000;

/**
 * Writes the automatic backups a few seconds after the stored data last
 * changed. Only one run writes at a time: changes that come while it writes
 * lead to exactly one more run after it. A run that is not done after five
 * minutes no longer holds the next one back: a write that never ends, as
 * after the database connection was lost, would otherwise stop the automatic
 * backups until the app is started again.
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
        let timeLimit: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            _save(),
            new Promise((_resolve, _reject) => {
              timeLimit = setTimeout(
                () => _reject(new Error('Not done within the time limit')),
                RUN_TIME_LIMIT_MS,
              );
            }),
          ]);
        } catch (ex) {
          this.uiLog.error('Automatic backup failed', ex);
        } finally {
          clearTimeout(timeLimit);
        }
      } while (this.runAgain);
    } finally {
      this.running = false;
    }
  }
}
