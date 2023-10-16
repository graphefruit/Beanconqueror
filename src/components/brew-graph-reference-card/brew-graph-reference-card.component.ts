import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Brew } from '../../classes/brew/brew';
import BeanconquerorFlowTestDataDummy from '../../assets/BeanconquerorFlowTestDataFourth.json';
import { Platform } from '@ionic/angular';
import { UIFileHelper } from '../../services/uiFileHelper';
import { BrewFlow } from '../../classes/brew/brewFlow';
import moment from 'moment/moment';
import { Settings } from '../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { TranslateService } from '@ngx-translate/core';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
declare var Plotly;
@Component({
  selector: 'brew-graph-reference-card',
  templateUrl: './brew-graph-reference-card.component.html',
  styleUrls: ['./brew-graph-reference-card.component.scss'],
})
export class BrewGraphReferenceCardComponent implements OnInit {
  @Input() public brew: Brew;
  public flow_profile_raw: BrewFlow = new BrewFlow();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public settings: Settings;

  private weightTrace: any;
  private flowPerSecondTrace: any;
  private realtimeFlowTrace: any;
  private pressureTrace: any;
  private temperatureTrace: any;
  public lastChartLayout: any = undefined;

  public radioSelection: string;

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  public profileDiv: ElementRef;
  constructor(
    private readonly platform: Platform,
    private readonly uiFileHelper: UIFileHelper,
    private readonly translate: TranslateService,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {}

  public async ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    await this.readFlowProfile();
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
    const chartWidth: number = this.canvaContainer.nativeElement.offsetWidth;

    const chartHeight: number = 150;

    let tickFormat = '%S';

    if (this.brew.brew_time > 59) {
      tickFormat = '%M:' + tickFormat;
    }
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
      range: [0, 12],
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
      } catch (ex) {}
      let graphSettings = this.settings.graph.FILTER;
      if (
        this.brew.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        graphSettings = this.settings.graph.ESPRESSO;
      }

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
    }, 100);
  }

  private async readFlowProfile() {
    if (this.platform.is('cordova')) {
      if (this.brew.flow_profile !== '') {
        try {
          const jsonParsed = await this.uiFileHelper.getJSONFile(
            this.brew.flow_profile
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
