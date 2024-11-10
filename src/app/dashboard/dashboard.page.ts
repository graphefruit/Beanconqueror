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
import { Settings } from '../../classes/settings/settings';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UIMillStorage } from '../../services/uiMillStorage';

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  public brews: Array<Brew> = [];
  private leftOverBeansWeight: number = undefined;
  private leftOverFrozenBeansWeight: number = undefined;
  public settings: Settings;

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

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      this.reloadBrews();
    });

    this.uiBeanStorage.attachOnEvent().subscribe((_val) => {
      this.reloadBrews();
    });
    this.uiPreparationStorage.attachOnEvent().subscribe((_val) => {
      this.reloadBrews();
    });
    this.uiMillStorage.attachOnEvent().subscribe((_val) => {
      this.reloadBrews();
    });
  }

  private reloadBrews() {
    // If an brew is deleted, we need to reset our array for the next call.
    this.leftOverBeansWeight = undefined;
    this.leftOverFrozenBeansWeight = undefined;
    this.brews = [];
    /**Short timeout needed, else the filter pipe is not working correctly**/
    setTimeout(() => {
      this.loadBrews();
    }, 50);
  }

  public async ionViewWillEnter() {
    this.reloadBrews();
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
        .filter((bean) => !bean.finished && bean.isFrozen() === false);
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

  public openFrozenBeansLeftOverCount(): string {
    // #183
    if (this.leftOverFrozenBeansWeight === undefined) {
      let leftOverCount: number = 0;
      const openBeans: Array<Bean> = this.uiBeanStorage
        .getAllEntries()
        .filter((bean) => !bean.finished && bean.isFrozen() === true);
      for (const bean of openBeans) {
        if (bean.weight > 0) {
          leftOverCount += bean.weight - this.getUsedWeightCount(bean);
        }
      }

      this.leftOverFrozenBeansWeight = leftOverCount;
    }
    if (this.leftOverFrozenBeansWeight < 1000) {
      return Math.round(this.leftOverFrozenBeansWeight * 100) / 100 + ' g';
    } else {
      return (
        Math.round((this.leftOverFrozenBeansWeight / 1000) * 100) / 100 + ' kg'
      );
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
