import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {UIHelper} from '../../../services/uiHelper';
import {IBeanPageFilter} from '../../../interfaces/bean/iBeanPageFilter';
import {BEAN_SORT_AFTER} from '../../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../../enums/beans/beanSortOrder';


@Component({
  selector: 'app-bean-filter',
  templateUrl: './bean-filter.component.html',
  styleUrls: ['./bean-filter.component.scss'],
})
export class BeanFilterComponent implements OnInit {



  public beanSortAfterEnum = BEAN_SORT_AFTER;
  public beanSortOrderEnum = BEAN_SORT_ORDER;
  public filter: IBeanPageFilter = {
    sort_order: BEAN_SORT_ORDER.UNKOWN,
    sort_after: BEAN_SORT_AFTER.UNKOWN,
  };

  private segment: string = 'open';

  constructor(private readonly modalController: ModalController,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper) {


  }

  public ngOnInit() {

    this.segment = this.navParams.get('segment');
    this.filter = this.uiHelper.copyData(this.navParams.get('bean_filter'));
    this.__reloadFilterSettings();
  }

  public dismiss(): void {
    this.modalController.dismiss({
      bean_filter: undefined
    });
  }

  public useFilter() {
    this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter)
    });
  }

  public resetFilter() {
    this.filter = {
      sort_order: BEAN_SORT_ORDER.UNKOWN,
      sort_after: BEAN_SORT_AFTER.UNKOWN,
    };
    this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter)
    },undefined,'bean-filter');
  }

  public setSortOrder(_order: any) {
      this.filter.sort_order = _order;
  }
  public setSortAfter(_sort: any) {
    this.filter.sort_after = _sort;
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

