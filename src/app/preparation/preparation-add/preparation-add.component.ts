import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Preparation} from '../../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {ModalController} from '@ionic/angular';
import {UIAnalytics} from '../../../services/uiAnalytics';

import {PREPARATION_TYPES} from '../../../enums/preparations/preparationTypes';
import {NgForm} from '@angular/forms';
import {PreparationAddTypeComponent} from '../preparation-add-type/preparation-add-type.component';

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
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('PREPARATION', 'ADD');
  }

  public async choosePreparation(_prepType: PREPARATION_TYPES) {

    const modal = await this.modalController.create({
      component: PreparationAddTypeComponent,
      cssClass: 'half-bottom-modal',
      showBackdrop: true,
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
