import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Bean} from '../../../classes/bean/bean';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {IBean} from '../../../interfaces/bean/iBean';
import {ModalController, NavParams} from '@ionic/angular';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIImage} from '../../../services/uiImage';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {Brew} from '../../../classes/brew/brew';
import {TranslateService} from '@ngx-translate/core';
import {Chart} from 'chart.js';

@Component({
  selector: 'beans-information',
  templateUrl: './beans-information.component.html',
  styleUrls: ['./beans-information.component.scss'],
})
export class BeansInformationComponent implements OnInit {

  public data: Bean = new Bean();
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  @Input() private bean: IBean;

  @ViewChild('beanChart', {static: false}) public beanChart;

  constructor(private readonly navParams: NavParams,
              private readonly modalController: ModalController,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiImage: UIImage,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly translate: TranslateService) {
    this.data.roastingDate = new Date().toISOString();
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'INFORMATION');
    //  this.bean = this.navParams.get('BEAN');
    this.data.initializeByObject(this.bean);
    this.__loadBeanChart();
  }

  public countAwesomeBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      if (brew.isAwesomeBrew()) {
        counter++;
      }
    }

    return counter;
  }
  public countGoodBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      if (brew.isGoodBrew()) {
        counter++;
      }
    }

    return counter;
  }

  public countBadBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      if (brew.isBadBrew()) {
        counter++;
      }
    }

    return counter;
  }

  public countNotRatedBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      if (brew.isNotRatedBrew()) {
        counter++;
      }
    }

    return counter;
  }

  public countIsNormalBrew() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      if (brew.isNormalBrew()) {
        counter++;
      }
    }

    return counter;
  }


  public countBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      counter++;
    }

    return counter;
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    });
  }

  public ngOnInit() {
  }

  private __getAllBrewsForThisBean(): Array<Brew> {
    const brewsForThisBean: Array<Brew> = [];
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const beanUUID: string = this.data.config.uuid;
    for (const brew of brews) {
      if (brew.bean === beanUUID) {
        brewsForThisBean.push(brew);
      }
    }
    return brewsForThisBean;
  }

  private __loadBeanChart(): void {


    const drinkingData = {
      labels: [],
      datasets: [{
        label: '',
        data: [],
        backgroundColor: []
      }]
    };


    const countAwesome = this.countAwesomeBrews();
    if (countAwesome > 0) {
      drinkingData.labels.push(this.translate.instant('PAGE_BEAN_INFORMATION_AWESOME_BREWS'));
      drinkingData.datasets[0].data.push(countAwesome);
      drinkingData.datasets[0].backgroundColor.push('#aa8736');
    }

    const countGood = this.countGoodBrews();
    if (countGood > 0) {
      drinkingData.labels.push(this.translate.instant('PAGE_BEAN_INFORMATION_GOOD_BREWS'));
      drinkingData.datasets[0].data.push(countGood);
      drinkingData.datasets[0].backgroundColor.push('#009966');
    }
    const countNormal = this.countIsNormalBrew();
    if (countNormal > 0) {
      drinkingData.labels.push(this.translate.instant('PAGE_BEAN_INFORMATION_NORMAL_BREWS'));
      drinkingData.datasets[0].data.push(countNormal);
      drinkingData.datasets[0].backgroundColor.push('#89729e');
    }

    const countBad = this.countBadBrews();
    if (countBad > 0) {
      drinkingData.labels.push(this.translate.instant('PAGE_BEAN_INFORMATION_BAD_BREWS'));
      drinkingData.datasets[0].data.push(countBad);
      drinkingData.datasets[0].backgroundColor.push('#fe4164');
    }


    const countNotRated = this.countNotRatedBrews();
    if (countNotRated > 0) {
      drinkingData.labels.push(this.translate.instant('PAGE_BEAN_INFORMATION_NOT_RATED_BREWS'));
      drinkingData.datasets[0].data.push(countNotRated);
      drinkingData.datasets[0].backgroundColor.push('#cfd7e1');
    }

    const chartOptions = {
      responsive: true,
      title: {
        display: true,
        text: this.translate.instant('PAGE_BEAN_BREW_CHART_TITLE'),
      }
    };
    this.beanChart = new Chart(this.beanChart.nativeElement, {
      type: 'pie',
      data: drinkingData,
      options: chartOptions
    });
  }




}
