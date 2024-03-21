import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { LogTextComponent } from '../../app/info/log/log-text/log-text.component';
import { UILog } from '../../services/uiLog';
import { ShareService } from '../../services/shareService/share-service.service';

@Component({
  selector: 'loading-popover',
  templateUrl: './loading-popover.component.html',
  styleUrls: ['./loading-popover.component.scss'],
})
export class LoadingPopoverComponent implements OnInit {
  public __showDismissButton: boolean = false;
  @Input('showDismissAfterSpecificTimeout')
  public showDismissAfterSpecificTimeout: boolean;
  @Input('message') public message: string;
  private timeoutFunc = null;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiLog: UILog,
    private shareService: ShareService
  ) {}

  public ngOnInit() {
    if (this.showDismissAfterSpecificTimeout) {
      this.timeoutFunc = setTimeout(() => {
        this.showDismissButton();
      }, 10000);
    }
  }
  public ngOnDestroy() {
    if (this.timeoutFunc) {
      clearTimeout(this.timeoutFunc);
    }
  }

  public ok() {
    this.modalController.dismiss({
      dismissed: true,
    });
  }

  public async sendLogs() {
    const logs = this.uiLog.getLogs();
    const stringifiedJSON = JSON.stringify(logs);
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
      const modal = await this.modalController.create({
        component: LogTextComponent,
      });
      await modal.present();
      await modal.onWillDismiss();
    };
  }
  public showDismissButton() {
    this.__showDismissButton = true;
  }
}
