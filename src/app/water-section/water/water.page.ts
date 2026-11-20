import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, waterOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { Water } from '../../../classes/water/water';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../../components/virtual-list/virtual-list.component';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    VirtualListComponent,
    VirtualRowDirective,
    WaterInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
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

  private waters: Water[] = [];

  public openWaters: Water[] = [];
  public finishedWaters: Water[] = [];

  public segment = 'open';
  private readonly list =
    viewChild<VirtualListComponent<Water>>(VirtualListComponent);
  public readonly waterKey = (water: Water): string => water.config.uuid;

  public settings: Settings;

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({ add, waterOutline });
  }

  public ionViewWillEnter(): void {
    this.load();
  }

  public load(): void {
    this.__initialize();
    this.changeDetectorRef.detectChanges();
  }

  public segmentChanged() {
    this.list()?.scrollToTop();
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
    const copyObj: Water[] = [...this.waters];
    const isOpen: boolean = _type === 'open';
    let sortedBeans: Water[];
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
