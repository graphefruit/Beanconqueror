import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {IBeanPageFilter} from '../../../interfaces/bean/iBeanPageFilter';
import {BEAN_SORT_AFTER} from '../../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../../enums/beans/beanSortOrder';
import {ModalController} from '@ionic/angular';
import {UIAlert} from '../../../services/uiAlert';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {GreenBean} from '../../../classes/green-bean/green-bean';
import {UIGreenBeanStorage} from '../../../services/uiGreenBeanStorage';
import {GREEN_BEAN_ACTION} from '../../../enums/green-beans/greenBeanAction';
import {GreenBeanFilterComponent} from './green-bean-filter/green-bean-filter.component';
import {AgVirtualSrollComponent} from 'ag-virtual-scroll';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIGreenBeanHelper} from '../../../services/uiGreenBeanHelper';

@Component({
  selector: 'app-green-beans',
  templateUrl: './green-beans.page.html',
  styleUrls: ['./green-beans.page.scss'],
})
export class GreenBeansPage implements OnInit {

  private beans: Array<GreenBean> = [];


  public openBeans: Array<GreenBean> = [];
  public finishedBeans: Array<GreenBean> = [];

  public openBeansFilter: IBeanPageFilter = {
    sort_after:  BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };


  @ViewChild('greenBeanContent',{read: ElementRef}) public greenBeanContent: ElementRef;

  @ViewChild('openScroll', {read: AgVirtualSrollComponent, static: false}) public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', {read: AgVirtualSrollComponent, static: false}) public archivedScroll: AgVirtualSrollComponent;
  public bean_segment: string = 'open';
  public archivedBeansFilter: IBeanPageFilter = {
    sort_after:  BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public archivedBeansFilterText: string = '';
  public openBeansFilterText: string = '';

  public settings: Settings;



  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiGreenBeanStorage: UIGreenBeanStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiGreenBeanHelper: UIGreenBeanHelper) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ionViewWillEnter(): void {
    const settings = this.uiSettingsStorage.getSettings();
    this.archivedBeansFilter = settings.green_bean_filter.ARCHIVED;
    this.openBeansFilter = settings.green_bean_filter.OPEN;
    this.loadBeans();
  }


  public loadBeans(): void {

    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
    this.retriggerScroll();
  }



  public segmentChanged() {
    this.retriggerScroll();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }
  private retriggerScroll() {

    setTimeout(async () =>{

      const el =  this.greenBeanContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height = (el.offsetHeight - scrollComponent.el.offsetTop) + 'px';
    },250);

  }

  public async beanAction(action: GREEN_BEAN_ACTION, bean: GreenBean): Promise<void> {
    this.loadBeans();
  }



  public async add() {
    await this.uiGreenBeanHelper.addGreenBean();
    this.loadBeans();
  }

  public async showFilter() {
    let beanFilter: IBeanPageFilter;
    if (this.bean_segment === 'open') {
      beanFilter = {...this.openBeansFilter};
    } else {
      beanFilter = {...this.archivedBeansFilter};
    }

    const modal = await this.modalCtrl.create({
      component: GreenBeanFilterComponent,
      cssClass: 'popover-actions',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      id: GreenBeanFilterComponent.COMPONENT_ID,
      componentProps:
        {bean_filter: beanFilter, segment: this.bean_segment},
      breakpoints: [0, 0.2, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData !== undefined && modalData.data.bean_filter !== undefined) {
      if (this.bean_segment === 'open') {
        this.openBeansFilter = modalData.data.bean_filter;

      } else {
        this.archivedBeansFilter = modalData.data.bean_filter;
      }
    }
    this.__saveBeanFilter();


    this.loadBeans();
  }

  public isFilterActive(): boolean {
    if (this.bean_segment === 'open') {
      return (this.openBeansFilter.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
        this.openBeansFilter.sort_after !== BEAN_SORT_AFTER.UNKOWN) || this.openBeansFilterText !== '';
    } else {
      return (this.archivedBeansFilter.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
        this.archivedBeansFilter.sort_after !== BEAN_SORT_AFTER.UNKOWN) || this.archivedBeansFilterText !== '';
    }
  }

  public research() {
    this.__initializeBeansView(this.bean_segment);
  }

  private __saveBeanFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.green_bean_filter.OPEN = this.openBeansFilter;
    settings.green_bean_filter.ARCHIVED = this.archivedBeansFilter;
    this.uiSettingsStorage.saveSettings(settings);
  }

  private __initializeBeansView(_type: string) {
// sort latest to top.
    const beansCopy: Array<GreenBean> = [...this.beans];
    const isOpen: boolean = (_type === 'open');
    let filter: IBeanPageFilter;
    let sortedBeans : Array<GreenBean>;
    if (isOpen) {
      filter = this.openBeansFilter;
      sortedBeans =  beansCopy.filter(
        (bean) => !bean.finished);
    } else {
      filter = this.archivedBeansFilter;
      sortedBeans =  beansCopy.filter(
        (bean) => bean.finished);
    }

    // Skip if something is unkown, because no filter is active then
   if (filter.sort_order !== BEAN_SORT_ORDER.UNKOWN && filter.sort_after !== BEAN_SORT_AFTER.UNKOWN){

      switch (filter.sort_after) {
        case BEAN_SORT_AFTER.NAME:
          sortedBeans = sortedBeans.sort( (a,b) => {
              const nameA = a.name.toUpperCase();
              const nameB = b.name.toUpperCase();

              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }

              return 0;
            }
          );
          break;
        case BEAN_SORT_AFTER.PURCHASE_DATE:
          sortedBeans = sortedBeans.sort( (a,b) => {
              if ( a.date > b.date){
                return -1;
              }
              if ( a.date < b.date){
                return 1;
              }
              return 0;
            }
          );
          break;
        case BEAN_SORT_AFTER.CREATION_DATE:
          sortedBeans = sortedBeans.sort( (a,b) => {
              if ( a.config.unix_timestamp > b.config.unix_timestamp ){
                return -1;
              }
              if ( a.config.unix_timestamp < b.config.unix_timestamp ){
                return 1;
              }
              return 0;
            }
          );

      }

      if (filter.sort_order === BEAN_SORT_ORDER.DESCENDING) {
        sortedBeans.reverse();
      }

    }
    let searchText: string = '';
    if (isOpen) {
      searchText = this.openBeansFilterText.toLowerCase();
    } else {
      searchText = this.archivedBeansFilterText.toLowerCase();
    }

    if (searchText) {
      sortedBeans = sortedBeans.filter((e) => e.note.toLowerCase().includes(searchText) ||
        e.name.toLowerCase().includes(searchText) ||
        e.aromatics.toLowerCase().includes(searchText));
    }
    if (isOpen) {
      this.openBeans = sortedBeans;
    } else {
      this.finishedBeans = sortedBeans;
    }
    this.retriggerScroll();
  }

  public ngOnInit() {
  }

  private __initializeBeans(): void {
    this.beans = this.uiGreenBeanStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openBeans = [];
    this.finishedBeans = [];
    this.__initializeBeansView('open');
    this.__initializeBeansView('archiv');

  }
}
