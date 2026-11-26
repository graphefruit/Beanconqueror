import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  NgZone,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonRange,
  IonRow,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';

import { Brew } from 'src/classes/brew/brew';
import { BrewFlow, IBrewWeightFlow } from 'src/classes/brew/brewFlow';
import { PREPARATION_STYLE_TYPE } from 'src/enums/preparations/preparationStyleTypes';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { RangeNameDirective } from '../../../directive/range-name.directive';
import { GraphHelperService } from '../../../services/graphHelper/graph-helper.service';
import { loadPlotly } from '../../../services/graphHelper/load-plotly';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  calculateCutBounds,
  FlowCutSave,
  performFlowCut,
} from '../../../stores/brews/flow-cut-rules';

declare var Plotly: any;

@Component({
  selector: 'app-brew-popover-cut',
  templateUrl: './brew-popover-cut.component.html',
  styleUrls: ['./brew-popover-cut.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    DecimalPipe,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonFooter,
    IonButton,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonRange,
    RangeNameDirective,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonCard,
    IonBadge,
  ],
})
export class BrewPopoverCutComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly graphHelper = inject(GraphHelperService);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  public static COMPONENT_ID = 'brew-cut';

  @Input() public brew: Brew;
  @Input() public flowProfile: BrewFlow;

  @ViewChild('cutChartContent', { read: ElementRef })
  public cutChartContent: ElementRef;

  public maxTime: number = 0;
  public cutRange: { lower: number; upper: number } = { lower: 0, upper: 0 };
  public newFinalWeight: number = 0;
  public loaded: boolean = false;

  public ngOnInit() {
    this.calculateBounds();
    this.calculateNewFinalWeight();
    setTimeout(() => {
      this.loaded = true;
      this.cdr.detectChanges();
    }, 50);
  }

  public ionViewDidEnter() {
    setTimeout(() => {
      void this.initializeChart();
    }, 100);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    setTimeout(() => {
      void this.initializeChart();
    }, 100);
  }

  private calculateBounds() {
    this.maxTime = calculateCutBounds(this.flowProfile);
    this.cutRange = { lower: 0, upper: this.maxTime };
  }

  public onRangeInput(event: any) {
    const val = event.detail.value;
    if (val) {
      this.cutRange = val;
      this.calculateNewFinalWeight();

      // Update vertical lines outside Angular zone for 60fps performance
      this.ngZone.runOutsideAngular(() => {
        this.updateChartLines();
      });

      this.cdr.detectChanges();
    }
  }

  public onRangeChange(event: any) {
    const val = event.detail.value;
    if (val) {
      this.cutRange = val;
      this.calculateNewFinalWeight();

      this.ngZone.runOutsideAngular(() => {
        this.updateChartLines();
      });

      this.cdr.detectChanges();
    }
  }

  public isSaveDisabled(): boolean {
    return this.cutRange.lower === 0 && this.cutRange.upper === this.maxTime;
  }

  public calculateNewFinalWeight() {
    let endWeight = 0;

    const upperVal = this.cutRange.upper;

    const getEndWeight = (arr: IBrewWeightFlow[]) => {
      if (!arr || arr.length === 0) return null;
      const endItem = [...arr]
        .reverse()
        .find((w) => parseFloat(w.brew_time) <= upperVal);
      return endItem ? endItem.actual_weight : 0;
    };

    let weight = getEndWeight(this.flowProfile?.weight);
    if (weight === null) {
      weight = getEndWeight(this.flowProfile?.weightSecond);
    }

    if (weight !== null) {
      endWeight = weight;
    }

    this.newFinalWeight = Math.max(0, Number(endWeight.toFixed(2)));
  }

  public async initializeChart() {
    try {
      const el = this.cutChartContent.nativeElement;
      const chartWidth = el.offsetWidth || 300;
      const chartHeight = 200;

      const traces = this.graphHelper.initializeTraces();
      const style = this.brew.getPreparation().style_type;
      const settings = this.uiSettingsStorage.getSettings();
      const graphSettings =
        style === PREPARATION_STYLE_TYPE.ESPRESSO
          ? settings.graph.ESPRESSO
          : settings.graph.FILTER;

      this.graphHelper.fillTraces(
        traces,
        graphSettings,
        true,
        false,
        this.flowProfile,
      );
      this.graphHelper.fillDataIntoTraces(this.flowProfile, traces);

      const chartData = [];
      if (traces.weightTrace?.x?.length > 0) chartData.push(traces.weightTrace);
      if (traces.flowPerSecondTrace?.x?.length > 0)
        chartData.push(traces.flowPerSecondTrace);
      if (traces.realtimeFlowTrace?.x?.length > 0)
        chartData.push(traces.realtimeFlowTrace);
      if (traces.pressureTrace?.x?.length > 0)
        chartData.push(traces.pressureTrace);
      if (traces.temperatureTrace?.x?.length > 0)
        chartData.push(traces.temperatureTrace);
      if (traces.weightTraceSecond?.x?.length > 0)
        chartData.push(traces.weightTraceSecond);
      if (traces.realtimeFlowTraceSecond?.x?.length > 0)
        chartData.push(traces.realtimeFlowTraceSecond);
      if (traces.waterDispensedTrace?.x?.length > 0)
        chartData.push(traces.waterDispensedTrace);
      if (traces.waterDispensedFlowSecondTrace?.x?.length > 0)
        chartData.push(traces.waterDispensedFlowSecondTrace);

      const layout = this.graphHelper.getChartLayout(
        traces,
        style,
        false,
        false,
        true,
        chartWidth,
        chartHeight,
        true,
      );

      const config = {
        responsive: true,
        scrollZoom: false,
        displayModeBar: false,
      };

      await loadPlotly();
      Plotly.newPlot('cutChart', chartData, layout, config);
      this.updateChartLines();
    } catch (ex) {
      console.error('Failed to initialize Plotly chart in PopoverCut', ex);
    }
  }

  public updateChartLines() {
    try {
      const startingDay = moment(new Date()).startOf('day');
      const lowerVal = this.cutRange.lower;
      const upperVal = this.cutRange.upper;

      const xStart = new Date(startingDay.toDate().getTime() + lowerVal * 1000);
      const xEnd = new Date(startingDay.toDate().getTime() + upperVal * 1000);

      const shapes = [
        {
          type: 'line',
          xref: 'x',
          yref: 'paper',
          x0: xStart,
          y0: 0,
          x1: xStart,
          y1: 1,
          line: {
            color: '#e74c3c',
            width: 2,
            dash: 'dash',
          },
        },
        {
          type: 'line',
          xref: 'x',
          yref: 'paper',
          x0: xEnd,
          y0: 0,
          x1: xEnd,
          y1: 1,
          line: {
            color: '#e74c3c',
            width: 2,
            dash: 'dash',
          },
        },
      ];

      Plotly.relayout('cutChart', { shapes: shapes });
    } catch (ex) {
      // ignore if plotly is not ready yet
    }
  }

  public save() {
    try {
      Plotly.purge('cutChart');
    } catch (ex) {}

    const duration = this.cutRange.upper - this.cutRange.lower;
    const cut: FlowCutSave = {
      ...performFlowCut(
        this.flowProfile,
        this.cutRange.lower,
        this.cutRange.upper,
        this.brew,
      ),
      brew_time: Math.round(duration),
      brew_time_milliseconds: Math.round(duration * 1000),
    };
    this.modalController.dismiss(
      cut,
      'save',
      BrewPopoverCutComponent.COMPONENT_ID,
    );
  }

  public dismiss() {
    try {
      Plotly.purge('cutChart');
    } catch (ex) {}

    this.modalController.dismiss(
      undefined,
      'cancel',
      BrewPopoverCutComponent.COMPONENT_ID,
    );
  }
}
