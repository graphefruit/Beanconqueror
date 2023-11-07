import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams, Platform } from '@ionic/angular';
import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { IGraph } from '../../../../interfaces/graph/iGraph';
import { Graph } from '../../../../classes/graph/graph';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import BeanconquerorFlowTestDataDummy from '../../../../assets/BeanconquerorFlowTestDataFifth.json';
import { UIGraphHelper } from '../../../../services/uiGraphHelper';
import { UIFileHelper } from '../../../../services/uiFileHelper';

@Component({
  selector: 'app-graph-edit',
  templateUrl: './graph-edit.component.html',
  styleUrls: ['./graph-edit.component.scss'],
})
export class GraphEditComponent implements OnInit {
  public static COMPONENT_ID = 'graph-edit';
  public data: Graph = new Graph();

  public flowData: BrewFlow = undefined;

  private flowDataHasBeenChanged: boolean = false;

  @Input() private graph: IGraph;

  constructor(
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    private readonly platform: Platform,
    private readonly uiGraphHelper: UIGraphHelper,
    private readonly uiFileHelper: UIFileHelper
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT
    );
    this.data = this.uiHelper.copyData(this.graph);
    this.readFlowProfile();
  }

  public async editGraph(form) {
    if (form.valid) {
      await this.__editGraph();
    }
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

  public async __editGraph() {
    if (this.flowDataHasBeenChanged === true) {
      // Resave the new flow because a user has updated to a new one.
      const flowPath: string = this.uiGraphHelper.saveGraph(
        this.data.config.uuid,
        this.flowData
      );
      this.data.flow_profile = flowPath;
    }
    await this.uiGraphStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_GRAPH_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT_FINISH
    );
    this.dismiss();
  }
  public async showGraph() {
    await this.uiGraphHelper.detailGraphRawData(this.flowData);
  }

  private async readFlowProfile() {
    if (this.platform.is('cordova')) {
      if (this.data.flow_profile !== '') {
        try {
          const jsonParsed = await this.uiFileHelper.getJSONFile(
            this.data.flow_profile
          );
          this.flowData = jsonParsed;
        } catch (ex) {}
      }
    } else {
      this.flowData = BeanconquerorFlowTestDataDummy as any;
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
          }
        }
      } else {
        this.flowData = BeanconquerorFlowTestDataDummy as BrewFlow;
      }
    } catch (ex) {}
  }
  public async deleteGraph() {
    this.flowData = undefined;
    this.flowDataHasBeenChanged = true;
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GraphEditComponent.COMPONENT_ID
    );
  }
  public ngOnInit() {}
}
