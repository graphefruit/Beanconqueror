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
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { PREPARATION_SORT_AFTER } from '../../../enums/preparations/preparationSortAfter';
import { PREPARATION_SORT_ORDER } from '../../../enums/preparations/preparationSortOrder';
import { IPreparationPageSort } from '../../../interfaces/preparation/iPreparationPageSort';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

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
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public static readonly COMPONENT_ID = 'preparation-sort';
  public preparationSortAfterEnum = PREPARATION_SORT_AFTER;
  public preparationSortOrderEnum = PREPARATION_SORT_ORDER;
  public filter: IPreparationPageSort = {
    sort_order: PREPARATION_SORT_ORDER.UNKOWN,
    sort_after: PREPARATION_SORT_AFTER.UNKOWN,
  };

  @Input() public preparation_sort: any;

  public settings: Settings;

  constructor() {
    addIcons({ chevronDownOutline, chevronUpOutline });
  }

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.filter = this.uiHelper.copyData(this.preparation_sort);
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      {
        preparation_sort: undefined,
      },
      undefined,
      PreparationSortComponent.COMPONENT_ID,
    );
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
      sort_order: PREPARATION_SORT_ORDER.UNKOWN,
      sort_after: PREPARATION_SORT_AFTER.UNKOWN,
    };
    this.useFilter();
  }

  public setSortOrder(_order: any) {
    this.filter.sort_order = _order;
    /**Preset the first sort if nothing is selected yet**/
    if (this.filter.sort_after === PREPARATION_SORT_AFTER.UNKOWN) {
      this.filter.sort_after = PREPARATION_SORT_AFTER.NAME;
    }
  }

  public setSortAfter(_sort: any) {
    this.filter.sort_after = _sort;
    if (this.filter.sort_order === PREPARATION_SORT_ORDER.UNKOWN) {
      this.filter.sort_order = PREPARATION_SORT_ORDER.ASCENDING;
    }
  }

  public isSortActive(_sort: any) {
    return this.filter.sort_after === _sort;
  }

  public isOrderActive(_order: any) {
    return this.filter.sort_order === _order;
  }
}
