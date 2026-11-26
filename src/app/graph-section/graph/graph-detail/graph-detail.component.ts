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
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import type { BrewFlow } from '../../../../classes/brew/brewFlow';
import { BrewGraphViewComponent } from '../../../../components/brews/graph/brew-graph-view/brew-graph-view.component';
import { FlowProfileReader } from '../../../../components/brews/graph/flow-profile-reader.service';
import GRAPH_TRACKING from '../../../../data/tracking/graphTracking';
import type { IBrew } from '../../../../interfaces/brew/iBrew';
import type { IGraph } from '../../../../interfaces/graph/iGraph';
import { UIAnalytics } from '../../../../services/uiAnalytics';

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
  private readonly reader = inject(FlowProfileReader);
  private readonly modalController = inject(ModalController);

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
      this.flow.set(await this.reader.read(graph.flow_profile));
    } else if (brew) {
      this.flow.set(await this.reader.read(brew.flow_profile));
      const reference = await this.reader.readReference(brew);
      this.reference.set(reference.flow);
      this.referenceMissing.set(reference.missing);
    } else {
      this.flow.set(this.flowProfileData() ?? null);
    }
    this.loading.set(false);
  }
}
