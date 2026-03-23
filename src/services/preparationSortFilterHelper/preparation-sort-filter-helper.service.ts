import { inject, Injectable } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';

import { PreparationSortComponent } from '../../app/preparation/preparation-sort/preparation-sort.component';
import { Preparation } from '../../classes/preparation/preparation';
import { PREPARATION_SEGMENT } from '../../enums/preparations/preparationSegment';
import { PREPARATION_SORT_AFTER } from '../../enums/preparations/preparationSortAfter';
import { PREPARATION_SORT_ORDER } from '../../enums/preparations/preparationSortOrder';
import { IPreparationPageSort } from '../../interfaces/preparation/iPreparationPageSort';
import { UIHelper } from '../uiHelper';

@Injectable({
  providedIn: 'root',
})
export class PreparationSortFilterHelperService {
  private readonly modalCtrl = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);

  public async showSort(_sort: IPreparationPageSort) {
    const prepSort: IPreparationPageSort = this.uiHelper.cloneData(_sort);

    const modal = await this.modalCtrl.create({
      component: PreparationSortComponent,
      componentProps: { preparation_sort: prepSort },
      id: PreparationSortComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData?.data?.preparation_sort !== undefined) {
      return modalData.data.preparation_sort as IPreparationPageSort;
    } else {
      return undefined;
    }
  }

  public initializePreparationsView(
    _type: PREPARATION_SEGMENT,
    _preparations: Preparation[],
    _searchText: string,
    _sort: IPreparationPageSort,
  ) {
    let filterPreparations: Preparation[] = this.manageFilterPreparations(
      _type,
      this.uiHelper.cloneData(_preparations),
    );

    filterPreparations = this.manageSort(_sort, filterPreparations);
    filterPreparations = this.manageSearchText(_searchText, filterPreparations);

    return filterPreparations;
  }

  private manageFilterPreparations(
    _type: PREPARATION_SEGMENT,
    preparationsCopy: Preparation[],
  ): Preparation[] {
    if (_type === PREPARATION_SEGMENT.OPEN) {
      return preparationsCopy.filter((prep) => !prep.finished);
    } else if (_type === PREPARATION_SEGMENT.ARCHIVE) {
      return preparationsCopy.filter((prep) => prep.finished);
    }
    return preparationsCopy;
  }

  private manageSearchText(
    searchText: string,
    filterPreparations: Preparation[],
  ) {
    if (searchText) {
      searchText = searchText.toLowerCase();
      const splittingSearch = searchText.split(',');
      filterPreparations = filterPreparations.filter((e) => {
        return splittingSearch.find((sc) => {
          const searchStr = sc.toLowerCase().trim();
          return (
            e.note?.toLowerCase().includes(searchStr) ||
            e.name?.toLowerCase().includes(searchStr) ||
            e.type?.toLowerCase().includes(searchStr)
          );
        });
      });
    }
    return filterPreparations;
  }

  private manageSort(
    sort: IPreparationPageSort,
    filterPreparations: Preparation[],
  ): Preparation[] {
    if (
      sort.sort_order !== PREPARATION_SORT_ORDER.UNKNOWN &&
      sort.sort_after !== PREPARATION_SORT_AFTER.UNKNOWN
    ) {
      switch (sort.sort_after) {
        case PREPARATION_SORT_AFTER.NAME:
          filterPreparations = filterPreparations.sort((a, b) => {
            const nameA = a.name.toUpperCase();
            const nameB = b.name.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            return 0;
          });
          break;
        case PREPARATION_SORT_AFTER.TYPE:
          filterPreparations = filterPreparations.sort((a, b) => {
            const typeA = a.type.toUpperCase();
            const typeB = b.type.toUpperCase();

            if (typeA < typeB) {
              return -1;
            }
            if (typeA > typeB) {
              return 1;
            }
            return 0;
          });
          break;
      }

      if (sort.sort_order === PREPARATION_SORT_ORDER.DESCENDING) {
        filterPreparations.reverse();
      }
    }
    return filterPreparations;
  }
}
