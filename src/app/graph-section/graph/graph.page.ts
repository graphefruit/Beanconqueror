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
  IonIcon,
  IonLabel,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { Graph } from '../../../classes/graph/graph';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { GraphInformationCardComponent } from '../../../components/graph-information-card/graph-information-card.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
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
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    GraphInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonMenuButton,
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

  @ViewChild('graphContent', { read: ElementRef })
  public graphContent: ElementRef;

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualScrollComponent;
  public segment = 'open';

  public settings: Settings;
  public segmentScrollHeight: string = undefined;
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
      const el = this.graphContent.nativeElement;
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
    this.retriggerScroll();
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
