import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {AlertController, IonVirtualScroll, ModalController, Platform, PopoverController} from '@ionic/angular';
import {UIAlert} from '../../services/uiAlert';
import {UIHelper} from '../../services/uiHelper';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {Brew} from '../../classes/brew/brew';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {BrewAddComponent} from './brew-add/brew-add.component';
import {BrewDetailComponent} from './brew-detail/brew-detail.component';
import {BrewPhotoViewComponent} from './brew-photo-view/brew-photo-view.component';
import {BrewEditComponent} from './brew-edit/brew-edit.component';

import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIMillStorage} from '../../services/uiMillStorage';
import {IPreparation} from '../../interfaces/preparation/iPreparation';
import {IBean} from '../../interfaces/bean/iBean';
import {IMill} from '../../interfaces/mill/iMill';
import {IBrewPageFilter} from '../../interfaces/brew/iBrewPageFilter';
import {TranslateService} from '@ngx-translate/core';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {Bean} from '../../classes/bean/bean';
import {BrewFilterComponent} from './brew-filter/brew-filter.component';
import {Settings} from '../../classes/settings/settings';
import {UIToast} from '../../services/uiToast';
import {BrewCuppingComponent} from './brew-cupping/brew-cupping.component';
import {UIAnalytics} from '../../services/uiAnalytics';

@Component({
  selector: 'brew',
  templateUrl: './brew.page.html',
  styleUrls: ['./brew.page.scss'],
})
export class BrewPage implements OnInit {


  public brews: Array<Brew>;
  public openBrewsView: Array<Brew> = [];
  public archiveBrewsView: Array<Brew> = [];


  public brew_segment: string = 'open';
  public settings: Settings;
  public query: string = '';

  public customSelectSheetOptions: any = {
    cssClass: 'select-break-text'
  };
  @ViewChild('openScroll', {read: IonVirtualScroll, static: false}) public openScroll: IonVirtualScroll;
  @ViewChild('archivedScroll', {read: IonVirtualScroll, static: false}) public archivedScroll: IonVirtualScroll;

  public openBrewsFilter: IBrewPageFilter = {
    mill: [],
    bean: [],
    method_of_preparation: []
  };
  public openBrewFilterText: string = '';
  public archivedBrewFilterText: string = '';

  public archivedBrewsFilter: IBrewPageFilter = {
    mill: [],
    bean: [],
    method_of_preparation: []
  };

  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];
  public finishedBeans: Array<IBean> = [];
  public mills: Array<IMill> = [];

  constructor (private readonly modalCtrl: ModalController,
               private readonly platform: Platform,
               private readonly socialSharing: SocialSharing,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly changeDetectorRef: ChangeDetectorRef,
               private readonly uiAlert: UIAlert,
               public uiHelper: UIHelper,
               public uiBrewHelper: UIBrewHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly popoverCtrl: PopoverController,
               public alertCtrl: AlertController,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiMillStorage: UIMillStorage,
               private translate: TranslateService,
               private readonly uiToast: UIToast,
               private readonly uiAnalytics: UIAnalytics) {
  }


  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBrewsFilter = this.settings.brew_filter.ARCHIVED;
    this.openBrewsFilter = this.settings.brew_filter.OPEN;
    this.loadBrews();


    this.retriggerScroll();
  }

  public segmentChanged() {
    this.retriggerScroll();
  }

  private retriggerScroll() {

    // https://github.com/ionic-team/ionic-framework/issues/18409
    // Workarround
    setTimeout( () => {
      if (typeof(this.archivedScroll) !== 'undefined' && this.archiveBrewsView.length > 0)
      {
        this.archivedScroll.checkRange(0,this.archiveBrewsView.length);
      }
      if (typeof(this.openScroll) !== 'undefined' && this.openBrewsView.length > 0)
      {
        this.openScroll.checkRange(0,this.openBrewsView.length);
      }
    },25);
  }


  public async brewAction(action: BREW_ACTION, brew: Brew): Promise<void> {
    switch (action) {
      case BREW_ACTION.REPEAT:
        this.repeatBrew(brew);
        break;
      case BREW_ACTION.DETAIL:
        this.detailBrew(brew);
        break;
      case BREW_ACTION.EDIT:
        this.editBrew(brew);
        break;
      case BREW_ACTION.DELETE:
        this.deleteBrew(brew);
        break;
      case BREW_ACTION.PHOTO_GALLERY:
        this.viewPhotos(brew);
        break;
      case BREW_ACTION.CUPPING:
        this.cupBrew(brew);
        break;
      case BREW_ACTION.SHOW_MAP_COORDINATES:
        this.showMapCoordinates(brew);
        break;
      case BREW_ACTION.FAST_REPEAT:
        this.fastRepeatBrew(brew);
        break;
      default:
        break;
    }
  }

  public async fastRepeatBrew(brew: Brew) {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      this.uiAnalytics.trackEvent('BREW', 'FAST_REPEAT');
      const repeatBrew = this.uiBrewHelper.repeatBrew(brew);
      this.uiBrewStorage.add(repeatBrew);
      this.uiToast.showInfoToast('TOAST_BREW_REPEATED_SUCCESSFULLY');
      this.loadBrews();
    }
  }

  public async editBrew(_brew: Brew) {

    const modal = await this.modalCtrl.create({component: BrewEditComponent, id:'brew-edit', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }
  public async repeatBrew(_brew: Brew) {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      this.uiAnalytics.trackEvent('BREW', 'REPEAT');
      const modal = await this.modalCtrl.create({component: BrewAddComponent, id: 'brew-add', componentProps: {brew_template: _brew}});
      await modal.present();
      await modal.onWillDismiss();
      this.loadBrews();
    }
  }


  public async add() {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      const modal = await this.modalCtrl.create({component: BrewAddComponent,id:'brew-add'});
      await modal.present();
      await modal.onWillDismiss();
      this.loadBrews();
    }

  }

  public async detailBrew(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewDetailComponent, id:'brew-detail', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async cupBrew(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewCuppingComponent, id:'brew-cup', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async showMapCoordinates(_brew: Brew) {
    this.uiAnalytics.trackEvent('BREW', 'SHOW_MAP');
    this.uiHelper.openExternalWebpage(_brew.getCoordinateMapLink());
  }


  public async viewPhotos(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewPhotoViewComponent, id:'brew-photo', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public deleteBrew(_brew: Brew): void {
    this.uiAlert.showConfirm('DELETE_BREW_QUESTION', 'SURE_QUESTION', true).then(() => {
          // Yes
        this.uiAnalytics.trackEvent('BREW', 'DELETE');
        this.__deleteBrew(_brew);
        this.uiToast.showInfoToast('TOAST_BREW_DELETED_SUCCESSFULLY');
        },
        () => {
          // No
        });
  }



  public loadBrews(): void {
    this.__initializeBrews();
    this.changeDetectorRef.detectChanges();

  }


  private __deleteBrew(_brew: Brew): void {
    this.uiBrewStorage.removeByObject(_brew);
    this.loadBrews();
  }


  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
  }


  public isFilterActive(): boolean {
    if (this.brew_segment === 'open') {
      return (this.openBrewsFilter.bean.length > 0 ||
        this.openBrewsFilter.method_of_preparation.length > 0 ||
        this.openBrewsFilter.mill.length > 0) || this.openBrewFilterText !== '';
    } else {
      return (this.archivedBrewsFilter.bean.length > 0 ||
        this.archivedBrewsFilter.method_of_preparation.length > 0 ||
        this.archivedBrewsFilter.mill.length > 0) || this.archivedBrewFilterText !== '';
    }
  }

  // Treat the instructor name as the unique identifier for the object
  public trackByUUID(index, instructor: Bean) {
    return instructor.config.uuid;
  }

  public async showFilter() {
    let brewFilter: IBrewPageFilter;
    if (this.brew_segment === 'open') {
      brewFilter = {...this.openBrewsFilter};
    } else {
      brewFilter = {...this.archivedBrewsFilter};
    }

    const modal = await this.modalCtrl.create({
      component: BrewFilterComponent,
      cssClass: 'bottom-modal',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      id:'brew-filter',
      componentProps:
        {brew_filter: brewFilter, segment: this.brew_segment}
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData.data.brew_filter !== undefined) {
      if (this.brew_segment === 'open') {
        this.openBrewsFilter = modalData.data.brew_filter;

      } else {
        this.archivedBrewsFilter = modalData.data.brew_filter;
      }
    }
    this.__saveBrewFilter();


    this.loadBrews();
  }

  private __saveBrewFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.brew_filter.OPEN = this.openBrewsFilter;
    settings.brew_filter.ARCHIVED = this.archivedBrewsFilter;
    this.uiSettingsStorage.saveSettings(settings);
  }

  public research() {
    this.__initializeBrewView(this.brew_segment);
  }
  private __initializeBrewView(_type: string): void {
// sort latest to top.
    const brewsCopy: Array<Brew> = [...this.brews];
    let brewsFilters: Array<Brew>;

    const isOpen: boolean = (_type === 'open');
    if (isOpen) {
      brewsFilters = brewsCopy.filter((e) =>
        e.getBean().finished === !isOpen &&
        e.getMill().finished === !isOpen &&
        e.getPreparation().finished === !isOpen
      );
    } else {
      brewsFilters = brewsCopy.filter((e) =>
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
      brewsFilters = brewsFilters.filter((e) => filter.mill.filter((z) => z === e.mill).length > 0);
    }
    if (filter.bean.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.bean.filter((z) => z === e.bean).length > 0);
    }
    if (filter.method_of_preparation.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.method_of_preparation.filter((z) => z === e.method_of_preparation).length > 0);
    }

    let sortedBrews: Array<Brew> = UIBrewHelper.sortBrews(brewsFilters);
    let searchText: string = '';
    if (_type === 'open') {
        searchText = this.openBrewFilterText.toLowerCase();
    } else {
      searchText = this.archivedBrewFilterText.toLowerCase();
    }
    if (searchText) {
      sortedBrews = sortedBrews.filter((e) => e.note.toLowerCase().includes(searchText) || e.getPreparation().name.toLowerCase().includes(searchText) ||
        e.getBean().name.toLowerCase().includes(searchText) ||
        e.getBean().roaster.toLowerCase().includes(searchText));
    }

    if (_type === 'open') {
      this.openBrewsView = sortedBrews;
    } else {
      this.archiveBrewsView = sortedBrews;
    }

  }
  public ngOnInit() {
  }


}
