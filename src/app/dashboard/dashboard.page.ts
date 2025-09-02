import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UIStatistic } from '../../services/uiStatistic';
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
import { Capacitor } from '@capacitor/core';
import { CameraPreview } from '@capgo/camera-preview';

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  public brews: Array<Brew> = [];
  public beans: Array<Bean> = [];
  public leftOverBeansWeight: string = undefined;
  public leftOverFrozenBeansWeight: string = undefined;
  public getBeansCount: number = undefined;
  public getBrewsDrunk: number = undefined;
  public getTimePassedSinceLastBrew: string = undefined;
  public getTimePassedSinceLastBrewMessage: string = undefined;
  public settings: Settings;

  constructor(
    public uiStatistic: UIStatistic,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly router: Router,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiMillStorage: UIMillStorage,
  ) {}

  private async __resizeCamera() {
    if (this.cameraIsVisible && Capacitor.getPlatform() !== 'web') {
      setTimeout(async () => {
        const rect = document
          .getElementById('cameraPreview')
          .getBoundingClientRect();
        await CameraPreview.setPreviewSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          y: Math.round(rect.y),
          x: Math.round(rect.x),
        });
      }, 500);
    }
  }
  public cameraIsVisible: boolean = false;

  private async stopCamera() {
    if (this.cameraIsVisible) {
      await CameraPreview.stop();
      await CameraPreview.removeAllListeners();
      this.cameraIsVisible = false;
    }
  }
  public async toggleCamera() {
    if (this.cameraIsVisible) {
      await this.stopCamera();
    } else {
      this.cameraIsVisible = true;
      setTimeout(async () => {
        let cameraPreviewOptions;
        let rect = document
          .getElementById('cameraPreview')
          .getBoundingClientRect();
        if (Capacitor.getPlatform() !== 'web') {
          cameraPreviewOptions = {
            disableAudio: true,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            y: Math.round(rect.y),
            x: Math.round(rect.x),
            parent: 'cameraPreview',
            position: 'front' as const,
            toBack: false,
          };
        } else {
          cameraPreviewOptions = {
            disableAudio: true,
            parent: 'cameraPreview',
            position: 'front' as const,
            toBack: false,
          };
        }

        await CameraPreview.start(cameraPreviewOptions);

        await CameraPreview.addListener(
          'screenResize',
          this.__resizeCamera.bind(this),
        );

        setTimeout(async () => {
          this.__resizeCamera();
        }, 250);
      }, 1000);
    }
  }

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
    this.loadBeans();
    // If an brew is deleted, we need to reset our array for the next call.
    this.setOpenFrozenBeansLeftOverCount();
    this.setOpenBeansLeftOverCount();
    this.getBeansCount = this.uiStatistic.getBeansCount();
    this.getBrewsDrunk = this.uiStatistic.getBrewsDrunk();
    this.getTimePassedSinceLastBrew =
      this.uiStatistic.getTimePassedSinceLastBrew();
    this.getTimePassedSinceLastBrewMessage =
      this.uiStatistic.getTimePassedSinceLastBrewMessage();

    this.brews = [];
    /**Short timeout needed, else the filter pipe is not working correctly**/
    setTimeout(() => {
      this.loadBrews();
    }, 50);
  }

  public async ionViewWillEnter() {
    this.loadBeans();
    this.reloadBrews();
  }
  public loadBeans() {
    this.beans = this.uiBeanStorage.getAllEntries();
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
          e.getPreparation().finished === false,
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

  public setOpenBeansLeftOverCount() {
    // #183
    let leftOverCount: number = 0;
    const openBeans: Array<Bean> = this.beans.filter(
      (bean) => !bean.finished && bean.isFrozen() === false,
    );
    for (const bean of openBeans) {
      if (bean.weight > 0) {
        leftOverCount += bean.weight - this.getUsedWeightCount(bean);
      }
    }

    if (leftOverCount < 1000) {
      this.leftOverBeansWeight = Math.round(leftOverCount * 100) / 100 + ' g';
    } else {
      this.leftOverBeansWeight =
        Math.round((leftOverCount / 1000) * 100) / 100 + ' kg';
    }
  }

  public setOpenFrozenBeansLeftOverCount() {
    // #183

    let leftOverCount: number = 0;
    const openBeans: Array<Bean> = this.beans.filter(
      (bean) => !bean.finished && bean.isFrozen() === true,
    );
    for (const bean of openBeans) {
      if (bean.weight > 0) {
        leftOverCount += bean.weight - this.getUsedWeightCount(bean);
      }
    }
    if (leftOverCount < 1000) {
      this.leftOverFrozenBeansWeight =
        Math.round(leftOverCount * 100) / 100 + ' g';
    } else {
      this.leftOverFrozenBeansWeight =
        Math.round((leftOverCount / 1000) * 100) / 100 + ' kg';
    }
  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      _bean.config.uuid,
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
