import { Injectable } from '@angular/core';

import moment from 'moment/moment';

declare var Plotly: any;

@Injectable({
  providedIn: 'root',
})
export class AnnotationGraphHelperService {
  private getTimestampMs(val: any): number {
    if (!val) return 0;
    if (val instanceof Date) {
      return val.getTime();
    }
    if (typeof val === 'number') {
      return val;
    }
    const m = moment(val);
    if (m.isValid()) {
      return m.valueOf();
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  private getAxisForTrace(fullLayout: any, trace: any): any {
    if (!fullLayout || !trace) return null;
    const yaxisKey = trace.yaxis;
    if (!yaxisKey || yaxisKey === 'y' || yaxisKey === 'y1') {
      return fullLayout.yaxis;
    }
    if (typeof yaxisKey === 'string' && yaxisKey.startsWith('y')) {
      const axisName = 'yaxis' + yaxisKey.slice(1);
      return fullLayout[axisName] || fullLayout.yaxis;
    }
    return fullLayout.yaxis;
  }

  private calculateTargetPixelY(
    fullLayout: any,
    trace: any,
    yVal: number,
  ): number {
    const axis = this.getAxisForTrace(fullLayout, trace);
    if (axis && typeof axis.c2p === 'function') {
      const p = axis.c2p(yVal);
      if (typeof p === 'number' && !isNaN(p)) {
        return (axis._offset || 0) + p;
      }
    }
    if (
      axis &&
      axis.range &&
      Array.isArray(axis.range) &&
      axis.range.length === 2
    ) {
      const min = axis.range[0];
      const max = axis.range[1];
      if (typeof min === 'number' && typeof max === 'number' && max !== min) {
        const frac = (yVal - min) / (max - min);
        const top = axis._offset || 40;
        const len = axis._length || 300;
        return top + (1 - frac) * len;
      }
    }
    return 150;
  }

  public getSliderRange(
    chartData: any[],
    brewTime?: number,
  ): { minTimeMs: number; maxTimeMs: number; maxSliderTime: number } {
    if (!chartData || chartData.length === 0) {
      const fallbackMax = brewTime || 60;
      const startingDayMs = moment(new Date())
        .startOf('day')
        .toDate()
        .getTime();
      return {
        minTimeMs: startingDayMs,
        maxTimeMs: startingDayMs + fallbackMax * 1000,
        maxSliderTime: fallbackMax,
      };
    }

    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const trace of chartData) {
      if (trace.x && trace.x.length > 0) {
        const firstX = trace.x[0];
        const lastX = trace.x[trace.x.length - 1];
        if (firstX && lastX) {
          const firstMs = this.getTimestampMs(firstX);
          const lastMs = this.getTimestampMs(lastX);
          if (firstMs > 0 && firstMs < minTime) minTime = firstMs;
          if (lastMs > 0 && lastMs > maxTime) maxTime = lastMs;
        }
      }
    }

    if (minTime !== Infinity && maxTime !== -Infinity) {
      return {
        minTimeMs: minTime,
        maxTimeMs: maxTime,
        maxSliderTime: (maxTime - minTime) / 1000,
      };
    } else {
      const fallbackMax = brewTime || 60;
      const startingDayMs = moment(new Date())
        .startOf('day')
        .toDate()
        .getTime();
      return {
        minTimeMs: startingDayMs,
        maxTimeMs: startingDayMs + fallbackMax * 1000,
        maxSliderTime: fallbackMax,
      };
    }
  }

  public updateSliderLineAndAnnotations(
    profileDivElement: any,
    lastChartLayout: any,
    chartData: any[],
    traces: any,
    traceReferences: any,
    sliderValue: number,
    minTimeMs: number,
  ) {
    if (!profileDivElement) return;

    const targetTimeMs = minTimeMs + sliderValue * 1000;
    const targetDate = new Date(targetTimeMs);

    if (!lastChartLayout.shapes) {
      lastChartLayout.shapes = [];
    }
    lastChartLayout.shapes = lastChartLayout.shapes.filter(
      (s: any) => s.customId !== 'sliderLine',
    );

    lastChartLayout.shapes.push({
      type: 'line',
      x0: targetDate,
      x1: targetDate,
      y0: 0,
      y1: 1,
      xref: 'x',
      yref: 'paper',
      line: {
        color: '#ff3b30',
        width: 1.5,
        dash: 'solid',
      },
      customId: 'sliderLine',
    });

    const fullLayout = profileDivElement._fullLayout;
    const annotations: any[] = [];

    if (chartData && traces) {
      const actualVisibleTraces = chartData.filter((trace: any) => {
        if (trace.visible === false || !trace.x || trace.x.length === 0) {
          return false;
        }
        if (traceReferences) {
          if (
            trace === traceReferences.weightTrace ||
            trace === traceReferences.flowPerSecondTrace ||
            trace === traceReferences.realtimeFlowTrace ||
            trace === traceReferences.pressureTrace ||
            trace === traceReferences.temperatureTrace ||
            trace === traceReferences.weightTraceSecond ||
            trace === traceReferences.realtimeFlowTraceSecond ||
            trace === traceReferences.waterDispensedTrace ||
            trace === traceReferences.waterDispensedFlowSecondTrace ||
            (traceReferences.customTraces &&
              Object.values(traceReferences.customTraces).includes(trace))
          ) {
            return false;
          }
        }
        return true;
      });

      interface AnnotationCandidate {
        trace: any;
        xVal: any;
        yVal: number;
        unit: string;
        targetPixelY: number;
      }
      const candidates: AnnotationCandidate[] = [];

      actualVisibleTraces.forEach((trace: any) => {
        let closestIndex = -1;
        let minDiff = Infinity;

        for (let i = 0; i < trace.x.length; i++) {
          const t = trace.x[i];
          if (!t) continue;
          const timeMs = this.getTimestampMs(t);
          if (timeMs === 0) continue;
          const diff = Math.abs(timeMs - targetTimeMs);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }

        if (closestIndex !== -1) {
          const xVal = trace.x[closestIndex];
          const yVal = trace.y[closestIndex];

          let unit = '';
          if (
            trace === traces.weightTrace ||
            trace === traces.weightTraceSecond
          ) {
            unit = ' g';
          } else if (
            trace === traces.flowPerSecondTrace ||
            trace === traces.realtimeFlowTrace ||
            trace === traces.realtimeFlowTraceSecond ||
            trace === traces.waterDispensedFlowSecondTrace
          ) {
            unit = ' g/s';
          } else if (trace === traces.pressureTrace) {
            unit = ' bar';
          } else if (trace === traces.temperatureTrace) {
            unit = ' °C';
          } else if (trace === traces.waterDispensedTrace) {
            unit = ' ml';
          }

          const targetPixelY = this.calculateTargetPixelY(
            fullLayout,
            trace,
            yVal,
          );
          candidates.push({
            trace,
            xVal,
            yVal,
            unit,
            targetPixelY,
          });
        }
      });

      let ax = 55;
      let xanchor: 'left' | 'right' = 'left';
      const xAxis = fullLayout?.xaxis;
      if (xAxis && typeof xAxis.c2p === 'function') {
        const targetPixelX =
          (xAxis._offset || 0) + xAxis.c2p(targetDate.getTime());
        const plotRightThreshold =
          (xAxis._offset || 0) + (xAxis._length || 300) * 0.7;
        if (targetPixelX > plotRightThreshold) {
          ax = -55;
          xanchor = 'right';
        }
      }

      const mainYAxis = fullLayout?.yaxis;
      const plotTop = (mainYAxis?._offset || 40) + 15;
      const plotBottom =
        (mainYAxis?._offset || 40) + (mainYAxis?._length || 300) - 15;
      const MIN_GAP = 28;

      candidates.sort((a, b) => a.targetPixelY - b.targetPixelY);

      const N = candidates.length;
      const labelY = candidates.map((c) => c.targetPixelY);

      for (let i = 1; i < N; i++) {
        if (labelY[i] < labelY[i - 1] + MIN_GAP) {
          labelY[i] = labelY[i - 1] + MIN_GAP;
        }
      }

      if (N > 0 && labelY[N - 1] > plotBottom) {
        labelY[N - 1] = plotBottom;
        for (let i = N - 2; i >= 0; i--) {
          if (labelY[i] > labelY[i + 1] - MIN_GAP) {
            labelY[i] = labelY[i + 1] - MIN_GAP;
          }
        }
      }

      if (N > 0 && labelY[0] < plotTop) {
        labelY[0] = plotTop;
        for (let i = 1; i < N; i++) {
          if (labelY[i] < labelY[i - 1] + MIN_GAP) {
            labelY[i] = labelY[i - 1] + MIN_GAP;
          }
        }
      }

      candidates.forEach((c, i) => {
        const ay = labelY[i] - c.targetPixelY;
        annotations.push({
          x: c.xVal,
          y: c.yVal,
          xref: 'x',
          yref: c.trace.yaxis || 'y',
          xanchor: xanchor,
          text: `${c.trace.name}: ${c.yVal.toFixed(1)}${c.unit}`,
          showarrow: true,
          arrowhead: 6,
          arrowsize: 1,
          arrowcolor: c.trace.line?.color || '#ff3b30',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            color: '#ffffff',
          },
          bgcolor: c.trace.line?.color || '#333333',
          bordercolor: '#ffffff',
          borderwidth: 1,
          borderpad: 4,
          ax: ax,
          ay: ay,
        });
      });
    }

    lastChartLayout.annotations = annotations;
    Plotly.relayout(profileDivElement, {
      shapes: lastChartLayout.shapes,
      annotations: annotations,
    });
  }

  public clearSliderLineAndAnnotations(
    profileDivElement: any,
    lastChartLayout: any,
  ) {
    if (!profileDivElement) return;

    if (lastChartLayout.shapes) {
      lastChartLayout.shapes = lastChartLayout.shapes.filter(
        (s: any) => s.customId !== 'sliderLine',
      );
    }
    lastChartLayout.annotations = [];
    Plotly.relayout(profileDivElement, {
      shapes: lastChartLayout.shapes || [],
      annotations: [],
    });
  }
}
