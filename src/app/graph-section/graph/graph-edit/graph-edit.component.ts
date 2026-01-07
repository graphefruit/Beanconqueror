import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular/standalone';
import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { IGraph } from '../../../../interfaces/graph/iGraph';
import { Graph } from '../../../../classes/graph/graph';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { UIGraphHelper } from '../../../../services/uiGraphHelper';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIAlert } from '../../../../services/uiAlert';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { GraphDisplayCardComponent } from '../../../../components/graph-display-card/graph-display-card.component';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  informationCircleOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonItem,
  IonInput,
  IonLabel,
  IonTextarea,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-graph-edit',
  templateUrl: './graph-edit.component.html',
  styleUrls: ['./graph-edit.component.scss'],
  imports: [
    FormsModule,
    GraphDisplayCardComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonItem,
    IonInput,
    IonLabel,
    IonTextarea,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class GraphEditComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiGraphStorage = inject(UIGraphStorage);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly platform = inject(Platform);
  private readonly uiGraphHelper = inject(UIGraphHelper);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);

  public static COMPONENT_ID = 'graph-edit';
  public data: Graph = new Graph();

  public flowData: BrewFlow = undefined;

  private flowDataHasBeenChanged: boolean = false;

  @Input() private graph: IGraph;

  constructor() {
    addIcons({ cloudUploadOutline, informationCircleOutline, trashOutline });
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT,
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
      try {
        const flowPath: string = await this.uiGraphHelper.saveGraph(
          this.data.config.uuid,
          this.flowData,
        );
        this.data.flow_profile = flowPath;
      } catch (ex) {}
    }
    await this.uiGraphStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_GRAPH_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }
  public async showGraph() {
    await this.uiGraphHelper.detailGraphRawData(this.flowData);
  }

  private async readDummyFlowProfile(): Promise<any> {
    return (
      await import('../../../../assets/BeanconquerorFlowTestDataFifth.json')
    ).default;
  }

  private async readFlowProfile() {
    if (!this.platform.is('capacitor')) {
      this.flowData = await this.readDummyFlowProfile();
      return;
    }

    if (this.data.flow_profile !== '') {
      try {
        const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
          this.data.flow_profile,
        );
        this.flowData = jsonParsed;
      } catch (ex) {}
    }
  }

  public async uploadGraph() {
    try {
      if (!this.platform.is('capacitor')) {
        this.flowData = await this.readDummyFlowProfile();
        return;
      }

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
            this.translate.instant('INVALID_FILE_FORMAT'),
          );
        }
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
      GraphEditComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
