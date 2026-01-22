import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCol,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Mill } from '../../../classes/mill/mill';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import TrackContentImpression from '../../../data/tracking/trackContentImpression/trackContentImpression';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'mill-add',
  templateUrl: './mill-add.component.html',
  styleUrls: ['./mill-add.component.scss'],
  imports: [
    FormsModule,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonItem,
    IonInput,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class MillAddComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'mill-add';

  public data: Mill = new Mill();
  @Input() private hide_toast_message: boolean;

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(MILL_TRACKING.TITLE, MILL_TRACKING.ACTIONS.ADD);
  }
  public async addMill() {
    if (this.data.name) {
      await this.__addMill();
    }
  }

  public async __addMill() {
    await this.uiMillStorage.add(this.data);
    this.uiAnalytics.trackContentImpression(
      TrackContentImpression.STATISTICS_GRINDER_NAME,
      this.data.name,
    );
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.ADD_FINISH,
      this.data.name,
    );
    this.dismiss();
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_MILL_ADDED_SUCCESSFULLY');
    }
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      MillAddComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
