import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCol,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonRange,
  IonRow,
  IonTextarea,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';

import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { RangeNameDirective } from '../../../directive/range-name.directive';
import { StarsNameDirective } from '../../../directive/stars-name.directive';
import { IBean } from '../../../interfaces/bean/iBean';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIToast } from '../../../services/uiToast';
import { BeanCommands } from '../../../stores/beans/bean-commands';
import { suggestedBeanRating } from '../../../stores/beans/bean-sheet-rules';
import { field } from '../../../stores/beans/bean-usage.store';
import { DeepReadonly } from '../../../stores/core/read-only';
import { SettingsStore } from '../../../stores/settings/settings.store';

@Component({
  selector: 'app-bean-archive-popover',
  templateUrl: './bean-archive-popover.component.html',
  styleUrls: ['./bean-archive-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgxStarsModule,
    StarsNameDirective,
    DisableDoubleClickDirective,
    TranslatePipe,
    ToFixedPipe,
    IonHeader,
    IonContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonRange,
    RangeNameDirective,
    IonTextarea,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class BeanArchivePopoverComponent {
  private readonly beanCommands = inject(BeanCommands);
  private readonly modalController = inject(ModalController);
  private readonly uiToast = inject(UIToast);
  private readonly brews = inject(UIBrewStorage);

  public static COMPONENT_ID = 'bean-archive-popover';
  /** The bean to archive; legacy callers hand in a `Bean`. */
  public readonly bean = input.required<DeepReadonly<IBean>>();

  protected readonly settings = inject(SettingsStore).settings;
  /** The stars stand for the rating only on a scale of 5 whole stars. */
  protected readonly showStars = computed(
    () =>
      this.settings().bean_rating === 5 &&
      this.settings().bean_rating_steps === 1,
  );
  protected readonly averageBrewRating = computed(() => {
    const uuid = this.bean().config.uuid;
    const ratings = this.brews
      .getRawEntries()
      .map((entry) => entry as Record<string, unknown>)
      .filter((brew) => field(brew, 'bean', '') === uuid)
      .map((brew) => Number(field(brew, 'rating', 0)));
    return suggestedBeanRating(this.bean().rating, ratings, this.settings());
  });
  protected readonly rating = linkedSignal(
    () => this.averageBrewRating() ?? this.bean().rating,
  );
  protected readonly note = linkedSignal(() => this.bean().note);

  private readonly beanRating = viewChild('beanRating', {
    read: NgxStarsComponent,
  });

  constructor() {
    // The stars take their input only when they are created.
    effect(() => this.beanRating()?.setRating(this.rating()));
  }

  public async archive() {
    await this.beanCommands.archive(
      this.bean().config.uuid,
      this.rating(),
      this.note(),
    );
    void this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
    this.dismiss();
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeanArchivePopoverComponent.COMPONENT_ID,
    );
  }
}
