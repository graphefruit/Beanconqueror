import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { UIAlert } from '../../services/uiAlert';
import { UIHelper } from '../../services/uiHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { Brew } from '../../classes/brew/brew';
import { IBrewPageFilter } from '../../interfaces/brew/iBrewPageFilter';
import { BREW_ACTION } from '../../enums/brews/brewAction';
import { Bean } from '../../classes/bean/bean';
import { BrewFilterComponent } from './brew-filter/brew-filter.component';
import { Settings } from '../../classes/settings/settings';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { UIAnalytics } from '../../services/uiAnalytics';

@Component({
  selector: 'brew',
  templateUrl: './brew.page.html',
  styleUrls: ['./brew.page.scss'],
})
export class BrewPage implements OnInit {
  public brews: Array<Brew>;
  public openBrewsView: Array<Brew> = [];
  public archiveBrewsView: Array<Brew> = [];

  public openBrewsLength: number = 0;
  public archiveBrewsLength: number = 0;

  public brew_segment: 'open' | 'archive' = 'open';

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

  public settings: Settings;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly platform: Platform,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiAlert: UIAlert,
    public uiHelper: UIHelper,
    public uiBrewHelper: UIBrewHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAnalytics: UIAnalytics
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBrewsFilter = this.settings.GET_BREW_FILTER();
    this.openBrewsFilter = this.settings.GET_BREW_FILTER();
  }

  public ionViewWillEnter(): void {
    this.archivedBrewsFilter = this.settings.brew_filter.ARCHIVED;
    this.openBrewsFilter = this.settings.brew_filter.OPEN;
    this.loadBrews();

    this.retriggerScroll();
  }

  public segmentChanged() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.brewContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';
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

  public async brewAction(action: BREW_ACTION, brew: Brew): Promise<void> {
    this.loadBrews();
  }

  public loadBrews(): void {
    this.__initializeBrews();
    this.retriggerScroll();
    this.changeDetectorRef.detectChanges();
  }

  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
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
      checkingFilter.method_of_preparation.length > 0 ||
      checkingFilter.mill.length > 0 ||
      checkingFilter.favourite ||
      checkingFilter.chart_data ||
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
          entriesExisting = this.uiBrewStorage
            .getAllEntries()
            .filter(
              (e) =>
                e.getBean().finished === !isOpen &&
                e.getMill().finished === !isOpen &&
                e.getPreparation().finished === !isOpen
            ).length;
        } else {
          entriesExisting = this.uiBrewStorage
            .getAllEntries()
            .filter(
              (e) =>
                e.getBean().finished === !isOpen ||
                e.getMill().finished === !isOpen ||
                e.getPreparation().finished === !isOpen
            ).length;
        }

        if (entriesExisting > 0) {
          shallBarDisplayed = true;
        }
      }
    }

    return shallBarDisplayed;
  }

  // Treat the instructor name as the unique identifier for the object
  public trackByUUID(index, instructor: Bean) {
    return instructor.config.uuid;
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
    if (modalData !== undefined && modalData.data.brew_filter !== undefined) {
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
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public research() {
    this.__initializeBrewView(this.brew_segment);
    this.retriggerScroll();
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
          e.getPreparation().finished === !isOpen
      );

      this.openBrewsLength = brewsFilters.length;
      this.archiveBrewsLength = this.brews.length - this.openBrewsLength;
    } else {
      brewsFilters = brewsCopy.filter(
        (e) =>
          e.getBean().finished === !isOpen ||
          e.getMill().finished === !isOpen ||
          e.getPreparation().finished === !isOpen
      );
    }

    let filter: IBrewPageFilter;
    if (isOpen) {
      filter = this.openBrewsFilter;
    } else {
      filter = this.archivedBrewsFilter;
    }

    if (filter.mill.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) => filter.mill.filter((z) => z === e.mill).length > 0
      );
    }
    if (filter.bean.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) => filter.bean.filter((z) => z === e.bean).length > 0
      );
    }
    if (filter.method_of_preparation.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) =>
          filter.method_of_preparation.filter(
            (z) => z === e.method_of_preparation
          ).length > 0
      );

      // Tools just can be selected when a preparation method was selected
      if (filter.method_of_preparation_tools.length > 0) {
        brewsFilters = brewsFilters.filter(
          (e) =>
            filter.method_of_preparation_tools.filter((z) =>
              e.method_of_preparation_tools.includes(z)
            ).length > 0
        );
      }
    }
    if (filter.favourite) {
      brewsFilters = brewsFilters.filter((e) => e.favourite === true);
    }
    if (filter.chart_data) {
      brewsFilters = brewsFilters.filter(
        (e) => e.flow_profile !== '' && e.flow_profile !== undefined
      );
    }
    if (filter.rating) {
      brewsFilters = brewsFilters.filter(
        (e: Brew) =>
          e.rating >= filter.rating.lower && e.rating <= filter.rating.upper
      );
    }

    let sortedBrews: Array<Brew> = UIBrewHelper.sortBrews(brewsFilters);
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
          e.getBean().roaster.toLowerCase().includes(searchText)
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
