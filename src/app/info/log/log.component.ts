import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonCol,
  IonContent,
  IonHeader,
  IonRow,
  IonText,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { LOGS_ENUM } from '../../../enums/logs/logs';
import { ILogInterface } from '../../../interfaces/log/iLog';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { LogTextComponent } from './log-text/log-text.component';

@Component({
  selector: 'log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
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
  private readonly modalCtrl = inject(ModalController);
  private shareService = inject(ShareService);
  private readonly uiHelper = inject(UIHelper);

  public logs: Array<ILogInterface> = [];
  public LOG_ENUM = LOGS_ENUM;

  constructor() {
    addIcons({ sendOutline });
  }

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
