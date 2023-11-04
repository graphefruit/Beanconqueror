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
import { Graph } from '../../../../classes/graph/graph';
import { IGraph } from '../../../../interfaces/graph/iGraph';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIHelper } from '../../../../services/uiHelper';
import { ModalController, Platform } from '@ionic/angular';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
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

  private weightTrace: any;
  private flowPerSecondTrace: any;
  private realtimeFlowTrace: any;
  private pressureTrace: any;
  private temperatureTrace: any;
  public lastChartLayout: any = undefined;
  public flowProfileLoading: boolean = true;

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  public profileDiv: ElementRef;

  @ViewChild('graphDetail', { read: ElementRef, static: true })
  public graphDetail: ElementRef;
  @ViewChild('graphHeader', { read: ElementRef, static: true })
  public graphHeader: ElementRef;

  public data: Graph = new Graph();

  @Input() private graph: IGraph;
  @Input() private flowProfileData: any;

  constructor(
    private readonly translate: TranslateService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiHelper: UIHelper,
    private readonly platform: Platform,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly modalController: ModalController
  ) {}

  public ngOnInit() {}
  public async ionViewWillEnter() {
    this.settings = this.uiSettingsStorage.getSettings();

    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.DETAIL
    );
    if (this.graph) {
      this.data = this.uiHelper.copyData(this.graph);
      await this.readFlowProfile();
    } else {
      this.flow_profile_raw = this.uiHelper.cloneData(this.flowProfileData);
    }

    setTimeout(() => {
      this.initializeFlowChart();
    }, 750);
  }
  public toggleChartLines(_type: string) {
    if (_type === 'weight') {
      this.weightTrace.visible = !this.weightTrace.visible;
    } else if (_type === 'calc_flow') {
      this.flowPerSecondTrace.visible = !this.flowPerSecondTrace.visible;
    } else if (_type === 'realtime_flow') {
      this.realtimeFlowTrace.visible = !this.realtimeFlowTrace.visible;
    } else if (_type === 'pressure') {
      this.pressureTrace.visible = !this.pressureTrace.visible;
    } else if (_type === 'temperature') {
      this.temperatureTrace.visible = !this.temperatureTrace.visible;
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

    let tickFormat = '%S';

    tickFormat = '%M:' + tickFormat;

    /*  yaxis3: {
        title: '',
        titlefont: {color: '#09485D'},
        tickfont: {color: '#09485D'},
        anchor: 'x',
        overlaying: 'y',
        side: 'right',
        position: 1

      },*/
    const layout = {
      width: chartWidth,
      height: chartHeight,
      margin: {
        l: 20,
        r: 20,
        b: 20,
        t: 20,
        pad: 2,
      },
      showlegend: false,
      xaxis: {
        tickformat: tickFormat,
        visible: true,
        domain: [0, 1],
        type: 'date',
      },
      yaxis: {
        title: '',
        titlefont: { color: '#cdc2ac' },
        tickfont: { color: '#cdc2ac' },
        side: 'left',
        position: 0.05,
        visible: true,
      },
      yaxis2: {
        title: '',
        titlefont: { color: '#7F97A2' },
        tickfont: { color: '#7F97A2' },
        anchor: 'x',
        overlaying: 'y',
        side: 'right',
        position: 0.95,
        showgrid: false,
        visible: true,
      },
    };

    layout['yaxis4'] = {
      title: '',
      titlefont: { color: '#05C793' },
      tickfont: { color: '#05C793' },
      anchor: 'free',
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      position: 0.93,
      range: [0, 10],
      visible: true,
    };

    layout['yaxis5'] = {
      title: '',
      titlefont: { color: '#CC3311' },
      tickfont: { color: '#CC3311' },
      anchor: 'free',
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      position: 0.8,
      fixedrange: true,
      range: [0, 100],
      visible: true,
    };

    if (this.weightTrace.x && this.weightTrace.x.length > 0) {
      layout['yaxis'].visible = true;
      layout['yaxis2'].visible = true;
    } else {
      layout['yaxis'].visible = false;
      layout['yaxis2'].visible = false;
    }
    if (this.pressureTrace.x && this.pressureTrace.x.length > 0) {
      layout['yaxis4'].visible = true;
    } else {
      layout['yaxis4'].visible = false;
    }

    if (this.temperatureTrace.x && this.temperatureTrace.x.length > 0) {
      layout['yaxis5'].visible = true;
    } else {
      layout['yaxis5'].visible = false;
    }

    this.lastChartLayout = layout;
    return layout;
  }
  public initializeFlowChart(): void {
    setTimeout(() => {
      try {
        Plotly.purge(this.profileDiv.nativeElement);
      } catch (ex) {}
      const graphSettings = this.settings.graph.FILTER;

      this.weightTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT'),
        yaxis: 'y',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#cdc2ac',
          width: 2,
        },
        visible: graphSettings.weight,
      };
      this.flowPerSecondTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#7F97A2',
          width: 2,
        },
        visible: graphSettings.calc_flow,
      };

      this.realtimeFlowTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#09485D',
          width: 2,
        },
        visible: graphSettings.realtime_flow,
      };

      this.pressureTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_PRESSURE_FLOW'),
        yaxis: 'y4',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#05C793',
          width: 2,
        },
        visible: graphSettings.pressure,
      };

      this.temperatureTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_TEMPERATURE_REALTIME'),
        yaxis: 'y5',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#CC3311',
          width: 2,
        },
        visible: graphSettings.temperature,
      };

      const startingDay = moment(new Date()).startOf('day');
      // IF brewtime has some seconds, we add this to the delay directly.

      let firstTimestamp;
      if (this.flow_profile_raw.weight?.length > 0) {
        firstTimestamp = this.flow_profile_raw.weight[0].timestamp;
      } else if (this.flow_profile_raw.pressureFlow?.length > 0) {
        firstTimestamp = this.flow_profile_raw.pressureFlow[0].timestamp;
      } else if (this.flow_profile_raw.temperatureFlow?.length > 0) {
        firstTimestamp = this.flow_profile_raw.temperatureFlow[0].timestamp;
      } else {
        firstTimestamp = 0;
      }
      const delay =
        moment(firstTimestamp, 'HH:mm:ss.SSS').toDate().getTime() -
        startingDay.toDate().getTime();
      if (this.flow_profile_raw.weight?.length > 0) {
        for (const data of this.flow_profile_raw.weight) {
          this.weightTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.weightTrace.y.push(data.actual_weight);
        }
        for (const data of this.flow_profile_raw.waterFlow) {
          this.flowPerSecondTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.flowPerSecondTrace.y.push(data.value);
        }
        if (this.flow_profile_raw?.realtimeFlow) {
          for (const data of this.flow_profile_raw.realtimeFlow) {
            this.realtimeFlowTrace.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay
              )
            );
            this.realtimeFlowTrace.y.push(data.flow_value);
          }
        }
      }
      if (
        this.flow_profile_raw?.pressureFlow &&
        this.flow_profile_raw.pressureFlow.length > 0
      ) {
        for (const data of this.flow_profile_raw.pressureFlow) {
          this.pressureTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.pressureTrace.y.push(data.actual_pressure);
        }
      }
      if (
        this.flow_profile_raw?.temperatureFlow &&
        this.flow_profile_raw.temperatureFlow.length > 0
      ) {
        for (const data of this.flow_profile_raw.temperatureFlow) {
          this.temperatureTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.temperatureTrace.y.push(data.actual_temperature);
        }
      }

      const chartData = [
        this.weightTrace,
        this.flowPerSecondTrace,
        this.realtimeFlowTrace,
      ];

      const layout = this.getChartLayout();

      chartData.push(this.pressureTrace);
      chartData.push(this.temperatureTrace);

      Plotly.newPlot(
        this.profileDiv.nativeElement,
        chartData,
        layout,
        this.getChartConfig()
      );
      this.flowProfileLoading = false;
    }, 100);
  }

  private async readFlowProfile() {
    if (this.platform.is('cordova')) {
      if (this.graph.flow_profile !== '') {
        try {
          const jsonParsed = await this.uiFileHelper.getJSONFile(
            this.graph.flow_profile
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
