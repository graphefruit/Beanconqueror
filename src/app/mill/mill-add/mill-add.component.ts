import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCheckbox,
  IonCol,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonRow,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { Mill } from '../../../classes/mill/mill';
import { storedOrReported } from '../../../classes/storedOrReported';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import TrackContentImpression from '../../../data/tracking/trackContentImpression/trackContentImpression';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { RequiredFields } from '../../../services/a11y/required-fields.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'mill-add',
  templateUrl: './mill-add.component.html',
  styleUrls: ['./mill-add.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonItem,
    IonInput,
    IonCheckbox,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class MillAddComponent implements OnInit {
  private readonly requiredFields = inject(RequiredFields);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modalController = inject(ModalController);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
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
    } else {
      this.requiredFields.report(this.host);
    }
  }

  public async __addMill() {
    if (
      !(await storedOrReported(this.uiAlert, () =>
        this.uiMillStorage.addAndConfirm(this.data),
      ))
    ) {
      return;
    }
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
  public ngOnInit() {
    this.data.has_adjustable_speed = false;
    this.data.has_timer = false;
  }
}
