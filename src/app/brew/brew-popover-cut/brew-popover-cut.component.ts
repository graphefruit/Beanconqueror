import { DecimalPipe } from '@angular/common';
import {
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
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonItem,
  IonLabel,
  IonRange,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';

import { Brew } from 'src/classes/brew/brew';
import { BrewFlow, IBrewWeightFlow } from 'src/classes/brew/brewFlow';
import { PREPARATION_STYLE_TYPE } from 'src/enums/preparations/preparationStyleTypes';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { GraphHelperService } from '../../../services/graphHelper/graph-helper.service';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

declare var Plotly: any;

@Component({
  selector: 'app-brew-popover-cut',
  templateUrl: './brew-popover-cut.component.html',
  styleUrls: ['./brew-popover-cut.component.scss'],
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
    IonGrid,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonBadge,
    ToFixedPipe,
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
      this.initializeChart();
    }, 100);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    setTimeout(() => {
      this.initializeChart();
    }, 100);
  }

  private calculateBounds() {
    let max = 0;
    if (this.flowProfile) {
      const arraysToCheck = [
        this.flowProfile.weight,
        this.flowProfile.weightSecond,
        this.flowProfile.waterFlow,
        this.flowProfile.realtimeFlow,
        this.flowProfile.realtimeFlowSecond,
        this.flowProfile.pressureFlow,
        this.flowProfile.temperatureFlow,
      ];

      for (const arr of arraysToCheck) {
        if (arr && arr.length > 0) {
          const lastItem = arr[arr.length - 1];
          const t = parseFloat(lastItem.brew_time);
          if (!isNaN(t) && t > max) {
            max = t;
          }
        }
      }
    }
    this.maxTime = Number(max.toFixed(3));
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

  public initializeChart() {
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

    const cutResult = this.performCut(
      this.flowProfile,
      this.cutRange.lower,
      this.cutRange.upper,
      this.brew,
    );
    const duration = this.cutRange.upper - this.cutRange.lower;

    this.modalController.dismiss(
      {
        flowProfile: cutResult.flowProfile,
        brew_time: Math.round(duration),
        brew_time_milliseconds: Math.round(duration * 1000),
        finalWeight: cutResult.finalWeight,
        coffee_first_drip_time: cutResult.coffee_first_drip_time,
        coffee_first_drip_time_milliseconds:
          cutResult.coffee_first_drip_time_milliseconds,
        coffee_blooming_time: cutResult.coffee_blooming_time,
        coffee_blooming_time_milliseconds:
          cutResult.coffee_blooming_time_milliseconds,
      },
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

  private performCut(
    flowProfile: BrewFlow,
    lower: number,
    upper: number,
    brew: Brew = this.brew,
  ): {
    flowProfile: BrewFlow;
    finalWeight?: number;
    coffee_first_drip_time?: number;
    coffee_first_drip_time_milliseconds?: number;
    coffee_blooming_time?: number;
    coffee_blooming_time_milliseconds?: number;
  } {
    let globalMinTime = lower;
    let found = false;
    let minTime = Infinity;

    const arraysToCheck = [
      flowProfile.weight,
      flowProfile.weightSecond,
      flowProfile.waterFlow,
      flowProfile.realtimeFlow,
      flowProfile.realtimeFlowSecond,
      flowProfile.pressureFlow,
      flowProfile.temperatureFlow,
      flowProfile.waterDispensed,
      flowProfile.waterDispensedFlowSecond,
      flowProfile.brewbyweight,
    ];

    for (const arr of arraysToCheck) {
      if (arr && arr.length > 0) {
        const firstItem = arr.find(
          (item) => parseFloat(item.brew_time) >= lower,
        );
        if (firstItem) {
          const t = parseFloat(firstItem.brew_time);
          if (t < minTime) {
            minTime = t;
            found = true;
          }
        }
      }
    }

    if (flowProfile.customMetrics) {
      for (const val of Object.values(flowProfile.customMetrics)) {
        if (val && val.length > 0) {
          const firstItem = val.find(
            (item) => parseFloat(item.brew_time) >= lower,
          );
          if (firstItem) {
            const t = parseFloat(firstItem.brew_time);
            if (t < minTime) {
              minTime = t;
              found = true;
            }
          }
        }
      }
    }

    if (found) {
      globalMinTime = minTime;
    }

    const shiftSeconds = globalMinTime;
    const shiftMs = Math.round(shiftSeconds * 1000);

    const processArray = <T extends { brew_time: string; timestamp: string }>(
      arr: T[],
    ): T[] => {
      if (!arr) return [];
      return arr
        .filter((item) => {
          const t = parseFloat(item.brew_time);
          return t >= lower && t <= upper;
        })
        .map((item) => {
          const t = parseFloat(item.brew_time);
          const newTime = (t - shiftSeconds).toFixed(1);

          let newTimestamp = item.timestamp;
          try {
            newTimestamp = moment(item.timestamp, 'HH:mm:ss.SSS')
              .subtract(shiftMs, 'milliseconds')
              .format('HH:mm:ss.SSS');
          } catch (ex) {}

          return {
            ...item,
            brew_time: newTime,
            timestamp: newTimestamp,
          };
        });
    };

    const processWeightArray = (arr: IBrewWeightFlow[]): IBrewWeightFlow[] => {
      if (!arr) return [];
      return arr
        .filter((item) => {
          const t = parseFloat(item.brew_time);
          return t >= lower && t <= upper;
        })
        .map((item) => {
          const t = parseFloat(item.brew_time);
          const newTime = (t - shiftSeconds).toFixed(1);

          let newTimestamp = item.timestamp;
          try {
            newTimestamp = moment(item.timestamp, 'HH:mm:ss.SSS')
              .subtract(shiftMs, 'milliseconds')
              .format('HH:mm:ss.SSS');
          } catch (ex) {}

          return {
            ...item,
            brew_time: newTime,
            timestamp: newTimestamp,
            actual_weight: item.actual_weight,
            old_weight: item.old_weight,
            actual_smoothed_weight: item.actual_smoothed_weight,
            old_smoothed_weight: item.old_smoothed_weight,
            not_mutated_weight: item.not_mutated_weight,
          };
        });
    };

    const newProfile = new BrewFlow();

    newProfile.weight = processWeightArray(flowProfile.weight);
    newProfile.weightSecond = processWeightArray(flowProfile.weightSecond);

    newProfile.waterFlow = processArray(flowProfile.waterFlow);

    if (flowProfile.realtimeFlow) {
      newProfile.realtimeFlow = flowProfile.realtimeFlow
        .filter((item) => {
          const t = parseFloat(item.brew_time);
          return t >= lower && t <= upper;
        })
        .map((item) => {
          const t = parseFloat(item.brew_time);
          const newTime = (t - shiftSeconds).toFixed(1);

          let newTimestamp = item.timestamp;
          try {
            newTimestamp = moment(item.timestamp, 'HH:mm:ss.SSS')
              .subtract(shiftMs, 'milliseconds')
              .format('HH:mm:ss.SSS');
          } catch (ex) {}

          return {
            ...item,
            brew_time: newTime,
            timestamp: newTimestamp,
            smoothed_weight: item.smoothed_weight,
          };
        });
    }

    if (flowProfile.realtimeFlowSecond) {
      newProfile.realtimeFlowSecond = flowProfile.realtimeFlowSecond
        .filter((item) => {
          const t = parseFloat(item.brew_time);
          return t >= lower && t <= upper;
        })
        .map((item) => {
          const t = parseFloat(item.brew_time);
          const newTime = (t - shiftSeconds).toFixed(1);

          let newTimestamp = item.timestamp;
          try {
            newTimestamp = moment(item.timestamp, 'HH:mm:ss.SSS')
              .subtract(shiftMs, 'milliseconds')
              .format('HH:mm:ss.SSS');
          } catch (ex) {}

          return {
            ...item,
            brew_time: newTime,
            timestamp: newTimestamp,
            smoothed_weight: item.smoothed_weight,
          };
        });
    }

    newProfile.pressureFlow = processArray(flowProfile.pressureFlow);
    newProfile.temperatureFlow = processArray(flowProfile.temperatureFlow);

    if (flowProfile.waterDispensed) {
      newProfile.waterDispensed = flowProfile.waterDispensed
        .filter((item) => {
          const t = parseFloat(item.brew_time);
          return t >= lower && t <= upper;
        })
        .map((item) => {
          const t = parseFloat(item.brew_time);
          const newTime = (t - shiftSeconds).toFixed(1);
          let newTimestamp = item.timestamp;
          try {
            newTimestamp = moment(item.timestamp, 'HH:mm:ss.SSS')
              .subtract(shiftMs, 'milliseconds')
              .format('HH:mm:ss.SSS');
          } catch (ex) {}
          return {
            ...item,
            brew_time: newTime,
            timestamp: newTimestamp,
            actual: item.actual,
            old: item.old,
          };
        });
    }

    if (flowProfile.waterDispensedFlowSecond) {
      newProfile.waterDispensedFlowSecond = flowProfile.waterDispensedFlowSecond
        .filter((item) => {
          const t = parseFloat(item.brew_time);
          return t >= lower && t <= upper;
        })
        .map((item) => {
          const t = parseFloat(item.brew_time);
          const newTime = (t - shiftSeconds).toFixed(1);
          let newTimestamp = item.timestamp;
          try {
            newTimestamp = moment(item.timestamp, 'HH:mm:ss.SSS')
              .subtract(shiftMs, 'milliseconds')
              .format('HH:mm:ss.SSS');
          } catch (ex) {}
          return {
            ...item,
            brew_time: newTime,
            timestamp: newTimestamp,
            actual: item.actual,
            old: item.old,
          };
        });
    }

    newProfile.brewbyweight = processArray(flowProfile.brewbyweight);

    if (flowProfile.customMetrics) {
      for (const [key, val] of Object.entries(flowProfile.customMetrics)) {
        newProfile.customMetrics[key] = processArray(val);
      }
    }

    newProfile.customAxes = flowProfile.customAxes || [];

    let finalWeight = 0;
    if (newProfile.weight && newProfile.weight.length > 0) {
      finalWeight =
        newProfile.weight[newProfile.weight.length - 1].actual_weight;
    } else if (newProfile.weightSecond && newProfile.weightSecond.length > 0) {
      finalWeight =
        newProfile.weightSecond[newProfile.weightSecond.length - 1]
          .actual_weight;
    }

    let coffee_first_drip_time = brew?.coffee_first_drip_time ?? 0;
    let coffee_first_drip_time_milliseconds =
      brew?.coffee_first_drip_time_milliseconds ?? 0;
    let coffee_blooming_time = brew?.coffee_blooming_time ?? 0;
    let coffee_blooming_time_milliseconds =
      brew?.coffee_blooming_time_milliseconds ?? 0;

    if (coffee_first_drip_time > 0 || coffee_first_drip_time_milliseconds > 0) {
      const currentFirstDripMs =
        coffee_first_drip_time * 1000 + coffee_first_drip_time_milliseconds;
      const newFirstDripMs = currentFirstDripMs - shiftMs;
      if (newFirstDripMs <= 0) {
        coffee_first_drip_time = 0;
        coffee_first_drip_time_milliseconds = 0;
      } else {
        coffee_first_drip_time = Math.floor(newFirstDripMs / 1000);
        coffee_first_drip_time_milliseconds = Math.round(newFirstDripMs % 1000);
      }
    }

    if (coffee_blooming_time > 0 || coffee_blooming_time_milliseconds > 0) {
      const currentBloomingMs =
        coffee_blooming_time * 1000 + coffee_blooming_time_milliseconds;
      const newBloomingMs = currentBloomingMs - shiftMs;
      if (newBloomingMs <= 0) {
        coffee_blooming_time = 0;
        coffee_blooming_time_milliseconds = 0;
      } else {
        coffee_blooming_time = Math.floor(newBloomingMs / 1000);
        coffee_blooming_time_milliseconds = Math.round(newBloomingMs % 1000);
      }
    }

    return {
      flowProfile: newProfile,
      finalWeight: finalWeight,
      coffee_first_drip_time,
      coffee_first_drip_time_milliseconds,
      coffee_blooming_time,
      coffee_blooming_time_milliseconds,
    };
  }
}
