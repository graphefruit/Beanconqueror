import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { Brew } from '../../../classes/brew/brew';
import { IBrewPageFilter } from '../../../interfaces/brew/iBrewPageFilter';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { BrewFilterComponent } from '../brew-filter/brew-filter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { UIGraphStorage } from '../../../services/uiGraphStorage.service';
import { Graph } from '../../../classes/graph/graph';
import { UIGraphHelper } from '../../../services/uiGraphHelper';
import { UIAlert } from '../../../services/uiAlert';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'app-brew-choose-graph-reference',
  templateUrl: './brew-choose-graph-reference.component.html',
  styleUrls: ['./brew-choose-graph-reference.component.scss'],
})
export class BrewChooseGraphReferenceComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-choose-graph-reference';
  public brew_segment: string = 'brews-open';
  public radioSelection: string;
  public graphOpenView: Array<Graph> = [];
  public openBrewsView: Array<Brew> = [];
  public archiveBrewsView: Array<Brew> = [];

  public graphsOpen: Array<Graph> = [];
  public brewsOpen: Array<Brew> = [];
  public brewsArchived: Array<Brew> = [];

  public openBrewsLength: number = 0;
  public archiveBrewsLength: number = 0;
  public brews: Array<Brew>;
  public graphs: Array<Graph>;
  public openBrewsFilterText: string = '';
  public archivedBrewsFilterText: string = '';

  public openBrewsFilter: IBrewPageFilter;
  public archivedBrewsFilter: IBrewPageFilter;

  @Input() public brew: Brew;

  public settings: Settings = undefined;
  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', { read: AgVirtualSrollComponent, static: false })
  public archivedScroll: AgVirtualSrollComponent;
  @ViewChild('graphOpenScroll', {
    read: AgVirtualSrollComponent,
    static: false,
  })
  public graphOpenScroll: AgVirtualSrollComponent;

  @ViewChild('brewContent', { read: ElementRef })
  public brewContent: ElementRef;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly modalCtrl: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiGraphHelper: UIGraphHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiHelper: UIHelper,
    private readonly platform: Platform
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBrewsFilter = this.settings.GET_BREW_FILTER();
    this.openBrewsFilter = this.settings.GET_BREW_FILTER();
  }

  public ngOnInit() {
    const graphs = this.uiGraphStorage.getAllEntries();
    if (graphs.filter((e) => e.finished === false).length > 0) {
      this.brew_segment = 'graphs-open';
    }
    this.openBrewsFilter.method_of_preparation.push(
      this.brew.method_of_preparation
    );
    this.archivedBrewsFilter.method_of_preparation.push(
      this.brew.method_of_preparation
    );
  }

  public segmentChanged() {
    this.retriggerScroll();
  }
  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }

  public async addOwnGraph() {
    await this.uiGraphHelper.addGraph();
    const graphs = this.uiGraphStorage.getAllEntries();
    const activeGraphs = graphs.filter((e) => e.finished === false).length;
    if (activeGraphs === 1) {
      // Means we just added one, so jump to this section now
      this.brew_segment = 'graphs-open';
    }
    if (activeGraphs >= 1) {
      if (this.settings.show_graph_section === false) {
        this.settings.show_graph_section = true;
        await this.uiSettingsStorage.update(this.settings);

        this.uiAlert.showMessage(
          'GRAPH_SECTION.SECTION_HAS_BEEN_ACTIVATED',
          undefined,
          undefined,
          true
        );
      }
    }
    this.__initializeBrews();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.brewContent.nativeElement;

      const footerEl = this.footerContent.nativeElement;

      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else if (this.archivedScroll !== undefined) {
        scrollComponent = this.archivedScroll;
      } else if (this.graphOpenScroll !== undefined) {
        scrollComponent = this.graphOpenScroll;
      }
      if (scrollComponent) {
        scrollComponent.el.style.height =
          el.offsetHeight -
          footerEl.offsetHeight -
          15 -
          scrollComponent.el.offsetTop +
          'px';
      }
    }, 150);
  }

  public ionViewDidEnter() {
    this.__initializeBrews();
  }
  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.graphs = this.uiGraphStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];
    this.graphsOpen = [];

    this.__initializeBrewView('brews-open');
    this.__initializeBrewView('brews-archiv');
    this.__initializeGraphView('graphs-open');

    this.retriggerScroll();
  }
  public research() {
    this.__initializeBrewView('brews-open');
    this.__initializeBrewView('brews-archiv');
    this.__initializeGraphView('graphs-open');
    this.retriggerScroll();
  }

  public async showFilter(_type: string) {
    let brewFilter: IBrewPageFilter;
    if (_type === 'brews-open') {
      brewFilter = this.uiHelper.cloneData(this.openBrewsFilter);
    } else {
      brewFilter = this.uiHelper.cloneData(this.archivedBrewsFilter);
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
      if (this.brew_segment === 'brews-open') {
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
    if (_type === 'brews-open') {
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

  private __initializeGraphView(_type: string) {
    const graphsCopy: Array<Graph> = [...this.graphs];
    let graphsFilters: Array<Graph>;

    const isOpen: boolean = _type === 'graphs-open';
    if (isOpen) {
      graphsFilters = graphsCopy.filter((e) => e.finished === false);
    } else {
      graphsFilters = graphsCopy.filter((e) => e.finished === true);
    }

    if (_type === 'graphs-open') {
      this.graphOpenView = graphsFilters;
    } else {
    }
  }

  private __initializeBrewView(_type: string): void {
    // sort latest to top.
    const brewsCopy: Array<Brew> = [...this.brews];
    let brewsFilters: Array<Brew>;

    const isOpen: boolean = _type === 'brews-open';
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

    if (this.platform.is('cordova')) {
      brewsFilters = brewsFilters.filter(
        (b) =>
          b.flow_profile !== undefined &&
          b.flow_profile !== null &&
          b.flow_profile !== ''
      );
    }

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
    if (_type === 'brews-open') {
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

    if (_type === 'brews-open') {
      this.openBrewsView = sortedBrews;
    } else {
      this.archiveBrewsView = sortedBrews;
    }
  }
  public chooseGraph(_brew: Brew = null, _graph: Graph = null) {
    this.modalController.dismiss(
      {
        dismissed: true,
        brew: _brew,
        graph: _graph,
      },
      undefined,
      BrewChooseGraphReferenceComponent.COMPONENT_ID
    );
  }
  public choose() {
    const radioSelection = this.radioSelection;
    if (radioSelection.startsWith('BREW-')) {
      const brewId = radioSelection.replace('BREW-', '');
      const choosenBrew: Brew = this.uiBrewStorage.getByUUID(brewId);
      this.chooseGraph(choosenBrew, null);
    } else {
      const graphId = radioSelection.replace('GRAPH-', '');
      const choosenGraph: Graph = this.uiGraphStorage.getByUUID(graphId);
      this.chooseGraph(null, choosenGraph);
    }
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
