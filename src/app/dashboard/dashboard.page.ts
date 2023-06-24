import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { UIStatistic } from '../../services/uiStatistic';
import { ModalController } from '@ionic/angular';
import { Brew } from '../../classes/brew/brew';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { BREW_ACTION } from '../../enums/brews/brewAction';
import { Router } from '@angular/router';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { Bean } from '../../classes/bean/bean';
import { UIBeanHelper } from '../../services/uiBeanHelper';

import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Preparation } from '../../classes/preparation/preparation';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UIMillStorage } from '../../services/uiMillStorage';
import { Mill } from '../../classes/mill/mill';
@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  public brews: Array<Brew> = [];
  private leftOverBeansWeight: number = undefined;
  @ViewChild('flowProfileChart', { static: false }) public flowProfileChart;
  public flowProfileChartEl: any = undefined;

  constructor(
    public uiStatistic: UIStatistic,
    private readonly modalCtrl: ModalController,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly router: Router,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiMillStorage: UIMillStorage
  ) {}

  public async importTestData() {
    const prep: Preparation = new Preparation();
    prep.name = 'Test 1';
    await this.uiPreparationStorage.add(prep);

    const mill: Mill = new Mill();
    prep.name = 'Test 1';
    await this.uiMillStorage.add(prep);
    for (let i = 0; i < 1000; i++) {
      const bean: Bean = new Bean();
      bean.name = 'Test ' + i;
      await this.uiBeanStorage.add(bean);
    }
    const uuidPrep = this.uiPreparationStorage.getAllEntries()[0].config.uuid;
    const uuidBean = this.uiBeanStorage.getAllEntries()[0].config.uuid;
    const uuidMilll = this.uiMillStorage.getAllEntries()[0].config.uuid;
    for (let i = 0; i < 4000; i++) {
      const brew: Brew = new Brew();
      brew.method_of_preparation = uuidPrep;
      brew.bean = uuidBean;
      brew.mill = uuidMilll;
      await this.uiBrewStorage.add(brew);
    }
    console.log('finished');
  }

  public ngOnInit() {
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.leftOverBeansWeight = undefined;
    });

    this.uiBeanStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.leftOverBeansWeight = undefined;
    });
  }

  public ionViewWillEnter() {
    this.loadBrews();
  }

  public loadBrews() {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.brews = UIBrewHelper.sortBrews(this.brews);
    const settings = this.uiSettingsStorage.getSettings();
    if (settings.show_archived_brews_on_dashboard === false) {
      this.brews = this.brews.filter(
        (e) =>
          e.getBean().finished === false &&
          e.getMill().finished === false &&
          e.getPreparation().finished === false
      );
    }
    this.brews = this.brews.slice(0, 10);
    this.changeDetectorRef.detectChanges();
  }

  public async addBrew() {
    await this.uiBrewHelper.addBrew();
    this.loadBrews();
    this.router.navigate(['/home/brews']);
  }

  public async longPressAdd(event: Event) {
    event.preventDefault();
    event.cancelBubble = true;

    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.uiBrewHelper.longPressAddBrew();
    this.loadBrews();
    this.router.navigate(['/home/brews']);
  }

  public getBrews() {
    return this.brews;
  }

  public async brewAction(action: BREW_ACTION, brew: Brew): Promise<void> {
    this.loadBrews();
  }

  public openBeansLeftOverCount(): string {
    // #183
    if (this.leftOverBeansWeight === undefined) {
      let leftOverCount: number = 0;
      const openBeans: Array<Bean> = this.uiBeanStorage
        .getAllEntries()
        .filter((bean) => !bean.finished);
      for (const bean of openBeans) {
        if (bean.weight > 0) {
          leftOverCount += bean.weight - this.getUsedWeightCount(bean);
        }
      }

      this.leftOverBeansWeight = leftOverCount;
    }
    if (this.leftOverBeansWeight < 1000) {
      return Math.round(this.leftOverBeansWeight * 100) / 100 + ' g';
    } else {
      return Math.round((this.leftOverBeansWeight / 1000) * 100) / 100 + ' kg';
    }
  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      _bean.config.uuid
    );
    for (const brew of relatedBrews) {
      if (brew?.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }
}
