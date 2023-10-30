import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { Brew } from '../../../classes/brew/brew';
import { IBrewPageFilter } from '../../../interfaces/brew/iBrewPageFilter';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { BrewFilterComponent } from '../brew-filter/brew-filter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';

@Component({
  selector: 'app-brew-choose-graph-reference',
  templateUrl: './brew-choose-graph-reference.component.html',
  styleUrls: ['./brew-choose-graph-reference.component.scss'],
})
export class BrewChooseGraphReferenceComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-choose-graph-reference';
  public brew_segment: string = 'open';
  public radioSelection: string;
  public openBrewsView: Array<Brew> = [];
  public archiveBrewsView: Array<Brew> = [];

  public brewsOpen: Array<Brew> = [];
  public brewsArchived: Array<Brew> = [];

  public openBrewsLength: number = 0;
  public archiveBrewsLength: number = 0;
  public brews: Array<Brew>;

  public openBrewsFilterText: string = '';
  public archivedBrewsFilterText: string = '';

  public openBrewsFilter: IBrewPageFilter;
  public archivedBrewsFilter: IBrewPageFilter;

  public settings: Settings = undefined;
  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', { read: AgVirtualSrollComponent, static: false })
  public archivedScroll: AgVirtualSrollComponent;

  @ViewChild('brewContent', { read: ElementRef })
  public brewContent: ElementRef;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly modalCtrl: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBrewsFilter = this.settings.GET_BREW_FILTER();
    this.openBrewsFilter = this.settings.GET_BREW_FILTER();
  }

  public ngOnInit() {}

  public segmentChanged() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.brewContent.nativeElement;

      const footerEl = this.footerContent.nativeElement;

      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight -
        footerEl.offsetHeight -
        10 -
        scrollComponent.el.offsetTop +
        'px';
    }, 150);
  }

  public ionViewDidEnter() {
    this.__initializeBrews();
  }
  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
    this.retriggerScroll();
  }
  public research() {
    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
    this.retriggerScroll();
  }

  public async showFilter(_type: string) {
    let brewFilter: IBrewPageFilter;
    if (_type === 'open') {
      brewFilter = { ...this.openBrewsFilter };
    } else {
      brewFilter = { ...this.archivedBrewsFilter };
    }
    const modal = await this.modalCtrl.create({
      component: BrewFilterComponent,
      cssClass: 'popover-actions',
      id: BrewFilterComponent.COMPONENT_ID,
      componentProps: {
        brew_filter: brewFilter,
        segment: this.brew_segment,
        hide_options: {
          chart_data: true,
        },
      },
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

    this.research();
  }

  public isFilterActive(_type: string) {
    let checkingFilter: IBrewPageFilter;
    let checkingFilterText: string = '';
    if (_type === 'open') {
      checkingFilter = this.openBrewsFilter;
      checkingFilterText = this.openBrewsFilterText;
    } else {
      checkingFilter = this.archivedBrewsFilter;
      checkingFilterText = this.archivedBrewsFilterText;
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
      checkingFilter.best_brew ||
      checkingFilter.profiles?.length > 0 ||
      didRatingFilterChanged ||
      checkingFilterText !== ''
    );
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

    brewsFilters = brewsFilters.filter(
      (b) =>
        b.flow_profile !== undefined &&
        b.flow_profile !== null &&
        b.flow_profile !== ''
    );

    if (isOpen) {
      this.brewsOpen = brewsFilters;
    } else {
      this.brewsArchived = brewsFilters;
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
    if (filter.profiles.length > 0) {
      brewsFilters = brewsFilters.filter(
        (e) =>
          filter.profiles.filter((z) => z === e.pressure_profile).length > 0
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
    if (filter.best_brew) {
      brewsFilters = brewsFilters.filter((e) => e.best_brew === true);
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
      searchText = this.openBrewsFilterText.toLowerCase();
    } else {
      searchText = this.archivedBrewsFilterText.toLowerCase();
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
  public chooseGraph(_brew: Brew) {
    this.modalController.dismiss(
      {
        dismissed: true,
        brew: _brew,
      },
      undefined,
      BrewChooseGraphReferenceComponent.COMPONENT_ID
    );
  }
  public choose() {
    const choosenBrew = this.uiBrewStorage.getByUUID(this.radioSelection);
    this.chooseGraph(choosenBrew);
  }
  public reset() {
    this.modalController.dismiss(
      {
        dismissed: true,
        reset: true,
      },
      undefined,
      BrewChooseGraphReferenceComponent.COMPONENT_ID
    );
  }
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewChooseGraphReferenceComponent.COMPONENT_ID
    );
  }
}