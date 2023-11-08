import { Component, Input, OnInit } from '@angular/core';
import { Graph } from '../../../../classes/graph/graph';

import { ModalController, NavParams, Platform } from '@ionic/angular';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { UIGraphHelper } from '../../../../services/uiGraphHelper';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import BeanconquerorFlowTestDataDummy from '../../../../assets/BeanconquerorFlowTestDataFifth.json';
import { UIAlert } from '../../../../services/uiAlert';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-graph-add',
  templateUrl: './graph-add.component.html',
  styleUrls: ['./graph-add.component.scss'],
})
export class GraphAddComponent implements OnInit {
  public static COMPONENT_ID = 'graph-add';
  public data: Graph = new Graph();
  public flowData: BrewFlow = undefined;

  constructor(
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiGraphHelper: UIGraphHelper,
    private readonly platform: Platform,
    private readonly uiAlert: UIAlert,
    private readonly translate: TranslateService
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT
    );
  }

  public saveDisabled(): boolean {
    if (
      this.data.name === undefined ||
      this.data.name === '' ||
      this.flowData === undefined
    ) {
      return true;
    }
    return false;
  }
  public async addGraph(form) {
    if (form.valid) {
      await this.__addGraph();
    }
  }

  public async uploadGraph() {
    try {
      if (this.platform.is('cordova')) {
        const data: any = await this.uiGraphHelper.chooseGraph();
        if (
          data &&
          (data?.weight || data?.pressureFlow || data?.temperatureFlow)
        ) {
          // Export from a normal flow data
          this.flowData = data as BrewFlow;
        } else {
          // Export from graph object
          if (
            data &&
            (data?.DATA?.weight ||
              data?.DATA?.pressureFlow ||
              data?.DATA?.temperatureFlow)
          ) {
            this.flowData = data.DATA as BrewFlow;
            if (data.NAME) {
              this.data.name = data.NAME;
            }
            if (data.NOTE) {
              this.data.note = data.NOTE;
            }
          } else {
            this.uiAlert.showMessage(
              this.translate.instant('INVALID_FILE_FORMAT')
            );
          }
        }
      } else {
        this.flowData = BeanconquerorFlowTestDataDummy as BrewFlow;
      }
    } catch (ex) {}
  }
  public async deleteGraph() {
    this.flowData = undefined;
  }

  public async showGraph() {
    await this.uiGraphHelper.detailGraphRawData(this.flowData);
  }

  public async __addGraph() {
    const addedGraphObj: Graph = await this.uiGraphStorage.add(this.data);
    try {
      const flowPath: string = await this.uiGraphHelper.saveGraph(
        addedGraphObj.config.uuid,
        this.flowData
      );
      addedGraphObj.flow_profile = flowPath;
      await this.uiGraphStorage.update(addedGraphObj);
    } catch (ex) {}
    this.uiToast.showInfoToast('TOAST_GRAPH_ADD_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.ADD_FINISH
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GraphAddComponent.COMPONENT_ID
    );
  }
  public ngOnInit() {}
}
