import { Component, Input, OnInit, inject } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';
import { GRAPH_ACTION } from '../../../../enums/graph/graphAction';
import { Graph } from '../../../../classes/graph/graph';
import { IGraph } from '../../../../interfaces/graph/iGraph';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { shareSocialOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

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
