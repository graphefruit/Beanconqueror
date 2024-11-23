import { Component, Input, OnInit } from '@angular/core';
import { BEAN_SORT_AFTER } from '../../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../../enums/beans/beanSortOrder';

import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-green-bean-filter',
  templateUrl: './green-bean-filter.component.html',
  styleUrls: ['./green-bean-filter.component.scss'],
})
export class GreenBeanFilterComponent implements OnInit {
  public static COMPONENT_ID = 'green-bean-filter';

  public beanSortAfterEnum = BEAN_SORT_AFTER;
  public beanSortOrderEnum = BEAN_SORT_ORDER;
  /*public filter: IBeanPageFilter = {
    sort_order: BEAN_SORT_ORDER.UNKOWN,
    sort_after: BEAN_SORT_AFTER.UNKOWN,
  };*/

  @Input('segment') public segment: string = 'open';

  constructor(private readonly modalController: ModalController) {}

  public ngOnInit() {}

  public dismiss(): void {
    this.modalController.dismiss({
      bean_filter: undefined,
    });
  }

  public useFilter() {
    /*this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter)
    });*/
  }

  public resetFilter() {
    /*this.filter = {
      sort_order: BEAN_SORT_ORDER.UNKOWN,
      sort_after: BEAN_SORT_AFTER.UNKOWN,
    };
    this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter)
    },undefined,GreenBeanFilterComponent.COMPONENT_ID);*/
  }

  public setSortOrder(_order: any) {
    /* this.filter.sort_order = _order;
    if (this.filter.sort_after === BEAN_SORT_AFTER.UNKOWN) {
      this.filter.sort_after = BEAN_SORT_AFTER.NAME;
    }*/
  }
  public setSortAfter(_sort: any) {
    /*this.filter.sort_after = _sort;
    if (this.filter.sort_order === BEAN_SORT_ORDER.UNKOWN) {
      this.filter.sort_order = BEAN_SORT_ORDER.ASCENDING;
    }*/
  }
  public isSortActive(_sort: any) {
    return true; //return this.filter.sort_after === _sort;
  }
  public isOrderActive(_order: any) {
    return true; //return this.filter.sort_order === _order;
  }
}
