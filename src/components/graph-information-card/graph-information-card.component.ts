import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';

import { ModalController, Platform } from '@ionic/angular/standalone';

import { UIToast } from '../../services/uiToast';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIAlert } from '../../services/uiAlert';

import GRAPH_TRACKING from '../../data/tracking/graphTracking';

import { GRAPH_ACTION } from '../../enums/graph/graphAction';
import { UIGraphStorage } from '../../services/uiGraphStorage.service';
import { Graph } from '../../classes/graph/graph';
import { GraphPopoverActionsComponent } from '../../app/graph-section/graph/graph-popover-actions/graph-popover-actions.component';
import { UIGraphHelper } from '../../services/uiGraphHelper';

import { Settings } from '../../classes/settings/settings';
import { UIFileHelper } from '../../services/uiFileHelper';
import { TranslateService } from '@ngx-translate/core';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { UIHelper } from '../../services/uiHelper';
import { LongPressDirective } from '../../directive/long-press.directive';
import { GraphDisplayCardComponent } from '../graph-display-card/graph-display-card.component';
import {
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';

declare var Plotly;
@Component({
  selector: 'graph-information-card',
  templateUrl: './graph-information-card.component.html',
  styleUrls: ['./graph-information-card.component.scss'],
  imports: [
    LongPressDirective,
    GraphDisplayCardComponent,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
  ],
})
export class GraphInformationCardComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiGraphStorage = inject(UIGraphStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiGraphHelper = inject(UIGraphHelper);
  private readonly platform = inject(Platform);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly translate = inject(TranslateService);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  protected readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiHelper = inject(UIHelper);

  @Input() public graph: Graph;
  @Output() public graphAction: EventEmitter<any> = new EventEmitter();

  public settings: Settings;

  public radioSelection: string;

  public async ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async show() {
    await this.detail();
  }

  public async showActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.POPOVER_ACTIONS,
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
      case GRAPH_ACTION.SHARE:
        await this.share();
        break;
      default:
        break;
    }
  }
  public async archive() {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.ARCHIVE,
    );
    this.graph.finished = true;
    await this.uiGraphStorage.update(this.graph);
    this.uiToast.showInfoToast('TOAST_GRAPH_ARCHIVED_SUCCESSFULLY');
  }

  public async share() {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.SHARE,
    );
    try {
      const flowData: BrewFlow = (await this.uiGraphHelper.readFlowProfile(
        this.graph.flow_profile,
      )) as BrewFlow;
      const exportData = {
        NAME: this.graph.name,
        NOTE: this.graph.note,
        DATA: flowData,
      };
      try {
        await this.uiHelper.exportJSON(
          this.graph.config.uuid + '_export.json',
          JSON.stringify(exportData),
          true,
        );
      } catch (ex) {}
    } catch (ex) {}
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
              GRAPH_TRACKING.ACTIONS.DELETE,
            );
            await this.__delete();
            this.uiToast.showInfoToast('TOAST_GRAPH_DELETED_SUCCESSFULLY');
            resolve(undefined);
          },
          () => {
            // No
            reject();
          },
        );
    });
  }

  private async __delete() {
    if (this.graph.flow_profile) {
      try {
        // Could be after importing that the storage path is given, but the file is not existing.
        await this.uiFileHelper.deleteInternalFile(this.graph.flow_profile);
      } catch (ex) {}
    }
    await this.uiGraphStorage.removeByObject(this.graph);
  }
}
