import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRange,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonToggle,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { SheetCloseButtonComponent } from '../../../components/sheet-close-button/sheet-close-button.component';
import { ChooseDateOverlayDirective } from '../../../directive/choose-date.directive';
import { ControlDescriptionDirective } from '../../../directive/control-description.directive';
import { PickerFieldDirective } from '../../../directive/picker-field.directive';
import { RangeNameDirective } from '../../../directive/range-name.directive';
import { SelectLabelDirective } from '../../../directive/select-label.directive';
import { TransformDateDirective } from '../../../directive/transform-date';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { IBeanPageFilter } from '../../../interfaces/bean/iBeanPageFilter';
import { KeysPipe } from '../../../pipes/keys';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  filterRatingMax,
  filterRoasters,
} from '../../../stores/beans/bean-sheet-rules';
import { BeanStore } from '../../../stores/beans/bean.store';

@Component({
  selector: 'app-bean-filter',
  templateUrl: './bean-filter.component.html',
  styleUrls: ['./bean-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ControlDescriptionDirective,
    FormsModule,
    ChooseDateOverlayDirective,
    TransformDateDirective,
    TranslatePipe,
    KeysPipe,
    ToFixedPipe,
    IonHeader,
    IonContent,
    IonItem,
    IonToggle,
    IonSelect,
    SelectLabelDirective,
    IonSelectOption,
    IonGrid,
    IonRow,
    IonCol,
    IonInput,
    PickerFieldDirective,
    IonLabel,
    IonRange,
    RangeNameDirective,
    IonIcon,
    IonBadge,
    IonList,
    IonButton,
    SheetCloseButtonComponent,
  ],
})
export class BeanFilterComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly beanStore = inject(BeanStore);

  public static readonly COMPONENT_ID = 'bean-filter';
  public readonly settings: Settings = inject(UISettingsStorage).getSettings();

  public readonly segment = input('open');
  public readonly bean_filter = input.required<IBeanPageFilter>();

  /** The filter as changed in the sheet so far. */
  public filter: IBeanPageFilter;

  protected readonly beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  /** Read from the store, so the shared lists of legacy code keep their order. */
  protected readonly roasteries = computed(() =>
    filterRoasters(this.beanStore.entries()),
  );
  protected readonly maxBeanRating = computed(() =>
    filterRatingMax(
      this.beanStore.entries(),
      this.segment(),
      this.settings.bean_rating,
    ),
  );

  public ngOnInit() {
    this.filter = { ...this.bean_filter() };
  }

  public pinFormatter(value: unknown) {
    const parsedFloat = parseFloat(value as string);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }

  public dismiss(): void {
    void this.modalController.dismiss({
      bean_filter: undefined,
    });
  }

  public useFilter() {
    void this.modalController.dismiss({
      bean_filter: { ...this.filter },
    });
  }

  public resetFilter() {
    this.filter = this.settings.GET_BEAN_FILTER();
    void this.modalController.dismiss(
      {
        bean_filter: { ...this.filter },
      },
      undefined,
      BeanFilterComponent.COMPONENT_ID,
    );
  }
}
