import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { IBeanPageSort } from '../../../interfaces/bean/iBeanPageSort';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';

@Component({
  selector: 'app-bean-sort',
  templateUrl: './bean-sort.component.html',
  styleUrls: ['./bean-sort.component.scss'],
})
export class BeanSortComponent implements OnInit {
  public static readonly COMPONENT_ID = 'bean-sort';
  public beanSortAfterEnum = BEAN_SORT_AFTER;
  public beanSortOrderEnum = BEAN_SORT_ORDER;
  public filter: IBeanPageSort = {
    sort_order: BEAN_SORT_ORDER.UNKOWN,
    sort_after: BEAN_SORT_AFTER.UNKOWN,
  };

  @Input('bean_sort') public bean_sort: any;

  public extendedSortActive: boolean = false;

  public settings: Settings;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
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
