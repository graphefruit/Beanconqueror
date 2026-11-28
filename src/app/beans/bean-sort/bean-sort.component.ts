import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';

import {
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRow,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { SheetCloseButtonComponent } from '../../../components/sheet-close-button/sheet-close-button.component';
import { ItemButtonDirective } from '../../../directive/item-button.directive';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { IBeanPageSort } from '../../../interfaces/bean/iBeanPageSort';
import {
  chooseSortAfter,
  chooseSortOrder,
} from '../../../stores/beans/bean-sheet-rules';
import { SettingsStore } from '../../../stores/settings/settings.store';

/** A criterion of the sheet: what it sorts by, its icon and its text. */
interface SortChoice {
  readonly after: BEAN_SORT_AFTER;
  readonly icon: string;
  readonly label: string;
}

const S = BEAN_SORT_AFTER;
const choice = (after: BEAN_SORT_AFTER, icon: string, label: string) => ({
  after,
  icon: `beanconqueror-${icon}`,
  label,
});

const MAIN_SORTS: readonly SortChoice[] = [
  choice(S.NAME, 'filter-aa', 'BEAN_SORT_NAME_OF_BEAN'),
  choice(S.ROASTER, 'person', 'BEAN_SORT_ROASTER'),
  choice(S.ROASTING_DATE, 'clock', 'BEAN_SORT_ROASTING_DATE'),
  choice(S.RATING, 'brew-rating-empty', 'BREW_DATA_RATING'),
  choice(S.BEAN_AGE, 'clock', 'BEAN_SORT_BEAN_AGE'),
  choice(S.RECENTLY_USED, 'clock', 'BEAN_SORT_RECENTLY_USED'),
];

@Component({
  selector: 'app-bean-sort',
  templateUrl: './bean-sort.component.html',
  styleUrls: ['./bean-sort.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    ItemButtonDirective,
    IonHeader,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonLabel,
    IonButton,
    SheetCloseButtonComponent,
  ],
})
export class BeanSortComponent {
  private readonly modalController = inject(ModalController);
  private readonly settingsStore = inject(SettingsStore);

  public static readonly COMPONENT_ID = 'bean-sort';
  protected readonly beanSortOrderEnum = BEAN_SORT_ORDER;
  protected readonly mainSorts = MAIN_SORTS;

  public readonly bean_sort = input.required<IBeanPageSort>();

  /** The sort as chosen in the sheet so far. */
  protected readonly sort = linkedSignal(() => ({ ...this.bean_sort() }));
  protected readonly extendedSortActive = signal(false);

  /** The further criteria; of the dates only those the bean form asks for. */
  protected readonly extendedSorts = computed((): SortChoice[] => {
    const shown = this.settingsStore.settings().bean_manage_parameters;
    const date = (asked: boolean, after: BEAN_SORT_AFTER, label: string) =>
      asked === true ? [choice(after, 'clock', label)] : [];
    return [
      choice(S.BEAN_ROASTING_TYPE, 'filter-aa', 'BEAN_SORT_BEAN_ROASTING_TYPE'),
      choice(S.WEIGHT, 'filter-aa', 'BEAN_SORT_WEIGHT'),
      ...date(shown.buyDate, S.BUY_DATE, 'BEAN_DATA_BUY_DATE'),
      ...date(shown.openDate, S.OPEN_DATE, 'BEAN_DATA_OPEN_DATE'),
      ...date(shown.bestDate, S.BEST_DATE, 'BEAN_DATA_BEST_DATE'),
      choice(S.WEIGHT_REMAINING, 'filter-aa', 'BEAN_SORT_WEIGHT_REMAINING'),
      choice(S.AROMATICS, 'filter-aa', 'BEAN_SORT_AROMATICS'),
      choice(
        S.INFORMATION_COUNTRY,
        'filter-aa',
        'BEAN_SORT_INFORMATION_COUNTRY',
      ),
      choice(S.INFORMATION_REGION, 'filter-aa', 'BEAN_SORT_INFORMATION_REGION'),
      choice(
        S.INFORMATION_VARIETY,
        'filter-aa',
        'BEAN_SORT_INFORMATION_VARIETY',
      ),
      choice(
        S.INFORMATION_PROCESSING,
        'filter-aa',
        'BEAN_SORT_INFORMATION_PROCESSING',
      ),
    ];
  });

  constructor() {
    addIcons({ chevronDownOutline, chevronUpOutline });
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      {
        bean_sort: undefined,
      },
      undefined,
      BeanSortComponent.COMPONENT_ID,
    );
  }

  public useFilter() {
    void this.modalController.dismiss(
      {
        bean_sort: { ...this.sort() },
      },
      undefined,
      BeanSortComponent.COMPONENT_ID,
    );
  }

  public resetFilter() {
    this.sort.set({
      sort_order: BEAN_SORT_ORDER.UNKOWN,
      sort_after: BEAN_SORT_AFTER.UNKOWN,
    });
    this.useFilter();
  }

  public setSortOrder(order: BEAN_SORT_ORDER) {
    this.sort.update((sort) => chooseSortOrder(sort, order));
  }

  public setSortAfter(after: BEAN_SORT_AFTER) {
    this.sort.update((sort) => chooseSortAfter(sort, after));
  }

  public toggleExtendSort() {
    this.extendedSortActive.update((active) => !active);
  }
}
