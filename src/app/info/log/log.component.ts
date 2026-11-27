import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import {
  IonBackButton,
  IonButton,
  IonCard,
  IonContent,
  IonHeader,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { sendOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';
import { stringify } from 'safe-stable-stringify';

import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { LogLevel } from '../../../enums/logs/log-level';
import { LogEntry } from '../../../interfaces/log/log-entry';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UILog } from '../../../services/uiLog';

/** Entries shown at once; the full log goes out through "Send logs". */
export const LOG_PAGE_SIZE = 100;

interface LogLine {
  text: string;
  color: string;
}

function formatLogEntry(log: LogEntry): string {
  let formattedMessage = `${log.timestamp} - ${log.level} - ${log.message}`;
  if (log.params.length > 0) {
    // Use safe-stable-stringify to prevent bad surprises with circular references
    formattedMessage += ` - ${stringify(log.params)}`;
  }
  return formattedMessage;
}

function levelToColor(level: LogLevel): string {
  switch (level) {
    case LogLevel.LOG:
      return 'dark';
    case LogLevel.ERR:
      return 'danger';
    case LogLevel.WARN:
      return 'warning';
    case LogLevel.INFO:
    default:
      return 'primary';
  }
}

/**
 * Shows the newest entries first, a page at a time. All 3000 entries at once
 * left VoiceOver on iOS without anything to read or tap on this page.
 */
@Component({
  selector: 'log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    IonButton,
    HeaderComponent,
    HeaderButtonComponent,
  ],
})
export class LogComponent implements OnInit {
  private readonly uiLog = inject(UILog);
  private readonly shareService = inject(ShareService);

  private readonly entries = signal<LogEntry[]>([]);
  private readonly shown = signal(LOG_PAGE_SIZE);

  public readonly lines = computed<LogLine[]>(() =>
    this.entries()
      .slice(-this.shown())
      .reverse()
      .map((_log) => ({
        text: formatLogEntry(_log),
        color: `var(--ion-color-${levelToColor(_log.level)})`,
      })),
  );
  public readonly hasEarlier = computed(
    () => this.entries().length > this.shown(),
  );

  constructor() {
    addIcons({ sendOutline });
  }

  public ngOnInit(): void {
    this.entries.set([...this.uiLog.getLogs()]);
    void this.uiLog.loadEarlier().then(() => {
      this.entries.set([...this.uiLog.getLogs()]);
    });
  }

  public showEarlier(): void {
    this.shown.update((_count) => _count + LOG_PAGE_SIZE);
  }

  public async send(): Promise<void> {
    await this.shareService.shareLogs();
  }
}
