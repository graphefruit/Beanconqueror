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
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { analyticsOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Graph } from '../../../classes/graph/graph';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { GraphInformationCardComponent } from '../../../components/graph-information-card/graph-information-card.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../../components/virtual-list/virtual-list.component';
import { GREEN_BEAN_ACTION } from '../../../enums/green-beans/greenBeanAction';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIGraphHelper } from '../../../services/uiGraphHelper';
import { UIGraphStorage } from '../../../services/uiGraphStorage.service';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.page.html',
  styleUrls: ['./graph.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    VirtualListComponent,
    VirtualRowDirective,
    GraphInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
  ],
})
export class GraphPage implements OnInit {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiGraphStorage = inject(UIGraphStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiGraphHelper = inject(UIGraphHelper);

  private graphs: Graph[] = [];

  public openGraphs: Graph[] = [];
  public finishedGraphs: Graph[] = [];

  public segment = 'open';
  private readonly list =
    viewChild<VirtualListComponent<Graph>>(VirtualListComponent);
  public readonly graphKey = (graph: Graph): string => graph.config.uuid;

  public settings: Settings;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({ analyticsOutline });
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
    await this.uiGraphHelper.addGraph();
    this.load();
  }

  private __initializeView(_type: string) {
    // sort latest to top.
    const copyObj: Graph[] = [...this.graphs];
    const isOpen: boolean = _type === 'open';
    let sortedBeans: Graph[];
    if (isOpen) {
      sortedBeans = copyObj.filter((w) => !w.finished);
    } else {
      sortedBeans = copyObj.filter((w) => w.finished);
    }
    if (isOpen) {
      this.openGraphs = sortedBeans;
    } else {
      this.finishedGraphs = sortedBeans;
    }
  }

  public ngOnInit() {}

  private __initialize(): void {
    this.graphs = this.uiGraphStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openGraphs = [];
    this.finishedGraphs = [];
    this.__initializeView('open');
    this.__initializeView('archiv');
  }
}

export default GraphPage;
