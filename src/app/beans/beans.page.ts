import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {ActionSheetController, ModalController, Platform} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Bean} from '../../classes/bean/bean';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {BEAN_ACTION} from '../../enums/beans/beanAction';
import {BeanFilterComponent} from './bean-filter/bean-filter.component';
import {IBeanPageFilter} from '../../interfaces/bean/iBeanPageFilter';
import {BEAN_SORT_AFTER} from '../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../enums/beans/beanSortOrder';
import {AgVirtualSrollComponent} from 'ag-virtual-scroll';
import {UIAnalytics} from '../../services/uiAnalytics';
import {TranslateService} from '@ngx-translate/core';
import {QrScannerService} from '../../services/qrScanner/qr-scanner.service';
import {IntentHandlerService} from '../../services/intentHandler/intent-handler.service';
import {UIBeanHelper} from '../../services/uiBeanHelper';

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

  @ViewChild('openScroll', {read: AgVirtualSrollComponent, static: false}) public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', {read: AgVirtualSrollComponent, static: false}) public archivedScroll: AgVirtualSrollComponent;
  @ViewChild('beanContent',{read: ElementRef}) public beanContent: ElementRef;

  public bean_segment: string = 'open';
  public archivedBeansFilter: IBeanPageFilter = {
    sort_after:  BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public archivedBeansFilterText: string = '';
  public openBeansFilterText: string = '';



  constructor(private readonly modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly translate: TranslateService,
              private readonly actionSheetController: ActionSheetController,
              private readonly qrScannerService: QrScannerService,
              private readonly intenthandler: IntentHandlerService,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly platform: Platform) {


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

  public segmentChanged() {
    this.retriggerScroll();
  }
  public async beanAction(action: BEAN_ACTION, bean: Bean): Promise<void> {
    this.loadBeans();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }
  private retriggerScroll() {

    setTimeout(async () =>{

      const el =  this.beanContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height = (el.offsetHeight - scrollComponent.el.offsetTop) + 'px';
    },250);

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
      componentProps:
        {bean_filter: beanFilter, segment: this.bean_segment},
      id: BeanFilterComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData.data && modalData.data.bean_filter !== undefined) {
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

  private async __saveBeanFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.bean_filter.OPEN = this.openBeansFilter;
    settings.bean_filter.ARCHIVED = this.archivedBeansFilter;
    await this.uiSettingsStorage.saveSettings(settings);
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
        e.roaster.toLowerCase().includes(searchText) ||
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
    this.beans = this.uiBeanStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openBeans = [];
    this.finishedBeans = [];
    this.__initializeBeansView('open');
    this.__initializeBeansView('archiv');
  }

  public async add() {
   await this.uiBeanHelper.addBean();
   this.loadBeans();
  }


  public async beanPopover() {
    const actionSheet = await this.actionSheetController.create({
      buttons: [{
        text: this.translate.instant('ADD_BEAN'),
        role: 'add',
        icon: 'add-circle-outline',
        handler: async () => {
         this.add();
        }
      }, {
        text: this.translate.instant('SCAN_BEAN'),
        role: 'scan',
        icon: 'qr-code-outline',
        handler: async () => {
          await this.scan();

        }
      }]
    });
    await actionSheet.present();

    const { role } = await actionSheet.onDidDismiss();
  }

  public async longPressAdd(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.add();
  }

  public async scan() {

    if (this.platform.is('cordova')) {
      await this.qrScannerService.scan().then(async (scannedCode) => {
        await this.intenthandler.handleQRCodeLink(scannedCode);
        this.loadBeans();
      },() => {});
    } else {
      // Test sample for development
      await this.intenthandler.handleQRCodeLink('https://beanconqueror.com/app/roaster/bean.html?id=f3244c61-da13-46d3-af69-f37a44976530');
      this.loadBeans();
    }

    return;

  }

}
