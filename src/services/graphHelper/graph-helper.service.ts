import { inject, Injectable } from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import { BrewFlow, IBrewCustomAxis } from '../../classes/brew/brewFlow';
import { PreparationDeviceType } from '../../classes/preparationDevice';
import { Settings } from '../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { IBrewGraphs } from '../../interfaces/brew/iBrewGraphs';
import { CoffeeBluetoothDevicesService } from '../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { ThemeService } from '../theme/theme.service';
import { UISettingsStorage } from '../uiSettingsStorage';

export function expandLiveAxisRangeForSample(
  range: [number, number],
  sample: number,
  multiplier: number,
  tolerance: number,
): [number, number] {
  if (!Number.isFinite(sample)) {
    return range;
  }

  const [lowerBound, upperBound] = range;
  const headroom = Math.abs(sample) * (multiplier - 1);

  if (upperBound < 0) {
    let nextLowerBound = lowerBound;
    let nextUpperBound = upperBound;

    if (sample <= lowerBound + tolerance) {
      nextLowerBound = sample - headroom;
    }
    if (sample >= upperBound - tolerance) {
      // A negative range grows towards zero, but a sample that has climbed
      // back above zero needs a bound above it or the trace is clipped again.
      nextUpperBound =
        sample >= 0 ? sample + headroom : Math.min(0, sample + headroom);
    }

    if (nextLowerBound === lowerBound && nextUpperBound === upperBound) {
      return range;
    }

    return [nextLowerBound, nextUpperBound];
  }

  if (sample >= upperBound - tolerance) {
    // The bound has to end up above the sample it is following, which a bare
    // multiplication does not guarantee for a sample near zero.
    return [lowerBound, Math.max(upperBound, sample + headroom)];
  }

  return range;
}

@Injectable({
  providedIn: 'root',
})
export class GraphHelperService {
  private readonly translate = inject(TranslateService);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  private readonly platform = inject(Platform);
  private readonly themeService = inject(ThemeService);

  public initializeTraces() {
    const trace: any = {};
    trace.weightTrace = undefined;
    trace.flowPerSecondTrace = undefined;
    trace.realtimeFlowTrace = undefined;
    trace.pressureTrace = undefined;
    trace.temperatureTrace = undefined;
    trace.weightTraceSecond = undefined;
    trace.realtimeFlowTraceSecond = undefined;
    trace.waterDispensedTrace = undefined;
    trace.waterDispensedFlowSecondTrace = undefined;
    trace.customTraces = {};
    return trace;
  }

  public fillTraces(
    _traces: any,
    _graphSettings: IBrewGraphs,
    _isDetail: boolean = false,
    _isReference: boolean = false,
    _rawData?: BrewFlow,
    _preparationDeviceType?: PreparationDeviceType,
  ) {
    const traces = _traces;

    const settings: Settings = this.uiSettingsStorage.getSettings();
    const isDarkMode = this.themeService.isDarkMode();
    const colors = settings.graph_colors;

    const getColor = (key: keyof typeof colors, isRef: boolean) => {
      if (isRef) {
        return isDarkMode
          ? colors[key].reference.dark
          : colors[key].reference.light;
      }
      return isDarkMode ? colors[key].active.dark : colors[key].active.light;
    };

    traces.weightTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WEIGHT'),
      yaxis: 'y',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('weight', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.weight,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };
    traces.flowPerSecondTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
      yaxis: 'y2',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('flowPerSecond', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.calc_flow,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

    traces.realtimeFlowTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
      yaxis: 'y2',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('realtimeFlow', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.realtime_flow,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

    traces.pressureTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_PRESSURE_FLOW'),
      yaxis: 'y4',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('pressure', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.pressure,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

    traces.temperatureTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_TEMPERATURE_REALTIME'),
      yaxis: 'y5',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('temperature', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.temperature,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };
    traces.weightTraceSecond = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WEIGHT'),
      yaxis: 'y',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('weightSecond', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.weightSecond,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

    traces.realtimeFlowTraceSecond = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
      yaxis: 'y2',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('realtimeFlowSecond', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.realtime_flowSecond,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

    traces.waterDispensedTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WATER_DISPENSED_VOLUME'),
      yaxis: 'y6',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('waterDispensed', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : true,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

    traces.waterDispensedFlowSecondTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WATER_DISPENSED_REALTIME'),
      yaxis: 'y2',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: getColor('waterDispensedFlowSecond', _isReference),
        width: 2,
      },
      visible: _isDetail ? true : true,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

    let customAxesToInit: Array<IBrewCustomAxis> = [];
    if (
      _rawData?.customMetrics &&
      Object.keys(_rawData.customMetrics).length > 0
    ) {
      for (const key of Object.keys(_rawData.customMetrics)) {
        customAxesToInit.push({
          key: key,
          name: key,
          unit: '',
          colorLight: getColor('customTrace', _isReference),
          colorDark: getColor('customTrace', _isReference),
        });
      }
    }

    if (!traces.customTraces) {
      traces.customTraces = {};
    }
    let customAxisIndex = 11;
    for (const customAxis of customAxesToInit) {
      if (!traces.customTraces[customAxis.key]) {
        traces.customTraces[customAxis.key] = {
          x: [],
          y: [],
          name: this.translate.instant(customAxis.name),
          yaxis: 'y' + customAxisIndex,
          type: 'scatter',
          mode: 'lines',
          line: {
            shape: 'linear',
            color: isDarkMode ? customAxis.colorDark : customAxis.colorLight,
            width: 2,
          },
          visible: true,
          hoverinfo: _isDetail ? 'all' : 'skip',
          showlegend: false,
        };
      }
      customAxisIndex++;
    }

    return traces;
  }

  public fillDataIntoTraces(_rawData: BrewFlow, _traces: any) {
    if (
      _rawData.weight.length > 0 ||
      _rawData.pressureFlow.length > 0 ||
      _rawData.temperatureFlow.length > 0
    ) {
      const startingDay = moment(new Date()).startOf('day');
      // IF brewtime has some seconds, we add this to the delay directly.

      let firstTimestamp;
      if (_rawData.weight.length > 0) {
        firstTimestamp = _rawData.weight[0].timestamp;
      } else if (_rawData.pressureFlow.length > 0) {
        firstTimestamp = _rawData.pressureFlow[0].timestamp;
      } else if (_rawData.temperatureFlow.length > 0) {
        firstTimestamp = _rawData.temperatureFlow[0].timestamp;
      }
      const delay =
        moment(firstTimestamp, 'HH:mm:ss.SSS').toDate().getTime() -
        startingDay.toDate().getTime();
      if (_rawData.weight.length > 0) {
        for (const data of _rawData.weight) {
          _traces.weightTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay,
            ),
          );
          _traces.weightTrace.y.push(data.actual_weight);
        }
        for (const data of _rawData.waterFlow) {
          _traces.flowPerSecondTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay,
            ),
          );
          _traces.flowPerSecondTrace.y.push(data.value);
        }
        if (_rawData.realtimeFlow) {
          for (const data of _rawData.realtimeFlow) {
            _traces.realtimeFlowTrace.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay,
              ),
            );
            _traces.realtimeFlowTrace.y.push(data.flow_value);
          }
        }
      }
      if (_rawData?.weightSecond?.length > 0) {
        for (const data of _rawData.weightSecond) {
          _traces.weightTraceSecond.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay,
            ),
          );
          _traces.weightTraceSecond.y.push(data.actual_weight);
        }

        if (_rawData.realtimeFlowSecond) {
          for (const data of _rawData.realtimeFlowSecond) {
            _traces.realtimeFlowTraceSecond.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay,
              ),
            );
            _traces.realtimeFlowTraceSecond.y.push(data.flow_value);
          }
        }
      }

      if (_rawData.pressureFlow && _rawData.pressureFlow.length > 0) {
        for (const data of _rawData.pressureFlow) {
          _traces.pressureTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay,
            ),
          );
          _traces.pressureTrace.y.push(data.actual_pressure);
        }
      }

      if (_rawData.waterDispensed && _rawData.waterDispensed.length > 0) {
        for (const data of _rawData.waterDispensed) {
          _traces.waterDispensedTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay,
            ),
          );
          _traces.waterDispensedTrace.y.push(data.actual);
        }
      }

      if (
        _rawData.waterDispensedFlowSecond &&
        _rawData.waterDispensedFlowSecond.length > 0
      ) {
        for (const data of _rawData.waterDispensedFlowSecond) {
          _traces.waterDispensedFlowSecondTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay,
            ),
          );
          _traces.waterDispensedFlowSecondTrace.y.push(data.actual);
        }
      }

      if (_rawData.temperatureFlow && _rawData.temperatureFlow.length > 0) {
        for (const data of _rawData.temperatureFlow) {
          _traces.temperatureTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay,
            ),
          );
          _traces.temperatureTrace.y.push(data.actual_temperature);
        }
      }

      if (_rawData.customMetrics) {
        if (!_traces.customTraces) {
          _traces.customTraces = {};
        }

        for (const [key, flowDataArray] of Object.entries(
          _rawData.customMetrics,
        )) {
          let customAxis = _rawData.customAxes?.find((a) => a.key === key);
          if (!customAxis) {
            if (key === 'waterDispensed') {
              customAxis = {
                key: 'waterDispensed',
                name: 'BREW_FLOW_WATER_DISPENSED',
                unit: 'ml',
                colorLight: '#0d6efd',
                colorDark: '#3b82f6',
              };
            } else {
              customAxis = {
                key: key,
                name: key,
                unit: '',
                colorLight: '#000000',
                colorDark: '#ffffff',
              };
            }
          }

          let customAxisIndex = 11;
          for (const cKey of Object.keys(_traces.customTraces)) {
            if (cKey === key) break;
            customAxisIndex++;
          }

          if (!_traces.customTraces[key]) {
            _traces.customTraces[key] = {
              x: [],
              y: [],
              name: this.translate.instant(customAxis.name),
              yaxis: 'y' + customAxisIndex,
              type: 'scatter',
              mode: 'lines',
              line: {
                shape: 'linear',
                color: this.themeService.isDarkMode()
                  ? customAxis.colorDark
                  : customAxis.colorLight,
                width: 2,
              },
              visible: true,
              hoverinfo: 'all',
              showlegend: false,
            };
          }

          for (const data of flowDataArray) {
            _traces.customTraces[key].x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay,
              ),
            );
            _traces.customTraces[key].y.push(data.value);
          }
        }
      }
    }
  }

  /**
   * The upper bound for an axis that counts up from zero, given the data it
   * has to hold.
   *
   * A brew that dispenses more water than the default upper bound is not a
   * broken brew, it is a bigger one. Clipping it hides the part of the trace
   * the drinker most wants to see, the end, while the axis goes on claiming a
   * scale it is no longer keeping. The default stays as a floor so that a
   * short or empty trace does not get an absurdly tight axis.
   *
   * Data that already fits returns the fallback untouched rather than the
   * fallback compared against a padded value. Adding the headroom first would
   * push a brew peaking anywhere above 95.24 past 100 and redraw it very
   * slightly lower than it has always drawn, which is a visible change to an
   * ordinary single-cup brew for no gain. The headroom exists to keep a trace
   * off the ceiling once it has outgrown the axis, not before.
   *
   * Detail and brewing charts can draw a reference series on the same water
   * axis as the active brew. The axis has to fit both traces, because clipping
   * the reference would make a larger saved brew look smaller than the live one
   * it is being compared against.
   */
  private fittedUpperBound(
    values: number[] | undefined,
    fallback: number,
  ): number {
    const finite = (values ?? []).filter((value) => Number.isFinite(value));
    if (finite.length === 0) {
      return fallback;
    }
    const highest = Math.max(...finite);
    if (highest <= fallback) {
      return fallback;
    }
    return Math.ceil(highest * 1.05);
  }

  /**
   * The bounds for a custom axis, which holds a series this app did not
   * define.
   *
   * Zero is meaningful for weight and for water, so those axes start there. A
   * sender's own series need not: a temperature that lives between 88 and 93
   * degrees, drawn on an axis from zero, is a straight line, and the steps
   * between stages, the reason the sender attached it at all, disappear. So a
   * custom axis is fitted to both ends of its own data with a little room
   * either side once it outgrows the fixed range. Data that already fits keeps
   * the fixed range, so comparable brews do not redraw on unrelated scales.
   */
  private fittedCustomRange(
    values: number[] | undefined,
    fallback: [number, number],
  ): [number, number] {
    const finite = (values ?? []).filter((value) => Number.isFinite(value));
    if (finite.length === 0) {
      return fallback;
    }
    const lowest = Math.min(...finite);
    const highest = Math.max(...finite);
    if (lowest >= fallback[0] && highest <= fallback[1]) {
      return fallback;
    }
    if (lowest === highest) {
      // A flat series should read as visibly flat rather than leave Plotly a
      // zero-height axis to invent a range for.
      return [lowest - 1, highest + 1];
    }
    const padding = (highest - lowest) * 0.1;
    return [lowest - padding, highest + padding];
  }

  private visibleRange(range: [number, number]): [number, number] {
    if (range[0] < range[1]) {
      return range;
    }
    if (range[0] === range[1]) {
      return [range[0] - 1, range[1] + 1];
    }
    return [range[1], range[0]];
  }

  private liveCustomRange(
    values: number[],
    fittedRange: [number, number],
  ): [number, number] {
    const finite = values.filter((value) => Number.isFinite(value));
    if (finite.length > 0 && finite.every((value) => value < 0)) {
      return fittedRange;
    }
    return [0, fittedRange[1]];
  }

  private combinedTraceValues(...traces: any[]): number[] {
    return traces.flatMap((trace) => (Array.isArray(trace?.y) ? trace.y : []));
  }

  public getChartLayout(
    _traces: any,
    _preparationStyle: PREPARATION_STYLE_TYPE,
    _preparationDeviceConnected: boolean = false,
    _maximizedScreenShown: boolean = false,
    _isDetail: boolean = false,
    _chartWidth: number = undefined,
    _chartHeight: number = undefined,
    _disableClick: boolean = false,
    _traceReferences: any = undefined,
  ) {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    const isDarkMode = this.themeService.isDarkMode();
    const colors = settings.graph_colors;

    const getAxisColor = (key: keyof typeof colors) => {
      return isDarkMode ? colors[key].active.dark : colors[key].active.light;
    };

    const isEspressoBrew: boolean =
      _preparationStyle === PREPARATION_STYLE_TYPE.ESPRESSO;
    let chartWidth: number = 300;
    try {
      if (_chartWidth) {
        chartWidth = _chartWidth;
      }
    } catch (ex) {}
    let chartHeight: number = 150;
    try {
      if (_chartHeight) {
        chartHeight = _chartHeight;
      }
    } catch (ex) {}

    const tickFormat = '%M:%S';
    const waterDispensedValues = this.combinedTraceValues(
      _traces.waterDispensedTrace,
      _traceReferences?.waterDispensedTrace,
    );

    let layout: any;
    if (_isDetail === false) {
      let graph_weight_settings;
      let graph_flow_settings;

      if (isEspressoBrew) {
        graph_weight_settings = settings.graph_weight.ESPRESSO;
        graph_flow_settings = settings.graph_flow.ESPRESSO;
      } else {
        graph_weight_settings = settings.graph_weight.FILTER;
        graph_flow_settings = settings.graph_flow.FILTER;
      }

      const suggestedMinFlow: number = graph_flow_settings.lower;
      const suggestedMaxFlow: number = graph_flow_settings.upper;

      const suggestedMinWeight: number = graph_weight_settings.lower;
      const suggestedMaxWeight: number = graph_weight_settings.upper;

      const startRange = moment(new Date()).startOf('day').toDate().getTime();

      let normalScreenTime: number;
      let fullScreenTime: number;
      if (isEspressoBrew) {
        normalScreenTime = settings.graph_time.ESPRESSO.NORMAL_SCREEN;
        fullScreenTime = settings.graph_time.ESPRESSO.FULL_SCREEN;
      } else {
        normalScreenTime = settings.graph_time.FILTER.NORMAL_SCREEN;
        fullScreenTime = settings.graph_time.FILTER.FULL_SCREEN;
      }
      let addSecondsOfEndRange = normalScreenTime + 10;

      // When reset is triggered, we maybe are already in the maximized screen, so we go for the 70sec directly.
      if (_maximizedScreenShown === true) {
        addSecondsOfEndRange = fullScreenTime + 10;
      }
      const endRange: number = moment(new Date())
        .startOf('day')
        .add('seconds', addSecondsOfEndRange)
        .toDate()
        .getTime();

      /***
       *        Don't use this tags right now... we don't know what they do
       *            extendsunburstcolors: false,
       *         extendfunnelareacolors: false,
       *         extendpiecolors: false,
       *         hidesources: true,
       *         hoverdistance: 0,
       *         spikedistance: 0,
       *         autosize: false,
       */
      layout = {
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
        extendsunburstcolors: false,
        extendfunnelareacolors: false,
        extendpiecolors: false,
        hidesources: true,
        hoverdistance: 0,
        spikedistance: 0,
        autosize: false,
        autotypenumbers: 'strict',
        xaxis: {
          tickformat: tickFormat,
          visible: true,
          domain: [0, 1],
          fixedrange: true,
          type: 'date',
          range: [startRange, endRange],
        },
        yaxis: {
          title: '',
          titlefont: { color: getAxisColor('weight') },
          tickfont: { color: getAxisColor('weight') },
          fixedrange: true,
          side: 'left',
          position: 0.03,
          rangemode: 'nonnegative',
          range: [suggestedMinWeight, suggestedMaxWeight],
        },
        yaxis2: {
          title: '',
          titlefont: { color: getAxisColor('flowPerSecond') },
          tickfont: { color: getAxisColor('flowPerSecond') },
          anchor: 'free',
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          position: 0.97,
          fixedrange: true,
          rangemode: 'nonnegative',
          range: [suggestedMinFlow, suggestedMaxFlow],
        },
      };

      const scaleDevice = this.bleManager.getScale();

      if (
        !this.platform.is('capacitor') ||
        (scaleDevice?.supportsTwoWeights === true && isEspressoBrew === false)
      ) {
        layout['yaxisWeightSecond'] = {
          title: '',
          titlefont: { color: getAxisColor('weightSecond') },
          tickfont: { color: getAxisColor('weightSecond') },
          fixedrange: true,
          side: 'left',
          overlaying: 'y',
          position: 0.03,
          rangemode: 'nonnegative',
          range: [suggestedMinWeight, suggestedMaxWeight],
        };
        layout['yaxisRealtimeFlowSecond'] = {
          title: '',
          titlefont: { color: getAxisColor('realtimeFlowSecond') }, // Or flowPerSecond? The original code had #7F97A2 which is flowPerSecond color. But maybe it should be realtimeFlowSecond? Wait, previous code used #7F97A2 for realtimeFlowSecond axis.
          tickfont: { color: getAxisColor('realtimeFlowSecond') },
          anchor: 'free',
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          position: 0.97,
          fixedrange: true,
          rangemode: 'nonnegative',
          range: [suggestedMinFlow, suggestedMaxFlow],
        };
      }
      const pressureDevice = this.bleManager.getPressureDevice();
      if (
        (pressureDevice != null && isEspressoBrew) ||
        _preparationDeviceConnected ||
        !this.platform.is('capacitor')
      ) {
        const graph_pressure_settings = settings.graph_pressure;
        const suggestedMinPressure: number = graph_pressure_settings.lower;
        const suggestedMaxPressure: number = graph_pressure_settings.upper;
        layout['yaxis4'] = {
          title: '',
          titlefont: { color: getAxisColor('pressure') },
          tickfont: { color: getAxisColor('pressure') },
          anchor: 'free',
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          position: 0.91,
          fixedrange: true,
          range: [suggestedMinPressure, suggestedMaxPressure],
        };
      }
      const temperatureDevice = this.bleManager.getTemperatureDevice();
      if (
        temperatureDevice != null ||
        _preparationDeviceConnected ||
        !this.platform.is('capacitor')
      ) {
        layout['yaxis5'] = {
          title: '',
          titlefont: { color: getAxisColor('temperature') },
          tickfont: { color: getAxisColor('temperature') },
          anchor: 'free',
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          position: 0.8,
          fixedrange: true,
          visible: false,
          range: [0, 100],
        };
        layout['yaxis6'] = {
          title: '',
          titlefont: { color: getAxisColor('waterDispensed') },
          tickfont: { color: getAxisColor('waterDispensed') },
          anchor: 'free',
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          position: 1,
          fixedrange: true,
          visible: false,
          range: [0, this.fittedUpperBound(waterDispensedValues, 100)],
        };
      }
    } else {
      layout = {
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
          titlefont: { color: getAxisColor('weight') },
          tickfont: { color: getAxisColor('weight') },
          side: 'left',
          position: 0.05,
          visible: true,
        },
        yaxis2: {
          title: '',
          titlefont: { color: getAxisColor('flowPerSecond') },
          tickfont: { color: getAxisColor('flowPerSecond') },
          anchor: 'x',
          overlaying: 'y',
          side: 'right',
          position: 0.95,
          showgrid: false,
          visible: true,
        },
      };

      if (_disableClick === true) {
        layout.showlegend = false;
        layout.dragmode = false;
        layout.hovermode = false;
        layout.clickmode = 'none';
        layout.extendtreemapcolors = false;
        layout.extendiciclecolors = false;
      }
      const graph_pressure_settings = settings.graph_pressure;
      const suggestedMinPressure = graph_pressure_settings.lower;
      let suggestedMaxPressure = graph_pressure_settings.upper;
      try {
        if (_traces.pressureTrace?.y.length > 0) {
          suggestedMaxPressure = Math.max(..._traces.pressureTrace.y);
          suggestedMaxPressure = Math.ceil(suggestedMaxPressure + 1);
        }
      } catch (ex) {}

      layout['yaxis4'] = {
        title: '',
        titlefont: { color: getAxisColor('pressure') },
        tickfont: { color: getAxisColor('pressure') },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 0.93,
        range: [suggestedMinPressure, suggestedMaxPressure],
        visible: true,
      };

      layout['yaxis5'] = {
        title: '',
        titlefont: { color: getAxisColor('temperature') },
        tickfont: { color: getAxisColor('temperature') },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 0.8,
        fixedrange: true,
        range: [0, 100],
        visible: true,
      };

      layout['yaxis6'] = {
        title: '',
        titlefont: { color: getAxisColor('waterDispensed') },
        tickfont: { color: getAxisColor('waterDispensed') },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 1,
        fixedrange: false,
        range: [0, this.fittedUpperBound(waterDispensedValues, 100)],
        visible: true,
      };

      layout['yaxisWeightSecond'] = {
        title: '',
        titlefont: { color: getAxisColor('weightSecond') },
        tickfont: { color: getAxisColor('weightSecond') },
        side: 'left',
        overlaying: 'y',
        position: 0.03,
      };
      layout['yaxisRealtimeFlowSecond'] = {
        title: '',
        titlefont: { color: getAxisColor('realtimeFlowSecond') },
        tickfont: { color: getAxisColor('realtimeFlowSecond') },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 0.97,
      };

      if (_traces.weightTrace.x && _traces.weightTrace.x.length > 0) {
        layout['yaxis'].visible = true;
        layout['yaxis2'].visible = true;
      } else {
        layout['yaxis'].visible = false;
        layout['yaxis2'].visible = false;
      }
      if (_traces.pressureTrace.x && _traces.pressureTrace.x.length > 0) {
        layout['yaxis4'].visible = true;
      } else {
        layout['yaxis4'].visible = false;
      }

      if (_traces.temperatureTrace.x && _traces.temperatureTrace.x.length > 0) {
        layout['yaxis5'].visible = true;
      } else {
        layout['yaxis5'].visible = false;
      }

      if (
        _traces.waterDispensedTrace.x &&
        _traces.waterDispensedTrace.x.length > 0
      ) {
        layout['yaxis6'].visible = true;
      } else {
        layout['yaxis6'].visible = false;
      }

      if (
        _traces.weightTraceSecond.x &&
        _traces.weightTraceSecond.x.length > 0
      ) {
        layout['yaxisWeightSecond'].visible = true;
        layout['yaxisRealtimeFlowSecond'].visible = true;
      } else {
        layout['yaxisWeightSecond'].visible = false;
        layout['yaxisRealtimeFlowSecond'].visible = false;
      }
    }

    if (_traces.customTraces) {
      let axisPositionOffset = 0.85;
      for (const [key, trace] of Object.entries(_traces.customTraces) as [
        string,
        any,
      ][]) {
        let yAxisKey = trace.yaxis.replace('y', 'yaxis');
        const referenceTrace = _traceReferences?.customTraces?.[key];
        if (referenceTrace) {
          // The reference trace object belongs to the chart component and can
          // be reused across relayouts, but assigning the active axis for the
          // same metric key is idempotent and keeps both plotted series on the
          // axis whose range is fitted below.
          referenceTrace.yaxis = trace.yaxis;
        }
        const fittedValues = this.combinedTraceValues(trace, referenceTrace);
        const fittedRange = this.fittedCustomRange(fittedValues, [0, 20]);
        const range = this.visibleRange(
          _isDetail
            ? fittedRange
            : this.liveCustomRange(fittedValues, fittedRange),
        );
        layout[yAxisKey] = {
          title: '',
          titlefont: { color: trace.line.color },
          tickfont: { color: trace.line.color },
          anchor: 'free',
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          position: axisPositionOffset,
          fixedrange: !_isDetail,
          visible: _isDetail ? true : trace.visible,
          range,
        };
        if (!_isDetail) {
          layout[yAxisKey].visible =
            trace.x && trace.x.length > 0 ? trace.visible : false;
        }
        axisPositionOffset -= 0.05;
      }
    }

    if (this.themeService.isDarkMode() === true) {
      layout.xaxis.gridcolor = '#8e8e8e';
      layout.yaxis.gridcolor = '#8e8e8e';
    }

    return layout;
  }
}
