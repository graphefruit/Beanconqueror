import { Component, Input, OnInit } from '@angular/core';

import { ModalController } from '@ionic/angular';
import { GRAPH_ACTION } from '../../../../enums/graph/graphAction';
import { Graph } from '../../../../classes/graph/graph';
import { IGraph } from '../../../../interfaces/graph/iGraph';

@Component({
  selector: 'app-graph-popover-actions',
  templateUrl: './graph-popover-actions.component.html',
  styleUrls: ['./graph-popover-actions.component.scss'],
})
export class GraphPopoverActionsComponent implements OnInit {
  public static COMPONENT_ID = 'graph-popover-actions';

  public data: Graph = new Graph();
  @Input('graph') public graph: IGraph;
  constructor(private readonly modalController: ModalController) {
    this.data.initializeByObject(this.graph);
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {}

  public getStaticActions(): any {
    return GRAPH_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      GraphPopoverActionsComponent.COMPONENT_ID
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      GraphPopoverActionsComponent.COMPONENT_ID
    );
  }
}
