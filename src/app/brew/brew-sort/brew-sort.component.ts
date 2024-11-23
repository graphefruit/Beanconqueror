import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { BREW_SORT_AFTER } from '../../../enums/brews/brewSortAfter';
import { BREW_SORT_ORDER } from '../../../enums/brews/brewSortOrder';
import { IBrewPageSort } from '../../../interfaces/brew/iBrewPageSort';

@Component({
    selector: 'app-brew-sort',
    templateUrl: './brew-sort.component.html',
    styleUrls: ['./brew-sort.component.scss'],
    standalone: false
})
export class BrewSortComponent implements OnInit {
  public static readonly COMPONENT_ID = 'brew-sort';
  public brewSortAfterEnum = BREW_SORT_AFTER;
  public brewSortOrderEnum = BREW_SORT_ORDER;
  public filter: IBrewPageSort = {
    sort_order: BREW_SORT_ORDER.UNKOWN,
    sort_after: BREW_SORT_AFTER.UNKOWN,
  };

  @Input('brew_sort') public brew_sort: any;

  public extendedSortActive: boolean = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper
  ) {}

  public ngOnInit() {
    this.filter = this.uiHelper.copyData(this.brew_sort);
    this.__reloadFilterSettings();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        bean_sort: undefined,
      },
      undefined,
      BrewSortComponent.COMPONENT_ID
    );
  }

  public useFilter() {
    this.modalController.dismiss(
      {
        brew_sort: this.uiHelper.copyData(this.filter),
      },
      undefined,
      BrewSortComponent.COMPONENT_ID
    );
  }

  public resetFilter() {
    this.filter = {
      sort_order: BREW_SORT_ORDER.DESCENDING,
      sort_after: BREW_SORT_AFTER.BREW_DATE,
    };
    this.useFilter();
  }

  public setSortOrder(_order: any) {
    this.filter.sort_order = _order;
    if (this.filter.sort_after === BREW_SORT_AFTER.UNKOWN) {
      this.filter.sort_after = BREW_SORT_AFTER.BREW_DATE;
    }
  }

  public setSortAfter(_sort: any) {
    this.filter.sort_after = _sort;
    if (this.filter.sort_order === BREW_SORT_ORDER.UNKOWN) {
      this.filter.sort_order = BREW_SORT_ORDER.DESCENDING;
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
