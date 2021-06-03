import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIToast} from '../../../../services/uiToast';
import {UIWaterStorage} from '../../../../services/uiWaterStorage';
import {Water} from '../../../../classes/water/water';

@Component({
  selector: 'app-water-add',
  templateUrl: './water-add.component.html',
  styleUrls: ['./water-add.component.scss'],
})
export class WaterAddComponent implements OnInit {
  public static COMPONENT_ID = 'water-add';

  public data: Water = new Water();

  constructor(private readonly modalController: ModalController,
              private readonly uiWaterStorage: UIWaterStorage,
              private readonly uiToast: UIToast) {

  }

  public ionViewWillEnter(): void {
  }
  public async add() {

    if (this.data.name) {
      await this.__add();
    }
  }

  public async __add() {
    await this.uiWaterStorage.add(this.data);
    this.dismiss();
    this.uiToast.showInfoToast('TOAST_WATER_ADDED_SUCCESSFULLY');

  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
    },undefined, WaterAddComponent.COMPONENT_ID)

  }
  public ngOnInit() {}


}
