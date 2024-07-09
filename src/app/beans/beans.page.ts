import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { ModalController, Platform } from '@ionic/angular';
import { Bean } from '../../classes/bean/bean';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { BeanSortComponent } from './bean-sort/bean-sort.component';
import { IBeanPageSort } from '../../interfaces/bean/iBeanPageSort';
import { BEAN_SORT_AFTER } from '../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../enums/beans/beanSortOrder';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { UIAnalytics } from '../../services/uiAnalytics';
import { QrScannerService } from '../../services/qrScanner/qr-scanner.service';
import { IntentHandlerService } from '../../services/intentHandler/intent-handler.service';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { IBeanPageFilter } from '../../interfaces/bean/iBeanPageFilter';
import { BeanFilterComponent } from './bean-filter/bean-filter.component';
import moment from 'moment';
import _ from 'lodash';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import { BeanPopoverAddComponent } from './bean-popover-add/bean-popover-add.component';
import { BEAN_POPOVER_ADD_ACTION } from '../../enums/beans/beanPopoverAddAction';

@Component({
  selector: 'beans',
  templateUrl: './beans.page.html',
  styleUrls: ['./beans.page.scss'],
})
export class BeansPage {
  public beans: Array<Bean> = [];

  public settings: Settings;

  public openBeans: Array<Bean> = [];
  public finishedBeans: Array<Bean> = [];
  public frozenBeans: Array<Bean> = [];
  public finishedBeansLength: number = 0;
  public openBeansLength: number = 0;
  public frozenBeansLength: number = 0;

  public openBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualSrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualSrollComponent;
  @ViewChild('frozenScroll', { read: AgVirtualSrollComponent, static: false })
  public frozenScroll: AgVirtualSrollComponent;

  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;

  public bean_segment: 'open' | 'archive' | 'frozen' = 'open';
  public archivedBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };
  public frozenBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public archivedBeansFilterText: string = '';
  public openBeansFilterText: string = '';
  public frozenBeansFilterText: string = '';

  public archivedBeansFilter: IBeanPageFilter;
  public openBeansFilter: IBeanPageFilter;
  public frozenBeansFilter: IBeanPageFilter;
  constructor(
    private readonly modalCtrl: ModalController,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly qrScannerService: QrScannerService,
    private readonly intenthandler: IntentHandlerService,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly platform: Platform,
    private readonly modalController: ModalController
  ) {}

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBeansSort = this.settings.bean_sort.ARCHIVED;
    this.openBeansSort = this.settings.bean_sort.OPEN;

    this.archivedBeansFilter = this.settings.bean_filter.ARCHIVED;
    this.frozenBeansFilter = this.settings.bean_filter.FROZEN;
    this.openBeansFilter = this.settings.bean_filter.OPEN;
    this.loadBeans();
  }

  public loadBeans(): void {
    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
    this.retriggerScroll();
  }

  public segmentChanged() {
    this.retriggerScroll();
  }

  public async beanAction(): Promise<void> {
    this.loadBeans();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(_event: any) {
    this.retriggerScroll();
  }

  public async showSort() {
    let beanSort: IBeanPageSort;
    if (this.bean_segment === 'open') {
      beanSort = { ...this.openBeansSort };
    } else if (this.bean_segment === 'archive') {
      beanSort = { ...this.archivedBeansSort };
    } else if (this.bean_segment === 'frozen') {
      beanSort = { ...this.frozenBeansSort };
    }

    const modal = await this.modalCtrl.create({
      component: BeanSortComponent,
      componentProps: { bean_sort: beanSort, segment: this.bean_segment },
      id: BeanSortComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData?.data?.bean_sort !== undefined) {
      if (this.bean_segment === 'open') {
        this.openBeansSort = modalData.data.bean_sort;
      } else if (this.bean_segment === 'archive') {
        this.archivedBeansSort = modalData.data.bean_sort;
      } else if (this.bean_segment === 'frozen') {
        this.frozenBeansSort = modalData.data.bean_sort;
      }
    }
    await this.__saveBeanFilter();

    this.loadBeans();
  }

  public async showFilter() {
    let beanFilter: IBeanPageFilter;
    if (this.bean_segment === 'open') {
      beanFilter = { ...this.openBeansFilter };
    } else if (this.bean_segment === 'archive') {
      beanFilter = { ...this.archivedBeansFilter };
    } else if (this.bean_segment === 'frozen') {
      beanFilter = { ...this.frozenBeansFilter };
    }

    const modal = await this.modalCtrl.create({
      component: BeanFilterComponent,
      cssClass: 'popover-actions',
      id: BeanFilterComponent.COMPONENT_ID,
      componentProps: { bean_filter: beanFilter, segment: this.bean_segment },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData !== undefined && modalData.data.bean_filter !== undefined) {
      if (this.bean_segment === 'open') {
        this.openBeansFilter = modalData.data.bean_filter;
      } else if (this.bean_segment === 'archive') {
        this.archivedBeansFilter = modalData.data.bean_filter;
      } else if (this.bean_segment === 'frozen') {
        this.frozenBeansFilter = modalData.data.bean_filter;
      }
    }
    await this.__saveBeanFilter();

    this.loadBeans();
  }

  public isSortActive(): boolean {
    if (this.bean_segment === 'open') {
      return (
        this.openBeansSort.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
        this.openBeansSort.sort_after !== BEAN_SORT_AFTER.UNKOWN
      );
    } else if (this.bean_segment === 'archive') {
      return (
        this.archivedBeansSort.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
        this.archivedBeansSort.sort_after !== BEAN_SORT_AFTER.UNKOWN
      );
    } else if (this.bean_segment === 'frozen') {
      return (
        this.frozenBeansSort.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
        this.frozenBeansSort.sort_after !== BEAN_SORT_AFTER.UNKOWN
      );
    }
  }

  public isTextSearchActive() {
    if (this.bean_segment === 'open') {
      return this.openBeansFilterText !== '';
    } else if (this.bean_segment === 'archive') {
      return this.archivedBeansFilterText !== '';
    } else if (this.bean_segment === 'frozen') {
      return this.frozenBeansFilterText !== '';
    }
  }

  public isFilterActive(): boolean {
    let isFilterActive: boolean = false;

    if (this.settings) {
      let checkingFilter: IBeanPageFilter;
      if (this.bean_segment === 'open') {
        checkingFilter = this.openBeansFilter;
      } else {
        checkingFilter = this.archivedBeansFilter;
      }
      isFilterActive = !_.isEqual(
        this.settings?.GET_BEAN_FILTER(),
        checkingFilter
      );
      /** let didRatingFilterChanged: boolean = false;
       if (isFilterActive === false && checkingFilter.rating) {
       didRatingFilterChanged = (checkingFilter.rating.upper !== this.settings?.bean_rating || checkingFilter.rating.lower !== -1);
       }
       if (didRatingFilterChanged === true) {
       isFilterActive = true;
       } **/
    }

    return isFilterActive;
  }

  public shallBarBeDisplayed() {
    let shallBarDisplayed: boolean = false;
    if (this.settings) {
      const isOpenSegment = this.bean_segment === 'open';
      const checkingEntries = isOpenSegment
        ? this.openBeans
        : this.finishedBeans;
      if (checkingEntries.length <= 0) {
        const entriesExisting = this.uiBeanStorage
          .getAllEntries()
          .filter((e) => e.finished !== isOpenSegment).length;
        if (entriesExisting > 0) {
          shallBarDisplayed = true;
        }
      }
    }

    return shallBarDisplayed;
  }

  public research() {
    this.__initializeBeansView(this.bean_segment);
  }

  public async add() {
    await this.uiBeanHelper.addBean();
    this.loadBeans();
  }

  public async beanPopover() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.POPOVER_ACTIONS
    );
    const popover = await this.modalController.create({
      component: BeanPopoverAddComponent,
      componentProps: {},
      id: BeanPopoverAddComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.25, 0.5],
      initialBreakpoint: 0.25,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      switch (data.role as BEAN_POPOVER_ADD_ACTION) {
        case BEAN_POPOVER_ADD_ACTION.ADD:
          await this.add();
          break;
        case BEAN_POPOVER_ADD_ACTION.SCAN:
          await this.scanBean();
          break;
      }
    }
  }

  public async scanBean() {
    if (this.platform.is('cordova')) {
      await this.qrScannerService.scan().then(
        async (scannedCode) => {
          await this.intenthandler.handleQRCodeLink(scannedCode);
        },
        () => {}
      );
    } else {
      // Test sample for development
      // await this.intenthandler.handleQRCodeLink('https://beanconqueror.com/?qr=e7ada0a6');
    }
    this.loadBeans();
  }

  public async longPressAdd(event) {
    if (event) {
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    await this.add();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.beanContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else if (this.archivedScroll !== undefined) {
        scrollComponent = this.archivedScroll;
      } else if (this.frozenScroll !== undefined) {
        scrollComponent = this.frozenScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';
    }, 250);
  }

  private async __saveBeanFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.bean_sort.OPEN = this.openBeansSort;
    settings.bean_sort.ARCHIVED = this.archivedBeansSort;
    settings.bean_sort.FROZEN = this.frozenBeansSort;

    settings.bean_filter.OPEN = this.openBeansFilter;
    settings.bean_filter.ARCHIVED = this.archivedBeansFilter;
    settings.bean_filter.FROZEN = this.frozenBeansFilter;
    await this.uiSettingsStorage.saveSettings(settings);
  }

  private __initializeBeansView(_type: string) {
    // sort latest to top.
    const beansCopy: Array<Bean> = [...this.beans];

    let sort: IBeanPageSort;
    let filterBeans: Array<Bean>;
    sort = this.manageSortScope(_type);
    filterBeans = this.manageFilterBeans(_type, beansCopy);

    const filter: IBeanPageFilter = this.manageFilter(_type);

    filterBeans = this.manageFavourites(filter, filterBeans);

    // Rating filter is always active
    filterBeans = this.manageRating(filterBeans, filter);

    filterBeans = this.manageRoastingType(filter, filterBeans);

    filterBeans = this.manageRoastRange(filterBeans, filter);

    filterBeans = this.manageRoaster(filter, filterBeans);

    filterBeans = this.manageRoastingDateStart(filter, filterBeans);

    filterBeans = this.manageRoastingDateEnd(filter, filterBeans);

    // Skip if something is unkown, because no filter is active then
    filterBeans = this.manageSort(sort, filterBeans);

    const searchText = this.manageSearchTextScope(_type);

    filterBeans = this.manageSearchText(searchText, filterBeans);

    if (_type === 'open') {
      this.openBeans = filterBeans;
    } else if (_type === 'archive') {
      this.finishedBeans = filterBeans;
    } else if (_type === 'frozen') {
      this.frozenBeans = filterBeans;
    }

    this.retriggerScroll();
  }

  private manageSearchText(searchText: string, filterBeans: Bean[]) {
    if (searchText) {
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
            })
          );
        });
      });
    }
    return filterBeans;
  }

  private manageSearchTextScope(_type: string) {
    if (_type === 'open') {
      return this.openBeansFilterText.toLowerCase();
    } else if (_type === 'archive') {
      return this.archivedBeansFilterText.toLowerCase();
    } else if (_type === 'frozen') {
      return this.frozenBeansFilterText.toLowerCase();
    }
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
            if (a.roastingDate > b.roastingDate) {
              return -1;
            }
            if (a.roastingDate < b.roastingDate) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.RATING:
          filterBeans = filterBeans.sort((a, b) => {
            if (a.rating > b.rating) {
              return -1;
            }
            if (a.rating < b.rating) {
              return 1;
            }
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
    filterBeans: Bean[]
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
        (e: Bean) => filter.bean_roaster.includes(e.roaster) === true
      );
    }
    return filterBeans;
  }

  private manageRoastRange(
    filterBeans: Bean[],
    filter: IBeanPageFilter
  ): Bean[] {
    return filterBeans.filter(
      (e: Bean) =>
        e.roast_range >= filter.roast_range.lower &&
        e.roast_range <= filter.roast_range.upper
    );
  }

  private manageRoastingType(
    filter: IBeanPageFilter,
    filterBeans: Bean[]
  ): Bean[] {
    if (filter.bean_roasting_type.length > 0) {
      return filterBeans.filter(
        (e: Bean) =>
          filter.bean_roasting_type.includes(e.bean_roasting_type) === true
      );
    }
    return filterBeans;
  }

  private manageRating(filterBeans: Bean[], filter: IBeanPageFilter): Bean[] {
    return filterBeans.filter(
      (e: Bean) =>
        e.rating >= filter.rating.lower && e.rating <= filter.rating.upper
    );
  }

  private manageFavourites(
    filter: IBeanPageFilter,
    filterBeans: Bean[]
  ): Bean[] {
    if (filter.favourite) {
      return filterBeans.filter((e) => e.favourite === true);
    }
    return filterBeans;
  }

  private manageFilter(_type: string): IBeanPageFilter {
    if (_type === 'open') {
      return this.openBeansFilter;
    } else if (_type === 'archive') {
      return this.archivedBeansFilter;
    } else if (_type === 'frozen') {
      return this.frozenBeansFilter;
    }
  }

  private manageSortScope(_type: string): IBeanPageSort {
    if (_type === 'open') {
      return this.openBeansSort;
    } else if (_type === 'archive') {
      return this.archivedBeansSort;
    } else if (_type === 'frozen') {
      return this.frozenBeansSort;
    }
  }
  private manageFilterBeans(_type: string, beansCopy: Bean[]): Bean[] {
    if (_type === 'open') {
      return beansCopy.filter(
        (bean) => !bean.finished && bean.isFrozen() === false
      );
    } else if (_type === 'archive') {
      return beansCopy.filter((bean) => bean.finished);
    } else if (_type === 'frozen') {
      return beansCopy.filter(
        (bean) => !bean.finished && bean.isFrozen() === true
      );
    }
  }

  private __initializeBeans(): void {
    this.beans = this.uiBeanStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.openBeansLength = this.beans.reduce(
      (n, e) => (!e.finished && e.isFrozen() === false ? n + 1 : n),
      0
    );
    this.finishedBeansLength = this.beans.reduce(
      (n, e) => (e.finished ? n + 1 : n),
      0
    );
    this.frozenBeansLength = this.beans.reduce(
      (n, e) => (!e.finished && e.isFrozen() === true ? n + 1 : n),
      0
    );

    this.openBeans = [];
    this.finishedBeans = [];
    this.frozenBeans = [];
    this.__initializeBeansView('open');
    this.__initializeBeansView('archive');
    this.__initializeBeansView('frozen');
  }
}
