import { Component, Input, OnInit, inject } from '@angular/core';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { Mill } from '../../../classes/mill/mill';
import { ModalController } from '@ionic/angular/standalone';
import { UIToast } from '../../../services/uiToast';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import TrackContentImpression from '../../../data/tracking/trackContentImpression/trackContentImpression';
import { FormsModule } from '@angular/forms';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonItem,
  IonInput,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';

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
