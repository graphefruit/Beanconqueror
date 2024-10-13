import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { ModalController, Platform } from '@ionic/angular';
import { Bean } from '../../classes/bean/bean';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { IBeanPageSort } from '../../interfaces/bean/iBeanPageSort';
import { BEAN_SORT_AFTER } from '../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../enums/beans/beanSortOrder';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { UILog } from '../../services/uiLog';
import { UIAnalytics } from '../../services/uiAnalytics';
import { QrScannerService } from '../../services/qrScanner/qr-scanner.service';
import { IntentHandlerService } from '../../services/intentHandler/intent-handler.service';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { IBeanPageFilter } from '../../interfaces/bean/iBeanPageFilter';
import _ from 'lodash';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import { BeanPopoverAddComponent } from './bean-popover-add/bean-popover-add.component';
import { BEAN_POPOVER_ADD_ACTION } from '../../enums/beans/beanPopoverAddAction';
import { Subscription } from 'rxjs';
import { BeanSortFilterHelperService } from '../../services/beanSortFilterHelper/bean-sort-filter-helper.service';
import { NfcService } from '../../services/nfcService/nfc-service.service';

@Component({
  selector: 'beans',
  templateUrl: './beans.page.html',
  styleUrls: ['./beans.page.scss'],
})
export class BeansPage implements OnDestroy {
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

  public openBeansCollapsed: boolean = false;
  public archivedBeansCollapsed: boolean = false;
  public frozenBeansCollapsed: boolean = false;

  public archivedBeansFilterText: string = '';
  public openBeansFilterText: string = '';
  public frozenBeansFilterText: string = '';

  public archivedBeansFilter: IBeanPageFilter;
  public openBeansFilter: IBeanPageFilter;
  public frozenBeansFilter: IBeanPageFilter;

  private beanStorageChangeSubscription: Subscription;

  constructor(
    private readonly uiLog: UILog,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly qrScannerService: QrScannerService,
    private readonly intenthandler: IntentHandlerService,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly platform: Platform,
    private readonly modalController: ModalController,
    private readonly beanSortFilterHelper: BeanSortFilterHelperService,
    private readonly nfcService: NfcService
  ) {}

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBeansSort = this.settings.bean_sort.ARCHIVED;
    this.openBeansSort = this.settings.bean_sort.OPEN;
    this.frozenBeansSort = this.settings.bean_sort.FROZEN;

    this.archivedBeansFilter = this.settings.bean_filter.ARCHIVED;
    this.frozenBeansFilter = this.settings.bean_filter.FROZEN;
    this.openBeansFilter = this.settings.bean_filter.OPEN;

    this.openBeansCollapsed = this.settings.bean_collapsed.OPEN;
    this.archivedBeansCollapsed = this.settings.bean_collapsed.ARCHIVED;
    this.frozenBeansCollapsed = this.settings.bean_collapsed.FROZEN;
    this.loadBeans();

    this.beanStorageChangeSubscription = this.uiBeanStorage
      .attachOnEvent()
      .subscribe((_val) => {
        // If an bean is added/deleted/changed we trigger this here, why we do this? Because when we import from the Beanconqueror website an bean, and we're actually on this page, this won't get shown.
        this.loadBeans();
      });
  }

  public async ngOnDestroy() {
    if (this.beanStorageChangeSubscription) {
      this.beanStorageChangeSubscription.unsubscribe();
      this.beanStorageChangeSubscription = undefined;
    }
  }

  public isCollapseActive() {
    let collapsed: boolean = false;
    if (this.bean_segment === 'open') {
      collapsed = this.openBeansCollapsed;
    } else if (this.bean_segment === 'archive') {
      collapsed = this.archivedBeansCollapsed;
    } else if (this.bean_segment === 'frozen') {
      collapsed = this.frozenBeansCollapsed;
    }
    return collapsed;
  }

  public toggleCollapseBeans() {
    if (this.bean_segment === 'open') {
      this.openBeansCollapsed = !this.openBeansCollapsed;
    } else if (this.bean_segment === 'archive') {
      this.archivedBeansCollapsed = !this.archivedBeansCollapsed;
    } else if (this.bean_segment === 'frozen') {
      this.frozenBeansCollapsed = !this.frozenBeansCollapsed;
    }
    this.__saveCollapseFilter();

    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
    this.retriggerScroll();
  }

  private async __saveCollapseFilter() {
    this.settings.bean_collapsed.OPEN = this.openBeansCollapsed;
    this.settings.bean_collapsed.ARCHIVED = this.archivedBeansCollapsed;
    this.settings.bean_collapsed.FROZEN = this.frozenBeansCollapsed;
    await this.uiSettingsStorage.saveSettings(this.settings);
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
    const sortSegment = this.manageSortScope(this.bean_segment);
    const newSort = await this.beanSortFilterHelper.showSort(sortSegment);
    if (newSort) {
      if (this.bean_segment === 'open') {
        this.openBeansSort = newSort;
      } else if (this.bean_segment === 'archive') {
        this.archivedBeansSort = newSort;
      } else if (this.bean_segment === 'frozen') {
        this.frozenBeansSort = newSort;
      }

      await this.__saveBeanFilter();

      this.loadBeans();
    }
  }

  public async showFilter() {
    const filterSegment = this.manageFilterScope(this.bean_segment);
    const newFilter = await this.beanSortFilterHelper.showFilter(
      filterSegment,
      this.bean_segment
    );
    if (newFilter) {
      /**We got the filtersegment above, so we got the reference and overwrite it**/

      if (this.bean_segment === 'open') {
        this.openBeansFilter = newFilter;
      } else if (this.bean_segment === 'archive') {
        this.archivedBeansFilter = newFilter;
      } else if (this.bean_segment === 'frozen') {
        this.frozenBeansFilter = newFilter;
      }
      await this.__saveBeanFilter();

      this.loadBeans();
    }
  }

  public isSortActive(): boolean {
    const sort = this.manageSortScope(this.bean_segment);
    return (
      sort.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
      sort.sort_after !== BEAN_SORT_AFTER.UNKOWN
    );
  }

  public isTextSearchActive() {
    const searchText = this.manageSearchTextScope(this.bean_segment);
    return searchText != '';
  }

  public isFilterActive(): boolean {
    let isFilterActive: boolean = false;

    if (this.settings) {
      let checkingFilter: IBeanPageFilter = this.manageFilterScope(
        this.bean_segment
      );

      isFilterActive = !_.isEqual(
        this.settings?.GET_BEAN_FILTER(),
        checkingFilter
      );
    }

    return isFilterActive;
  }

  public shallBarBeDisplayed() {
    let shallBarDisplayed: boolean = false;

    if (this.bean_segment === 'open') {
      shallBarDisplayed = this.openBeansLength > 0;
    } else if (this.bean_segment === 'archive') {
      shallBarDisplayed = this.finishedBeansLength > 0;
    } else if (this.bean_segment === 'frozen') {
      shallBarDisplayed = this.frozenBeansLength > 0;
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

  public async scanNFC() {
    if (this.platform.is('cordova')) {
      try {
        await this.nfcService.readNFCTag();
      } catch (error) {
        // Just log and do nothing else, it's likely the user just cancelled
        this.uiLog.warn('NFC scan error:', error);
      }
    } else {
    }
    this.loadBeans();
  }
  public async scanBean() {
    if (this.platform.is('cordova')) {
      try {
        const scannedCode = await this.qrScannerService.scan();
        await this.intenthandler.handleQRCodeLink(scannedCode);
      } catch (error) {
        // Just log and do nothing else, it's likely the user just cancelled
        this.uiLog.warn('Bean QR code scan error:', error);
      }
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

  private __initializeBeansView(_type: string) {
    const searchText = this.manageSearchTextScope(_type);
    const sort = this.manageSortScope(_type);
    const filters = this.manageFilterScope(_type);

    const filteredBeans = this.beanSortFilterHelper.initializeBeansView(
      _type,
      this.beans,
      searchText,
      sort,
      filters
    );
    if (_type === 'open') {
      this.openBeans = filteredBeans;
    } else if (_type === 'archive') {
      this.finishedBeans = filteredBeans;
    } else if (_type === 'frozen') {
      this.frozenBeans = filteredBeans;
    }
    this.retriggerScroll();
  }

  private manageFilterScope(_type: string): IBeanPageFilter {
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

  private manageSearchTextScope(_type: string) {
    if (_type === 'open') {
      return this.openBeansFilterText.toLowerCase();
    } else if (_type === 'archive') {
      return this.archivedBeansFilterText.toLowerCase();
    } else if (_type === 'frozen') {
      return this.frozenBeansFilterText.toLowerCase();
    }
  }
}
