import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
  Platform,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import type { BrewFlow } from '../../../../classes/brew/brewFlow';
import { BrewGraphViewComponent } from '../../../../components/brews/graph/brew-graph-view/brew-graph-view.component';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import { BREW_GRAPH_TYPE } from '../../../../enums/brews/brewGraphType';
import { REFERENCE_GRAPH_TYPE } from '../../../../enums/brews/referenceGraphType';
import type { IBrew } from '../../../../interfaces/brew/iBrew';
import type { IReferenceGraph } from '../../../../interfaces/brew/iReferenceGraph';
import type { IGraph } from '../../../../interfaces/graph/iGraph';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { UILog } from '../../../../services/uiLog';

/**
 * The large graph of a stored graph, of a brew with its reference brew, or of
 * flow data not stored yet. A missing or broken file shows a hint.
 */
@Component({
  selector: 'app-graph-detail',
  templateUrl: './graph-detail.component.html',
  styleUrls: ['./graph-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    TranslatePipe,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
    BrewGraphViewComponent,
  ],
})
export class GraphDetailComponent implements OnInit {
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly platform = inject(Platform);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiLog = inject(UILog);
  private readonly modalController = inject(ModalController);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiGraphStorage = inject(UIGraphStorage);

  public static COMPONENT_ID = 'graph-detail';

  public readonly graph = input<IGraph>();
  public readonly brew = input<IBrew>();
  public readonly flowProfileData = input<BrewFlow>();

  protected readonly loading = signal(true);
  protected readonly flow = signal<BrewFlow | null>(null);
  protected readonly reference = signal<BrewFlow | null>(null);
  protected readonly referenceMissing = signal(false);

  constructor() {
    addIcons({ closeOutline });
  }

  public ngOnInit(): void {
    this.uiAnalytics.trackEvent(
      GRAPH_TRACKING.TITLE,
      GRAPH_TRACKING.ACTIONS.DETAIL,
    );
    void this.load();
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      { dismissed: true },
      undefined,
      GraphDetailComponent.COMPONENT_ID,
    );
  }

  private async load(): Promise<void> {
    const graph = this.graph();
    const brew = this.brew();
    if (graph) {
      this.flow.set(await this.readFlowProfile(graph.flow_profile));
    } else if (brew) {
      this.flow.set(await this.readFlowProfile(brew.flow_profile));
      await this.readReferenceFlowProfile(brew);
    } else {
      this.flow.set(this.flowProfileData() ?? null);
    }
    this.loading.set(false);
  }

  private async readFlowProfile(path: string): Promise<BrewFlow | null> {
    if (!this.platform.is('capacitor')) {
      return (
        await import('../../../../assets/BeanconquerorFlowTestDataFourth.json')
      ).default as unknown as BrewFlow;
    }
    if (!path) {
      return null;
    }
    try {
      return (await this.uiFileHelper.readInternalJSONFile(path)) as BrewFlow;
    } catch (error) {
      this.uiLog.error('Graph detail could not read the flow profile', error);
      return null;
    }
  }

  private async readReferenceFlowProfile(brew: IBrew): Promise<void> {
    if (!this.platform.is('capacitor')) {
      this.reference.set(
        (
          await import('../../../../assets/BeanconquerorFlowTestDataSecond.json')
        ).default as unknown as BrewFlow,
      );
      return;
    }
    const reference = this.uiBrewStorage.getEntryByUUID(
      brew.config.uuid,
    )?.reference_flow_profile;
    if (!reference || reference.type === REFERENCE_GRAPH_TYPE.NONE) {
      return;
    }
    const path = this.referencePath(reference);
    if (!path) {
      // The reference brew or graph has been deleted.
      this.referenceMissing.set(true);
      return;
    }
    try {
      this.reference.set(
        (await this.uiFileHelper.readInternalJSONFile(path)) as BrewFlow,
      );
    } catch (error) {
      this.uiLog.error('Graph detail could not read the reference', error);
      this.referenceMissing.set(true);
    }
  }

  private referencePath(reference: IReferenceGraph): string | undefined {
    switch (reference.type) {
      case REFERENCE_GRAPH_TYPE.BREW:
        return this.uiBrewStorage
          .getEntryByUUID(reference.uuid)
          ?.getGraphPath(BREW_GRAPH_TYPE.BREW);
      case REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH:
        return this.uiBrewStorage
          .getEntryByUUID(reference.uuid)
          ?.getGraphPath(BREW_GRAPH_TYPE.IMPORTED_GRAPH);
      default:
        return this.uiGraphStorage
          .getEntryByUUID(reference.uuid)
          ?.getGraphPath();
    }
  }
}
