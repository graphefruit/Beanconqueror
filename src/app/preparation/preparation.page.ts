import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonMenuButton,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { HeaderButtonComponent } from '../../components/header/header-button.component';
import { HeaderComponent } from '../../components/header/header.component';
import { PreparationInformationCardComponent } from '../../components/preparation-information-card/preparation-information-card.component';
import { PREPARATION_ACTION } from '../../enums/preparations/preparationAction';
import { PREPARATION_SEGMENT } from '../../enums/preparations/preparationSegment';
import { PREPARATION_SORT_AFTER } from '../../enums/preparations/preparationSortAfter';
import { PREPARATION_SORT_ORDER } from '../../enums/preparations/preparationSortOrder';
import { IPreparationPageSort } from '../../interfaces/preparation/iPreparationPageSort';
import { PreparationSortFilterHelperService } from '../../services/preparationSortFilterHelper/preparation-sort-filter-helper.service';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';

@Component({
  selector: 'preparation',
  templateUrl: './preparation.page.html',
  styleUrls: ['./preparation.page.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    PreparationInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonSearchbar,
    IonButton,
    NgTemplateOutlet,
  ],
})
export class PreparationPage {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly preparationSortFilterHelper = inject(
    PreparationSortFilterHelperService,
  );

  public settings: Settings;
  public segment: PREPARATION_SEGMENT = PREPARATION_SEGMENT.OPEN;
  public preparations: Preparation[] = [];

  public openPreparationsLength = 0;
  public archivePreparationsLength = 0;

  public openPreparationsView: Preparation[] = [];
  public archivePreparationsView: Preparation[] = [];

  public openPreparationsSort: IPreparationPageSort = {
    sort_after: PREPARATION_SORT_AFTER.UNKNOWN,
    sort_order: PREPARATION_SORT_ORDER.UNKNOWN,
  };
  public archivedPreparationsSort: IPreparationPageSort = {
    sort_after: PREPARATION_SORT_AFTER.UNKNOWN,
    sort_order: PREPARATION_SORT_ORDER.UNKNOWN,
  };

  public openPreparationsFilterText = '';
  public archivedPreparationsFilterText = '';

  public uiIsSortActive = false;
  public uiShallBarBeDisplayed = false;
  public uiIsTextSearchActive = false;
  public uiSearchText = '';

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualScrollComponent;
  @ViewChild('preparationContent', { read: ElementRef })
  public preparationContent: ElementRef;
  public segmentScrollHeight: string = undefined;

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.openPreparationsSort = this.settings.preparation_sort.OPEN;
    this.archivedPreparationsSort = this.settings.preparation_sort.ARCHIVED;

    this.__initializePreparations();
    this.retriggerScroll();
    this.setUIParams();
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      this.loadPreparations();
    });
  }

  public loadPreparations(): void {
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
    this.setUIParams();
  }

  private setUIParams() {
    this.uiIsSortActive = this.isSortActive();
    this.uiShallBarBeDisplayed = this.shallBarBeDisplayed();
    this.uiIsTextSearchActive = this.isTextSearchActive();
  }

  public segmentChanged() {
    this.uiSearchText = this.manageSearchTextScope(this.segment, false);
    this.retriggerScroll();
    this.setUIParams();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }
  private retriggerScroll() {
    setTimeout(() => {
      const el = this.preparationContent.nativeElement;
      let scrollComponent: AgVirtualScrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';

      this.segmentScrollHeight = scrollComponent.el.style.height;

      // HACK: Manually trigger component refresh to work around initialization
      //       bug. For some reason the scroll component sees its own height as
      //       0 during initialization, which causes it to render 0 items. As
      //       no changes to the component occur after initialization, no
      //       re-render ever occurs. This forces one. The root cause for
      //       this issue is currently unknown.
      if (scrollComponent.items.length === 0) {
        scrollComponent.refreshData();
      }
    }, 150);
  }

  public async showSort() {
    const sortSegment = this.manageSortScope(this.segment);
    const newSort =
      await this.preparationSortFilterHelper.showSort(sortSegment);
    if (newSort) {
      if (this.segment === PREPARATION_SEGMENT.OPEN) {
        this.openPreparationsSort = newSort;
      } else if (this.segment === PREPARATION_SEGMENT.ARCHIVE) {
        this.archivedPreparationsSort = newSort;
      }

      await this.__savePreparationSort();

      this.loadPreparations();
    }
  }

  public isSortActive(): boolean {
    const sort = this.manageSortScope(this.segment);
    return (
      sort.sort_order !== PREPARATION_SORT_ORDER.UNKNOWN &&
      sort.sort_after !== PREPARATION_SORT_AFTER.UNKNOWN
    );
  }

  public isTextSearchActive() {
    const searchText = this.manageSearchTextScope(this.segment);
    return searchText !== '';
  }

  public shallBarBeDisplayed() {
    let shallBarDisplayed = false;

    if (this.segment === PREPARATION_SEGMENT.OPEN) {
      shallBarDisplayed = this.openPreparationsLength > 0;
    } else if (this.segment === PREPARATION_SEGMENT.ARCHIVE) {
      shallBarDisplayed = this.archivePreparationsLength > 0;
    }

    return shallBarDisplayed;
  }

  public research() {
    this.setSearchTextScope(this.segment, this.uiSearchText);
    this.__initializePreparationsView(this.segment);
    this.setUIParams();
  }

  public async add() {
    await this.uiPreparationHelper.addPreparation();
    this.loadPreparations();
  }

  public async preparationAction(
    action: PREPARATION_ACTION,
    preparation: Preparation,
  ): Promise<void> {
    this.loadPreparations();
  }

  private async __savePreparationSort() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.preparation_sort.OPEN = this.openPreparationsSort;
    settings.preparation_sort.ARCHIVED = this.archivedPreparationsSort;
    await this.uiSettingsStorage.saveSettings(settings);
  }

  private __initializePreparations(): void {
    this.openPreparationsView = [];
    this.archivePreparationsView = [];

    this.preparations = this.uiPreparationStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openPreparationsLength = this.preparations.reduce(
      (n, e) => (!e.finished ? n + 1 : n),
      0,
    );
    this.archivePreparationsLength = this.preparations.reduce(
      (n, e) => (e.finished ? n + 1 : n),
      0,
    );

    this.__initializePreparationsView(PREPARATION_SEGMENT.OPEN);
    this.__initializePreparationsView(PREPARATION_SEGMENT.ARCHIVE);
  }

  private __initializePreparationsView(_type: PREPARATION_SEGMENT) {
    const searchText = this.manageSearchTextScope(_type);
    const sort = this.manageSortScope(_type);

    const filteredPreparations =
      this.preparationSortFilterHelper.initializePreparationsView(
        _type,
        this.preparations,
        searchText,
        sort,
      );

    if (_type === PREPARATION_SEGMENT.OPEN) {
      this.openPreparationsView = filteredPreparations;
    } else if (_type === PREPARATION_SEGMENT.ARCHIVE) {
      this.archivePreparationsView = filteredPreparations;
    }
    this.retriggerScroll();
  }

  private manageSortScope(_type: PREPARATION_SEGMENT): IPreparationPageSort {
    if (_type === PREPARATION_SEGMENT.OPEN) {
      return this.openPreparationsSort;
    } else if (_type === PREPARATION_SEGMENT.ARCHIVE) {
      return this.archivedPreparationsSort;
    }
  }

  private manageSearchTextScope(
    _type: PREPARATION_SEGMENT,
    _toLowerCase = true,
  ) {
    let searchText = '';
    if (_type === PREPARATION_SEGMENT.OPEN) {
      searchText = this.openPreparationsFilterText;
    } else if (_type === PREPARATION_SEGMENT.ARCHIVE) {
      searchText = this.archivedPreparationsFilterText;
    }
    if (_toLowerCase) {
      searchText = searchText.toLowerCase();
    }
    return searchText;
  }

  private setSearchTextScope(_type: PREPARATION_SEGMENT, _text: string) {
    if (_type === PREPARATION_SEGMENT.OPEN) {
      this.openPreparationsFilterText = _text;
    } else if (_type === PREPARATION_SEGMENT.ARCHIVE) {
      this.archivedPreparationsFilterText = _text;
    }
  }
}

export default PreparationPage;
