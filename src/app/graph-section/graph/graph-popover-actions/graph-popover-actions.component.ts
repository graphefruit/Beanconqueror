import { Component, inject, Input, OnInit } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shareSocialOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Graph } from '../../../../classes/graph/graph';
import { GRAPH_ACTION } from '../../../../enums/graph/graphAction';
import { IGraph } from '../../../../interfaces/graph/iGraph';

@Component({
  selector: 'app-graph-popover-actions',
  templateUrl: './graph-popover-actions.component.html',
  styleUrls: ['./graph-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class GraphPopoverActionsComponent implements OnInit {
  private readonly modalController = inject(ModalController);

  public static COMPONENT_ID = 'graph-popover-actions';

  public data: Graph = new Graph();
  @Input('graph') public graph: IGraph;
  constructor() {
    this.data.initializeByObject(this.graph);
    addIcons({ shareSocialOutline });
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
      GraphPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      GraphPopoverActionsComponent.COMPONENT_ID,
    );
  }
}
