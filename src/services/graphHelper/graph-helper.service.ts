import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IBrewGraphs } from '../../interfaces/brew/iBrewGraphs';
import { BrewFlow } from '../../classes/brew/brewFlow';
import moment from 'moment';
import { UISettingsStorage } from '../uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { CoffeeBluetoothDevicesService } from '../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { Platform } from '@ionic/angular';
import { ThemeService } from '../theme/theme.service';

@Injectable({
  providedIn: 'root',
})
export class GraphHelperService {
  constructor(
    private readonly translate: TranslateService,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly platform: Platform,
    private readonly themeService: ThemeService,
  ) {}

  public initializeTraces() {
    const trace: any = {};
    trace.weightTrace = undefined;
    trace.flowPerSecondTrace = undefined;
    trace.realtimeFlowTrace = undefined;
    trace.pressureTrace = undefined;
    trace.temperatureTrace = undefined;
    trace.weightTraceSecond = undefined;
    trace.realtimeFlowTraceSecond = undefined;
    return trace;
  }

  public fillTraces(
    _traces: any,
    _graphSettings: IBrewGraphs,
    _isDetail: boolean = false,
    _isReference: boolean = false,
  ) {
    const traces = _traces;

    let weightColor = '#cdc2ac';
    if (this.themeService.isDarkMode() === true) {
      weightColor = '#8b7e6a';
    }
    traces.weightTrace = {
      x: [],
      y: [],
      name: this.translate.instant('BREW_FLOW_WEIGHT'),
      yaxis: 'y',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: _isReference ? '#ebe6dd' : weightColor,
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
        color: _isReference ? '#cbd5d9' : '#7F97A2',
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
        color: _isReference ? '#9cb5be' : '#09485D',
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
        color: _isReference ? '#9be8d3' : '#05C793',
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
        color: _isReference ? '#eaad9f' : '#CC3311',
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
        color: _isReference ? '#b0924c' : '#8F6400',
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
        color: _isReference ? '#62cbf0' : '#1FB6EA',
        width: 2,
      },
      visible: _isDetail ? true : _graphSettings.realtime_flowSecond,
      hoverinfo: _isDetail ? 'all' : 'skip',
      showlegend: false,
    };

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
    }
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
  ) {
    const settings: Settings = this.uiSettingsStorage.getSettings();
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
          titlefont: { color: '#cdc2ac' },
          tickfont: { color: '#cdc2ac' },
          fixedrange: true,
          side: 'left',
          position: 0.03,
          rangemode: 'nonnegative',
          range: [suggestedMinWeight, suggestedMaxWeight],
        },
        yaxis2: {
          title: '',
          titlefont: { color: '#7F97A2' },
          tickfont: { color: '#7F97A2' },
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
          titlefont: { color: '#cdc2ac' },
          tickfont: { color: '#cdc2ac' },
          fixedrange: true,
          side: 'left',
          overlaying: 'y',
          position: 0.03,
          rangemode: 'nonnegative',
          range: [suggestedMinWeight, suggestedMaxWeight],
        };
        layout['yaxisRealtimeFlowSecond'] = {
          title: '',
          titlefont: { color: '#7F97A2' },
          tickfont: { color: '#7F97A2' },
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
          titlefont: { color: '#05C793' },
          tickfont: { color: '#05C793' },
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
          titlefont: { color: '#CC3311' },
          tickfont: { color: '#CC3311' },
          anchor: 'free',
          overlaying: 'y',
          side: 'right',
          showgrid: false,
          position: 0.8,
          fixedrange: true,
          visible: false,
          range: [0, 100],
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
        titlefont: { color: '#05C793' },
        tickfont: { color: '#05C793' },
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

      layout['yaxisWeightSecond'] = {
        title: '',
        titlefont: { color: '#cdc2ac' },
        tickfont: { color: '#cdc2ac' },
        side: 'left',
        overlaying: 'y',
        position: 0.03,
      };
      layout['yaxisRealtimeFlowSecond'] = {
        title: '',
        titlefont: { color: '#7F97A2' },
        tickfont: { color: '#7F97A2' },
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

    if (this.themeService.isDarkMode() === true) {
      layout.xaxis.gridcolor = '#8e8e8e';
      layout.yaxis.gridcolor = '#8e8e8e';
    }

    return layout;
  }
}
