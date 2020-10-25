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
               private readonly uiToast: UIToast) {
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

      const repeatBrew: Brew = new Brew();
      const brewBean: IBean = this.uiBeanStorage.getByUUID(brew.bean);
      if (!brewBean.finished) {
        repeatBrew.bean = brewBean.config.uuid;
      }
      repeatBrew.grind_size = brew.grind_size;

      repeatBrew.grind_weight = brew.grind_weight;

      const brewPreparation: IPreparation = this.uiPreparationStorage.getByUUID(brew.method_of_preparation);
      if (!brewPreparation.finished) {
        repeatBrew.method_of_preparation = brewPreparation.config.uuid;
      }

      const brewMill: IMill = this.uiMillStorage.getByUUID(brew.mill);
      if (!brewMill.finished) {
        repeatBrew.mill = brewMill.config.uuid;
      }
      repeatBrew.mill_timer = brew.mill_timer;
      repeatBrew.mill_speed = brew.mill_speed;
      repeatBrew.pressure_profile = brew.pressure_profile;
      repeatBrew.brew_temperature = brew.brew_temperature;
      repeatBrew.brew_temperature_time = brew.brew_temperature_time;
      repeatBrew.brew_time = brew.brew_time;
      repeatBrew.brew_quantity = brew.brew_quantity;
      repeatBrew.brew_quantity_type = brew.brew_quantity_type;
      repeatBrew.coffee_type = brew.coffee_type;
      repeatBrew.coffee_concentration = brew.coffee_concentration;
      repeatBrew.coffee_first_drip_time = brew.coffee_first_drip_time;
      repeatBrew.coffee_blooming_time = brew.coffee_blooming_time;
      repeatBrew.rating = brew.rating;
      repeatBrew.note = brew.note;
      repeatBrew.coordinates = brew.coordinates;

      this.uiBrewStorage.add(repeatBrew);

    this.loadBrews();
  }

  public async editBrew(_brew: Brew) {

    const modal = await this.modalCtrl.create({component: BrewEditComponent, id:'brew-edit', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }
  public async repeatBrew(_brew: Brew) {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
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

  private __sortBrews(_sortingBrews: Array<Brew>): Array<Brew> {
    const sortedBrews: Array<Brew> = _sortingBrews.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return -1;
      }

      return 0;
    });
    return sortedBrews;
  }

  public isFilterActive(): boolean {
    if (this.brew_segment === 'open') {
      return (this.openBrewsFilter.bean.length > 0 ||
        this.openBrewsFilter.method_of_preparation.length > 0 ||
        this.openBrewsFilter.mill.length > 0);
    } else {
      return (this.archivedBrewsFilter.bean.length > 0 ||
        this.archivedBrewsFilter.method_of_preparation.length > 0 ||
        this.archivedBrewsFilter.mill.length > 0);
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

    if (this.settings.mill === true && filter.mill.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.mill.filter((z) => z === e.mill).length > 0);
    }
    if (this.settings.bean_type === true && filter.bean.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.bean.filter((z) => z === e.bean).length > 0);
    }
    if (this.settings.method_of_preparation === true && filter.method_of_preparation.length > 0) {
      brewsFilters = brewsFilters.filter((e) => filter.method_of_preparation.filter((z) => z === e.method_of_preparation).length > 0);
    }

    const sortedBrews: Array<Brew> = this.__sortBrews(brewsFilters);
    if (_type === 'open') {
      this.openBrewsView = sortedBrews;
    } else {
      this.archiveBrewsView = sortedBrews;
    }

  }
  public ngOnInit() {
  }


}
