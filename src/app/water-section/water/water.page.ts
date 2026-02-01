import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Water } from '../../../classes/water/water';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import { Settings } from '../../../classes/settings/settings';
import { ModalController } from '@ionic/angular';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import { UIAlert } from '../../../services/uiAlert';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { GREEN_BEAN_ACTION } from '../../../enums/green-beans/greenBeanAction';
import { GreenBean } from '../../../classes/green-bean/green-bean';

import { UIWaterHelper } from '../../../services/uiWaterHelper';

@Component({
  selector: 'app-water',
  templateUrl: './water.page.html',
  styleUrls: ['./water.page.scss'],
  standalone: false,
})
export class WaterPage implements OnInit {
  private waters: Array<Water> = [];

  public openWaters: Array<Water> = [];
  public finishedWaters: Array<Water> = [];

  @ViewChild('waterContent', { read: ElementRef })
  public waterContent: ElementRef;

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualScrollComponent;
  public segment: string = 'open';

  public settings: Settings;

  public segmentScrollHeight: string = undefined;
  constructor(
    public modalCtrl: ModalController,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly uiAlert: UIAlert,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiWaterHelper: UIWaterHelper,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ionViewWillEnter(): void {
    this.load();
  }

  public load(): void {
    this.__initialize();
    this.changeDetectorRef.detectChanges();
    this.retriggerScroll();
  }

  public segmentChanged() {
    this.retriggerScroll();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }
  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.waterContent.nativeElement;
      let scrollComponent: AgVirtualScrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';
      this.segmentScrollHeight = scrollComponent.el.style.height;
    }, 250);
  }

  public async triggerAction(
    action: GREEN_BEAN_ACTION,
    bean: GreenBean,
  ): Promise<void> {
    this.load();
  }

  public async add() {
    await this.uiWaterHelper.addWater();
    this.load();
  }

  private __initializeView(_type: string) {
    // sort latest to top.
    const copyObj: Array<Water> = [...this.waters];
    const isOpen: boolean = _type === 'open';
    let sortedBeans: Array<Water>;
    if (isOpen) {
      sortedBeans = copyObj.filter((w) => !w.finished);
    } else {
      sortedBeans = copyObj.filter((w) => w.finished);
    }
    if (isOpen) {
      this.openWaters = sortedBeans;
    } else {
      this.finishedWaters = sortedBeans;
    }
    this.retriggerScroll();
  }

  public ngOnInit() {}

  private __initialize(): void {
    this.waters = this.uiWaterStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openWaters = [];
    this.finishedWaters = [];
    this.__initializeView('open');
    this.__initializeView('archiv');
  }
}
