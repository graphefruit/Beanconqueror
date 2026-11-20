import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, settingsOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../classes/brew/brew';
import { Settings } from '../../classes/settings/settings';
import { BrewInformationComponent } from '../../components/brew-information/brew-information.component';
import { HeaderButtonComponent } from '../../components/header/header-button.component';
import { HeaderComponent } from '../../components/header/header.component';
import { SegmentLabelComponent } from '../../components/segment-label/segment-label.component';
import { ListAnchor } from '../../components/virtual-list/virtual-list-anchor';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../components/virtual-list/virtual-list.component';
import { LongPressDirective } from '../../directive/long-press.directive';
import { SearchbarNameDirective } from '../../directive/searchbar-name.directive';
import { BREW_ACTION } from '../../enums/brews/brewAction';
import { BREW_SORT_AFTER } from '../../enums/brews/brewSortAfter';
import { BREW_SORT_ORDER } from '../../enums/brews/brewSortOrder';
import { IBrewPageFilter } from '../../interfaces/brew/iBrewPageFilter';
import { IBrewPageSort } from '../../interfaces/brew/iBrewPageSort';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIHelper } from '../../services/uiHelper';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { BrewFilterComponent } from './brew-filter/brew-filter.component';

type BrewSegment = 'open' | 'archive';

@Component({
  selector: 'brew',
  templateUrl: './brew.page.html',
  styleUrls: ['./brew.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    SegmentLabelComponent,
    RouterLink,
    NgTemplateOutlet,
    VirtualListComponent,
    VirtualRowDirective,
    BrewInformationComponent,
    TranslatePipe,
    IonHeader,
    HeaderComponent,
    HeaderButtonComponent,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    SearchbarNameDirective,
    IonIcon,
    IonButton,
    IonFab,
    IonFabButton,
    LongPressDirective,
  ],
})
export class BrewPage implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  uiHelper = inject(UIHelper);
  uiBrewHelper = inject(UIBrewHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public brews: Brew[] = [];
  public openBrewsView: Brew[] = [];
  public archiveBrewsView: Brew[] = [];

  public openBrewsLength = 0;
  public archiveBrewsLength = 0;

  public brew_segment: BrewSegment = 'open';
  /** The brews of the segment shown. */
  public shownBrews: Brew[] = [];

  private readonly list =
    viewChild<VirtualListComponent<Brew>>(VirtualListComponent);
  public readonly brewKey = (brew: Brew): string => brew.config.uuid;

  public openBrewFilterText = '';
  public archivedBrewFilterText = '';

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

  public openBrewsCollapsed = false;
  public archivedBrewsCollapsed = false;

  public settings: Settings;

  public uiIsSortActive = false;
  public uiIsFilterActive = false;
  public uiIsCollapseActive = false;
  public uiShallBarBeDisplayed = false;
  public uiSearchText = '';
  public uiSegmentShown = true;

  /** Where each segment was left, to return to it. */
  private readonly anchors: Record<BrewSegment, ListAnchor | null> = {
    open: null,
    archive: null,
  };
  private shownSegment: BrewSegment = 'open';
  /** The brew the list brings on the screen after the next load. */
  private lastInteractedBrewId: string = null;

  constructor() {
    addIcons({ add, settingsOutline });
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBrewsFilter = this.settings.GET_BREW_FILTER();
    this.openBrewsFilter = this.settings.GET_BREW_FILTER();

    this.uiBrewStorage
      .attachOnEvent()
      .pipe(takeUntilDestroyed())
      .subscribe((change?: { uuid?: string }) => {
        // A brew added or changed, also on another tab, is brought on the
        // screen.
        if (change?.uuid) {
          this.lastInteractedBrewId = change.uuid;
        }
        // If an bean is added/deleted/changed we trigger this here, why we do this? Because when we import from the Beanconqueror website an bean, and we're actually on this page, this won't get shown.
        this.loadBrews();
      });
  }

  public ionViewWillEnter(): void {
    this.archivedBrewsFilter = this.settings.brew_filter.ARCHIVED;
    this.openBrewsFilter = this.settings.brew_filter.OPEN;
    this.openBrewsCollapsed = this.settings.brew_collapsed.OPEN;
    this.archivedBrewsCollapsed = this.settings.brew_collapsed.ARCHIVED;

    this.archivedSortBrewsFilter = this.settings.brew_sort.ARCHIVED;
    this.openSortBrewsFilter = this.settings.brew_sort.OPEN;

    this.loadBrews();
  }

  public segmentChanged() {
    if (this.brew_segment === 'open') {
      this.uiSearchText = this.openBrewFilterText;
    } else {
      this.uiSearchText = this.archivedBrewFilterText;
    }
    const list = this.list();
    if (list) {
      this.anchors[this.shownSegment] = list.anchor();
    }
    this.shownSegment = this.brew_segment;
    this.setUIParams();
    list?.restore(this.anchors[this.shownSegment]);
  }

  private setUIParams() {
    this.uiIsSortActive = this.isSortActive();
    this.uiIsFilterActive = this.isFilterActive();
    this.uiIsCollapseActive = this.isCollapseActive();
    this.uiShallBarBeDisplayed = this.shallBarBeDisplayed();
    this.uiSegmentShown =
      this.brew_segment === 'open' || !!this.settings?.show_archived_brews;
    this.shownBrews = !this.uiSegmentShown
      ? []
      : this.brew_segment === 'open'
        ? this.openBrewsView
        : this.archiveBrewsView;
  }

  public async add() {
    await this.uiBrewHelper.addBrew();
    this.loadBrews();
  }

  /** After an action on a card the list stays with its brew. */
  public brewAction(event?: [BREW_ACTION, Brew]): void {
    const uuid = event?.[1]?.config?.uuid;
    if (uuid) {
      this.lastInteractedBrewId = uuid;
    }
    this.loadBrews();
  }

  public loadBrews(): void {
    this.__initializeBrews();
    this.setUIParams();
    this.changeDetectorRef.detectChanges();
    const uuid = this.lastInteractedBrewId;
    this.lastInteractedBrewId = null;
    if (uuid && this.shownBrews.some((brew) => brew.config.uuid === uuid)) {
      this.list()?.scrollToKey(uuid);
    }
  }

  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
  }

  public isCollapseActive() {
    let collapsed = false;
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
    this.list()?.measure();
    this.research();
  }

  public isFilterActive(): boolean {
    let checkingFilter: IBrewPageFilter;
    let checkingFilterText = '';
    if (this.brew_segment === 'open') {
      checkingFilter = this.openBrewsFilter;
      checkingFilterText = this.openBrewFilterText;
    } else {
      checkingFilter = this.archivedBrewsFilter;
      checkingFilterText = this.archivedBrewFilterText;
    }
    let didRatingFilterChanged = false;
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
    let shallBarDisplayed = false;
    if (this.settings) {
      const isOpen = this.brew_segment === 'open';
      let checkingEntries: Brew[] = [];
      if (isOpen) {
        checkingEntries = this.openBrewsView;
      } else {
        checkingEntries = this.archiveBrewsView;
      }
      if (checkingEntries.length <= 0) {
        let entriesExisting = 0;
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
      this.list()?.scrollToTop();
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
    if (modalData?.data?.brew_filter !== undefined) {
      if (this.brew_segment === 'open') {
        this.openBrewsFilter = modalData.data.brew_filter;
      } else {
        this.archivedBrewsFilter = modalData.data.brew_filter;
      }
    }
    this.__saveBrewFilter();

    this.loadBrews();
    this.list()?.scrollToTop();
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
    this.setUIParams();
    this.list()?.scrollToTop();
  }

  private __initializeBrewView(_type: string): void {
    // sort latest to top.
    const brewsCopy: Brew[] = [...this.brews];
    let brewsFilters: Brew[];

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
    let sortedBrews: Brew[] = [];
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
    let searchText = '';
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

export default BrewPage;
