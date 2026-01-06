import { Component, Input } from '@angular/core';

import { ModalController, IonicModule } from '@ionic/angular';

import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { Water } from '../../../../classes/water/water';
import { UIWaterStorage } from '../../../../services/uiWaterStorage';

import { WATER_UNIT } from '../../../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../../../enums/water/waterUnitTds';
import WATER_TRACKING from '../../../../data/tracking/waterTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { FormsModule } from '@angular/forms';
import { PhotoAddComponent } from '../../../../components/photo-add/photo-add.component';
import { PreventCharacterDirective } from '../../../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../../../directive/remove-empty-number.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { KeysPipe } from '../../../../pipes/keys';

@Component({
  selector: 'app-water-edit',
  templateUrl: './water-edit.component.html',
  styleUrls: ['./water-edit.component.scss'],
  imports: [
    IonicModule,
    FormsModule,
    PhotoAddComponent,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    TranslatePipe,
    KeysPipe,
  ],
})
export class WaterEditComponent {
  public static readonly COMPONENT_ID = 'water-edit';
  public data: Water = new Water();

  @Input() private water: Water;
  public waterPropertyEnum = WATER_UNIT;
  public waterPropertyTdsEnum = WATER_UNIT_TDS;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.EDIT,
    );
    this.data = this.uiHelper.copyData(this.water);
  }

  public async edit() {
    if (this.data.name !== '') {
      await this.__edit();
    }
  }

  public async __edit() {
    await this.uiWaterStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_WATER_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      WaterEditComponent.COMPONENT_ID,
    );
  }
}
