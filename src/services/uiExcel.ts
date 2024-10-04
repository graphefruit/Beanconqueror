/** Core */
import { Injectable } from '@angular/core';
/** Services */

import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';
import * as XLSX from 'xlsx';
import { AlertController, Platform } from '@ionic/angular';
import { UIBrewStorage } from './uiBrewStorage';
import { TranslateService } from '@ngx-translate/core';
import { UIBeanStorage } from './uiBeanStorage';
import { BEAN_ROASTING_TYPE_ENUM } from '../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../enums/beans/mix';
import { UIPreparationStorage } from './uiPreparationStorage';
import { UIAlert } from './uiAlert';
import { UIFileHelper } from './uiFileHelper';
import { UIMillStorage } from './uiMillStorage';
import { BrewFlow, IBrewWaterFlow } from '../classes/brew/brewFlow';
import moment from 'moment';
import { UISettingsStorage } from './uiSettingsStorage';
import { Settings } from '../classes/settings/settings';
import { Brew } from '../classes/brew/brew';
import { Bean } from '../classes/bean/bean';
import { IBeanInformation } from '../interfaces/bean/iBeanInformation';
import { UIBeanHelper } from './uiBeanHelper';
import { GreenBean } from '../classes/green-bean/green-bean';
import { UIGreenBeanStorage } from './uiGreenBeanStorage';

@Injectable({
  providedIn: 'root',
})
export class UIExcel {
  private settings: Settings;
  constructor(
    protected uiStorage: UIStorage,
    protected uiHelper: UIHelper,
    protected uiLog: UILog,
    private readonly platform: Platform,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiPreparationStoraage: UIPreparationStorage,
    private readonly translate: TranslateService,
    private readonly uiAlert: UIAlert,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBeanHelper: UIBeanHelper
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }
  private write(): XLSX.WorkBook {
    /* generate worksheet */
    // const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(this.data);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    this.exportBrews(wb);
    this.exportBeans(wb);
    this.exportPreparationMethods(wb);
    this.exportGrinders(wb);
    return wb;
  }

  private generateBrewFlowProfileRaw(_flow: BrewFlow): XLSX.WorkBook {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    const header: Array<string> = [];
    header.push('Timestamp');
    header.push('Brew time');
    header.push('Actual weight');
    header.push('Old weight');
    header.push('Actual smoothed weight');
    header.push('Old smoothed weight');

    let hasMutatedWeightEntry: boolean = false;
    if (_flow.weight.length > 0 && 'not_mutated_weight' in _flow.weight[0]) {
      header.push('Not mutated weight');
      hasMutatedWeightEntry = true;
    }

    const wsData: any[][] = [header];
    for (const entry of _flow.weight) {
      const wbEntry: Array<any> = [
        entry.timestamp,
        entry.brew_time,
        entry.actual_weight,
        entry.old_weight,
        entry.actual_smoothed_weight,
        entry.old_smoothed_weight,
      ];
      if (hasMutatedWeightEntry) {
        wbEntry.push(entry.not_mutated_weight);
      }
      wsData.push(wbEntry);
    }
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      this.translate.instant('Flow profile raw')
    );

    const header_flow: Array<string> = [];
    header_flow.push('Timestamp');
    header_flow.push('Time');
    header_flow.push('Value');

    const wsDataFlow: any[][] = [header_flow];
    for (const entry of _flow.waterFlow) {
      const wbEntry: Array<any> = [
        entry.timestamp,
        entry.brew_time,
        entry.value,
      ];
      wsDataFlow.push(wbEntry);
    }
    const wsFlow: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsDataFlow);
    XLSX.utils.book_append_sheet(
      wb,
      wsFlow,
      this.translate.instant('Flow profile calculated')
    );

    if (_flow.hasOwnProperty('realtimeFlow')) {
      const header_flow_realtime: Array<string> = [];
      header_flow_realtime.push('Timestamp');
      header_flow_realtime.push('Time');
      header_flow_realtime.push('Flow value');
      header_flow_realtime.push('Smoothed weight');

      header_flow_realtime.push('Timestamp delta');

      const wsDataFlowRealtime: any[][] = [header_flow_realtime];
      for (const entry of _flow.realtimeFlow) {
        const wbEntry: Array<any> = [
          entry.timestamp,
          entry.brew_time,
          entry.flow_value,
          entry.smoothed_weight,
          entry.timestampdelta,
        ];
        wsDataFlowRealtime.push(wbEntry);
      }
      const wsFlowRealtime: XLSX.WorkSheet =
        XLSX.utils.aoa_to_sheet(wsDataFlowRealtime);
      XLSX.utils.book_append_sheet(
        wb,
        wsFlowRealtime,
        this.translate.instant('Flow profile realtime')
      );
    }

    if (_flow.hasOwnProperty('pressureFlow')) {
      const header_pressure_flow: Array<string> = [];
      header_pressure_flow.push('Timestamp');
      header_pressure_flow.push('Time');
      header_pressure_flow.push('Actual');
      header_pressure_flow.push('Old');

      const wsDataPressureFlow: any[][] = [header_pressure_flow];
      for (const entry of _flow.pressureFlow) {
        const wbEntry: Array<any> = [
          entry.timestamp,
          entry.brew_time,
          entry.actual_pressure,
          entry.old_pressure,
        ];
        wsDataPressureFlow.push(wbEntry);
      }
      const wsFlowRealtime: XLSX.WorkSheet =
        XLSX.utils.aoa_to_sheet(wsDataPressureFlow);
      XLSX.utils.book_append_sheet(
        wb,
        wsFlowRealtime,
        this.translate.instant('Flow pressure')
      );
    }
    if (_flow.hasOwnProperty('temperatureFlow')) {
      const header_temperature_flow: Array<string> = [];
      header_temperature_flow.push('Timestamp');
      header_temperature_flow.push('Time');
      header_temperature_flow.push('Actual');
      header_temperature_flow.push('Old');

      const wsDataTemperatureFlow: any[][] = [header_temperature_flow];
      for (const entry of _flow.temperatureFlow) {
        const wbEntry: Array<any> = [
          entry.timestamp,
          entry.brew_time,
          entry.actual_temperature,
          entry.old_temperature,
        ];
        wsDataTemperatureFlow.push(wbEntry);
      }
      const wsFlowRealtime: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(
        wsDataTemperatureFlow
      );
      XLSX.utils.book_append_sheet(
        wb,
        wsFlowRealtime,
        this.translate.instant('Flow temperature')
      );
    }

    if (_flow.hasOwnProperty('brewbyweight')) {
      const header_final_weight: Array<string> = [];
      header_final_weight.push('target_weight');
      header_final_weight.push('lag_time');
      header_final_weight.push('brew_time');
      header_final_weight.push('timestamp');
      header_final_weight.push('last_flow_value');
      header_final_weight.push('actual_scale_weight');
      header_final_weight.push('calc_lag_time');
      header_final_weight.push('calc_exceeds_weight');
      header_final_weight.push('avg_flow_lag_residual_time');
      header_final_weight.push('residual_lag_time');
      header_final_weight.push('average_flow_rate');
      header_final_weight.push('scaleType');

      const wsDatafinalWeightFlow: any[][] = [header_final_weight];
      for (const entry of _flow.brewbyweight) {
        const wbEntry: Array<any> = [
          entry.target_weight,
          entry.lag_time,
          entry.brew_time,
          entry.timestamp,
          entry.last_flow_value,
          entry.actual_scale_weight,
          entry.calc_lag_time,
          entry.calc_exceeds_weight,
          entry.avg_flow_lag_residual_time,
          entry.residual_lag_time,
          entry.average_flow_rate,
          entry.scaleType,
        ];
        wsDatafinalWeightFlow.push(wbEntry);
      }
      const wsFinalWeight: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(
        wsDatafinalWeightFlow
      );
      XLSX.utils.book_append_sheet(wb, wsFinalWeight, 'Brew by weight');
    }

    return wb;
  }

  private exportGrinders(_wb: XLSX.WorkBook) {
    const header: Array<string> = [];

    header.push(this.translate.instant('NAME'));
    header.push(this.translate.instant('NOTES'));
    header.push(this.translate.instant('ARCHIVED'));
    header.push(this.translate.instant('EXCEL.GRINDER.CREATION_DATE'));
    header.push(this.translate.instant('EXCEL.GRINDER.ID'));

    const wsData: any[][] = [header];
    for (const mill of this.uiMillStorage.getAllEntries()) {
      const entry: Array<any> = [
        mill.name,
        mill.note,
        mill.finished,
        this.uiHelper.formateDate(
          mill.config.unix_timestamp,
          this.settings.date_format + ' HH:mm:ss'
        ),
        mill.config.uuid,
      ];
      wsData.push(entry);
    }

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(_wb, ws, this.translate.instant('NAV_MILL'));
  }
  private exportPreparationMethods(_wb: XLSX.WorkBook) {
    const header: Array<string> = [];

    header.push(this.translate.instant('PREPARATION_TYPE'));
    header.push(this.translate.instant('PREPARATION_TYPE_NAME'));
    header.push(this.translate.instant('PREPARATION_TYPE_STYLE'));
    header.push(this.translate.instant('PREPARATION_TOOLS'));
    header.push(this.translate.instant('NOTES'));
    header.push(this.translate.instant('ARCHIVED'));
    header.push(this.translate.instant('EXCEL.PREPARATION.CREATION_DATE'));
    header.push(this.translate.instant('EXCEL.PREPARATION.ID'));

    const wsData: any[][] = [header];
    for (const preparation of this.uiPreparationStoraage.getAllEntries()) {
      const entry: Array<any> = [
        preparation.type,
        preparation.name,
        preparation.style_type,
        preparation.tools.map((e) => e.name).join(','),
        preparation.note,
        preparation.finished,
        this.uiHelper.formateDate(
          preparation.config.unix_timestamp,
          this.settings.date_format + ' HH:mm:ss'
        ),
        preparation.config.uuid,
      ];

      wsData.push(entry);
    }

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(
      _wb,
      ws,
      this.translate.instant('NAV_PREPARATION')
    );
  }

  private exportBeans(_wb: XLSX.WorkBook) {
    const header: Array<string> = [];

    header.push(this.translate.instant('BEAN_DATA_NAME'));
    header.push(this.translate.instant('BEAN_DATA_ROASTER'));
    header.push(this.translate.instant('BEAN_DATA_ROASTING_DATE'));
    header.push(this.translate.instant('BEAN_DATA_ROASTING_TYPE'));
    header.push(this.translate.instant('BEAN_DATA_ROAST_NAME'));
    header.push(this.translate.instant('BEAN_DATA_CUSTOM_ROAST_NAME'));
    header.push(this.translate.instant('BEAN_DATA_MIX'));
    header.push(this.translate.instant('BEAN_DATA_WEIGHT'));
    header.push(this.translate.instant('BEAN_DATA_COST'));
    header.push(this.translate.instant('BEAN_DATA_AROMATICS'));
    header.push(this.translate.instant('BEAN_DATA_CUPPING_POINTS'));
    header.push(this.translate.instant('BEAN_DATA_DECAFFEINATED'));
    header.push(this.translate.instant('BEAN_DATA_URL'));
    header.push(this.translate.instant('BEAN_DATA_EAN'));
    header.push(this.translate.instant('NOTES'));
    header.push(this.translate.instant('BREW_DATA_RATING'));
    header.push(this.translate.instant('EXCEL.BEAN.CREATION_DATE'));
    header.push(this.translate.instant('EXCEL.BEAN.ID'));
    header.push(this.translate.instant('ARCHIVED'));

    const wsData: any[][] = [header];
    let maxSortRepeats: number = 1;
    for (const bean of this.uiBeanStorage.getAllEntries()) {
      const entry: Array<any> = [
        bean.name,
        bean.roaster,
        this.uiHelper.formateDatestr(
          bean.roastingDate,
          this.settings.date_format
        ),
        BEAN_ROASTING_TYPE_ENUM[bean.bean_roasting_type],
        bean.getRoastName(),
        bean.getCustomRoastName(),
        BEAN_MIX_ENUM[bean.beanMix],
        bean.weight,
        bean.cost,
        bean.aromatics,
        bean.cupping_points,
        bean.decaffeinated,
        bean.url,
        bean.ean_article_number,
        bean.note,
        bean.rating,
        this.uiHelper.formateDate(
          bean.config.unix_timestamp,
          this.settings.date_format + ' HH:mm:ss'
        ),
        bean.config.uuid,
        bean.finished,
      ];

      if (maxSortRepeats < bean.bean_information.length) {
        maxSortRepeats = bean.bean_information.length;
      }
      for (const sortInformation of bean.bean_information) {
        entry.push(sortInformation.country);
        entry.push(sortInformation.region);
        entry.push(sortInformation.farm);
        entry.push(sortInformation.farmer);
        entry.push(sortInformation.elevation);
        entry.push(sortInformation.variety);
        entry.push(sortInformation.processing);
        entry.push(sortInformation.harvest_time);
        entry.push(sortInformation.percentage);
        entry.push(sortInformation.certification);
      }

      wsData.push(entry);
    }

    for (let i = 0; i < maxSortRepeats; i++) {
      header.push(i + 1 + '. ' + this.translate.instant('BEAN_DATA_COUNTRY'));
      header.push(i + 1 + '. ' + this.translate.instant('BEAN_DATA_REGION'));
      header.push(i + 1 + '. ' + this.translate.instant('BEAN_DATA_FARM'));
      header.push(i + 1 + '. ' + this.translate.instant('BEAN_DATA_FARMER'));
      header.push(i + 1 + '. ' + this.translate.instant('BEAN_DATA_ELEVATION'));
      header.push(i + 1 + '. ' + this.translate.instant('BEAN_DATA_VARIETY'));
      header.push(
        i + 1 + '. ' + this.translate.instant('BEAN_DATA_PROCESSING')
      );
      header.push(
        i + 1 + '. ' + this.translate.instant('BEAN_DATA_HARVEST_TIME')
      );
      header.push(
        i + 1 + '. ' + this.translate.instant('BEAN_DATA_PERCENTAGE')
      );
      header.push(
        i + 1 + '. ' + this.translate.instant('BEAN_DATA_CERTIFICATION')
      );
    }
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(_wb, ws, this.translate.instant('NAV_BEANS'));
  }

  private exportBrews(_wb: XLSX.WorkBook) {
    const header: Array<string> = [];

    header.push(this.translate.instant('BREW_DATA_GRIND_SIZE'));
    header.push(this.translate.instant('BREW_DATA_GRIND_WEIGHT'));
    header.push(this.translate.instant('BREW_DATA_BREW_TEMPERATURE'));
    header.push(this.translate.instant('BREW_DATA_PREPARATION_METHOD'));
    header.push(this.translate.instant('BREW_DATA_BEAN_TYPE'));
    header.push(this.translate.instant('BREW_DATA_MILL'));
    header.push(this.translate.instant('BREW_DATA_MILL_SPEED'));
    header.push(this.translate.instant('BREW_DATA_MILL_TIMER'));
    header.push(this.translate.instant('BREW_DATA_PRESSURE_PROFILE'));
    header.push(this.translate.instant('BREW_DATA_PREPARATION_METHOD_TOOL'));
    header.push(this.translate.instant('BREW_DATA_TEMPERATURE_TIME'));
    header.push(this.translate.instant('BREW_DATA_TIME'));
    header.push(this.translate.instant('BREW_DATA_COFFEE_BLOOMING_TIME'));
    header.push(this.translate.instant('BREW_DATA_COFFEE_FIRST_DRIP_TIME'));
    header.push(this.translate.instant('BREW_DATA_BREW_QUANTITY'));
    header.push(this.translate.instant('BREW_DATA_COFFEE_TYPE'));
    header.push(this.translate.instant('BREW_DATA_COFFEE_CONCENTRATION'));
    header.push(this.translate.instant('BREW_DATA_RATING'));
    header.push(this.translate.instant('BREW_DATA_NOTES'));
    header.push(this.translate.instant('BREW_DATA_BREW_BEVERAGE_QUANTITY'));
    header.push(this.translate.instant('BREW_DATA_TDS'));
    header.push(
      this.translate.instant('BREW_DATA_CALCULATED_EXTRACTION_YIELD')
    );
    header.push(this.translate.instant('BREW_CREATION_DATE'));
    header.push(this.translate.instant('BREW_INFORMATION_BREW_RATIO'));
    header.push(this.translate.instant('BREW_INFORMATION_BEAN_AGE'));
    header.push(this.translate.instant('ARCHIVED'));
    header.push(this.translate.instant('EXCEL.BEAN.ID'));
    header.push(this.translate.instant('EXCEL.PREPARATION.ID'));
    header.push(this.translate.instant('EXCEL.GRINDER.ID'));

    const waterEnabled: boolean =
      this.uiSettingsStorage.getSettings().show_water_section;
    if (waterEnabled) {
      header.push(this.translate.instant('BREW_DATA_WATER'));
    }

    const millisecondsEnabled: boolean =
      this.uiSettingsStorage.getSettings().brew_milliseconds;

    const wsData: any[][] = [header];
    for (const brew of this.uiBrewStorage.getAllEntries()) {
      let brewTime: string = String(brew.brew_time);
      let bloomingTime: string = String(brew.coffee_blooming_time);
      let dripTime: string = String(brew.coffee_first_drip_time);
      let temperatureTime: string = String(brew.brew_temperature_time);
      let millTime: string = String(brew.mill_timer);
      if (millisecondsEnabled) {
        if (brew.brew_time_milliseconds > 0) {
          brewTime = brewTime + '.' + brew.brew_time_milliseconds;
        }
        if (brew.coffee_blooming_time_milliseconds) {
          bloomingTime =
            bloomingTime + '.' + brew.coffee_blooming_time_milliseconds;
        }

        if (brew.coffee_first_drip_time_milliseconds) {
          dripTime = dripTime + '.' + brew.coffee_first_drip_time_milliseconds;
        }

        if (brew.brew_temperature_time_milliseconds) {
          temperatureTime =
            temperatureTime + '.' + brew.brew_temperature_time_milliseconds;
        }

        if (brew.mill_timer_milliseconds) {
          millTime = millTime + '.' + brew.mill_timer_milliseconds;
        }
      }

      const entry: Array<any> = [
        brew.grind_size,
        brew.grind_weight,
        brew.brew_temperature,
        brew.getPreparation().name,
        brew.getBean().name,
        brew.getMill().name,
        brew.mill_speed,
        millTime,
        brew.pressure_profile,
        brew
          .getPreparation()
          .tools.filter(
            (e) =>
              brew.method_of_preparation_tools.includes(e.config.uuid) === true
          )
          .map((e) => e.name)
          .join(','),
        temperatureTime,
        brewTime,
        bloomingTime,
        dripTime,
        brew.brew_quantity,
        brew.coffee_type,
        brew.coffee_concentration,
        brew.rating,
        brew.note,
        brew.brew_beverage_quantity,
        brew.tds,
        brew.getExtractionYield(),
        this.uiHelper.formateDate(
          brew.config.unix_timestamp,
          this.settings.date_format + ' HH:mm:ss'
        ),
        brew.getBrewRatio(),
        brew.getCalculatedBeanAge(),
        brew.getBean().finished,
        brew.getBean().config.uuid,
        brew.getPreparation().config.uuid,
        brew.getMill().config.uuid,
      ];

      if (waterEnabled) {
        let waterName = '';
        if (brew.water) {
          waterName = brew.getWater().name;
        }
        entry.push(waterName);
      }

      wsData.push(entry);
    }
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(_wb, ws, this.translate.instant('NAV_BREWS'));
  }

  public async exportBrewFlowProfile(_flow: BrewFlow) {
    await this.uiAlert.showLoadingSpinner();
    const wb: XLSX.WorkBook = this.generateBrewFlowProfileRaw(_flow);

    const filename: string =
      'Beanconqueror_Flowprofile_Raw_' +
      moment().format('HH_mm_ss_DD_MM_YYYY').toString() +
      '.xlsx';
    try {
      /* generate Blob */
      const wbout: ArrayBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
      });
      const blob: Blob = new Blob([wbout], {
        type: 'application/octet-stream',
      });
      try {
        await this.uiFileHelper.exportFile(filename, blob, true);
        await this.uiAlert.hideLoadingSpinner();
        // We share directly, so we don'T download into download folders.
        /**if (this.platform.is('android')) {
          const alert = await this.alertCtrl.create({
            header: this.translate.instant('DOWNLOADED'),
            subHeader: this.translate.instant('FILE_DOWNLOADED_SUCCESSFULLY', {
              fileName: filename,
            }),
            buttons: ['OK'],
          });
          await alert.present();
        }**/
      } catch (ex) {}
    } catch (e) {
      if (e.message.match(/It was determined/)) {
        /* in the browser, use writeFile */
        XLSX.writeFile(wb, filename);
      } else {
        this.uiAlert.showMessage(e.message);
        this.uiLog.log(`Excel export - Error occured: ${e.message}`);
      }
    }
    await this.uiAlert.hideLoadingSpinner();
  }

  public async exportBrewByWeights(
    _entry: Array<{ BREW: Brew; FLOW: BrewFlow }>
  ) {
    await this.uiAlert.showLoadingSpinner();

    let counter: number = 0;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    for (const exportEntry of _entry) {
      const grindWeight = exportEntry.BREW.grind_weight;
      const brewBeverageQuantity = exportEntry.BREW.brew_beverage_quantity;
      const avgFlow: number = this.getAvgFlow(exportEntry.FLOW);
      if (exportEntry.FLOW.hasOwnProperty('brewbyweight')) {
        const header_final_weight: Array<string> = [];
        header_final_weight.push('target_weight');
        header_final_weight.push('lag_time');
        header_final_weight.push('brew_time');
        header_final_weight.push('timestamp');
        header_final_weight.push('last_flow_value');
        header_final_weight.push('actual_scale_weight');
        header_final_weight.push('calc_lag_time');
        header_final_weight.push('calc_exceeds_weight');
        header_final_weight.push('avg_flow_lag_residual_time');
        header_final_weight.push('residual_lag_time');
        header_final_weight.push('average_flow_rate');
        header_final_weight.push('scaleType');
        header_final_weight.push('grindWeight');
        header_final_weight.push('brewBeverageQuantity');
        header_final_weight.push('avgFlow');
        header_final_weight.push('offsetWeight');
        header_final_weight.push('offsetWeightPercentage');

        const wsDatafinalWeightFlow: any[][] = [header_final_weight];
        for (const entry of exportEntry.FLOW.brewbyweight) {
          let percentageOffset =
            (Number(brewBeverageQuantity) * 100) / Number(entry.target_weight);
          if (percentageOffset >= 100) {
            percentageOffset = percentageOffset - 100;
          } else {
            percentageOffset = (percentageOffset - 100) * -1;
          }
          const wbEntry: Array<any> = [
            entry.target_weight,
            entry.lag_time,
            entry.brew_time,
            entry.timestamp,
            entry.last_flow_value,
            entry.actual_scale_weight,
            entry.calc_lag_time,
            entry.calc_exceeds_weight,
            entry.avg_flow_lag_residual_time,
            entry.residual_lag_time,
            entry.average_flow_rate,
            entry.scaleType,
            grindWeight,
            brewBeverageQuantity,
            avgFlow,
            Number(entry.target_weight) - Number(brewBeverageQuantity),
            Number(percentageOffset),
          ];
          wsDatafinalWeightFlow.push(wbEntry);
        }
        const wsFinalWeight: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(
          wsDatafinalWeightFlow
        );
        XLSX.utils.book_append_sheet(wb, wsFinalWeight, 'S-' + counter);
        counter = counter + 1;
      }
    }

    const filename: string =
      'Beanconqueror_All_Brew_ByWeights_' +
      moment().format('HH_mm_ss_DD_MM_YYYY').toString() +
      '.xlsx';
    try {
      /* generate Blob */
      const wbout: ArrayBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
      });
      const blob: Blob = new Blob([wbout], {
        type: 'application/octet-stream',
      });
      try {
        await this.uiFileHelper.exportFile(filename, blob, true);
        await this.uiAlert.hideLoadingSpinner();
        // We share directly, so we don'T download into download folders.
        /**if (this.platform.is('android')) {
         const alert = await this.alertCtrl.create({
         header: this.translate.instant('DOWNLOADED'),
         subHeader: this.translate.instant('FILE_DOWNLOADED_SUCCESSFULLY', {
         fileName: filename,
         }),
         buttons: ['OK'],
         });
         await alert.present();
         }**/
      } catch (ex) {}
    } catch (e) {
      if (e.message.match(/It was determined/)) {
        /* in the browser, use writeFile */
        XLSX.writeFile(wb, filename);
      } else {
        this.uiAlert.showMessage(e.message);
        this.uiLog.log(`Excel export - Error occured: ${e.message}`);
      }
    }
    await this.uiAlert.hideLoadingSpinner();
  }
  private getAvgFlow(_flow: BrewFlow): number {
    if (_flow.waterFlow && _flow.waterFlow.length > 0) {
      const waterFlows: Array<IBrewWaterFlow> = _flow.waterFlow;
      let calculatedFlow: number = 0;
      let foundEntries: number = 0;
      for (const water of waterFlows) {
        if (water.value > 0) {
          calculatedFlow += water.value;
          foundEntries += 1;
        }
      }
      if (calculatedFlow > 0) {
        return calculatedFlow / foundEntries;
      }

      return 0;
    }
  }

  public async importGreenBeansByExcel(_arrayBuffer) {
    try {
      /* data is an ArrayBuffer */
      const wb = XLSX.read(_arrayBuffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Green Beans']);

      let varietyInformationWhereAdded: boolean = false;
      const addedBeans: Array<GreenBean> = [];
      const toAddBeans: Array<GreenBean> = [];
      for (const entry of data) {
        /**
         * 1. Bean certification: 14
         * 1. Country: 5
         * 1. Elevation: 9
         * 1. Farm: 7
         * 1. Farmer: 8
         * 1. Harvested: 12
         * 1. Percentage: 13
         * 1. Processing: 11
         * 1. Region: 6
         * 1. Variety: 10
         * 1. Fob Price
         * 1. Purchasing Price
         * Archived: false -
         * Cost: 13 -
         * Cupping points: 92 -
         * Decaffeinated: false -
         * EAN / Articlenumber: 2 -
         * Flavour profile: "Red, whine, apple" -
         * Name: 123 -
         * Notes: 3
         * Rating: 4
         * Website: 1 -
         * Weight: 250 -
         * Buy Date
         */

        const bean: GreenBean = new GreenBean();

        const nameEntry = entry['Name'];
        if (nameEntry) {
          bean.name = nameEntry.toString();
        } else {
          continue;
        }

        const weightEntry = entry['Weight'];
        if (weightEntry && Number(weightEntry) > 0) {
          bean.weight = Number(weightEntry);
        }

        const buyDateEntry = entry['Buy Date'];
        if (buyDateEntry && Number(buyDateEntry) > 0) {
          bean.date = this.getJsDateFromExcel(Number(buyDateEntry));
        }

        const websiteEntry = entry['Website'];
        if (websiteEntry) {
          bean.url = websiteEntry.toString();
        }

        const flavourProfileEntry = entry['Flavour profile'];
        if (flavourProfileEntry) {
          bean.aromatics = flavourProfileEntry.toString();
        }

        const eanArticleNumberEntry = entry['EAN / Articlenumber'];
        if (eanArticleNumberEntry) {
          bean.ean_article_number = eanArticleNumberEntry.toString();
        }

        const decaffeinatedEntry = entry['Decaffeinated'];
        if (decaffeinatedEntry) {
          bean.decaffeinated = decaffeinatedEntry;
        }

        const cuppingPointsEntry = entry['Cupping points'];
        if (cuppingPointsEntry) {
          bean.cupping_points = cuppingPointsEntry.toString();
        }

        const costEntry = entry['Cost'];
        if (costEntry) {
          bean.cost = Number(costEntry);
        }

        const archivedEntry = entry['Archived'];
        if (archivedEntry) {
          bean.finished = archivedEntry;
        }

        const beanInformation: IBeanInformation = {} as IBeanInformation;
        let hasOneBeanInformation: boolean = false;

        const informationCertificationEntry = entry['1. Bean certification'];
        if (informationCertificationEntry) {
          beanInformation.certification =
            informationCertificationEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationCountryEntry = entry['1. Country'];
        if (informationCountryEntry) {
          beanInformation.country = informationCountryEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationElevationEntry = entry['1. Elevation'];
        if (informationElevationEntry) {
          beanInformation.elevation = informationElevationEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationFarmEntry = entry['1. Farm'];
        if (informationFarmEntry) {
          beanInformation.farm = informationFarmEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationFarmerEntry = entry['1. Farmer'];
        if (informationFarmerEntry) {
          beanInformation.farmer = informationFarmerEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationHarvestedEntry = entry['1. Harvested'];
        if (informationHarvestedEntry) {
          beanInformation.harvest_time = informationHarvestedEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationPercentageEntry = entry['1. Percentage'];
        if (
          informationPercentageEntry &&
          Number(informationPercentageEntry) > 0
        ) {
          beanInformation.percentage = Number(informationPercentageEntry);
          hasOneBeanInformation = true;
        }

        const informationProcessingEntry = entry['1. Processing'];
        if (informationProcessingEntry) {
          beanInformation.processing = informationProcessingEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationRegionEntry = entry['1. Region'];
        if (informationRegionEntry) {
          beanInformation.region = informationRegionEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationVarietyEntry = entry['1. Variety'];
        if (informationVarietyEntry) {
          beanInformation.variety = informationVarietyEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationFobPriceEntry = entry['1. Fob Price'];
        if (informationFobPriceEntry && Number(informationFobPriceEntry) > 0) {
          beanInformation.fob_price = Number(informationFobPriceEntry);
          hasOneBeanInformation = true;
        }

        const informationPurchasingPriceEntry = entry['1. Purchasing Price'];
        if (
          informationPurchasingPriceEntry &&
          Number(informationPurchasingPriceEntry) > 0
        ) {
          beanInformation.purchasing_price = Number(
            informationPurchasingPriceEntry
          );
          hasOneBeanInformation = true;
        }

        if (hasOneBeanInformation) {
          varietyInformationWhereAdded = true;
          bean.bean_information.push(beanInformation);
        } else {
          /** Add atleast one empty bean information**/
          const emptyBeanInformation: IBeanInformation = {} as IBeanInformation;
          bean.bean_information.push(emptyBeanInformation);
        }

        toAddBeans.push(bean);
      }

      if (varietyInformationWhereAdded) {
        if (this.settings.bean_manage_parameters.bean_information === false) {
          this.settings.bean_manage_parameters.bean_information = true;
          await this.uiSettingsStorage.saveSettings(this.settings);
        }
      }

      /**
       * Add all beans afterwards to not have some added and then going into an exception
       */
      for await (const addBean of toAddBeans) {
        try {
          const newBean: GreenBean = await this.uiGreenBeanStorage.add(addBean);
          addedBeans.push(newBean);
        } catch (ex) {}
      }

      if (addedBeans.length > 0) {
        try {
          await this.uiAlert.showMessage(
            'GREEN_BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
            'IMPORT_SUCCESSFULLY',
            undefined,
            true
          );
        } catch (ex) {}
      } else {
        this.uiAlert.showMessage(
          'BEANS_IMPORTED_UNSUCCESSFULLY_WRONG_EXCELFILE',
          'IMPORT_UNSUCCESSFULLY',
          'OK',
          false
        );
      }
    } catch (ex) {
      this.uiAlert.showMessage(
        ex.message,
        this.translate.instant('IMPORT_UNSUCCESSFULLY'),
        this.translate.instant('OK'),
        false
      );
    }
  }

  public async importBeansByExcel(_arrayBuffer) {
    try {
      /* data is an ArrayBuffer */
      const wb = XLSX.read(_arrayBuffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Beans']);

      let isOneEntryFrozen: boolean = false;
      let varietyInformationWhereAdded: boolean = false;
      const addedBeans: Array<Bean> = [];
      const toAddBeans: Array<Bean> = [];
      for (const entry of data) {
        /**
         * 1. Bean certification: 14
         * 1. Country: 5
         * 1. Elevation: 9
         * 1. Farm: 7
         * 1. Farmer: 8
         * 1. Harvested: 12
         * 1. Percentage: 13
         * 1. Processing: 11
         * 1. Region: 6
         * 1. Variety: 10
         * 1. Fob Price
         * 1. Purchasing Price
         * Archived: false -
         * Blend: "UNKNOWN" -
         * Cost: 13 -
         * Cupping points: 92 -
         * Decaffeinated: false -
         * Degree of Roast: "UNKNOWN" -
         * EAN / Articlenumber: 2 -
         * Flavour profile: "Red, whine, apple" -
         * Name: 123 -
         * Notes: 3
         * Rating: 4
         * Roast date: 44593
         * Roast type: "FILTER" -
         * Roaster: 123 -
         * Website: 1 -
         * Weight: 250 -
         * Frozen Date
         * Unfrozen Date
         * Freezing Storage Type
         * Frozen Note
         */

        const bean: Bean = new Bean();

        const nameEntry = entry['Name'];
        if (nameEntry) {
          bean.name = nameEntry.toString();
        } else {
          continue;
        }

        const weightEntry = entry['Weight'];
        if (weightEntry && Number(weightEntry) > 0) {
          bean.weight = Number(weightEntry);
        }

        const roastDateEntry = entry['Roast date'];
        if (roastDateEntry && Number(roastDateEntry) > 0) {
          bean.roastingDate = this.getJsDateFromExcel(Number(roastDateEntry));
        }

        const websiteEntry = entry['Website'];
        if (websiteEntry) {
          bean.url = websiteEntry.toString();
        }

        const roasterEntry = entry['Roaster'];
        if (roasterEntry) {
          bean.roaster = roasterEntry.toString();
        }

        const roastTypeEntry = entry['Roast type'];
        if (roastTypeEntry) {
          bean.bean_roasting_type = roastTypeEntry;
        }

        const flavourProfileEntry = entry['Flavour profile'];
        if (flavourProfileEntry) {
          bean.aromatics = flavourProfileEntry.toString();
        }

        const eanArticleNumberEntry = entry['EAN / Articlenumber'];
        if (eanArticleNumberEntry) {
          bean.ean_article_number = eanArticleNumberEntry.toString();
        }

        const degreeOfRoastEntry = entry['Degree of Roast'];
        if (degreeOfRoastEntry) {
          bean.roast = degreeOfRoastEntry;
        }
        const decaffeinatedEntry = entry['Decaffeinated'];
        if (decaffeinatedEntry) {
          bean.decaffeinated = decaffeinatedEntry;
        }

        const cuppingPointsEntry = entry['Cupping points'];
        if (cuppingPointsEntry) {
          bean.cupping_points = cuppingPointsEntry.toString();
        }

        const costEntry = entry['Cost'];
        if (costEntry) {
          bean.cost = Number(costEntry);
        }

        const blendEntry = entry['Blend'];
        if (blendEntry) {
          bean.beanMix = blendEntry;
        }

        const archivedEntry = entry['Archived'];
        if (archivedEntry) {
          bean.finished = archivedEntry;
        }

        const beanInformation: IBeanInformation = {} as IBeanInformation;
        let hasOneBeanInformation: boolean = false;

        const informationCertificationEntry = entry['1. Bean certification'];
        if (informationCertificationEntry) {
          beanInformation.certification =
            informationCertificationEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationCountryEntry = entry['1. Country'];
        if (informationCountryEntry) {
          beanInformation.country = informationCountryEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationElevationEntry = entry['1. Elevation'];
        if (informationElevationEntry) {
          beanInformation.elevation = informationElevationEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationFarmEntry = entry['1. Farm'];
        if (informationFarmEntry) {
          beanInformation.farm = informationFarmEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationFarmerEntry = entry['1. Farmer'];
        if (informationFarmerEntry) {
          beanInformation.farmer = informationFarmerEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationHarvestedEntry = entry['1. Harvested'];
        if (informationHarvestedEntry) {
          beanInformation.harvest_time = informationHarvestedEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationPercentageEntry = entry['1. Percentage'];
        if (
          informationPercentageEntry &&
          Number(informationPercentageEntry) > 0
        ) {
          beanInformation.percentage = Number(informationPercentageEntry);
          hasOneBeanInformation = true;
        }

        const informationProcessingEntry = entry['1. Processing'];
        if (informationProcessingEntry) {
          beanInformation.processing = informationProcessingEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationRegionEntry = entry['1. Region'];
        if (informationRegionEntry) {
          beanInformation.region = informationRegionEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationVarietyEntry = entry['1. Variety'];
        if (informationVarietyEntry) {
          beanInformation.variety = informationVarietyEntry.toString();
          hasOneBeanInformation = true;
        }

        const informationFobPriceEntry = entry['1. Fob Price'];
        if (informationFobPriceEntry && Number(informationFobPriceEntry) > 0) {
          beanInformation.fob_price = Number(informationFobPriceEntry);
          hasOneBeanInformation = true;
        }

        const informationPurchasingPriceEntry = entry['1. Purchasing Price'];
        if (
          informationPurchasingPriceEntry &&
          Number(informationPurchasingPriceEntry) > 0
        ) {
          beanInformation.purchasing_price = Number(
            informationPurchasingPriceEntry
          );
          hasOneBeanInformation = true;
        }

        if (hasOneBeanInformation) {
          varietyInformationWhereAdded = true;
          bean.bean_information.push(beanInformation);
        } else {
          /** Add atleast one empty bean information**/
          const emptyBeanInformation: IBeanInformation = {} as IBeanInformation;
          bean.bean_information.push(emptyBeanInformation);
        }

        const freezingStorageTypeEntry = entry['Freezing Storage Type'];
        if (freezingStorageTypeEntry) {
          bean.frozenStorageType = freezingStorageTypeEntry;
        }

        const frozenNoteEntry = entry['Frozen Note'];
        if (frozenNoteEntry) {
          bean.frozenNote = frozenNoteEntry;
        }

        const frozenDateEntry = entry['Frozen Date'];
        if (frozenDateEntry && Number(frozenDateEntry) > 0) {
          isOneEntryFrozen = true;
          bean.frozenDate = this.getJsDateFromExcel(Number(frozenDateEntry));
          bean.frozenId = this.uiBeanHelper.generateFrozenId();
        }

        const unfrozenDateEntry = entry['Unfrozen Date'];
        if (unfrozenDateEntry && Number(unfrozenDateEntry) > 0) {
          isOneEntryFrozen = true;
          bean.unfrozenDate = this.getJsDateFromExcel(
            Number(unfrozenDateEntry)
          );
        }
        toAddBeans.push(bean);
      }

      if (isOneEntryFrozen) {
        // Activate the frozen feature if not active
        if (this.settings.freeze_coffee_beans === false) {
          this.settings.freeze_coffee_beans = true;
          await this.uiSettingsStorage.saveSettings(this.settings);
        }
      }
      if (varietyInformationWhereAdded) {
        if (this.settings.bean_manage_parameters.bean_information === false) {
          this.settings.bean_manage_parameters.bean_information = true;
          await this.uiSettingsStorage.saveSettings(this.settings);
        }
      }

      /**
       * Add all beans afterwards to not have some added and then going into an exception
       */
      for await (const addBean of toAddBeans) {
        try {
          const newBean: Bean = await this.uiBeanStorage.add(addBean);
          addedBeans.push(newBean);
        } catch (ex) {}
      }

      if (addedBeans.length > 0) {
        try {
          await this.uiAlert.showMessage(
            'BEANS_IMPORTED_SUCCESSFULLY_DESCRIPTION',
            'IMPORT_SUCCESSFULLY',
            undefined,
            true
          );
        } catch (ex) {}
        this.uiBeanHelper.showBeans(addedBeans);
      } else {
        this.uiAlert.showMessage(
          'BEANS_IMPORTED_UNSUCCESSFULLY_WRONG_EXCELFILE',
          'IMPORT_UNSUCCESSFULLY',
          'OK',
          false
        );
      }
    } catch (ex) {
      this.uiAlert.showMessage(
        ex.message,
        this.translate.instant('IMPORT_UNSUCCESSFULLY'),
        this.translate.instant('OK'),
        false
      );
    }
  }

  private getJsDateFromExcel(_dateNumber) {
    return new Date((_dateNumber - (25567 + 2)) * 86400 * 1000).toISOString();
  }
  /* Export button */
  public async export() {
    await this.uiAlert.showLoadingSpinner();
    const wb: XLSX.WorkBook = this.write();

    const dateTimeStr: string = this.uiHelper.formateDate(
      new Date().getTime() / 1000,
      'DD_MM_YYYY_HH_mm_ss'
    );
    const filename: string = 'Beanconqueror_export_' + dateTimeStr + '.xlsx';
    try {
      /* generate Blob */
      const wbout: ArrayBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
      });
      const blob: Blob = new Blob([wbout], {
        type: 'application/octet-stream',
      });
      try {
        await this.uiFileHelper.exportFile(filename, blob, true);
        await this.uiAlert.hideLoadingSpinner();
      } catch (ex) {}
    } catch (e) {
      if (e.message.match(/It was determined/)) {
        /* in the browser, use writeFile */
        XLSX.writeFile(wb, filename);
      } else {
        this.uiAlert.showMessage(e.message);
        this.uiLog.log(`Excel export - Error occured: ${e.message}`);
      }
    }
    await this.uiAlert.hideLoadingSpinner();
  }
}
