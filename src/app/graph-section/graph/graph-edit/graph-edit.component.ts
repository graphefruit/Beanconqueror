import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { IGraph } from '../../../../interfaces/graph/iGraph';
import { Graph } from '../../../../classes/graph/graph';

@Component({
  selector: 'app-graph-edit',
  templateUrl: './graph-edit.component.html',
  styleUrls: ['./graph-edit.component.scss'],
})
export class GraphEditComponent implements OnInit {
  public static COMPONENT_ID = 'graph-edit';
  public data: Graph = new Graph();

  @Input() private graph: IGraph;

  constructor(
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT
    );
    this.data = this.uiHelper.copyData(this.graph);
  }

  public async editGraph(form) {
    if (form.valid) {
      await this.__editGraph();
    }
  }

  public async __editGraph() {
    await this.uiGraphStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_GRAPH_EDITED_SUCCESSFULLY');
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
      GraphEditComponent.COMPONENT_ID
    );
  }
  public ngOnInit() {}
}
