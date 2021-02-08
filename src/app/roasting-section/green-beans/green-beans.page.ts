import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {IBeanPageFilter} from '../../../interfaces/bean/iBeanPageFilter';
import {BEAN_SORT_AFTER} from '../../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../../enums/beans/beanSortOrder';
import {IonVirtualScroll, ModalController} from '@ionic/angular';
import {UIAlert} from '../../../services/uiAlert';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIToast} from '../../../services/uiToast';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIBeanHelper} from '../../../services/uiBeanHelper';
import {Brew} from '../../../classes/brew/brew';
import {GreenBean} from '../../../classes/green-bean/green-bean';
import {UIGreenBeanStorage} from '../../../services/uiGreenBeanStorage';
import {GREEN_BEAN_ACTION} from '../../../enums/green-beans/greenBeanAction';
import {GreenBeanEditComponent} from './green-bean-edit/green-bean-edit.component';
import {GreenBeanAddComponent} from './green-bean-add/green-bean-add.component';
import {GreenBeanDetailComponent} from './green-bean-detail/green-bean-detail.component';
import {BeansAddComponent} from '../../beans/beans-add/beans-add.component';
import {UIImage} from '../../../services/uiImage';
import {GreenBeanFilterComponent} from './green-bean-filter/green-bean-filter.component';

@Component({
  selector: 'app-green-beans',
  templateUrl: './green-beans.page.html',
  styleUrls: ['./green-beans.page.scss'],
})
export class GreenBeansPage implements OnInit {

  private beans: Array<GreenBean> = [];


  public settings: Settings;

  public openBeans: Array<GreenBean> = [];
  public finishedBeans: Array<GreenBean> = [];

  public openBeansFilter: IBeanPageFilter = {
    sort_after:  BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  @ViewChild('openScroll', {read: IonVirtualScroll, static: false}) public openScroll: IonVirtualScroll;
  @ViewChild('archivedScroll', {read: IonVirtualScroll, static: false}) public archivedScroll: IonVirtualScroll;
  public bean_segment: string = 'open';
  public archivedBeansFilter: IBeanPageFilter = {
    sort_after:  BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public archivedBeansFilterText: string = '';
  public openBeansFilterText: string = '';



  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiGreenBeanStorage: UIGreenBeanStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly uiImage: UIImage) {


  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBeansFilter = this.settings.green_bean_filter.ARCHIVED;
    this.openBeansFilter = this.settings.green_bean_filter.OPEN;
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
  public async beanAction(action: GREEN_BEAN_ACTION, bean: GreenBean): Promise<void> {
    switch (action) {
      case GREEN_BEAN_ACTION.DETAIL:
        this.detailBean(bean);
        break;
      case GREEN_BEAN_ACTION.REPEAT:
        this.repeatBean(bean);
        break;
      case GREEN_BEAN_ACTION.EDIT:
        this.editBean(bean);
        break;
      case GREEN_BEAN_ACTION.DELETE:
        this.deleteBean(bean);
        break;
      case GREEN_BEAN_ACTION.BEANS_CONSUMED:
        this.beansConsumed(bean);
        break;
      case GREEN_BEAN_ACTION.PHOTO_GALLERY:
        this.viewPhotos(bean);
        break;
      case GREEN_BEAN_ACTION.TRANSFER_ROAST:
        this.transferRoast(bean);
        break;
      default:
        break;
    }
  }

  public async detailBean(_bean: GreenBean) {
    const modal = await this.modalCtrl.create({component: GreenBeanDetailComponent, id:'green-bean-detail', componentProps: {greenBean: _bean}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public async viewPhotos(_bean: GreenBean) {
    await this.uiImage.viewPhotos(_bean);
  }

  public async transferRoast(_bean: GreenBean) {
    const modal = await this.modalCtrl.create({component:BeansAddComponent, id:'bean-add',  componentProps: {greenBean : _bean}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }

  private retriggerScroll() {
    // https://github.com/ionic-team/ionic-framework/issues/18409
    // Workarround
    setTimeout( () => {
      if (typeof(this.archivedScroll) !== 'undefined' && this.finishedBeans.length > 0)
      {
        this.archivedScroll.checkRange(0,this.finishedBeans.length);
      }
      if (typeof(this.openScroll) !== 'undefined' && this.openBeans.length > 0)
      {
        this.openScroll.checkRange(0,this.openBeans.length);
      }
    },75);
  }


  public beansConsumed(_bean: GreenBean) {
    _bean.finished = true;
    this.uiGreenBeanStorage.update(_bean);
    this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
    this.settings.resetFilter();
    this.uiSettingsStorage.saveSettings(this.settings);
    this.loadBeans();
  }

  public async add() {
    const modal = await this.modalCtrl.create({component:GreenBeanAddComponent,id:'green-bean-add'});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }

  public async editBean(_bean: GreenBean) {

    const modal = await this.modalCtrl.create({component:GreenBeanEditComponent, id:'green-bean-edit',  componentProps: {greenBean : _bean}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }


  public deleteBean(_bean: GreenBean): void {
    this.uiAlert.showConfirm('DELETE_BEAN_QUESTION', 'SURE_QUESTION', true)
      .then(() => {
          // Yes
          this.uiAnalytics.trackEvent('GREEN_BEAN', 'DELETE');
          this.__deleteBean(_bean);
          this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
          this.settings.resetFilter();
          this.uiSettingsStorage.saveSettings(this.settings);
        },
        () => {
          // No
        });

  }

  public async repeatBean(_bean: GreenBean) {
    this.uiAnalytics.trackEvent('GREEN_BEAN', 'REPEAT');
    const modal = await this.modalCtrl.create({component: GreenBeanAddComponent, id:'green-bean-add', componentProps: {green_bean_template: _bean}});
    await modal.present();
    await modal.onWillDismiss();
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
      cssClass: 'bottom-modal',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      id:'green-bean-filter',
      componentProps:
        {bean_filter: beanFilter, segment: this.bean_segment}
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData.data.bean_filter !== undefined) {
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
    this.settings.green_bean_filter.OPEN = this.openBeansFilter;
    this.settings.green_bean_filter.ARCHIVED = this.archivedBeansFilter;
    this.uiSettingsStorage.saveSettings(this.settings);
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


  private __deleteBean(_bean: GreenBean): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();

    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].bean === _bean.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiGreenBeanStorage.removeByObject(_bean);
    this.loadBeans();

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
