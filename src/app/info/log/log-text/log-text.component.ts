import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UILog } from '../../../../services/uiLog';

@Component({
  selector: 'log-text',
  templateUrl: './log-text.component.html',
  styleUrls: ['./log-text.component.scss'],
  standalone: false,
})
export class LogTextComponent implements OnInit {
  public logString: string = '';

  constructor(
    private readonly modalController: ModalController,
    private readonly uiLog: UILog,
  ) {}

  public ngOnInit() {
    this.logString = JSON.stringify(this.uiLog.getLogs());
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true,
    });
  }
}
