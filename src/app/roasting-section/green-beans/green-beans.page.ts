import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { GreenBeanInformationComponent } from '../../../components/green-bean-information/green-bean-information.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../../components/virtual-list/virtual-list.component';
import { SearchbarNameDirective } from '../../../directive/searchbar-name.directive';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { GREEN_BEAN_ACTION } from '../../../enums/green-beans/greenBeanAction';
import { IBeanPageSort } from '../../../interfaces/bean/iBeanPageSort';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIGreenBeanHelper } from '../../../services/uiGreenBeanHelper';
import { UIGreenBeanStorage } from '../../../services/uiGreenBeanStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { GreenBeanSortComponent } from './green-bean-sort/green-bean-sort.component';

@Component({
  selector: 'app-green-beans',
  templateUrl: './green-beans.page.html',
  styleUrls: ['./green-beans.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    VirtualListComponent,
    VirtualRowDirective,
    GreenBeanInformationComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    SearchbarNameDirective,
    IonIcon,
    IonButton,
  ],
})
export class GreenBeansPage implements OnInit {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiGreenBeanHelper = inject(UIGreenBeanHelper);

  private beans: GreenBean[] = [];

  public openBeans: GreenBean[] = [];
  public finishedBeans: GreenBean[] = [];

  public openBeansFilter: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public bean_segment = 'open';
  private readonly list =
    viewChild<VirtualListComponent<GreenBean>>(VirtualListComponent);
  public readonly greenBeanKey = (greenBean: GreenBean): string =>
    greenBean.config.uuid;
  public archivedBeansFilter: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public archivedBeansFilterText = '';
  public openBeansFilterText = '';

  public settings: Settings;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ionViewWillEnter(): void {
    const settings = this.uiSettingsStorage.getSettings();
    this.archivedBeansFilter = settings.green_bean_sort.ARCHIVED;
    this.openBeansFilter = settings.green_bean_sort.OPEN;
    this.loadBeans();
  }

  public loadBeans(): void {
    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
  }

  public segmentChanged() {
    this.list()?.scrollToTop();
  }

  public async beanAction(
    action: GREEN_BEAN_ACTION,
    bean: GreenBean,
  ): Promise<void> {
    this.loadBeans();
  }

  public async add() {
    await this.uiGreenBeanHelper.addGreenBean();
    this.loadBeans();
  }

  public async showFilter() {
    let beanFilter: IBeanPageSort;
    if (this.bean_segment === 'open') {
      beanFilter = { ...this.openBeansFilter };
    } else {
      beanFilter = { ...this.archivedBeansFilter };
    }

    const modal = await this.modalCtrl.create({
      component: GreenBeanSortComponent,
      cssClass: 'popover-actions',
      showBackdrop: true,
      id: GreenBeanSortComponent.COMPONENT_ID,
      componentProps: { bean_filter: beanFilter, segment: this.bean_segment },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData?.data?.bean_filter !== undefined) {
      if (this.bean_segment === 'open') {
        this.openBeansFilter = modalData.data.bean_filter;
      } else {
        this.archivedBeansFilter = modalData.data.bean_filter;
      }
    }
    await this.__saveBeanFilter();

    this.loadBeans();
    this.list()?.scrollToTop();
  }

  public isFilterActive(): boolean {
    if (this.bean_segment === 'open') {
      return (
        (this.openBeansFilter.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
          this.openBeansFilter.sort_after !== BEAN_SORT_AFTER.UNKOWN) ||
        this.openBeansFilterText !== ''
      );
    } else {
      return (
        (this.archivedBeansFilter.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
          this.archivedBeansFilter.sort_after !== BEAN_SORT_AFTER.UNKOWN) ||
        this.archivedBeansFilterText !== ''
      );
    }
  }

  public research() {
    this.__initializeBeansView(this.bean_segment);
    this.list()?.scrollToTop();
  }

  private async __saveBeanFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.green_bean_sort.OPEN = this.openBeansFilter;
    settings.green_bean_sort.ARCHIVED = this.archivedBeansFilter;
    await this.uiSettingsStorage.saveSettings(settings);
  }

  private __initializeBeansView(_type: string) {
    // sort latest to top.
    const beansCopy: GreenBean[] = [...this.beans];
    const isOpen: boolean = _type === 'open';
    let filter: IBeanPageSort;
    let sortedBeans: GreenBean[];
    if (isOpen) {
      filter = this.openBeansFilter;
      sortedBeans = beansCopy.filter((bean) => !bean.finished);
    } else {
      filter = this.archivedBeansFilter;
      sortedBeans = beansCopy.filter((bean) => bean.finished);
    }

    // Skip if something is unkown, because no filter is active then
    if (
      filter.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
      filter.sort_after !== BEAN_SORT_AFTER.UNKOWN
    ) {
      switch (filter.sort_after) {
        case BEAN_SORT_AFTER.NAME:
          sortedBeans = sortedBeans.sort((a, b) => {
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
        case BEAN_SORT_AFTER.PURCHASE_DATE:
          sortedBeans = sortedBeans.sort((a, b) => {
            if (a.date > b.date) {
              return -1;
            }
            if (a.date < b.date) {
              return 1;
            }
            return 0;
          });
          break;
        case BEAN_SORT_AFTER.CREATION_DATE:
          sortedBeans = sortedBeans.sort((a, b) => {
            if (a.config.unix_timestamp > b.config.unix_timestamp) {
              return -1;
            }
            if (a.config.unix_timestamp < b.config.unix_timestamp) {
              return 1;
            }
            return 0;
          });
      }

      if (filter.sort_order === BEAN_SORT_ORDER.DESCENDING) {
        sortedBeans.reverse();
      }
    }
    let searchText = '';
    if (isOpen) {
      searchText = this.openBeansFilterText.toLowerCase();
    } else {
      searchText = this.archivedBeansFilterText.toLowerCase();
    }

    if (searchText) {
      sortedBeans = sortedBeans.filter(
        (e) =>
          e.note?.toLowerCase().includes(searchText) ||
          e.name?.toLowerCase().includes(searchText) ||
          e.aromatics?.toLowerCase().includes(searchText) ||
          e.ean_article_number?.toLowerCase().includes(searchText),
      );
    }
    if (isOpen) {
      this.openBeans = sortedBeans;
    } else {
      this.finishedBeans = sortedBeans;
    }
  }

  public ngOnInit() {}

  private __initializeBeans(): void {
    this.beans = this.uiGreenBeanStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openBeans = [];
    this.finishedBeans = [];
    this.__initializeBeansView('open');
    this.__initializeBeansView('archiv');
  }
}

export default GreenBeansPage;
