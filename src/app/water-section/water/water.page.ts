import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonLabel,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { waterOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { Water } from '../../../classes/water/water';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { WaterInformationCardComponent } from '../../../components/water-information-card/water-information-card.component';
import { GREEN_BEAN_ACTION } from '../../../enums/green-beans/greenBeanAction';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIWaterHelper } from '../../../services/uiWaterHelper';
import { UIWaterStorage } from '../../../services/uiWaterStorage';

@Component({
  selector: 'app-water',
  templateUrl: './water.page.html',
  styleUrls: ['./water.page.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    WaterInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
})
export class WaterPage implements OnInit {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiWaterHelper = inject(UIWaterHelper);

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
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({ waterOutline });
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
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }
  private retriggerScroll() {
    setTimeout(() => {
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

      // HACK: Manually trigger component refresh to work around initialization
      //       bug. For some reason the scroll component sees its own height as
      //       0 during initialization, which causes it to render 0 items. As
      //       no changes to the component occur after initialization, no
      //       re-render ever occurs. This forces one. The root cause for
      //       this issue is currently unknown.
      if (scrollComponent.items.length === 0) {
        scrollComponent.refreshData();
      }
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

export default WaterPage;
