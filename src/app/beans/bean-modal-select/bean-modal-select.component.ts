import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { IBeanPageFilter } from '../../../interfaces/bean/iBeanPageFilter';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { IBeanPageSort } from '../../../interfaces/bean/iBeanPageSort';
import _ from 'lodash';
import { BeanSortFilterHelperService } from '../../../services/beanSortFilterHelper/bean-sort-filter-helper.service';

@Component({
  selector: 'bean-modal-select',
  templateUrl: './bean-modal-select.component.html',
  styleUrls: ['./bean-modal-select.component.scss'],
})
export class BeanModalSelectComponent implements OnInit {
  public static COMPONENT_ID = 'bean-modal-select';
  public objs: Array<Bean> = [];
  public bean_segment: string = 'open';
  public beans: Array<Bean> = [];
  public multipleSelection = {};
  public radioSelection: string;
  @Input() public multiple: boolean;
  @Input() public showFinished: boolean;
  @Input() private selectedValues: Array<string>;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  public openBeans: Array<Bean> = [];
  public finishedBeans: Array<Bean> = [];
  public frozenBeans: Array<Bean> = [];

  public archivedBeansFilter: IBeanPageFilter;
  public openBeansFilter: IBeanPageFilter;
  public frozenBeansFilter: IBeanPageFilter;

  public archivedBeansFilterText: string = '';
  public openBeansFilterText: string = '';
  public frozenBeansFilterText: string = '';

  public settings: Settings;

  public filterVisible: any = {
    open: false,
    archived: false,
    frozen: false,
  };

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('frozenScroll', { read: AgVirtualSrollComponent, static: false })
  public frozenScroll: AgVirtualSrollComponent;

  @ViewChild('archivedScroll', {
    read: AgVirtualSrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualSrollComponent;
  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;

  public beanFreezingStorageTypeEnum = BEAN_FREEZING_STORAGE_ENUM;

  public openBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public archivedBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };
  public frozenBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public finishedBeansLength: number = 0;
  public openBeansLength: number = 0;
  public frozenBeansLength: number = 0;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly beanSortFilterHelper: BeanSortFilterHelperService
  ) {
    this.settings = this.uiSettingsStorage.getSettings();

    this.archivedBeansSort = this.settings.bean_sort_selection.ARCHIVED;
    this.openBeansSort = this.settings.bean_sort_selection.OPEN;
    this.frozenBeansSort = this.settings.bean_sort_selection.FROZEN;

    this.archivedBeansFilter = this.settings.bean_filter_selection.ARCHIVED;
    this.frozenBeansFilter = this.settings.bean_filter_selection.FROZEN;
    this.openBeansFilter = this.settings.bean_filter_selection.OPEN;

    this.__initializeBeans();
  }

  public __initializeBeans() {
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

  public async add() {
    await this.uiBeanHelper.addBean();
    this.__initializeBeans();
    this.research();
  }

  private async __saveBeanFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.bean_sort_selection.OPEN = this.openBeansSort;
    settings.bean_sort_selection.ARCHIVED = this.archivedBeansSort;
    settings.bean_sort_selection.FROZEN = this.frozenBeansSort;

    settings.bean_filter_selection.OPEN = this.openBeansFilter;
    settings.bean_filter_selection.ARCHIVED = this.archivedBeansFilter;
    settings.bean_filter_selection.FROZEN = this.frozenBeansFilter;
    await this.uiSettingsStorage.saveSettings(settings);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }
  public segmentChanged() {
    this.retriggerScroll();
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
      if (!scrollComponent) {
        return;
      }
      const footerEl = this.footerContent.nativeElement;
      // right bracing
      scrollComponent.el.style.height =
        el.offsetHeight -
        footerEl.offsetHeight -
        10 -
        scrollComponent.el.offsetTop +
        'px';
    }, 250);
  }

  public ionViewDidEnter(): void {
    if (this.multiple) {
      for (const obj of this.beans) {
        this.multipleSelection[obj.config.uuid] =
          this.selectedValues.filter((e) => e === obj.config.uuid).length > 0;
      }
    } else {
      if (this.selectedValues.length > 0) {
        this.radioSelection = this.selectedValues[0];
      }
    }
    this.research();
  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      _bean.config.uuid
    );
    for (const brew of relatedBrews) {
      if (brew.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }

  public ngOnInit() {}

  public async choose(): Promise<void> {
    const chosenKeys: Array<string> = [];
    if (this.multiple) {
      for (const key in this.multipleSelection) {
        if (this.multipleSelection[key] === true) {
          chosenKeys.push(key);
        }
      }
    } else {
      chosenKeys.push(this.radioSelection);
    }
    let selected_text: string = '';

    for (const val of chosenKeys) {
      const bean = this.uiBeanStorage.getByUUID(val);
      selected_text += bean.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss(
      {
        selected_values: chosenKeys,
        selected_text: selected_text,
      },
      undefined,
      BeanModalSelectComponent.COMPONENT_ID
    );
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanModalSelectComponent.COMPONENT_ID
    );
  }
  public isBeanRoastUnknown(_bean: Bean) {
    if (_bean) {
      return (
        _bean.bean_roasting_type === ('UNKNOWN' as BEAN_ROASTING_TYPE_ENUM)
      );
    }
    return true;
  }

  public research() {
    this.__initializeBeansView(this.bean_segment);
    this.retriggerScroll();
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

      this.__initializeBeans();
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

      this.__initializeBeans();
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
}
