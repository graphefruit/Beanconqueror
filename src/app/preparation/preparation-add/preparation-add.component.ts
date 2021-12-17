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


  public static COMPONENT_ID: string = 'preparation-add';
  public data: Preparation = new Preparation();

  public preparation_types_enum = PREPARATION_TYPES;


  @ViewChild('addPreparationForm', {static: false}) public preparationForm: NgForm;

  @Input() private hide_toast_message: boolean;

  constructor (private readonly modalController: ModalController,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(PREPARATION_TRACKING.TITLE, PREPARATION_TRACKING.ACTIONS.ADD);
  }

  public async choosePreparation(_prepType: PREPARATION_TYPES) {


    const modal = await this.modalController.create({
      component: PreparationAddTypeComponent,
      cssClass: 'popover-actions',
      id:  PreparationAddTypeComponent.COMPONENT_ID,
      componentProps: {type: _prepType, hide_toast_message: this.hide_toast_message},
      breakpoints: [0, 0.2, 0.5, 0.75, 1],
      initialBreakpoint: 0.5,
    });
    await modal.present();
    const {data} = await modal.onDidDismiss();
    if (data && data.added === true) {
      this.uiAnalytics.trackEvent(PREPARATION_TRACKING.TITLE, PREPARATION_TRACKING.ACTIONS.ADD_FINISH);
      await this.dismiss();
    }

  }


  public async dismiss() {
    await this.modalController.dismiss({
      dismissed: true
    }, undefined, PreparationAddComponent.COMPONENT_ID);

  }

  public ngOnInit() {}

}
