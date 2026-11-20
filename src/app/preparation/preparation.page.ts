import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
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
import { add } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';
import { merge } from 'rxjs';

import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { HeaderComponent } from '../../components/header/header.component';
import { PreparationInformationCardComponent } from '../../components/preparation-information-card/preparation-information-card.component';
import { SegmentLabelComponent } from '../../components/segment-label/segment-label.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../components/virtual-list/virtual-list.component';
import { SearchbarNameDirective } from '../../directive/searchbar-name.directive';
import { PREPARATION_ACTION } from '../../enums/preparations/preparationAction';
import { PREPARATION_SEGMENT } from '../../enums/preparations/preparationSegment';
import { PREPARATION_SORT_AFTER } from '../../enums/preparations/preparationSortAfter';
import { PREPARATION_SORT_ORDER } from '../../enums/preparations/preparationSortOrder';
import { IPreparationPageSort } from '../../interfaces/preparation/iPreparationPageSort';
import { PreparationSortFilterHelperService } from '../../services/preparationSortFilterHelper/preparation-sort-filter-helper.service';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

@Component({
  selector: 'preparation',
  templateUrl: './preparation.page.html',
  styleUrls: ['./preparation.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    SegmentLabelComponent,
    VirtualListComponent,
    VirtualRowDirective,
    PreparationInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonSearchbar,
    SearchbarNameDirective,
    IonButton,
    NgTemplateOutlet,
  ],
})
export class PreparationPage {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly preparationSortFilterHelper = inject(
    PreparationSortFilterHelperService,
  );

  public settings: Settings;
  public segment: PREPARATION_SEGMENT = PREPARATION_SEGMENT.OPEN;
  private preparations: Preparation[] = [];

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

  private readonly list =
    viewChild<VirtualListComponent<Preparation>>(VirtualListComponent);
  public readonly preparationKey = (preparation: Preparation): string =>
    preparation.config.uuid;

  public constructor() {
    addIcons({ add });
    // Building the list replaces every card, as it shows copies. A card that
    // deletes its method is replaced when the brews go and its event reaches
    // nobody, so the list follows the methods themselves as well.
    merge(
      this.uiBrewStorage.attachOnEvent(),
      this.uiPreparationStorage.attachOnEvent(),
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadPreparations());
  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.openPreparationsSort = this.settings.preparation_sort.OPEN;
    this.archivedPreparationsSort = this.settings.preparation_sort.ARCHIVED;

    this.__initializePreparations();
    this.setUIParams();
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
    this.setUIParams();
    this.list()?.scrollToTop();
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
      this.list()?.scrollToTop();
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
    this.list()?.scrollToTop();
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
    this.preparations = this.uiPreparationStorage.getAllEntries();
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
