import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';

import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { Settings } from '../../../classes/settings/settings';
import { ModalController } from '@ionic/angular';
import { UIGraphStorage } from '../../../services/uiGraphStorage.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';

import { GREEN_BEAN_ACTION } from '../../../enums/green-beans/greenBeanAction';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Graph } from '../../../classes/graph/graph';
import { UIGraphHelper } from '../../../services/uiGraphHelper';

@Component({
    selector: 'app-graph',
    templateUrl: './graph.page.html',
    styleUrls: ['./graph.page.scss'],
    standalone: false
})
export class GraphPage implements OnInit {
  private graphs: Array<Graph> = [];

  public openGraphs: Array<Graph> = [];
  public finishedGraphs: Array<Graph> = [];

  @ViewChild('graphContent', { read: ElementRef })
  public graphContent: ElementRef;

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', { read: AgVirtualSrollComponent, static: false })
  public archivedScroll: AgVirtualSrollComponent;
  public segment: string = 'open';

  public settings: Settings;
  public segmentScrollHeight: string = undefined;
  constructor(
    public modalCtrl: ModalController,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiAlert: UIAlert,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiGraphHelper: UIGraphHelper
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
      const el = this.graphContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
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
    bean: GreenBean
  ): Promise<void> {
    this.load();
  }

  public async add() {
    await this.uiGraphHelper.addGraph();
    this.load();
  }

  private __initializeView(_type: string) {
    // sort latest to top.
    const copyObj: Array<Graph> = [...this.graphs];
    const isOpen: boolean = _type === 'open';
    let sortedBeans: Array<Graph>;
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
