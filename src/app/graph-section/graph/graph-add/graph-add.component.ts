import { Component, Input, OnInit } from '@angular/core';
import { Graph } from '../../../../classes/graph/graph';

import { ModalController, NavParams } from '@ionic/angular';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { UIGraphHelper } from '../../../../services/uiGraphHelper';
import { BrewFlow } from '../../../../classes/brew/brewFlow';

@Component({
  selector: 'app-graph-add',
  templateUrl: './graph-add.component.html',
  styleUrls: ['./graph-add.component.scss'],
})
export class GraphAddComponent implements OnInit {
  public static COMPONENT_ID = 'graph-add';
  public data: Graph = new Graph();
  public flowData: BrewFlow;

  constructor(
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiGraphHelper: UIGraphHelper
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT
    );
  }

  public async addGraph(form) {
    if (form.valid) {
      await this.__addGraph();
    }
  }

  public async uploadGraph() {
    try {
      const data: any = await this.uiGraphHelper.chooseGraph();
      if (
        data &&
        (data?.weight || data?.pressureFlow || data?.temperatureFlow)
      ) {
        this.flowData = data as BrewFlow;
      }
    } catch (ex) {}
  }

  public async showGraph() {
    await this.uiGraphHelper.detailGraphRawData(this.flowData);
  }

  public async __addGraph() {
    const addedGraphObj: Graph = await this.uiGraphStorage.add(this.data);
    const flowPath: string = this.uiGraphHelper.saveGraph(
      addedGraphObj.config.uuid,
      this.flowData
    );
    addedGraphObj.flow_profile = flowPath;
    await this.uiGraphStorage.update(addedGraphObj);

    this.uiToast.showInfoToast('TOAST_GRAPH_ADD_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT_FINISH
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
