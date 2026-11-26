import {
  ChangeDetectionStrategy,
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

import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';
import { TranslatePipe } from '@ngx-translate/core';

import { BrewFlow } from '../../classes/brew/brewFlow';
import { MeticulousDevice } from '../../classes/preparationDevice/meticulous/meticulousDevice';
import { Settings } from '../../classes/settings/settings';
import { GraphHelperService } from '../../services/graphHelper/graph-helper.service';
import { drawWhenPlotlyLoaded } from '../../services/graphHelper/load-plotly';
import { UIHelper } from '../../services/uiHelper';

declare var Plotly;
@Component({
  selector: 'graph-display-card',
  templateUrl: './graph-display-card.component.html',
  styleUrls: ['./graph-display-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslatePipe],
})
export class GraphDisplayCardComponent implements OnInit, OnChanges, OnDestroy {
  private readonly uiHelper = inject(UIHelper);
  private readonly graphHelper = inject(GraphHelperService);

  @Input() public flowProfileData: any;
  @Input() public flowProfilePath: any;

  @Input() public meticulousHistoryData: HistoryListingEntry;
  @Input() public meticulousDevice: MeticulousDevice;
  @Input() public gaggiuinoHistoryData: BrewFlow;
  @Input() public gaggimateHistoryData: BrewFlow;

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
    } else if (this.gaggimateHistoryData) {
      this.flow_profile_raw = this
        .gaggimateHistoryData as BrewFlow; /**GaggimateDevice.returnBrewFlowForShotData(
       this.gaggimateHistoryData.data,
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
  public initializeFlowChart(): void {
    setTimeout(() => {
      try {
        Plotly.purge(this.profileDiv.nativeElement);
      } catch (ex) {}

      const { traces, data, layout } = this.graphHelper.staticFlowFigure(
        this.flow_profile_raw,
        this.chartWidth > 0
          ? this.chartWidth
          : this.canvaContainer.nativeElement.offsetWidth - 10,
        this.chartHeight || 150,
      );
      this.traces = traces;

      drawWhenPlotlyLoaded(() => {
        Plotly.newPlot(
          this.profileDiv.nativeElement,
          data,
          layout,
          this.getChartConfig(),
        );
        this.profileDiv.nativeElement.removeAllListeners();
        this.profileDiv.nativeElement.removeAllListeners('plotly_click');
      });
    }, 100);
  }

  private async readFlowProfile() {
    try {
      this.flow_profile_raw = await this.graphHelper.readFlowProfile(
        this.flowProfilePath,
      );
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
