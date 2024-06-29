import { Component, OnInit } from '@angular/core';
import WATER_TRACKING from '../../../../data/tracking/waterTracking';
import { ModalController, NavParams } from '@ionic/angular';
import { UIWaterStorage } from '../../../../services/uiWaterStorage';
import { UIToast } from '../../../../services/uiToast';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { WATER_TYPES } from '../../../../enums/water/waterTypes';

import { Water } from '../../../../classes/water/water';
import { TranslateService } from '@ngx-translate/core';
import { WATER_UNIT } from '../../../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../../../enums/water/waterUnitTds';

@Component({
  selector: 'water-add-type',
  templateUrl: './water-add-type.component.html',
  styleUrls: ['./water-add-type.component.scss'],
})
export class WaterAddTypeComponent implements OnInit {
  public static COMPONENT_ID = 'water-add-type';
  public WATER_TYPES = WATER_TYPES;
  public data: Water = new Water();

  constructor(
    private readonly modalController: ModalController,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    private readonly navParams: NavParams,
    private readonly translate: TranslateService
  ) {
    this.data.type = this.navParams.get('type');
    if (this.data.type !== WATER_TYPES.CUSTOM_WATER) {
      this.data.name = this.translate.instant('WATER_TYPE_' + this.data.type);
    }
  }

  public ngOnInit() {}
  public async add() {
    if (this.data.name) {
      this.addWaterIngredientsInformation();
      await this.__add();
    }
  }
  private addWaterIngredientsInformation() {
    switch (this.data.type) {
      case WATER_TYPES.THIRD_WAVE_WATER_CLASSIC_LIGHT_ROAST_PROFILE:
        /**
         * General Hardness (GH): 220 mg/l
         * Total Alkalinity (KH): 35 mg/l
         * Calcium (Ca): 45 mg/l
         * Magnesium (Mg): 95 mg/l
         * Sodium (Na): 10 mg/l
         * Potassium (K): 0 mg/l
         * Total Dissolved Solids (TDS): 150 mg/l
         */
        this.data.general_hardness = 220;
        this.data.general_hardness_type = 'MG_L' as WATER_UNIT;

        this.data.total_alkalinity = 35;
        this.data.total_alkalinity_type = 'MG_L' as WATER_UNIT;

        this.data.calcium = 45;
        this.data.calcium_type = 'MG_L' as WATER_UNIT;

        this.data.magnesium = 95;
        this.data.magnesium_type = 'MG_L' as WATER_UNIT;

        this.data.sodium = 10;
        this.data.sodium_type = 'MG_L' as WATER_UNIT;

        this.data.potassium = 0;
        this.data.potassium_type = 'MG_L' as WATER_UNIT;

        this.data.tds = 150;
        this.data.tds_type = 'PPM' as WATER_UNIT_TDS;
        break;

      case WATER_TYPES.THIRD_WAVE_WATER_MEDIUM_ROAST_PROFILE:
        /**
         * General Hardness (GH): 210 mg/l
         * Total Alkalinity (KH): 85 mg/l
         * Calcium (Ca): 45 mg/l
         * Magnesium (Mg): 90 mg/l
         * Sodium (Na): 0 mg/l
         * Potassium (K): 15 mg/l
         * Total Dissolved Solids (TDS): 150 mg/l
         */
        this.data.general_hardness = 210;
        this.data.general_hardness_type = 'MG_L' as WATER_UNIT;

        this.data.total_alkalinity = 85;
        this.data.total_alkalinity_type = 'MG_L' as WATER_UNIT;

        this.data.calcium = 45;
        this.data.calcium_type = 'MG_L' as WATER_UNIT;

        this.data.magnesium = 90;
        this.data.magnesium_type = 'MG_L' as WATER_UNIT;

        this.data.sodium = 0;
        this.data.sodium_type = 'MG_L' as WATER_UNIT;

        this.data.potassium = 15;
        this.data.potassium_type = 'MG_L' as WATER_UNIT;

        this.data.tds = 150;
        this.data.tds_type = 'PPM' as WATER_UNIT_TDS;
        break;

      case WATER_TYPES.THIRD_WAVE_WATER_DARK_ROAST_PROFILE:
        /**
         * General Hardness (GH): 160 mg/l
         * Total Alkalinity (KH): 137 mg/l
         * Calcium (Ca): 40 mg/l
         * Magnesium (Mg): 60 mg/l
         * Sodium (Na): 80 mg/l
         * Potassium (K): 0 mg/l
         * Total Dissolved Solids (TDS): 180 mg/l
         */
        this.data.general_hardness = 160;
        this.data.general_hardness_type = 'MG_L' as WATER_UNIT;

        this.data.total_alkalinity = 137;
        this.data.total_alkalinity_type = 'MG_L' as WATER_UNIT;

        this.data.calcium = 40;
        this.data.calcium_type = 'MG_L' as WATER_UNIT;

        this.data.magnesium = 60;
        this.data.magnesium_type = 'MG_L' as WATER_UNIT;

        this.data.sodium = 80;
        this.data.sodium_type = 'MG_L' as WATER_UNIT;

        this.data.potassium = 0;
        this.data.potassium_type = 'MG_L' as WATER_UNIT;

        this.data.tds = 180;
        this.data.tds_type = 'PPM' as WATER_UNIT_TDS;
        break;

      case WATER_TYPES.THIRD_WAVE_WATER_LOW_ACID_PROFILE:
        /**
         * General Hardness (GH): 160 mg/l
         * Total Alkalinity (KH): 180 mg/l
         * Calcium (Ca): 0 mg/l
         * Magnesium (Mg): 60 mg/l
         * Sodium (Na): 80 mg/l
         * Potassium (K): 40 mg/l
         * Total Dissolved Solids (TDS): 220 mg/l
         */
        this.data.general_hardness = 160;
        this.data.general_hardness_type = 'MG_L' as WATER_UNIT;

        this.data.total_alkalinity = 180;
        this.data.total_alkalinity_type = 'MG_L' as WATER_UNIT;

        this.data.calcium = 0;
        this.data.calcium_type = 'MG_L' as WATER_UNIT;

        this.data.magnesium = 60;
        this.data.magnesium_type = 'MG_L' as WATER_UNIT;

        this.data.sodium = 80;
        this.data.sodium_type = 'MG_L' as WATER_UNIT;

        this.data.potassium = 40;
        this.data.potassium_type = 'MG_L' as WATER_UNIT;

        this.data.tds = 220;
        this.data.tds_type = 'PPM' as WATER_UNIT_TDS;
        break;

      case WATER_TYPES.THIRD_WAVE_WATER_ESPRESSO_MACHINE_PROFILE:
        /**
         * General Hardness (GH): 210 mg/l
         * Total Alkalinity (KH): 85 mg/l
         * Calcium (Ca): 45 mg/l
         * Magnesium (Mg): 90 mg/l
         * Sodium (Na): 0 mg/l
         * Potassium (K): 15 mg/l
         * Total Dissolved Solids (TDS): 150 mg/l
         */
        this.data.general_hardness = 210;
        this.data.general_hardness_type = 'MG_L' as WATER_UNIT;

        this.data.total_alkalinity = 85;
        this.data.total_alkalinity_type = 'MG_L' as WATER_UNIT;

        this.data.calcium = 45;
        this.data.calcium_type = 'MG_L' as WATER_UNIT;

        this.data.magnesium = 90;
        this.data.magnesium_type = 'MG_L' as WATER_UNIT;

        this.data.sodium = 0;
        this.data.sodium_type = 'MG_L' as WATER_UNIT;

        this.data.potassium = 15;
        this.data.potassium_type = 'MG_L' as WATER_UNIT;

        this.data.tds = 150;
        this.data.tds_type = 'PPM' as WATER_UNIT_TDS;
        break;

      case WATER_TYPES.THIRD_WAVE_WATER_COLD_BREW_PROFILE:
        /**
         * General Hardness (GH): 180 mg/l
         * Total Alkalinity (KH): 180 mg/l
         * Calcium (Ca): 0 mg/l
         * Magnesium (Mg): 60 mg/l
         * Sodium (Na): 80 mg/l
         * Potassium (K): 40 mg/l
         * Total Dissolved Solids (TDS): 220 mg/l
         */
        this.data.general_hardness = 180;
        this.data.general_hardness_type = 'MG_L' as WATER_UNIT;

        this.data.total_alkalinity = 180;
        this.data.total_alkalinity_type = 'MG_L' as WATER_UNIT;

        this.data.calcium = 0;
        this.data.calcium_type = 'MG_L' as WATER_UNIT;

        this.data.magnesium = 60;
        this.data.magnesium_type = 'MG_L' as WATER_UNIT;

        this.data.sodium = 80;
        this.data.sodium_type = 'MG_L' as WATER_UNIT;

        this.data.potassium = 40;
        this.data.potassium_type = 'MG_L' as WATER_UNIT;

        this.data.tds = 220;
        this.data.tds_type = 'PPM' as WATER_UNIT_TDS;
        break;

      case WATER_TYPES.PURE_COFFEE_WATER:
        this.data.note = 'https://www.purecoffeewater.com/';
        break;

      default:
        break;
    }
  }
  public async __add() {
    await this.uiWaterStorage.add(this.data);
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.ADD_FINISH
    );
    this.uiToast.showInfoToast('TOAST_WATER_ADDED_SUCCESSFULLY');
    this.dismiss(true);
  }

  public dismiss(_added: boolean = false): void {
    this.modalController.dismiss(
      {
        dismissed: true,
        added: _added,
      },
      undefined,
      WaterAddTypeComponent.COMPONENT_ID
    );
  }
}
