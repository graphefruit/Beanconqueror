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
import BeanconquerorFlowTestDataDummy from '../../assets/BeanconquerorFlowTestDataFourth.json';
import { UIHelper } from '../../services/uiHelper';
import { UIFileHelper } from '../../services/uiFileHelper';
import { Platform } from '@ionic/angular';
import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';
import { MeticulousDevice } from '../../classes/preparationDevice/meticulous/meticulousDevice';
import { GraphHelperService } from '../../services/graphHelper/graph-helper.service';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';

declare var Plotly;
@Component({
  selector: 'graph-display-card',
  templateUrl: './graph-display-card.component.html',
  styleUrls: ['./graph-display-card.component.scss'],
  imports: [],
})
export class GraphDisplayCardComponent implements OnInit {
  @Input() public flowProfileData: any;
  @Input() public flowProfilePath: any;

  @Input() public meticulousHistoryData: HistoryListingEntry;
  @Input() public gaggiuinoHistoryData: BrewFlow;

  @Input() public chartWidth: number;
  @Input() public chartHeight: number;

  @Input() public staticChart: boolean = false;

  public flow_profile_raw: BrewFlow = new BrewFlow();

  public settings: Settings;

  public traces: any = {};

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  public profileDiv: ElementRef;
  constructor(
    private readonly uiHelper: UIHelper,
    private readonly uiFileHelper: UIFileHelper,
    private readonly platform: Platform,
    private readonly graphHelper: GraphHelperService,
  ) {}

  public async ngOnInit() {
    if (this.flowProfilePath) {
      await this.readFlowProfile();
    } else if (this.flowProfileData) {
      this.flow_profile_raw = this.uiHelper.cloneData(this.flowProfileData);
    } else if (this.meticulousHistoryData) {
      this.flow_profile_raw = MeticulousDevice.returnBrewFlowForShotData(
        this.meticulousHistoryData.data,
      );
    } else if (this.gaggiuinoHistoryData) {
      //ebugger;
      this.flow_profile_raw = this
        .gaggiuinoHistoryData as BrewFlow; /**GaggiuinoDevice.returnBrewFlowForShotData(
        this.gaggiuinoHistoryData.data,
      );**/
    }
    setTimeout(() => {
      this.initializeFlowChart();
    }, 50);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    setTimeout(() => {
      this.initializeFlowChart();
    }, 250);
  }

  private getChartConfig() {
    const config: any = {
      responsive: false,
      scrollZoom: false,
      displayModeBar: false, // this is the line that hides the bar.
    };
    if (this.staticChart) {
      config.staticPlot = true;
    }
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

    const layout = this.graphHelper.getChartLayout(
      this.traces,
      PREPARATION_STYLE_TYPE.FULL_IMMERSION,
      false,
      false,
      true,
      chartWidth,
      chartHeight,
      true,
    );

    return layout;
  }
  public initializeFlowChart(): void {
    setTimeout(() => {
      try {
        Plotly.purge(this.profileDiv.nativeElement);
      } catch (ex) {}

      this.traces = this.graphHelper.initializeTraces();
      this.traces = this.graphHelper.fillTraces(this.traces, null, true);

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
        this.getChartConfig(),
      );
      this.profileDiv.nativeElement.removeAllListeners();
      this.profileDiv.nativeElement.removeAllListeners('plotly_click');
    }, 100);
  }

  private async readFlowProfile() {
    if (this.platform.is('capacitor')) {
      if (this.flowProfilePath !== '') {
        try {
          const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
            this.flowProfilePath,
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
