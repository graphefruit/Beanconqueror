import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';

import {
  IonButton,
  IonContent,
  IonFooter,
  IonSpinner,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../../services/queueService/queue-service.service';
import { ShareService } from '../../services/shareService/share-service.service';

@Component({
  selector: 'loading-popover',
  templateUrl: './loading-popover.component.html',
  styleUrls: ['./loading-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslatePipe, IonContent, IonSpinner, IonFooter, IonButton],
})
export class LoadingPopoverComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private shareService = inject(ShareService);
  private eventQueue = inject(EventQueueService);

  public __showDismissButton: boolean = false;
  @Input('showDismissAfterSpecificTimeout')
  public showDismissAfterSpecificTimeout: boolean;

  @Input('dismissTimeoutInMilliseconds')
  public dismissTimeoutInMilliseconds: number = 10000;

  @Input('showLogs')
  public showLogs: boolean = true;

  @Input('message') public message: string;
  private timeoutFunc = null;

  private updatingLoadingSpinnerMessageSubscription: Subscription = undefined;

  public ngOnInit() {
    if (this.showDismissAfterSpecificTimeout) {
      this.timeoutFunc = setTimeout(() => {
        this.showDismissButton();
      }, this.dismissTimeoutInMilliseconds);
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
    await this.shareService.shareLogs();
  }
  public showDismissButton() {
    this.__showDismissButton = true;
  }
}
