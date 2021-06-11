import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIStatistic} from '../../services/uiStatistic';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';
import {ModalController} from '@ionic/angular';
import {Brew} from '../../classes/brew/brew';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {Router} from '@angular/router';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {Bean} from '../../classes/bean/bean';
import {UIBeanHelper} from '../../services/uiBeanHelper';
import {UIAnalytics} from '../../services/uiAnalytics';
import {ServerCommunicationService} from '../../services/serverCommunication/server-communication.service';

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  public brews: Array<Brew> = [];
  private leftOverBeansWeight: number = undefined;
  constructor(public uiStatistic: UIStatistic,
              private readonly modalCtrl: ModalController,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly router: Router,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly uiAnalytics: UIAnalytics,
              private readonly serverCommunication: ServerCommunicationService) {
  }

  public ngOnInit(): void {

    this.serverCommunication.getBeanInformation(1);
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
    this.brews = this.brews.slice(0, 10);
    this.changeDetectorRef.detectChanges();
  }

  public async addBrew() {

      await this.uiBrewHelper.addBrew();
      this.loadBrews();
      this.router.navigate(['/home/brews']);
  }

  public async longPressAdd(event) {
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
      const openBeans: Array<Bean> = this.uiBeanStorage.getAllEntries().filter(
        (bean) => !bean.finished);
      for (const bean of openBeans) {

        if (bean.weight > 0) {
          leftOverCount  += (bean.weight - this.getUsedWeightCount(bean));
        }
      }


      this.leftOverBeansWeight = leftOverCount;
    }
    if (this.leftOverBeansWeight <1000) {
      return (Math.round(this.leftOverBeansWeight * 100) / 100 )+ ' g';

    } else {
      return (Math.round((this.leftOverBeansWeight / 1000) * 100) / 100) + ' kg';
    }

  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(_bean.config.uuid);
    for (const brew of relatedBrews) {
      usedWeightCount += brew.grind_weight;
    }
    return usedWeightCount;
  }


}
