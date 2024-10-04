import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { Settings } from '../../classes/settings/settings';
import moment from 'moment';
import BeanconquerorFlowTestDataDummy from '../../assets/BeanconquerorFlowTestDataFourth.json';
import { TranslateService } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIFileHelper } from '../../services/uiFileHelper';
import { Platform } from '@ionic/angular';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';
import { MeticulousDevice } from '../../classes/preparationDevice/meticulous/meticulousDevice';

declare var Plotly;
@Component({
  selector: 'graph-display-card',
  templateUrl: './graph-display-card.component.html',
  styleUrls: ['./graph-display-card.component.scss'],
})
export class GraphDisplayCardComponent implements OnInit {
  @Input() public flowProfileData: any;
  @Input() public flowProfilePath: any;

  @Input() public meticulousHistoryData: HistoryListingEntry;

  @Input() public chartWidth: number;
  @Input() public chartHeight: number;

  public flow_profile_raw: BrewFlow = new BrewFlow();

  public settings: Settings;

  private weightTrace: any;
  private flowPerSecondTrace: any;
  private realtimeFlowTrace: any;
  private pressureTrace: any;
  private temperatureTrace: any;

  public flowProfileLoading: boolean = true;

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  public profileDiv: ElementRef;
  constructor(
    private readonly translate: TranslateService,
    private readonly uiHelper: UIHelper,
    private readonly uiFileHelper: UIFileHelper,
    private readonly platform: Platform,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {}

  public async ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    if (this.flowProfilePath) {
      await this.readFlowProfile();
    } else if (this.flowProfileData) {
      this.flow_profile_raw = this.uiHelper.cloneData(this.flowProfileData);
    } else if (this.meticulousHistoryData) {
      this.flow_profile_raw = MeticulousDevice.returnBrewFlowForShotData(
        this.meticulousHistoryData.data
      );
    }
    setTimeout(() => {
      this.initializeFlowChart();
    }, 50);
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
      responsive: false,
      scrollZoom: false,
      displayModeBar: false, // this is the line that hides the bar.
    };
    return config;
  }
  private getChartLayout() {
    /* Important - we use scatter instead of scattergl, because we can't have many openGL contexts
     * - https://github.com/plotly/plotly.js/issues/2333 -
     * */
    let chartWidth: number = this.canvaContainer.nativeElement.offsetWidth - 10;
    if (this.chartWidth && this.chartWidth > 0) {
      chartWidth = this.chartWidth;
    }

    let chartHeight: number = 150;
    if (this.chartHeight) {
      chartHeight = this.chartHeight;
    }

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
      dragmode: false,
      hovermode: false,
      clickmode: 'none',
      extendtreemapcolors: false,
      extendiciclecolors: false,
      xaxis: {
        tickformat: tickFormat,
        visible: true,
        fixedrange: true,
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
        fixedrange: true,
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
        fixedrange: true,
        visible: true,
      },
    };

    const graph_pressure_settings = this.settings.graph_pressure;
    const suggestedMinPressure: number = graph_pressure_settings.lower;
    let suggestedMaxPressure = graph_pressure_settings.upper;
    try {
      if (this.pressureTrace?.y.length > 0) {
        suggestedMaxPressure = Math.max(...this.pressureTrace.y);
        suggestedMaxPressure = Math.ceil(suggestedMaxPressure + 1);
      }
    } catch (ex) {}

    layout['yaxis4'] = {
      title: '',
      titlefont: { color: '#05C793' },
      tickfont: { color: '#05C793' },
      anchor: 'free',
      overlaying: 'y',
      side: 'right',
      fixedrange: true,
      showgrid: false,
      range: [suggestedMinPressure, suggestedMaxPressure],
      position: 0.93,
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

    return layout;
  }
  public initializeFlowChart(): void {
    setTimeout(() => {
      try {
        Plotly.purge(this.profileDiv.nativeElement);
      } catch (ex) {}

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
        visible: true,
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
        visible: true,
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
        visible: true,
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
        visible: true,
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
        visible: true,
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
      if (this.flowProfilePath !== '') {
        try {
          const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
            this.flowProfilePath
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
}
