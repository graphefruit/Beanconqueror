import { Component, inject, Input, OnInit } from '@angular/core';

import {
  IonButton,
  IonContent,
  IonFooter,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import stringify from 'safe-stable-stringify';

import { LogTextComponent } from '../../app/info/log/log-text/log-text.component';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../../services/queueService/queue-service.service';
import { ShareService } from '../../services/shareService/share-service.service';
import { UILog } from '../../services/uiLog';

@Component({
  selector: 'loading-popover',
  templateUrl: './loading-popover.component.html',
  styleUrls: ['./loading-popover.component.scss'],
  imports: [TranslatePipe, IonContent, IonSpinner, IonFooter, IonButton],
})
export class LoadingPopoverComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiLog = inject(UILog);
  private shareService = inject(ShareService);
  private eventQueue = inject(EventQueueService);

  public __showDismissButton: boolean = false;
  @Input('showDismissAfterSpecificTimeout')
  public showDismissAfterSpecificTimeout: boolean;
  @Input('message') public message: string;
  private timeoutFunc = null;

  private updatingLoadingSpinnerMessageSubscription: Subscription = undefined;

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
    // Use safe-stable-stringify to prevent bad surprises with circular references
    const stringifiedJSON = stringify(logs);
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
