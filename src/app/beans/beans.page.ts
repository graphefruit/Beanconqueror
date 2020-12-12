import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {IonVirtualScroll, ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {Bean} from '../../classes/bean/bean';
import {BeansAddComponent} from './beans-add/beans-add.component';
import {BeansEditComponent} from './beans-edit/beans-edit.component';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {BEAN_ACTION} from '../../enums/beans/beanAction';
import {UIToast} from '../../services/uiToast';
import {BeanPhotoViewComponent} from './bean-photo-view/bean-photo-view.component';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIBeanHelper} from '../../services/uiBeanHelper';
import {BeanFilterComponent} from './bean-filter/bean-filter.component';
import {IBeanPageFilter} from '../../interfaces/bean/iBeanPageFilter';
import {BEAN_SORT_AFTER} from '../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../enums/beans/beanSortOrder';

@Component({
  selector: 'beans',
  templateUrl: './beans.page.html',
  styleUrls: ['./beans.page.scss'],
})
export class BeansPage implements OnInit {

  public beans: Array<Bean> = [];


  public settings: Settings;

  public openBeans: Array<Bean> = [];
  public finishedBeans: Array<Bean> = [];

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
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiBeanHelper: UIBeanHelper) {


  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBeansFilter = this.settings.bean_filter.ARCHIVED;
    this.openBeansFilter = this.settings.bean_filter.OPEN;
    this.loadBeans();
  }


  public loadBeans(): void {

    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
    this.retriggerScroll();
  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(_bean.config.uuid);
    for (const brew of relatedBrews) {
      usedWeightCount += brew.grind_weight;
    }
    return usedWeightCount;
  }

  public segmentChanged() {
    this.retriggerScroll();
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

  public async beanAction(action: BEAN_ACTION, bean: Bean): Promise<void> {
    switch (action) {

      case BEAN_ACTION.REPEAT:
        this.repeatBean(bean);
        break;
      case BEAN_ACTION.EDIT:
        this.editBean(bean);
        break;
      case BEAN_ACTION.DELETE:
        this.deleteBean(bean);
        break;
      case BEAN_ACTION.BEANS_CONSUMED:
        this.beansConsumed(bean);
        break;
      case BEAN_ACTION.PHOTO_GALLERY:
        this.viewPhotos(bean);
        break;
      default:
        break;
    }
  }

  public async viewPhotos(_bean: Bean) {
    const modal = await this.modalCtrl.create({component: BeanPhotoViewComponent, id:'bean-photo', componentProps: {bean: _bean}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public beansConsumed(_bean: Bean) {
    _bean.finished = true;
    this.uiBeanStorage.update(_bean);
    this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
    this.settings.resetFilter();
    this.uiSettingsStorage.saveSettings(this.settings);
    this.loadBeans();
  }

  public async add() {
    const modal = await this.modalCtrl.create({component:BeansAddComponent,id:'bean-add'});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }

  public async editBean(_bean: Bean) {

    const modal = await this.modalCtrl.create({component:BeansEditComponent, id:'bean-edit',  componentProps: {'bean' : _bean}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }


  public deleteBean(_bean: Bean): void {
    this.uiAlert.showConfirm('DELETE_BEAN_QUESTION', 'SURE_QUESTION', true)
        .then(() => {
              // Yes
            this.uiAnalytics.trackEvent('BEAN', 'DELETE');
            this.__deleteBean(_bean);
            this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
            this.settings.resetFilter();
            this.uiSettingsStorage.saveSettings(this.settings);
            },
            () => {
              // No
            });

  }

  public async repeatBean(_bean: Bean) {
    this.uiAnalytics.trackEvent('BEAN', 'REPEAT');
    const modal = await this.modalCtrl.create({component: BeansAddComponent, id:'bean-add', componentProps: {bean_template: _bean}});
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
      component: BeanFilterComponent,
      cssClass: 'bottom-modal',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      id:'bean-filter',
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
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.bean_filter.OPEN = this.openBeansFilter;
    settings.bean_filter.ARCHIVED = this.archivedBeansFilter;
    this.uiSettingsStorage.saveSettings(settings);
  }

  private __initializeBeansView(_type: string) {
// sort latest to top.
    const beansCopy: Array<Bean> = [...this.beans];
    const isOpen: boolean = (_type === 'open');
    let filter: IBeanPageFilter;
    let sortedBeans : Array<Bean>;
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
        case BEAN_SORT_AFTER.ROASTER:
          sortedBeans = sortedBeans.sort( (a,b) => {
            const roasterA = a.roaster.toUpperCase();
            const roasterB = b.roaster.toUpperCase();
            if (roasterA < roasterB) {
              return -1;
            }
            if (roasterA > roasterB) {
              return 1;
            }

            return 0;
            }
          );
          break;
        case BEAN_SORT_AFTER.ROASTING_DATE:
          sortedBeans = sortedBeans.sort( (a,b) => {
              if ( a.roastingDate > b.roastingDate ){
                return -1;
              }
              if ( a.roastingDate < b.roastingDate ){
                return 1;
              }
              return 0;
            }
          );

      }

      switch (filter.sort_order) {
        case BEAN_SORT_ORDER.DESCENDING:
          sortedBeans.reverse();
          break;
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
        e.roaster.toLowerCase().includes(searchText) ||
        e.aromatics.toLowerCase().includes(searchText));
    }
    console.log('Lets go');
   if (isOpen) {
     this.openBeans = sortedBeans;
   } else {
     this.finishedBeans = sortedBeans;
   }
  }


  private __deleteBean(_bean: Bean): void {
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

    this.uiBeanStorage.removeByObject(_bean);
    this.loadBeans();

  }
  public ngOnInit() {
  }

  private __initializeBeans(): void {
    this.beans = this.uiBeanStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.__initializeBeansView('open');
    this.__initializeBeansView('archiv');

  }

}
