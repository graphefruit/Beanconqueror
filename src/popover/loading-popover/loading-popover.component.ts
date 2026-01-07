import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { LogTextComponent } from '../../app/info/log/log-text/log-text.component';
import { UILog } from '../../services/uiLog';
import { ShareService } from '../../services/shareService/share-service.service';
import { EventQueueService } from '../../services/queueService/queue-service.service';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonContent,
  IonSpinner,
  IonFooter,
  IonButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'loading-popover',
  templateUrl: './loading-popover.component.html',
  styleUrls: ['./loading-popover.component.scss'],
  imports: [TranslatePipe, IonContent, IonSpinner, IonFooter, IonButton],
})
export class LoadingPopoverComponent implements OnInit {
  public __showDismissButton: boolean = false;
  @Input('showDismissAfterSpecificTimeout')
  public showDismissAfterSpecificTimeout: boolean;
  @Input('message') public message: string;
  private timeoutFunc = null;

  private updatingLoadingSpinnerMessageSubscription: Subscription = undefined;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiLog: UILog,
    private shareService: ShareService,
    private eventQueue: EventQueueService,
  ) {}

  public ngOnInit() {
    if (this.showDismissAfterSpecificTimeout) {
      this.timeoutFunc = setTimeout(() => {
        this.showDismissButton();
      }, 10000);
    }
    const eventSubs = this.eventQueue.on(
      AppEventType.UPDATE_LOADING_SPINNER_MESSAGE,
    );
    this.updatingLoadingSpinnerMessageSubscription = eventSubs.subscribe(
      (event) => {
        this.message = event.payload;
      },
    );
  }
  public deattachTouUdatingLoadingSpinnerMessageSubscription() {
    if (this.updatingLoadingSpinnerMessageSubscription) {
      this.updatingLoadingSpinnerMessageSubscription.unsubscribe();
      this.updatingLoadingSpinnerMessageSubscription = undefined;
    }
  }
  public ngOnDestroy() {
    this.deattachTouUdatingLoadingSpinnerMessageSubscription();
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
