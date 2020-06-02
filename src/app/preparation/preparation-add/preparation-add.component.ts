import {Component, OnInit} from '@angular/core';
import {Preparation} from '../../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {ModalController} from '@ionic/angular';
import {UIAnalytics} from '../../../services/uiAnalytics';

import {PREPARATION_TYPES} from '../../../enums/preparations/preparationTypes';

@Component({
  selector: 'preparation-add',
  templateUrl: './preparation-add.component.html',
  styleUrls: ['./preparation-add.component.scss'],
})
export class PreparationAddComponent implements OnInit {


  public data: Preparation = new Preparation();

  public preparationTypes = [
    {TYPE: PREPARATION_TYPES.CUSTOM_PREPARATION, ICON: ''},
    {TYPE: PREPARATION_TYPES.AEROPRESS, ICON: ''},
    {TYPE: PREPARATION_TYPES.V60, ICON: ''},
    {TYPE: PREPARATION_TYPES.CHEMEX, ICON: ''},
    {TYPE: PREPARATION_TYPES.BIALETTI, ICON: ''},
  ];


  constructor (private readonly modalController: ModalController,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('PREPARATION', 'ADD');
  }
  public addBean(form): void {

    if (form.valid) {
      this.__addBean();
    }
  }

  public __addBean(): void {
    this.uiPreparationStorage.add(this.data);
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
    });
  }

  public ngOnInit() {}

}
