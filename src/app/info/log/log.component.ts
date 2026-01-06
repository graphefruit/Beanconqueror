import { Component, OnInit } from '@angular/core';
import { UILog } from '../../../services/uiLog';
import { ILogInterface } from '../../../interfaces/log/iLog';

import { LOGS_ENUM } from '../../../enums/logs/logs';
import { ModalController, IonicModule } from '@ionic/angular';
import { LogTextComponent } from './log-text/log-text.component';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class LogComponent implements OnInit {
  public logs: Array<ILogInterface> = [];
  public LOG_ENUM = LOGS_ENUM;

  constructor(
    private readonly uiLog: UILog,
    private readonly modalCtrl: ModalController,
    private shareService: ShareService,
    private readonly uiHelper: UIHelper,
  ) {}

  public ngOnInit() {
    this.logs = this.uiLog.getLogs();
  }

  public async send(): Promise<any> {
    const stringifiedJSON = JSON.stringify(this.logs);
    const blob = new Blob([stringifiedJSON], {
      type: 'application/json',
    });
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      this.shareService.shareFile('Beanconqueror_logs', base64data);
    };
    reader.onerror = async () => {
      const modal = await this.modalCtrl.create({
        component: LogTextComponent,
      });
      await modal.present();
      await modal.onWillDismiss();
    };
  }
}
