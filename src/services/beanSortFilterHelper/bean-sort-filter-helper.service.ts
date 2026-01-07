import { Injectable } from '@angular/core';
import { Bean } from '../../classes/bean/bean';
import { IBeanPageSort } from '../../interfaces/bean/iBeanPageSort';
import { IBeanPageFilter } from '../../interfaces/bean/iBeanPageFilter';
import { BEAN_SORT_ORDER } from '../../enums/beans/beanSortOrder';
import { BEAN_SORT_AFTER } from '../../enums/beans/beanSortAfter';
import moment from 'moment/moment';
import { BeanSortComponent } from '../../app/beans/bean-sort/bean-sort.component';
import { BeanFilterComponent } from '../../app/beans/bean-filter/bean-filter.component';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../uiHelper';
import { Brew } from '../../classes/brew/brew';
import { UIBeanHelper } from '../uiBeanHelper';

@Injectable({
  providedIn: 'root',
})
export class BeanSortFilterHelperService {
  constructor(
    private readonly modalCtrl: ModalController,
    private readonly uiHelper: UIHelper,
    private readonly uiBeanHelper: UIBeanHelper,
  ) {}

  public async showSort(_sort: IBeanPageSort) {
    const beanSort: IBeanPageSort = this.uiHelper.cloneData(_sort);

    const modal = await this.modalCtrl.create({
      component: BeanSortComponent,
      componentProps: { bean_sort: beanSort },
      id: BeanSortComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData?.data?.bean_sort !== undefined) {
      return modalData.data.bean_sort;
    } else {
      return undefined;
    }
  }

  public async showFilter(_beanFilter: IBeanPageFilter, _segment: string) {
    const beanFilter: IBeanPageFilter = this.uiHelper.cloneData(_beanFilter);

    const modal = await this.modalCtrl.create({
      component: BeanFilterComponent,
      cssClass: 'popover-actions',
      id: BeanFilterComponent.COMPONENT_ID,
      componentProps: { bean_filter: beanFilter, segment: _segment },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (
      modalData !== undefined &&
      modalData.data &&
      modalData.data.bean_filter !== undefined
    ) {
      return modalData.data.bean_filter;
    } else {
      return undefined;
    }
  }

  public initializeBeansView(
    _type: string,
    _beans: Array<Bean>,
    _searchText: string,
    _sort: IBeanPageSort,
    _filter: IBeanPageFilter,
  ) {
    let filterBeans: Array<Bean> = this.manageFilterBeans(
      _type,
      this.uiHelper.cloneData(_beans),
    );

    filterBeans = this.manageFavourites(_filter, filterBeans);

    // Rating filter is always active
    filterBeans = this.manageRating(filterBeans, _filter);

    filterBeans = this.manageRoastingType(_filter, filterBeans);

    filterBeans = this.manageRoastRange(filterBeans, _filter);

    filterBeans = this.manageRoaster(_filter, filterBeans);

    filterBeans = this.manageRoastingDateStart(_filter, filterBeans);

    filterBeans = this.manageRoastingDateEnd(_filter, filterBeans);

    // Skip if something is unkown, because no filter is active then
    filterBeans = this.manageSort(_sort, filterBeans);

    filterBeans = this.manageSearchText(_searchText, filterBeans);

    return filterBeans;
  }
  private manageFilterBeans(_type: string, beansCopy: Bean[]): Bean[] {
    if (_type === 'open') {
      return beansCopy.filter(
        (bean) => !bean.finished && bean.isFrozen() === false,
      );
    } else if (_type === 'archive') {
      return beansCopy.filter((bean) => bean.finished);
    } else if (_type === 'frozen') {
      return beansCopy.filter(
        (bean) => !bean.finished && bean.isFrozen() === true,
      );
    }
  }
  private manageSearchText(searchText: string, filterBeans: Bean[]) {
    if (searchText) {
      searchText = searchText.toLowerCase();
      const splittingSearch = searchText.split(',');
      filterBeans = filterBeans.filter((e) => {
        return splittingSearch.find((sc) => {
          const searchStr = sc.toLowerCase().trim();
          return (
            e.note?.toLowerCase().includes(searchStr) ||
            e.name?.toLowerCase().includes(searchStr) ||
            e.roaster?.toLowerCase().includes(searchStr) ||
            e.aromatics?.toLowerCase().includes(searchStr) ||
            e.bean_information?.find((bi) => {
              return (
                bi?.variety?.toLowerCase().includes(searchStr) ||
                bi?.country?.toLowerCase().includes(searchStr) ||
                bi?.region?.toLowerCase().includes(searchStr) ||
                bi?.farm?.toLowerCase().includes(searchStr) ||
                bi?.farmer?.toLowerCase().includes(searchStr) ||
                bi?.harvest_time?.toLowerCase().includes(searchStr) ||
                bi?.elevation?.toLowerCase().includes(searchStr) ||
                bi?.processing?.toLowerCase().includes(searchStr)
              );
            }) ||
            e.frozenId?.toLowerCase().includes(searchStr) ||
            e.ean_article_number?.toLowerCase().includes(searchStr)
          );
        });
      });
    }
    return filterBeans;
  }

  private manageSort(sort: IBeanPageSort, filterBeans: Bean[]): Bean[] {
    if (
      sort.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
      sort.sort_after !== BEAN_SORT_AFTER.UNKOWN
    ) {
      switch (sort.sort_after) {
        case BEAN_SORT_AFTER.NAME:
          filterBeans = filterBeans.sort((a, b) => {
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
        case BEAN_SORT_AFTER.ROASTER:
          filterBeans = filterBeans.sort((a, b) => {
            const roasterA = a.roaster.toUpperCase();
            const roasterB = b.roaster.toUpperCase();
            if (roasterA < roasterB) {
              return -1;
            }
            if (roasterA > roasterB) {
              return 1;
            }

            return 0;
          });
          break;
        case BEAN_SORT_AFTER.ROASTING_DATE:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.roastingDate < b.roastingDate) {
              return -1;
            }
            if (a.roastingDate > b.roastingDate) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.BUY_DATE:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.buyDate < b.buyDate) {
              return -1;
            }
            if (a.buyDate > b.buyDate) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.OPEN_DATE:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.openDate < b.openDate) {
              return -1;
            }
            if (a.openDate > b.openDate) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.BEST_DATE:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.bestDate < b.bestDate) {
              return -1;
            }
            if (a.bestDate > b.bestDate) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.RATING:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.rating < b.rating) {
              return -1;
            }
            if (a.rating > b.rating) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.BEAN_AGE:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.beanAgeInDays() < b.beanAgeInDays()) {
              return -1;
            }
            if (a.beanAgeInDays() > b.beanAgeInDays()) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.RECENTLY_USED:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.getLastUsed() < b.getLastUsed()) {
              return -1;
            }
            if (a.getLastUsed() > b.getLastUsed()) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.BEAN_ROASTING_TYPE:
          filterBeans = filterBeans.sort((a, b) => {
            const nameA = a.bean_roasting_type.toUpperCase();
            const nameB = b.bean_roasting_type.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }

            return 0;
          });
          break;
        case BEAN_SORT_AFTER.WEIGHT:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.weight < b.weight) {
              return -1;
            }
            if (a.weight > b.weight) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.WEIGHT_REMAINING:
          filterBeans = filterBeans.sort((a, b) => {
            const remainingWeightA =
              a?.weight - this.getUsedWeightCount(a.config.uuid);
            const remainingWeightB =
              b?.weight - this.getUsedWeightCount(b.config.uuid);
            if (remainingWeightA < remainingWeightB) {
              return -1;
            }
            if (remainingWeightA > remainingWeightB) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.AROMATICS:
          filterBeans = filterBeans.sort((a, b) => {
            const nameA = a.aromatics.toUpperCase();
            const nameB = b.aromatics.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }

            return 0;
          });
          break;
        case BEAN_SORT_AFTER.INFORMATION_COUNTRY:
          filterBeans = filterBeans.sort((a, b) => {
            try {
              const nameA = a.bean_information[0].country.toUpperCase();
              const nameB = b.bean_information[0].country.toUpperCase();

              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }
            } catch (ex) {}
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.INFORMATION_REGION:
          filterBeans = filterBeans.sort((a, b) => {
            try {
              const nameA = a.bean_information[0].region.toUpperCase();
              const nameB = b.bean_information[0].region.toUpperCase();

              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }
            } catch (ex) {}
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.INFORMATION_VARIETY:
          filterBeans = filterBeans.sort((a, b) => {
            try {
              const nameA = a.bean_information[0].variety.toUpperCase();
              const nameB = b.bean_information[0].variety.toUpperCase();

              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }
            } catch (ex) {}
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.INFORMATION_PROCESSING:
          filterBeans = filterBeans.sort((a, b) => {
            try {
              const nameA = a.bean_information[0].processing.toUpperCase();
              const nameB = b.bean_information[0].processing.toUpperCase();

              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }
            } catch (ex) {}
            return 0;
          });
          break;
      }

      if (sort.sort_order === BEAN_SORT_ORDER.DESCENDING) {
        filterBeans.reverse();
      }
    }
    return filterBeans;
  }

  public getUsedWeightCount(_uuid: string): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> =
      this.uiBeanHelper.getAllBrewsForThisBean(_uuid);
    for (const brew of relatedBrews) {
      if (brew.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }

  private manageRoastingDateEnd(filter: IBeanPageFilter, filterBeans: Bean[]) {
    if (filter.roastingDateEnd) {
      const roastingDateEnd = moment(filter.roastingDateEnd)
        .startOf('day')
        .toDate();
      filterBeans = filterBeans.filter((e: Bean) => {
        if (e.roastingDate === undefined || e.roastingDate === '') {
          return false;
        }

        const beanRoastingDate = moment(e.roastingDate).startOf('day').toDate();
        return beanRoastingDate <= roastingDateEnd;
      });
    }
    return filterBeans;
  }

  private manageRoastingDateStart(
    filter: IBeanPageFilter,
    filterBeans: Bean[],
  ): Bean[] {
    if (filter.roastingDateStart) {
      const roastingStart = moment(filter.roastingDateStart)
        .startOf('day')
        .toDate();
      filterBeans = filterBeans.filter((e: Bean) => {
        if (e.roastingDate === undefined || e.roastingDate === '') {
          return false;
        }

        const beanRoastingDate = moment(e.roastingDate).startOf('day').toDate();
        return beanRoastingDate >= roastingStart;
      });
    }
    return filterBeans;
  }

  private manageRoaster(filter: IBeanPageFilter, filterBeans: Bean[]) {
    if (filter.bean_roaster) {
      filterBeans = filterBeans.filter(
        (e: Bean) => filter.bean_roaster.includes(e.roaster) === true,
      );
    }
    return filterBeans;
  }

  private manageRoastRange(
    filterBeans: Bean[],
    filter: IBeanPageFilter,
  ): Bean[] {
    return filterBeans.filter(
      (e: Bean) =>
        e.roast_range >= filter.roast_range.lower &&
        e.roast_range <= filter.roast_range.upper,
    );
  }

  private manageRoastingType(
    filter: IBeanPageFilter,
    filterBeans: Bean[],
  ): Bean[] {
    if (filter.bean_roasting_type.length > 0) {
      return filterBeans.filter(
        (e: Bean) =>
          filter.bean_roasting_type.includes(e.bean_roasting_type) === true,
      );
    }
    return filterBeans;
  }

  private manageRating(filterBeans: Bean[], filter: IBeanPageFilter): Bean[] {
    return filterBeans.filter(
      (e: Bean) =>
        e.rating >= filter.rating.lower && e.rating <= filter.rating.upper,
    );
  }

  private manageFavourites(
    filter: IBeanPageFilter,
    filterBeans: Bean[],
  ): Bean[] {
    if (filter.favourite) {
      return filterBeans.filter((e) => e.favourite === true);
    }
    return filterBeans;
  }
}
