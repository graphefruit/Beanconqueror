import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { RoastingFlow } from 'src/classes/roasting/roastingFlow';

@Injectable({
  providedIn: 'root'
})
export class RoastingGraphHelperService {

  constructor(private readonly translate: TranslateService) { }

  public getChartConfig() {
    return {
      displayModeBar: false,
      responsive: true,
    };
  }

  public getChartLayout(traces: any, isDetail: boolean, chartWidth: number, chartHeight: number) {
    return {
      width: chartWidth,
      height: chartHeight,
      margin: {
        l: 50,
        r: 20,
        b: 30,
        t: 20,
        pad: 0
      },
      showlegend: false,
      xaxis: {
        domain: [0, 0.98],
        showgrid: true,
        gridcolor: 'rgba(128, 128, 128, 0.1)',
        linecolor: 'rgba(128, 128, 128, 0.5)',
        zerolinecolor: 'rgba(128, 128, 128, 0.5)',
        tickfont: {
          color: 'rgba(128, 128, 128, 0.5)'
        },
        type: 'date'
      },
      yaxis: {
        title: this.translate.instant('ROASTING_GRAPH.TEMPERATURE'),
        showgrid: true,
        gridcolor: 'rgba(128, 128, 128, 0.1)',
        linecolor: 'rgba(128, 128, 128, 0.5)',
        zerolinecolor: 'rgba(128, 128, 128, 0.5)',
        tickfont: {
          color: 'rgba(128, 128, 128, 0.5)'
        }
      },
      yaxis2: {
        title: this.translate.instant('ROASTING_GRAPH.FAN'),
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        linecolor: 'rgba(128, 128, 128, 0.5)',
        zerolinecolor: 'rgba(128, 128, 128, 0.5)',
        tickfont: {
          color: 'rgba(128, 128, 128, 0.5)'
        }
      },
      yaxis3: {
        title: this.translate.instant('ROASTING_GRAPH.HEAT'),
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        linecolor: 'rgba(128, 128, 128, 0.5)',
        zerolinecolor: 'rgba(128, 128, 128, 0.5)',
        tickfont: {
          color: 'rgba(128, 128, 128, 0.5)'
        },
        position: 0.99
      }
    };
  }

  public initializeTraces() {
    return {
      temperatureTrace: {},
      fanTrace: {},
      heatTrace: {},
    };
  }

  public fillTraces(traces: any, graphSettings: any, isDetail: boolean, isReference: boolean = false) {
    traces.temperatureTrace = {
      x: [],
      y: [],
      name: this.translate.instant('ROASTING_GRAPH.TEMPERATURE'),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#FF0000' }
    };
    traces.fanTrace = {
      x: [],
      y: [],
      name: this.translate.instant('ROASTING_GRAPH.FAN'),
      type: 'scatter',
      mode: 'lines',
      yaxis: 'y2',
      line: { color: '#0000FF' }
    };
    traces.heatTrace = {
      x: [],
      y: [],
      name: this.translate.instant('ROASTING_GRAPH.HEAT'),
      type: 'scatter',
      mode: 'lines',
      yaxis: 'y3',
      line: { color: '#00FF00' }
    };
    return traces;
  }

  public fillDataIntoTraces(flow: RoastingFlow, traces: any) {
    if (flow) {
      if (flow.temperature) {
        flow.temperature.forEach(t => {
          traces.temperatureTrace.x.push(t.roasting_time);
          traces.temperatureTrace.y.push(t.actual_temperature);
        });
      }
      if (flow.fan) {
        flow.fan.forEach(f => {
          traces.fanTrace.x.push(f.roasting_time);
          traces.fanTrace.y.push(f.value);
        });
      }
      if (flow.heat) {
        flow.heat.forEach(h => {
          traces.heatTrace.x.push(h.roasting_time);
          traces.heatTrace.y.push(h.value);
        });
      }
    }
    return traces;
  }
}
