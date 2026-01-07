import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';
import { ModalController } from '@ionic/angular/standalone';

import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { NgForm } from '@angular/forms';
import { PreparationAddTypeComponent } from '../preparation-add-type/preparation-add-type.component';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '@ngx-translate/core';
import { KeysPipe } from '../../../pipes/keys';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'preparation-add',
  templateUrl: './preparation-add.component.html',
  styleUrls: ['./preparation-add.component.scss'],
  imports: [
    TranslatePipe,
    KeysPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
  ],
})
export class PreparationAddComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-add';
  public data: Preparation = new Preparation();

  public preparation_types_enum = PREPARATION_TYPES;

  public ENVIRONMENT = environment;

  @ViewChild('addPreparationForm', { static: false })
  public preparationForm: NgForm;

  @Input() private hide_toast_message: boolean;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.ADD,
    );
  }

  public individualPreparationVisible(_key) {
    if (_key === 'SANREMO_YOU') {
      if (this.ENVIRONMENT.FEATURES_ACTIVE.SANREMO_YOU === true) {
        return true;
      }
      return false;
    }
    return true;
  }

  public async choosePreparation(_prepType: PREPARATION_TYPES) {
    //Animated false, else backdrop would sometimes not disappear and stay until user touches again.
    const modal = await this.modalController.create({
      component: PreparationAddTypeComponent,
      cssClass: 'popover-actions',
      animated: true,
      id: PreparationAddTypeComponent.COMPONENT_ID,
      componentProps: {
        type: _prepType,
        hide_toast_message: this.hide_toast_message,
      },
      breakpoints: [0, 0.25, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data && data.added === true) {
      this.uiAnalytics.trackEvent(
        PREPARATION_TRACKING.TITLE,
        PREPARATION_TRACKING.ACTIONS.ADD_FINISH,
      );
      await this.dismiss();
    }
  }

  public async dismiss() {
    await this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PreparationAddComponent.COMPONENT_ID,
    );
  }

  public ngOnInit() {}
}
