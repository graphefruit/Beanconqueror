import { Component, inject, Input, OnInit } from '@angular/core';

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
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { PREPARATION_SORT_AFTER } from '../../../enums/preparations/preparationSortAfter';
import { PREPARATION_SORT_ORDER } from '../../../enums/preparations/preparationSortOrder';
import { IPreparationPageSort } from '../../../interfaces/preparation/iPreparationPageSort';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'app-preparation-sort',
  templateUrl: './preparation-sort.component.html',
  styleUrls: ['./preparation-sort.component.scss'],
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
  ],
})
export class PreparationSortComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);

  public static readonly COMPONENT_ID = 'preparation-sort';
  public preparationSortAfterEnum = PREPARATION_SORT_AFTER;
  public preparationSortOrderEnum = PREPARATION_SORT_ORDER;
  public filter: IPreparationPageSort = {
    sort_order: PREPARATION_SORT_ORDER.UNKNOWN,
    sort_after: PREPARATION_SORT_AFTER.UNKNOWN,
  };

  @Input() public preparation_sort: IPreparationPageSort;

  constructor() {}

  public ngOnInit() {
    this.filter = this.uiHelper.copyData(this.preparation_sort);
  }

  public useFilter() {
    void this.modalController.dismiss(
      {
        preparation_sort: this.uiHelper.copyData(this.filter),
      },
      undefined,
      PreparationSortComponent.COMPONENT_ID,
    );
  }

  public resetFilter() {
    this.filter = {
      sort_order: PREPARATION_SORT_ORDER.UNKNOWN,
      sort_after: PREPARATION_SORT_AFTER.UNKNOWN,
    };
    this.useFilter();
  }

  public setSortOrder(_order: PREPARATION_SORT_ORDER) {
    this.filter.sort_order = _order;
    /**Preset the first sort if nothing is selected yet**/
    if (this.filter.sort_after === PREPARATION_SORT_AFTER.UNKNOWN) {
      this.filter.sort_after = PREPARATION_SORT_AFTER.NAME;
    }
  }

  public setSortAfter(_sort: PREPARATION_SORT_AFTER) {
    this.filter.sort_after = _sort;
    if (this.filter.sort_order === PREPARATION_SORT_ORDER.UNKNOWN) {
      this.filter.sort_order = PREPARATION_SORT_ORDER.ASCENDING;
    }
  }

  public isSortActive(_sort: PREPARATION_SORT_AFTER) {
    return this.filter.sort_after === _sort;
  }

  public isOrderActive(_order: PREPARATION_SORT_ORDER) {
    return this.filter.sort_order === _order;
  }
}
