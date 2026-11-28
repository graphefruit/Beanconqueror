import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { IonCard, IonItem, IonLabel } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../../classes/settings/settings';
import { BEAN_MIX_ENUM } from '../../../../enums/beans/mix';
import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';
import { BeanFieldVisiblePipe } from '../../../../pipes/bean/beanFieldVisible';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { isBlend } from '../../../../stores/beans/bean-rules';
import { DeepReadonly } from '../../../../stores/core/read-only';

/** A bean or a green bean; a green bean has no mix and is no blend. */
export interface BeanVarieties {
  readonly bean_information: readonly DeepReadonly<IBeanInformation>[];
  readonly beanMix?: BEAN_MIX_ENUM;
}

@Component({
  selector: 'bean-detail-sort-information',
  templateUrl: './bean-detail-sort-information.component.html',
  styleUrls: ['./bean-detail-sort-information.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, BeanFieldVisiblePipe, IonCard, IonItem, IonLabel],
})
export class BeanDetailSortInformationComponent {
  public readonly data = input.required<BeanVarieties>();

  protected readonly settings: Settings =
    inject(UISettingsStorage).getSettings();
  protected readonly blend = computed(() => isBlend(this.data()));
}
