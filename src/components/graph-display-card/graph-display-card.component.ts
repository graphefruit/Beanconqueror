import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';

import { BrewFlow } from '../../classes/brew/brewFlow';
import { MeticulousDevice } from '../../classes/preparationDevice/meticulous/meticulousDevice';
import { Settings } from '../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { GraphHelperService } from '../../services/graphHelper/graph-helper.service';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIHelper } from '../../services/uiHelper';

declare var Plotly;
@Component({
  selector: 'graph-display-card',
  templateUrl: './graph-display-card.component.html',
  styleUrls: ['./graph-display-card.component.scss'],
  imports: [],
})
export class GraphDisplayCardComponent implements OnInit, OnChanges, OnDestroy {
  private readonly uiHelper = inject(UIHelper);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly platform = inject(Platform);
  private readonly graphHelper = inject(GraphHelperService);

  @Input() public flowProfileData: any;
  @Input() public flowProfilePath: any;

  @Input() public meticulousHistoryData: HistoryListingEntry;
  @Input() public meticulousDevice: MeticulousDevice;
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

  public async ngOnInit() {
    if (this.flowProfilePath) {
      await this.readFlowProfile();
    } else if (this.flowProfileData) {
      this.flow_profile_raw = this.uiHelper.cloneData(this.flowProfileData);
    } else if (this.meticulousHistoryData) {
      await this.ensureMeticulousShotData();
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

  public ngOnChanges(changes: SimpleChanges) {
    if (
      changes &&
      changes['meticulousHistoryData'] &&
      !changes['meticulousHistoryData'].firstChange
    ) {
      if (this.meticulousHistoryData) {
        this.flow_profile_raw = MeticulousDevice.returnBrewFlowForShotData(
          this.meticulousHistoryData.data,
        );
        this.initializeFlowChart();
      }
    }
  }

  /**
   * History listing entries are loaded without their shot data for
   * performance. When a card is actually rendered we lazily fetch the detail
   * for its own entry and cache it back onto the entry (mutating in place, so
   * the owning list keeps a stable object reference and the virtual scroll is
   * not reset).
   */
  private async ensureMeticulousShotData() {
    if (
      !this.meticulousHistoryData ||
      this.meticulousHistoryData.data ||
      !this.meticulousDevice
    ) {
      return;
    }
    try {
      const details = await this.meticulousDevice.getHistoryEntryDetails(
        this.meticulousHistoryData.id,
      );
      if (details?.data) {
        (this.meticulousHistoryData as any).data = details.data;
      }
    } catch {
      // ignore - an empty graph will be rendered
    }
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
      chartData.push(this.traces.waterDispensedTrace);
      chartData.push(this.traces.waterDispensedFlowSecondTrace);
      chartData.push(this.traces.weightTraceSecond);
      chartData.push(this.traces.realtimeFlowTraceSecond);

      if (this.traces.customTraces) {
        for (const [key, trace] of Object.entries(this.traces.customTraces) as [
          string,
          any,
        ][]) {
          if (trace) {
            chartData.push(trace);
          }
        }
      }

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
    if (!this.platform.is('capacitor')) {
      const dummyData = (
        await import('../../assets/BeanconquerorFlowTestDataFourth.json')
      ).default;
      this.flow_profile_raw = dummyData as any;
      return;
    }

    if (this.flowProfilePath === '') {
      return;
    }

    try {
      const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
        this.flowProfilePath,
      );
      this.flow_profile_raw = jsonParsed;
    } catch (ex) {
      // ignore
    }
  }
  public ngOnDestroy() {
    try {
      Plotly.purge(this.profileDiv.nativeElement);
    } catch (ex) {}
  }
}
