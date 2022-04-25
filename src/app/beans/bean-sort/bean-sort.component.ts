import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {UIHelper} from '../../../services/uiHelper';
import {IBeanPageSort} from '../../../interfaces/bean/iBeanPageSort';
import {BEAN_SORT_AFTER} from '../../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../../enums/beans/beanSortOrder';


@Component({
  selector: 'app-bean-sort',
  templateUrl: './bean-sort.component.html',
  styleUrls: ['./bean-sort.component.scss'],
})
export class BeanSortComponent implements OnInit {

  public static COMPONENT_ID = 'bean-sort';
  public beanSortAfterEnum = BEAN_SORT_AFTER;
  public beanSortOrderEnum = BEAN_SORT_ORDER;
  public filter: IBeanPageSort = {
    sort_order: BEAN_SORT_ORDER.UNKOWN,
    sort_after: BEAN_SORT_AFTER.UNKOWN,
  };

  public segment: string = 'open';

  constructor(private readonly modalController: ModalController,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper) {


  }

  public ngOnInit() {

    this.segment = this.navParams.get('segment');
    this.filter = this.uiHelper.copyData(this.navParams.get('bean_sort'));
    this.__reloadFilterSettings();
  }

  public dismiss(): void {
    this.modalController.dismiss({
      bean_sort: undefined
    },undefined, BeanSortComponent.COMPONENT_ID);
  }

  public useFilter() {
    this.modalController.dismiss({
      bean_sort: this.uiHelper.copyData(this.filter)
    },undefined, BeanSortComponent.COMPONENT_ID);
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
  private __reloadFilterSettings() {


  }
}

