import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
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
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { IBeanPageSort } from '../../../interfaces/bean/iBeanPageSort';
import { UIHelper } from '../../../services/uiHelper';
import { SettingsStore } from '../../../stores/settings/settings.store';

@Component({
  selector: 'app-bean-sort',
  templateUrl: './bean-sort.component.html',
  styleUrls: ['./bean-sort.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TranslatePipe,
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
export class BeanSortComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly settingsStore = inject(SettingsStore);

  public static readonly COMPONENT_ID = 'bean-sort';
  public beanSortAfterEnum = BEAN_SORT_AFTER;
  public beanSortOrderEnum = BEAN_SORT_ORDER;
  public filter: IBeanPageSort = {
    sort_order: BEAN_SORT_ORDER.UNKOWN,
    sort_after: BEAN_SORT_AFTER.UNKOWN,
  };

  @Input('bean_sort') public bean_sort: any;

  public extendedSortActive: boolean = false;

  /** The dates a bean can be sorted by: those the bean form asks for. */
  protected readonly sortableDates = computed(() => {
    const shown = this.settingsStore.settings().bean_manage_parameters;
    return {
      buyDate: shown.buyDate === true,
      openDate: shown.openDate === true,
      bestDate: shown.bestDate === true,
    };
  });

  constructor() {
    addIcons({ chevronDownOutline, chevronUpOutline });
  }

  public ngOnInit() {
    this.filter = this.uiHelper.copyData(this.bean_sort);
    this.__reloadFilterSettings();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        bean_sort: undefined,
      },
      undefined,
      BeanSortComponent.COMPONENT_ID,
    );
  }

  public useFilter() {
    this.modalController.dismiss(
      {
        bean_sort: this.uiHelper.copyData(this.filter),
      },
      undefined,
      BeanSortComponent.COMPONENT_ID,
    );
  }

  public resetFilter() {
    this.filter = {
      sort_order: BEAN_SORT_ORDER.UNKOWN,
      sort_after: BEAN_SORT_AFTER.UNKOWN,
    };
    this.useFilter();
  }

  public setSortOrder(_order: any) {
    this.filter.sort_order = _order;
    /**Preset the first sort if nothing is selected yet**/
    if (this.filter.sort_after === BEAN_SORT_AFTER.UNKOWN) {
      this.filter.sort_after = BEAN_SORT_AFTER.NAME;
    }
  }

  public setSortAfter(_sort: any) {
    this.filter.sort_after = _sort;
    if (this.filter.sort_order === BEAN_SORT_ORDER.UNKOWN) {
      this.filter.sort_order = BEAN_SORT_ORDER.ASCENDING;
    }
  }

  public toggleExtendSort() {
    this.extendedSortActive = !this.extendedSortActive;
  }

  public isSortActive(_sort: any) {
    return this.filter.sort_after === _sort;
  }

  public isOrderActive(_order: any) {
    return this.filter.sort_order === _order;
  }

  private __reloadFilterSettings() {
    /* Empty for no particular reason */
  }
}
