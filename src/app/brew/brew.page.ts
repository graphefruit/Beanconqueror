import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../services/uiHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { Brew } from '../../classes/brew/brew';
import { IBrewPageFilter } from '../../interfaces/brew/iBrewPageFilter';
import { BrewFilterComponent } from './brew-filter/brew-filter.component';
import { Settings } from '../../classes/settings/settings';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { Subscription } from 'rxjs';
import { IBrewPageSort } from '../../interfaces/brew/iBrewPageSort';
import { BREW_SORT_ORDER } from '../../enums/brews/brewSortOrder';
import { BREW_SORT_AFTER } from '../../enums/brews/brewSortAfter';

@Component({
  selector: 'brew',
  templateUrl: './brew.page.html',
  styleUrls: ['./brew.page.scss'],
  standalone: false,
})
export class BrewPage implements OnInit {
  public brews: Array<Brew> = [];
  public openBrewsView: Array<Brew> = [];
  public archiveBrewsView: Array<Brew> = [];

  public openBrewsLength: number = 0;
  public archiveBrewsLength: number = 0;

  public brew_segment: 'open' | 'archive' = 'open';
  public segmentScrollHeight: string = undefined;

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', { read: AgVirtualSrollComponent, static: false })
  public archivedScroll: AgVirtualSrollComponent;
  @ViewChild('brewContent', { read: ElementRef })
  public brewContent: ElementRef;

  public openBrewFilterText: string = '';
  public archivedBrewFilterText: string = '';

  public archivedBrewsFilter: IBrewPageFilter;
  public openBrewsFilter: IBrewPageFilter;

  public openSortBrewsFilter: IBrewPageSort = {
    sort_after: BREW_SORT_AFTER.UNKOWN,
    sort_order: BREW_SORT_ORDER.UNKOWN,
  };
  public archivedSortBrewsFilter: IBrewPageSort = {
    sort_after: BREW_SORT_AFTER.UNKOWN,
    sort_order: BREW_SORT_ORDER.UNKOWN,
  };

  public openBrewsCollapsed: boolean = false;
  public archivedBrewsCollapsed: boolean = false;

  public settings: Settings;
  private brewStorageChangeSubscription: Subscription;

  public uiIsSortActive: boolean = false;
  public uiIsFilterActive: boolean = false;
  public uiIsCollapseActive: boolean = false;
  public uiShallBarBeDisplayed: boolean = false;
  public uiSearchText: string = '';

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly changeDetectorRef: ChangeDetectorRef,
    public uiHelper: UIHelper,
    public uiBrewHelper: UIBrewHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBrewsFilter = this.settings.GET_BREW_FILTER();
    this.openBrewsFilter = this.settings.GET_BREW_FILTER();
  }

  public ionViewWillEnter(): void {
    this.archivedBrewsFilter = this.settings.brew_filter.ARCHIVED;
    this.openBrewsFilter = this.settings.brew_filter.OPEN;
    this.openBrewsCollapsed = this.settings.brew_collapsed.OPEN;
    this.archivedBrewsCollapsed = this.settings.brew_collapsed.ARCHIVED;

    this.archivedSortBrewsFilter = this.settings.brew_sort.ARCHIVED;
    this.openSortBrewsFilter = this.settings.brew_sort.OPEN;

    this.loadBrews();

    this.brewStorageChangeSubscription = this.uiBrewStorage
      .attachOnEvent()
      .subscribe((_val) => {
        // If an bean is added/deleted/changed we trigger this here, why we do this? Because when we import from the Beanconqueror website an bean, and we're actually on this page, this won't get shown.
        this.loadBrews();
      });
  }

  public segmentChanged() {
    if (this.brew_segment === 'open') {
      this.uiSearchText = this.openBrewFilterText;
    } else {
      this.uiSearchText = this.archivedBrewFilterText;
    }
    this.retriggerScroll();
    this.setUIParams();
  }

  private setUIParams() {
    this.uiIsSortActive = this.isSortActive();
    this.uiIsFilterActive = this.isFilterActive();
    this.uiIsCollapseActive = this.isCollapseActive();
    this.uiShallBarBeDisplayed = this.shallBarBeDisplayed();
  }

  private retriggerScroll() {
    setTimeout(() => {
      const el = this.brewContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';

      this.segmentScrollHeight = scrollComponent.el.style.height;
      setTimeout(() => {
        /** If we wouldn't do it, and the tiles are collapsed, the next once just exist when the user starts scrolling**/
        const elScroll = scrollComponent.el;
        elScroll.dispatchEvent(new Event('scroll'));
      }, 15);
    }, 150);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }

  public async add() {
    await this.uiBrewHelper.addBrew();
    this.loadBrews();
  }

  public async brewAction(): Promise<void> {
    this.loadBrews();
  }

  public loadBrews(): void {
    this.__initializeBrews();
    this.retriggerScroll();
    this.setUIParams();
    this.changeDetectorRef.detectChanges();
  }

  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
  }

  public isCollapseActive() {
    let collapsed: boolean = false;
    if (this.brew_segment === 'open') {
      collapsed = this.openBrewsCollapsed;
    } else {
      collapsed = this.archivedBrewsCollapsed;
    }
    return collapsed;
  }

  public toggleCollapseBrews() {
    if (this.brew_segment === 'open') {
      this.openBrewsCollapsed = !this.openBrewsCollapsed;
    } else {
      this.archivedBrewsCollapsed = !this.archivedBrewsCollapsed;
    }
    this.__saveCollapseFilter();
    this.research();
  }

  public isFilterActive(): boolean {
    let checkingFilter: IBrewPageFilter;
    let checkingFilterText: string = '';
    if (this.brew_segment === 'open') {
      checkingFilter = this.openBrewsFilter;
      checkingFilterText = this.openBrewFilterText;
    } else {
      checkingFilter = this.archivedBrewsFilter;
      checkingFilterText = this.archivedBrewFilterText;
    }
    let didRatingFilterChanged: boolean = false;
    if (checkingFilter.rating) {
      didRatingFilterChanged =
        checkingFilter.rating.upper !== this.settings?.brew_rating ||
        checkingFilter.rating.lower !== -1;
    }
    return (
      checkingFilter.bean.length > 0 ||
      checkingFilter.water?.length > 0 ||
      checkingFilter.method_of_preparation.length > 0 ||
      checkingFilter.mill.length > 0 ||
      checkingFilter.favourite ||
      checkingFilter.chart_data ||
      checkingFilter.best_brew ||
      checkingFilter.profiles?.length > 0 ||
      didRatingFilterChanged ||
      checkingFilterText !== ''
    );
  }

  public shallBarBeDisplayed() {
    let shallBarDisplayed: boolean = false;
    if (this.settings) {
      const isOpen = this.brew_segment === 'open';
      let checkingEntries: Array<Brew> = [];
      if (isOpen) {
        checkingEntries = this.openBrewsView;
      } else {
        checkingEntries = this.archiveBrewsView;
      }
      if (checkingEntries.length <= 0) {
        let entriesExisting: number = 0;
        if (isOpen) {
          entriesExisting = this.brews.filter(
            (e) =>
              e.getBean().finished === !isOpen &&
              e.getMill().finished === !isOpen &&
              e.getPreparation().finished === !isOpen,
          ).length;
        } else {
          entriesExisting = this.brews.filter(
            (e) =>
              e.getBean().finished === !isOpen ||
              e.getMill().finished === !isOpen ||
              e.getPreparation().finished === !isOpen,
          ).length;
        }

        if (entriesExisting > 0) {
          shallBarDisplayed = true;
        }
      }
    }

    return shallBarDisplayed;
  }

  public isSortActive(): boolean {
    let sort;
    if (this.brew_segment === 'open') {
      sort = this.openSortBrewsFilter;
    } else {
      sort = this.archivedSortBrewsFilter;
    }

    return !(
      sort.sort_order === BREW_SORT_ORDER.DESCENDING &&
      sort.sort_after === BREW_SORT_AFTER.BREW_DATE
    );
  }

  public async showSort() {
    let sortSegment;
    if (this.brew_segment === 'open') {
      sortSegment = this.openSortBrewsFilter;
    } else {
      sortSegment = this.archivedSortBrewsFilter;
    }

    const newSort = await this.uiBrewHelper.showSort(sortSegment);
    if (newSort) {
      if (this.brew_segment === 'open') {
        this.openSortBrewsFilter = newSort;
      } else if (this.brew_segment === 'archive') {
        this.archivedSortBrewsFilter = newSort;
      }

      await this.__saveBrewFilter();

      this.loadBrews();
    }
  }

  public async showFilter() {
    let brewFilter: IBrewPageFilter;
    if (this.brew_segment === 'open') {
      brewFilter = { ...this.openBrewsFilter };
    } else {
      brewFilter = { ...this.archivedBrewsFilter };
    }

    const modal = await this.modalCtrl.create({
      component: BrewFilterComponent,
      cssClass: 'popover-actions',
      id: BrewFilterComponent.COMPONENT_ID,
      componentProps: { brew_filter: brewFilter, segment: this.brew_segment },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (
      modalData !== undefined &&
      modalData.data &&
      modalData.data.brew_filter !== undefined
    ) {
      if (this.brew_segment === 'open') {
        this.openBrewsFilter = modalData.data.brew_filter;
      } else {
        this.archivedBrewsFilter = modalData.data.brew_filter;
      }
    }
    this.__saveBrewFilter();

    this.loadBrews();
  }

  private async __saveBrewFilter() {
    this.settings.brew_filter.OPEN = this.openBrewsFilter;
    this.settings.brew_filter.ARCHIVED = this.archivedBrewsFilter;
    this.settings.brew_sort.OPEN = this.openSortBrewsFilter;
    this.settings.brew_sort.ARCHIVED = this.archivedSortBrewsFilter;
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  private async __saveCollapseFilter() {
    this.settings.brew_collapsed.OPEN = this.openBrewsCollapsed;
    this.settings.brew_collapsed.ARCHIVED = this.archivedBrewsCollapsed;
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public research() {
    if (this.brew_segment === 'open') {
      this.openBrewFilterText = this.uiSearchText;
    } else {
      this.archivedBrewFilterText = this.uiSearchText;
    }

    this.__initializeBrewView(this.brew_segment);
    this.retriggerScroll();
    this.setUIParams();
  }

  private __initializeBrewView(_type: string): void {
    // sort latest to top.
    const brewsCopy: Array<Brew> = [...this.brews];
    let brewsFilters: Array<Brew>;

    const isOpen: boolean = _type === 'open';
    if (isOpen) {
      brewsFilters = brewsCopy.filter(
        (e) =>
          e.getBean().finished === !isOpen &&
          e.getMill().finished === !isOpen &&
          e.getPreparation().finished === !isOpen,
      );

      this.openBrewsLength = brewsFilters.length;
      this.archiveBrewsLength = this.brews.length - this.openBrewsLength;
    } else {
      brewsFilters = brewsCopy.filter(
        (e) =>
          e.getBean().finished === !isOpen ||
          e.getMill().finished === !isOpen ||
          e.getPreparation().finished === !isOpen,
      );
    }

    let filter: IBrewPageFilter;
    let sort: IBrewPageSort;
    if (isOpen) {
      filter = this.openBrewsFilter;
      sort = this.openSortBrewsFilter;
    } else {
      filter = this.archivedBrewsFilter;
      sort = this.archivedSortBrewsFilter;
    }

    if (filter.mill.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) => filter.mill.filter((z) => z === e.mill).length > 0,
      );
    }
    if (filter.bean.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) => filter.bean.filter((z) => z === e.bean).length > 0,
      );
    }
    if (filter.profiles.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) =>
          filter.profiles.filter((z) => z === e.pressure_profile).length > 0,
      );
    }
    if (filter.method_of_preparation.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) =>
          filter.method_of_preparation.filter(
            (z) => z === e.method_of_preparation,
          ).length > 0,
      );

      // Tools just can be selected when a preparation method was selected
      if (filter.method_of_preparation_tools.length > 0) {
        brewsFilters = brewsFilters.filter(
          (e) =>
            filter.method_of_preparation_tools.filter((z) =>
              e.method_of_preparation_tools.includes(z),
            ).length > 0,
        );
      }
    }
    if (filter.favourite) {
      brewsFilters = brewsFilters.filter((e) => e.favourite === true);
    }
    if (filter.best_brew) {
      brewsFilters = brewsFilters.filter((e) => e.best_brew === true);
    }
    if (filter.chart_data) {
      brewsFilters = brewsFilters.filter(
        (e) => e.flow_profile !== '' && e.flow_profile !== undefined,
      );
    }
    if (filter.rating) {
      brewsFilters = brewsFilters.filter(
        (e: Brew) =>
          e.rating >= filter.rating.lower && e.rating <= filter.rating.upper,
      );
    }
    if (filter.water?.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) => filter.water.filter((z) => z === e.water).length > 0,
      );
    }
    let sortedBrews: Array<Brew> = [];
    if (
      sort.sort_order !== BREW_SORT_ORDER.UNKOWN &&
      sort.sort_after !== BREW_SORT_AFTER.UNKOWN
    ) {
      switch (sort.sort_after) {
        case BREW_SORT_AFTER.BREW_DATE:
          sortedBrews = brewsFilters.sort((obj1, obj2) => {
            if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
              return 1;
            }
            if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
              return -1;
            }

            return 0;
          });
          break;
        case BREW_SORT_AFTER.RATING:
          sortedBrews = brewsFilters.sort((obj1, obj2) => {
            if (obj1.rating > obj2.rating) {
              return 1;
            }
            if (obj1.rating < obj2.rating) {
              return -1;
            }

            return 0;
          });
          break;
        case BREW_SORT_AFTER.GRINDER:
          sortedBrews = brewsFilters.sort((a, b) => {
            const nameA = a.getMill().name.toUpperCase();
            const nameB = b.getMill().name.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }

            return 0;
          });
          break;
        case BREW_SORT_AFTER.BEAN_NAME:
          sortedBrews = brewsFilters.sort((a, b) => {
            const nameA = a.getBean().name.toUpperCase();
            const nameB = b.getBean().name.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }

            return 0;
          });
          break;
        case BREW_SORT_AFTER.PREPARATION:
          sortedBrews = brewsFilters.sort((a, b) => {
            const nameA = a.getPreparation().name.toUpperCase();
            const nameB = b.getPreparation().name.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }

            return 0;
          });
          break;
      }
    }
    if (sort.sort_order === BREW_SORT_ORDER.DESCENDING) {
      sortedBrews.reverse();
    }

    //let sortedBrews: Array<Brew> = UIBrewHelper.sortBrews(brewsFilters);
    let searchText: string = '';
    if (_type === 'open') {
      searchText = this.openBrewFilterText.toLowerCase();
    } else {
      searchText = this.archivedBrewFilterText.toLowerCase();
    }
    if (searchText) {
      sortedBrews = sortedBrews.filter(
        (e) =>
          e.note.toLowerCase().includes(searchText) ||
          e.getPreparation().name.toLowerCase().includes(searchText) ||
          e.getBean().name.toLowerCase().includes(searchText) ||
          e.getBean().roaster.toLowerCase().includes(searchText) ||
          e.getBean().bean_information?.find((bi) => {
            return (
              bi?.variety?.toLowerCase().includes(searchText) ||
              bi?.country?.toLowerCase().includes(searchText) ||
              bi?.region?.toLowerCase().includes(searchText) ||
              bi?.farm?.toLowerCase().includes(searchText) ||
              bi?.farmer?.toLowerCase().includes(searchText) ||
              bi?.processing?.toLowerCase().includes(searchText)
            );
          }) ||
          e.coffee_type.toLowerCase().includes(searchText),
      );
    }

    if (_type === 'open') {
      this.openBrewsView = sortedBrews;
    } else {
      this.archiveBrewsView = sortedBrews;
    }
  }

  public ngOnInit() {}

  public async ngOnDestroy() {
    if (this.brewStorageChangeSubscription) {
      this.brewStorageChangeSubscription.unsubscribe();
      this.brewStorageChangeSubscription = undefined;
    }
  }

  public async longPressAdd(_event) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    await this.uiBrewHelper.longPressAddBrew();
    this.loadBrews();
  }
}
