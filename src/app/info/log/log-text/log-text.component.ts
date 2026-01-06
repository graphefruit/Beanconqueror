import { Component, OnInit } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { UILog } from '../../../../services/uiLog';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'log-text',
  templateUrl: './log-text.component.html',
  styleUrls: ['./log-text.component.scss'],
  imports: [IonicModule, FormsModule, TranslatePipe],
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
