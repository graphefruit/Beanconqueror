import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Preparation} from '../../../classes/preparation/preparation';
import {ModalController} from '@ionic/angular';

import {PREPARATION_TYPES} from '../../../enums/preparations/preparationTypes';
import {NgForm} from '@angular/forms';
import {PreparationAddTypeComponent} from '../preparation-add-type/preparation-add-type.component';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import {UIAnalytics} from '../../../services/uiAnalytics';
@Component({
  selector: 'preparation-add',
  templateUrl: './preparation-add.component.html',
  styleUrls: ['./preparation-add.component.scss'],
})
export class PreparationAddComponent implements OnInit {


  public data: Preparation = new Preparation();

  public preparation_types_enum = PREPARATION_TYPES;


  @ViewChild('addPreparationForm', {static: false}) public preparationForm: NgForm;

  @Input() private hide_toast_message: boolean;

  constructor (private readonly modalController: ModalController,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewWillEnter(): void {
  }

  public async choosePreparation(_prepType: PREPARATION_TYPES) {

    this.uiAnalytics.trackEvent(PREPARATION_TRACKING.TITLE, PREPARATION_TRACKING.ACTIONS.ADD_TYPE);
    const modal = await this.modalController.create({
      component: PreparationAddTypeComponent,
      cssClass: 'popover-actions',
      showBackdrop: true,
      id: 'preparation-add-type',
      backdropDismiss: true,
      swipeToClose: true,
      componentProps: {type: _prepType, hide_toast_message: this.hide_toast_message}
    });
    await modal.present();
    const {data} = await modal.onDidDismiss();
    if (data.added === true) {
      await this.dismiss();
    }

  }


  public async dismiss() {
    await this.modalController.dismiss({
      dismissed: true
    }, undefined, 'preparation-add');

  }

  public ngOnInit() {}

}
