import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import moment from 'moment/moment';
import BeanconquerorFlowTestDataDummy from '../../../../assets/BeanconquerorFlowTestDataFourth.json';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { Settings } from '../../../../classes/settings/settings';
import { TranslateService } from '@ngx-translate/core';
import { IGraph } from '../../../../interfaces/graph/iGraph';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIHelper } from '../../../../services/uiHelper';
import { ModalController, Platform } from '@ionic/angular';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { IBrew } from '../../../../interfaces/brew/iBrew';
import { GraphHelperService } from '../../../../services/graphHelper/graph-helper.service';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
declare var Plotly;
@Component({
  selector: 'app-graph-detail',
  templateUrl: './graph-detail.component.html',
  styleUrls: ['./graph-detail.component.scss'],
})
export class GraphDetailComponent implements OnInit {
  public static COMPONENT_ID = 'graph-detail';
  public flow_profile_raw: BrewFlow = new BrewFlow();

  public settings: Settings;

  public traces: any = {};
  public lastChartLayout: any = undefined;
  public flowProfileLoading: boolean = true;

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  public profileDiv: ElementRef;

  @Input() private graph: IGraph;
  @Input() private brew: IBrew;

  @Input() private flowProfileData: any;

  constructor(
    private readonly translate: TranslateService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiHelper: UIHelper,
    private readonly platform: Platform,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly modalController: ModalController,
    private readonly graphHelper: GraphHelperService
  ) {}

  public ngOnInit() {}
  public async ionViewWillEnter() {
    this.settings = this.uiSettingsStorage.getSettings();

    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.DETAIL
    );
    if (this.graph) {
      await this.readFlowProfile(this.graph.flow_profile);
    } else if (this.brew) {
      await this.readFlowProfile(this.brew.flow_profile);
    } else {
      this.flow_profile_raw = this.uiHelper.cloneData(this.flowProfileData);
    }
  }

  public async ionViewDidEnter() {
    setTimeout(() => {
      this.initializeFlowChart();
      setTimeout(() => {
        // After the chips are not visible actually, we need to relayout, when we're in portrait format, else we get a scrolling bar, because the chips are higher
        Plotly.relayout(this.profileDiv.nativeElement, this.getChartLayout());
      }, 300);
    }, 50);
  }
  public toggleChartLines(_type: string) {
    if (_type === 'weight') {
      this.traces.weightTrace.visible = !this.traces.weightTrace.visible;
    } else if (_type === 'calc_flow') {
      this.traces.flowPerSecondTrace.visible =
        !this.traces.flowPerSecondTrace.visible;
    } else if (_type === 'realtime_flow') {
      this.traces.realtimeFlowTrace.visible =
        !this.traces.realtimeFlowTrace.visible;
    } else if (_type === 'pressure') {
      this.traces.pressureTrace.visible = !this.traces.pressureTrace.visible;
    } else if (_type === 'temperature') {
      this.traces.temperatureTrace.visible =
        !this.traces.temperatureTrace.visible;
    } else if (_type === 'weightSecond') {
      this.traces.weightTraceSecond.visible =
        !this.traces.weightTraceSecond.visible;
    } else if (_type === 'realtimeFlowSecond') {
      this.traces.realtimeFlowTraceSecond.visible =
        !this.traces.realtimeFlowTraceSecond.visible;
    }

    Plotly.relayout(this.profileDiv.nativeElement, this.lastChartLayout);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    setTimeout(() => {
      this.initializeFlowChart();
    }, 250);
  }

  private getChartConfig() {
    const config = {
      responsive: true,
      displayModeBar: false, // this is the line that hides the bar.
    };
    return config;
  }
  private getChartLayout() {
    /* Important - we use scatter instead of scattergl, because we can't have many openGL contexts
     * - https://github.com/plotly/plotly.js/issues/2333 -
     * */
    const chartWidth: number = this.canvaContainer.nativeElement.offsetWidth;

    const chartHeight: number = this.canvaContainer.nativeElement.offsetHeight;

    const layout = this.graphHelper.getChartLayout(
      this.traces,
      PREPARATION_STYLE_TYPE.FULL_IMMERSION,
      false,
      false,
      true,
      chartWidth,
      chartHeight
    );
    this.lastChartLayout = layout;
    return layout;
  }
  public initializeFlowChart(): void {
    setTimeout(() => {
      try {
        Plotly.purge(this.profileDiv.nativeElement);
      } catch (ex) {}
      const graphSettings = this.settings.graph.FILTER;

      this.traces = this.graphHelper.initializeTraces();
      this.traces = this.graphHelper.fillTraces(
        this.traces,
        graphSettings,
        true
      );

      this.graphHelper.fillDataIntoTraces(this.flow_profile_raw, this.traces);

      const chartData = [
        this.traces.weightTrace,
        this.traces.flowPerSecondTrace,
        this.traces.realtimeFlowTrace,
      ];

      const layout = this.getChartLayout();

      chartData.push(this.traces.pressureTrace);
      chartData.push(this.traces.temperatureTrace);
      chartData.push(this.traces.weightTraceSecond);
      chartData.push(this.traces.realtimeFlowTraceSecond);

      Plotly.newPlot(
        this.profileDiv.nativeElement,
        chartData,
        layout,
        this.getChartConfig()
      );
      this.flowProfileLoading = false;
    }, 100);
  }

  private async readFlowProfile(_path) {
    if (this.platform.is('cordova')) {
      if (_path !== '') {
        try {
          const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
            _path
          );
          this.flow_profile_raw = jsonParsed;
        } catch (ex) {}
      }
    } else {
      this.flow_profile_raw = BeanconquerorFlowTestDataDummy as any;
    }
  }
  public ngOnDestroy() {
    try {
      Plotly.purge(this.profileDiv.nativeElement);
    } catch (ex) {}
  }
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GraphDetailComponent.COMPONENT_ID
    );
  }
}
