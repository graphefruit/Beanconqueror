import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { ModalController, Platform } from '@ionic/angular';

import { UIToast } from '../../services/uiToast';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIAlert } from '../../services/uiAlert';

import GRAPH_TRACKING from '../../data/tracking/graphTracking';

import { GRAPH_ACTION } from '../../enums/graph/graphAction';
import { UIGraphStorage } from '../../services/uiGraphStorage.service';
import { Graph } from '../../classes/graph/graph';
import { GraphPopoverActionsComponent } from '../../app/graph-section/graph/graph-popover-actions/graph-popover-actions.component';
import { UIGraphHelper } from '../../services/uiGraphHelper';
import moment from 'moment';
import BeanconquerorFlowTestDataDummy from '../../assets/BeanconquerorFlowTestDataFourth.json';

import { BrewFlow } from '../../classes/brew/brewFlow';
import { Settings } from '../../classes/settings/settings';
import { UIFileHelper } from '../../services/uiFileHelper';
import { TranslateService } from '@ngx-translate/core';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';

declare var Plotly;
@Component({
  selector: 'graph-information-card',
  templateUrl: './graph-information-card.component.html',
  styleUrls: ['./graph-information-card.component.scss'],
})
export class GraphInformationCardComponent implements OnInit {
  @Input() public graph: Graph;
  @Output() public graphAction: EventEmitter<any> = new EventEmitter();

  public flow_profile_raw: BrewFlow = new BrewFlow();

  public settings: Settings;

  private weightTrace: any;
  private flowPerSecondTrace: any;
  private realtimeFlowTrace: any;
  private pressureTrace: any;
  private temperatureTrace: any;
  public lastChartLayout: any = undefined;

  public radioSelection: string;
  public flowProfileLoading: boolean = true;

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  public profileDiv: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiAlert: UIAlert,
    private readonly uiGraphHelper: UIGraphHelper,
    private readonly platform: Platform,
    private readonly uiFileHelper: UIFileHelper,
    private readonly translate: TranslateService,
    private readonly uiSettingsStorage: UISettingsStorage,
    protected readonly uiBrewHelper: UIBrewHelper
  ) {}

  public async ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    await this.readFlowProfile();
    setTimeout(() => {
      this.initializeFlowChart();
    }, 250);
  }

  public async show() {
    await this.detail();
  }

  public async showActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.POPOVER_ACTIONS
    );
    const popover = await this.modalController.create({
      component: GraphPopoverActionsComponent,
      componentProps: { graph: this.graph },
      id: GraphPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalAction(data.role as GRAPH_ACTION);
      this.graphAction.emit([data.role as GRAPH_ACTION, this.graph]);
    }
  }

  private async internalAction(action: GRAPH_ACTION) {
    switch (action) {
      case GRAPH_ACTION.DETAIL:
        await this.detail();
        break;
      case GRAPH_ACTION.EDIT:
        await this.edit();
        break;
      case GRAPH_ACTION.DELETE:
        try {
          await this.delete();
        } catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;

      case GRAPH_ACTION.ARCHIVE:
        await this.archive();
        break;
      default:
        break;
    }
  }
  public async archive() {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.ARCHIVE
    );
    this.graph.finished = true;
    await this.uiGraphStorage.update(this.graph);
    this.uiToast.showInfoToast('TOAST_GRAPH_ARCHIVED_SUCCESSFULLY');
  }

  public async longPressEdit(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.edit();
    this.graphAction.emit([GRAPH_ACTION.EDIT, this.graph]);
  }

  public async edit() {
    await this.uiGraphHelper.editGraph(this.graph);
  }

  public async detail() {
    await this.uiGraphHelper.detailGraph(this.graph);
  }

  public async delete(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.uiAlert
        .showConfirm('DELETE_GRAPH_QUESTION', 'SURE_QUESTION', true)
        .then(
          async () => {
            await this.uiAlert.showLoadingSpinner();
            // Yes
            this.uiAnalytics.trackEvent(
              GRAPH_TRACKING.TITLE,
              GRAPH_TRACKING.ACTIONS.DELETE
            );
            await this.__delete();
            this.uiToast.showInfoToast('TOAST_GRAPH_DELETED_SUCCESSFULLY');
            resolve(undefined);
          },
          () => {
            // No
            reject();
          }
        );
    });
  }

  private async __delete() {
    if (this.graph.flow_profile) {
      await this.uiFileHelper.deleteFile(this.graph.flow_profile);
    }
    await this.uiGraphStorage.removeByObject(this.graph);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.initializeFlowChart();
  }

  private getChartConfig() {
    const config = {
      responsive: false,
      scrollZoom: false,
      displayModeBar: false, // this is the line that hides the bar.
    };
    return config;
  }
  private getChartLayout() {
    /* Important - we use scatter instead of scattergl, because we can't have many openGL contexts
     * - https://github.com/plotly/plotly.js/issues/2333 -
     * */
    const chartWidth: number =
      this.canvaContainer.nativeElement.offsetWidth - 10;

    const chartHeight: number = 150;

    let tickFormat = '%S';

    tickFormat = '%M:' + tickFormat;

    /*  yaxis3: {
        title: '',
        titlefont: {color: '#09485D'},
        tickfont: {color: '#09485D'},
        anchor: 'x',
        overlaying: 'y',
        side: 'right',
        position: 1

      },*/
    const layout = {
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
      xaxis: {
        tickformat: tickFormat,
        visible: true,
        fixedrange: true,
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
        fixedrange: true,
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
        fixedrange: true,
        visible: true,
      },
    };

    layout['yaxis4'] = {
      title: '',
      titlefont: { color: '#05C793' },
      tickfont: { color: '#05C793' },
      anchor: 'free',
      overlaying: 'y',
      side: 'right',
      fixedrange: true,
      showgrid: false,
      position: 0.93,
      range: [0, 10],
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

    if (this.weightTrace.x && this.weightTrace.x.length > 0) {
      layout['yaxis'].visible = true;
      layout['yaxis2'].visible = true;
    } else {
      layout['yaxis'].visible = false;
      layout['yaxis2'].visible = false;
    }
    if (this.pressureTrace.x && this.pressureTrace.x.length > 0) {
      layout['yaxis4'].visible = true;
    } else {
      layout['yaxis4'].visible = false;
    }

    if (this.temperatureTrace.x && this.temperatureTrace.x.length > 0) {
      layout['yaxis5'].visible = true;
    } else {
      layout['yaxis5'].visible = false;
    }

    this.lastChartLayout = layout;
    return layout;
  }
  public initializeFlowChart(): void {
    setTimeout(() => {
      try {
        Plotly.purge(this.profileDiv.nativeElement);
      } catch (ex) {}
      const graphSettings = this.settings.graph.FILTER;

      this.weightTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT'),
        yaxis: 'y',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#cdc2ac',
          width: 2,
        },
        visible: graphSettings.weight,
      };
      this.flowPerSecondTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#7F97A2',
          width: 2,
        },
        visible: graphSettings.calc_flow,
      };

      this.realtimeFlowTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
        yaxis: 'y2',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#09485D',
          width: 2,
        },
        visible: graphSettings.realtime_flow,
      };

      this.pressureTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_PRESSURE_FLOW'),
        yaxis: 'y4',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#05C793',
          width: 2,
        },
        visible: graphSettings.pressure,
      };

      this.temperatureTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_TEMPERATURE_REALTIME'),
        yaxis: 'y5',
        type: 'scatter',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#CC3311',
          width: 2,
        },
        visible: graphSettings.temperature,
      };

      const startingDay = moment(new Date()).startOf('day');
      // IF brewtime has some seconds, we add this to the delay directly.

      let firstTimestamp;
      if (this.flow_profile_raw.weight?.length > 0) {
        firstTimestamp = this.flow_profile_raw.weight[0].timestamp;
      } else if (this.flow_profile_raw.pressureFlow?.length > 0) {
        firstTimestamp = this.flow_profile_raw.pressureFlow[0].timestamp;
      } else if (this.flow_profile_raw.temperatureFlow?.length > 0) {
        firstTimestamp = this.flow_profile_raw.temperatureFlow[0].timestamp;
      } else {
        firstTimestamp = 0;
      }
      const delay =
        moment(firstTimestamp, 'HH:mm:ss.SSS').toDate().getTime() -
        startingDay.toDate().getTime();
      if (this.flow_profile_raw.weight?.length > 0) {
        for (const data of this.flow_profile_raw.weight) {
          this.weightTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.weightTrace.y.push(data.actual_weight);
        }
        for (const data of this.flow_profile_raw.waterFlow) {
          this.flowPerSecondTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.flowPerSecondTrace.y.push(data.value);
        }
        if (this.flow_profile_raw?.realtimeFlow) {
          for (const data of this.flow_profile_raw.realtimeFlow) {
            this.realtimeFlowTrace.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay
              )
            );
            this.realtimeFlowTrace.y.push(data.flow_value);
          }
        }
      }
      if (
        this.flow_profile_raw?.pressureFlow &&
        this.flow_profile_raw.pressureFlow.length > 0
      ) {
        for (const data of this.flow_profile_raw.pressureFlow) {
          this.pressureTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.pressureTrace.y.push(data.actual_pressure);
        }
      }
      if (
        this.flow_profile_raw?.temperatureFlow &&
        this.flow_profile_raw.temperatureFlow.length > 0
      ) {
        for (const data of this.flow_profile_raw.temperatureFlow) {
          this.temperatureTrace.x.push(
            new Date(
              moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() - delay
            )
          );
          this.temperatureTrace.y.push(data.actual_temperature);
        }
      }

      const chartData = [
        this.weightTrace,
        this.flowPerSecondTrace,
        this.realtimeFlowTrace,
      ];

      const layout = this.getChartLayout();

      chartData.push(this.pressureTrace);
      chartData.push(this.temperatureTrace);

      Plotly.newPlot(
        this.profileDiv.nativeElement,
        chartData,
        layout,
        this.getChartConfig()
      );
      this.flowProfileLoading = false;
    }, 100);
  }

  private async readFlowProfile() {
    if (this.platform.is('cordova')) {
      if (this.graph.flow_profile !== '') {
        try {
          const jsonParsed = await this.uiFileHelper.getJSONFile(
            this.graph.flow_profile
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
