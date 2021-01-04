/** Core */
import {Injectable} from '@angular/core';
/** Services */

import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';
import * as XLSX from 'xlsx';
import {File} from '@ionic-native/file/ngx';
import {Platform} from '@ionic/angular';
import {UIBrewStorage} from './uiBrewStorage';
import {TranslateService} from '@ngx-translate/core';
import {UIBeanStorage} from './uiBeanStorage';
import {BEAN_ROASTING_TYPE_ENUM} from '../enums/beans/beanRoastingType';
import {BEAN_MIX_ENUM} from '../enums/beans/mix';
import {UIPreparationStorage} from './uiPreparationStorage';



@Injectable({
  providedIn: 'root'
})
export class UIExcel {

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog,
              private readonly file: File,
              private readonly platform: Platform,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiPreparationStoraage: UIPreparationStorage,
              private readonly translate: TranslateService) {

  }
  private  write(): XLSX.WorkBook {
    /* generate worksheet */
    // const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(this.data);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();


    this.exportBrews(wb);
    this.exportBeans(wb);
    this.exportPreparationMethods(wb);
    return wb;
  };


  private exportPreparationMethods(_wb: XLSX.WorkBook)
  {
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
        this.uiHelper.formateDate(preparation.config.unix_timestamp, 'DD.MM.YYYY HH:mm:ss'),
        preparation.config.uuid
      ];


      wsData.push(entry)
    }

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(_wb, ws, this.translate.instant('NAV_PREPARATION'));

  }


  private exportBeans(_wb: XLSX.WorkBook)
  {
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
    header.push(this.translate.instant('EXCEL.BEAN.CREATION_DATE'));
    header.push(this.translate.instant('EXCEL.BEAN.ID'));
    header.push(this.translate.instant('ARCHIVED'));



    const wsData: any[][] = [header];
    let maxSortRepeats: number = 1;
    for (const bean of this.uiBeanStorage.getAllEntries()) {
      const entry: Array<any> = [
        bean.name,
        bean.roaster,
        this.uiHelper.formateDatestr(bean.roastingDate, 'DD.MM.YYYY'),
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
        this.uiHelper.formateDate(bean.config.unix_timestamp, 'DD.MM.YYYY HH:mm:ss'),
        bean.config.uuid,
        bean.finished
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
        entry.push(sortInformation.farmer);
      }

      wsData.push(entry)
    }

    for (let i=0; i < maxSortRepeats; i++) {
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_COUNTRY'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_REGION'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_FARM'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_FARMER'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_ELEVATION'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_VARIETY'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_PROCESSING'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_HARVEST_TIME'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_PERCENTAGE'));
      header.push((i+1) + '. ' + this.translate.instant('BEAN_DATA_CERTIFICATION'));
    }
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(_wb, ws, this.translate.instant('NAV_BEANS'));

  }


  private exportBrews(_wb: XLSX.WorkBook)
  {

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
    header.push(this.translate.instant('BREW_DATA_COFFEE_BLOOMING_TIME'));
    header.push(this.translate.instant('BREW_DATA_COFFEE_FIRST_DRIP_TIME'));
    header.push(this.translate.instant('BREW_DATA_BREW_QUANTITY'));
    header.push(this.translate.instant('BREW_DATA_COFFEE_TYPE'));
    header.push(this.translate.instant('BREW_DATA_COFFEE_CONCENTRATION'));
    header.push(this.translate.instant('BREW_DATA_RATING'));
    header.push(this.translate.instant('BREW_DATA_NOTES'));
    header.push(this.translate.instant('BREW_DATA_BREW_BEVERAGE_QUANTITY'));
    header.push(this.translate.instant('BREW_DATA_TDS'));
    header.push(this.translate.instant('BREW_DATA_CALCULATED_EXTRACTION_YIELD'));
    header.push(this.translate.instant('BREW_CREATION_DATE'));
    header.push(this.translate.instant('BREW_INFORMATION_BREW_RATIO'));
    header.push(this.translate.instant('BREW_INFORMATION_BEAN_AGE'));
    header.push(this.translate.instant('ARCHIVED'));

    const wsData: any[][] = [header];
    for (const brew of this.uiBrewStorage.getAllEntries()) {


      const entry: Array<any> = [

        brew.grind_size,
        brew.grind_weight,
        brew.brew_temperature,
        brew.getPreparation().name,
        brew.getBean().name,
        brew.getMill().name,
        brew.mill_speed,
        brew.mill_timer,
        brew.pressure_profile,
        brew.getPreparation().tools.filter((e)=> brew.method_of_preparation_tools.includes(e.config.uuid) === true).map((e) => e.name).join(','),
        brew.brew_temperature_time,
        brew.coffee_blooming_time,
        brew.coffee_first_drip_time,
        brew.brew_quantity + ' ' + brew.brew_quantity_type,
        brew.coffee_type,
        brew.coffee_concentration,
        brew.rating,
        brew.note,
        brew.brew_beverage_quantity  + ' ' + brew.brew_beverage_quantity_type,
        brew.tds,
        brew.getExtractionYield(),
        this.uiHelper.formateDate(brew.config.unix_timestamp, 'DD.MM.YYYY HH:mm:ss'),
        brew.getBrewRatio(),
        brew.getCalculatedBeanAge(),
        brew.getBean().finished,
      ];
      wsData.push(entry)
    }
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(_wb, ws,  this.translate.instant('NAV_BREWS'))
  }


  /* Export button */
  public async export() {
    const wb: XLSX.WorkBook = this.write();
    const filename: string = 'Export.xlsx';
    try {
      /* generate Blob */
      const wbout: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob: Blob = new Blob([wbout], {type: 'application/octet-stream'});

      /* find appropriate path for mobile */
      if (this.platform.is('cordova')) {
        const target: string = this.file.documentsDirectory || this.file.externalDataDirectory || this.file.dataDirectory || '';
        const dentry = await this.file.resolveDirectoryUrl(target);
        const url: string = dentry.nativeURL || '';

        /* attempt to save blob to file */
        await this.file.writeFile(url, filename, blob, {replace: true});
      }
     else {
      setTimeout(() => {
        if (navigator.msSaveBlob) { // IE 10+
          navigator.msSaveBlob(blob, filename);
        } else {
          const link = document.createElement('a');
          if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);


          }
        }
      }, 250);
     }
    } catch(e) {
      if(e.message.match(/It was determined/)) {
        /* in the browser, use writeFile */
        XLSX.writeFile(wb, filename);
      }
      else alert(`Error: ${e.message}`);
    }
  };



}
