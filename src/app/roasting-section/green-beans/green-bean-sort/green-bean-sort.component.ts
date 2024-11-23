import { Component, Input, OnInit } from '@angular/core';
import { BEAN_SORT_AFTER } from '../../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../../enums/beans/beanSortOrder';
import { IBeanPageSort } from '../../../../interfaces/bean/iBeanPageSort';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../../services/uiHelper';

@Component({
    selector: 'app-green-bean-sort',
    templateUrl: './green-bean-sort.component.html',
    styleUrls: ['./green-bean-sort.component.scss'],
    standalone: false
})
export class GreenBeanSortComponent implements OnInit {
  public static COMPONENT_ID = 'green-bean-sort';

  public beanSortAfterEnum = BEAN_SORT_AFTER;
  public beanSortOrderEnum = BEAN_SORT_ORDER;
  public filter: IBeanPageSort = {
    sort_order: BEAN_SORT_ORDER.UNKOWN,
    sort_after: BEAN_SORT_AFTER.UNKOWN,
  };

  @Input('segment') public segment: string = 'open';
  @Input('bean_filter') public bean_filter: any;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper
  ) {}

  public ngOnInit() {
    this.filter = this.uiHelper.copyData(this.bean_filter);
  }

  public dismiss(): void {
    this.modalController.dismiss({
      bean_filter: undefined,
    });
  }

  public useFilter() {
    this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter),
    });
  }

  public resetFilter() {
    this.filter = {
      sort_order: BEAN_SORT_ORDER.UNKOWN,
      sort_after: BEAN_SORT_AFTER.UNKOWN,
    };
    this.modalController.dismiss(
      {
        bean_filter: this.uiHelper.copyData(this.filter),
      },
      undefined,
      GreenBeanSortComponent.COMPONENT_ID
    );
  }

  public setSortOrder(_order: any) {
    this.filter.sort_order = _order;
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
  public isSortActive(_sort: any) {
    return this.filter.sort_after === _sort;
  }
  public isOrderActive(_order: any) {
    return this.filter.sort_order === _order;
  }
}
