import {Component, OnInit} from '@angular/core';
import {UILog} from '../../../services/uiLog';
import {ILogInterface} from '../../../interfaces/log/iLog';

import {LOGS_ENUM} from '../../../enums/logs/logs';
import {ModalController} from '@ionic/angular';
import {LogTextComponent} from './log-text/log-text.component';

@Component({
  selector: 'log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
})
export class LogComponent implements OnInit {

  public logs: Array<ILogInterface> = [];
  public LOG_ENUM = LOGS_ENUM;

  constructor(private readonly uiLog: UILog, private readonly modalCtrl: ModalController) {
  }

  public ngOnInit() {
    this.logs = this.uiLog.getLogs();
  }

  public async send(): Promise<any> {
    const modal = await this.modalCtrl.create({component: LogTextComponent});
    await modal.present();
    await modal.onWillDismiss();
  }


}
