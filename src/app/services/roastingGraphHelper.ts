import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { RoastingProfile } from '../../classes/roasting-profile/roasting-profile';
import { ThemeService } from '../../services/theme/theme.service';

@Injectable({
  providedIn: 'root',
})
export class RoastingGraphHelperService {
  constructor(
    private readonly translate: TranslateService,
    private readonly themeService: ThemeService,
  ) {}

  public initializeTraces() {
    const trace: any = {};
    trace.temperatureTrace = undefined;
    trace.powerTrace = undefined;
    trace.fanTrace = undefined;
    return trace;
  }

  public fillTraces(_traces: any) {
    const traces = _traces;

    let tempColor = '#CC3311';
    if (this.themeService.isDarkMode() === true) {
      tempColor = '#D55E00';
    }

    traces.temperatureTrace = {
      x: [],
      y: [],
      name: this.translate.instant('ROASTING_SECTION.BEAN.TEMPERATURE'),
      yaxis: 'y',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: tempColor,
        width: 2,
      },
      hoverinfo: 'all',
      showlegend: false,
    };

    traces.powerTrace = {
      x: [],
      y: [],
      name: this.translate.instant('ROASTING_SECTION.BEAN.POWER'),
      yaxis: 'y2',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: '#E69F00',
        width: 2,
      },
      hoverinfo: 'all',
      showlegend: false,
    };

    traces.fanTrace = {
      x: [],
      y: [],
      name: this.translate.instant('ROASTING_SECTION.BEAN.FAN'),
      yaxis: 'y3',
      type: 'scatter',
      mode: 'lines',
      line: {
        shape: 'linear',
        color: '#56B4E9',
        width: 2,
      },
      hoverinfo: 'all',
      showlegend: false,
    };

    return traces;
  }

  public fillDataIntoTraces(_rawData: RoastingProfile, _traces: any) {
    if (_rawData.time.length > 0) {
      for (let i = 0; i < _rawData.time.length; i++) {
        _traces.temperatureTrace.x.push(_rawData.time[i]);
        _traces.temperatureTrace.y.push(_rawData.temperature[i]);
        _traces.powerTrace.x.push(_rawData.time[i]);
        _traces.powerTrace.y.push(_rawData.power[i]);
        _traces.fanTrace.x.push(_rawData.time[i]);
        _traces.fanTrace.y.push(_rawData.fan[i]);
      }
    }
  }

  public getChartLayout() {
    const layout = {
      showlegend: false,
      xaxis: {
        title: this.translate.instant('ROASTING_SECTION.BEAN.TIME'),
      },
      yaxis: {
        title: this.translate.instant('ROASTING_SECTION.BEAN.TEMPERATURE'),
      },
      yaxis2: {
        title: this.translate.instant('ROASTING_SECTION.BEAN.POWER'),
        overlaying: 'y',
        side: 'right',
      },
      yaxis3: {
        title: this.translate.instant('ROASTING_SECTION.BEAN.FAN'),
        overlaying: 'y',
        side: 'right',
        position: 1,
      },
    };
    return layout;
  }
}
