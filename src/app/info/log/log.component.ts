import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonCol,
  IonContent,
  IonHeader,
  IonRow,
  IonText,
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

@Component({
  selector: 'log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    IonRow,
    IonCol,
    IonText,
    HeaderComponent,
    HeaderButtonComponent,
  ],
})
export class LogComponent implements OnInit {
  private readonly uiLog = inject(UILog);
  private shareService = inject(ShareService);

  public logs: LogEntry[] = [];
  public LogLevel = LogLevel;

  constructor() {
    addIcons({ sendOutline });
  }

  public ngOnInit(): void {
    this.logs = this.uiLog.getLogs();
    void this.uiLog.loadEarlier().then(() => {
      this.logs = this.uiLog.getLogs();
    });
  }

  public levelToColor(level: LogLevel): string {
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

  public formatLogEntry(log: LogEntry): string {
    let formattedMessage = `${log.timestamp} - ${log.message}`;
    if (log.params.length > 0) {
      // Use safe-stable-stringify to prevent bad surprises with circular references
      const serializedParams = stringify(log.params);
      formattedMessage += ` - ${serializedParams}`;
    }
    return formattedMessage;
  }

  public async send(): Promise<void> {
    await this.shareService.shareLogs();
  }
}
