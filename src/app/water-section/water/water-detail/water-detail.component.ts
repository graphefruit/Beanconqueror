import {Component, Input, OnInit} from '@angular/core';

import {ModalController} from '@ionic/angular';
import {UIHelper} from '../../../../services/uiHelper';
import {Water} from '../../../../classes/water/water';
import {WATER_UNIT} from '../../../../enums/water/waterUnit';
import {WATER_UNIT_TDS} from '../../../../enums/water/waterUnitTds';

@Component({
  selector: 'app-water-detail',
  templateUrl: './water-detail.component.html',
  styleUrls: ['./water-detail.component.scss'],
})
export class WaterDetailComponent implements OnInit {
  public static COMPONENT_ID = 'water-detail';
  public data: Water = new Water();

  @Input() private water: Water;

  public waterPropertyEnum = WATER_UNIT;
  public waterPropertyTdsEnum = WATER_UNIT_TDS;

  constructor (private readonly modalController: ModalController,
               private readonly uiHelper: UIHelper) {
  }

  public ionViewWillEnter() {
    this.data = this.uiHelper.copyData(this.water);

  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,WaterDetailComponent.COMPONENT_ID);
  }
}
