import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
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
  Platform,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import _ from 'lodash';
import { Subscription } from 'rxjs';

import { Bean } from '../../classes/bean/bean';
import { Settings } from '../../classes/settings/settings';
import { AiImportPhotoGalleryComponent } from '../../components/ai-import-photo-gallery/ai-import-photo-gallery.component';
import { BeanInformationComponent } from '../../components/bean-information/bean-information.component';
import { HeaderButtonComponent } from '../../components/header/header-button.component';
import { HeaderComponent } from '../../components/header/header.component';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import { BEAN_IMPORT_ACTION } from '../../enums/beans/beanImportAction';
import { BEAN_POPOVER_ADD_ACTION } from '../../enums/beans/beanPopoverAddAction';
import { BEAN_SORT_AFTER } from '../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../enums/beans/beanSortOrder';
import { CLOUD_AI_PROVIDER_ENUM } from '../../enums/settings/cloudAiProvider';
import { BeanGroup } from '../../interfaces/bean/beanGroup';
import { IBeanPageFilter } from '../../interfaces/bean/iBeanPageFilter';
import { IBeanPageSort } from '../../interfaces/bean/iBeanPageSort';
import { AIBeanImportService } from '../../services/aiBeanImport/ai-bean-import.service';
import { CloudAIBeanImportService } from '../../services/aiBeanImport/cloud-ai-bean-import.service';
import { BeanSortFilterHelperService } from '../../services/beanSortFilterHelper/bean-sort-filter-helper.service';
import { IntentHandlerService } from '../../services/intentHandler/intent-handler.service';
import { NfcService } from '../../services/nfcService/nfc-service.service';
import { QrScannerService } from '../../services/qrScanner/qr-scanner.service';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIImage } from '../../services/uiImage';
import { UILog } from '../../services/uiLog';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { BeanImportPopoverComponent } from './bean-import-popover/bean-import-popover.component';
import { BeanPopoverAddComponent } from './bean-popover-add/bean-popover-add.component';
import { BeansAddComponent } from './beans-add/beans-add.component';

@Component({
  selector: 'beans',
  templateUrl: './beans.page.html',
  styleUrls: ['./beans.page.scss'],
  imports: [
    FormsModule,
    NgTemplateOutlet,
    AgVirtualScrollComponent,
    BeanInformationComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    IonIcon,
    IonButton,
  ],
})
export class BeansPage implements OnDestroy {
  private readonly uiLog = inject(UILog);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly qrScannerService = inject(QrScannerService);
  private readonly intenthandler = inject(IntentHandlerService);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly platform = inject(Platform);
  private readonly modalController = inject(ModalController);
  private readonly beanSortFilterHelper = inject(BeanSortFilterHelperService);
  private readonly nfcService = inject(NfcService);
  private readonly uiImage = inject(UIImage);
  private readonly aiBeanImportService = inject(AIBeanImportService);
  private readonly cloudAiBeanImportService = inject(CloudAIBeanImportService);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiFileHelper = inject(UIFileHelper);

  public beans: Bean[] = [];

  public settings: Settings;

  public openBeans: (Bean | BeanGroup)[] = [];
  public finishedBeans: (Bean | BeanGroup)[] = [];
  public frozenBeans: (Bean | BeanGroup)[] = [];
  public finishedBeansLength = 0;
  public openBeansLength = 0;
  public frozenBeansLength = 0;

  public openBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualScrollComponent;
  @ViewChild('frozenScroll', { read: AgVirtualScrollComponent, static: false })
  public frozenScroll: AgVirtualScrollComponent;

  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;

  public bean_segment: 'open' | 'archive' | 'frozen' = 'open';
  public archivedBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };
  public frozenBeansSort: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.UNKOWN,
    sort_order: BEAN_SORT_ORDER.UNKOWN,
  };

  public openBeansCollapsed = false;
  public archivedBeansCollapsed = false;
  public frozenBeansCollapsed = false;

  public archivedBeansFilterText = '';
  public openBeansFilterText = '';
  public frozenBeansFilterText = '';

  public archivedBeansFilter: IBeanPageFilter;
  public openBeansFilter: IBeanPageFilter;
  public frozenBeansFilter: IBeanPageFilter;

  private beanStorageChangeSubscription: Subscription;
  public segmentScrollHeight: string = undefined;

  public uiIsSortActive = false;
  public uiIsFilterActive = false;
  public uiIsCollapseActive = false;
  public uiShallBarBeDisplayed = false;
  public uiIsTextSearchActive = false;
  public uiSearchText = '';

  private savedScrollPositions: {
    open: number;
    archive: number;
    frozen: number;
    openHeights: number[];
    archiveHeights: number[];
    frozenHeights: number[];
  } = {
    open: 0,
    archive: 0,
    frozen: 0,
    openHeights: [],
    archiveHeights: [],
    frozenHeights: [],
  };

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.archivedBeansSort = this.settings.bean_sort.ARCHIVED;
    this.openBeansSort = this.settings.bean_sort.OPEN;
    this.frozenBeansSort = this.settings.bean_sort.FROZEN;

    this.archivedBeansFilter = this.settings.bean_filter.ARCHIVED;
    this.frozenBeansFilter = this.settings.bean_filter.FROZEN;
    this.openBeansFilter = this.settings.bean_filter.OPEN;

    this.openBeansCollapsed = this.settings.bean_collapsed.OPEN;
    this.archivedBeansCollapsed = this.settings.bean_collapsed.ARCHIVED;
    this.frozenBeansCollapsed = this.settings.bean_collapsed.FROZEN;
    this.loadBeans();

    this.beanStorageChangeSubscription = this.uiBeanStorage
      .attachOnEvent()
      .subscribe((val: any) => {
        // Find if this change emitted a bean we can focus
        if (val && val.obj && val.obj.config && val.obj.config.uuid) {
          this.lastInteractedBeanId = val.obj.config.uuid;
        }
        // If an bean is added/deleted/changed we trigger this here, why we do this? Because when we import from the Beanconqueror website an bean, and we're actually on this page, this won't get shown.
        this.loadBeans();
      });
  }

  private setUIParams() {
    this.uiIsSortActive = this.isSortActive();
    this.uiIsFilterActive = this.isFilterActive();
    this.uiIsCollapseActive = this.isCollapseActive();
    this.uiShallBarBeDisplayed = this.shallBarBeDisplayed();
    this.uiIsTextSearchActive = this.isTextSearchActive();
  }

  public async ngOnDestroy() {
    if (this.beanStorageChangeSubscription) {
      this.beanStorageChangeSubscription.unsubscribe();
      this.beanStorageChangeSubscription = undefined;
    }
  }

  public isCollapseActive() {
    let collapsed = false;
    if (this.bean_segment === 'open') {
      collapsed = this.openBeansCollapsed;
    } else if (this.bean_segment === 'archive') {
      collapsed = this.archivedBeansCollapsed;
    } else if (this.bean_segment === 'frozen') {
      collapsed = this.frozenBeansCollapsed;
    }
    return collapsed;
  }

  public toggleCollapseBeans() {
    if (this.bean_segment === 'open') {
      this.openBeansCollapsed = !this.openBeansCollapsed;
    } else if (this.bean_segment === 'archive') {
      this.archivedBeansCollapsed = !this.archivedBeansCollapsed;
    } else if (this.bean_segment === 'frozen') {
      this.frozenBeansCollapsed = !this.frozenBeansCollapsed;
    }
    this.__saveCollapseFilter();

    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
    this.retriggerScroll();
    this.setUIParams();
  }

  private async __saveCollapseFilter() {
    this.settings.bean_collapsed.OPEN = this.openBeansCollapsed;
    this.settings.bean_collapsed.ARCHIVED = this.archivedBeansCollapsed;
    this.settings.bean_collapsed.FROZEN = this.frozenBeansCollapsed;
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public loadBeans(): void {
    this.saveScrollPositions();

    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
    this.retriggerScroll();
    this.setUIParams();
  }

  private saveScrollPositions(): void {
    if (this.openScroll) {
      this.savedScrollPositions.open = this.openScroll.currentScroll;
      const hOpen = (this.openScroll as any).previousItemsHeight;
      if (hOpen && hOpen.length > 0 && hOpen.some((h) => h !== null)) {
        this.savedScrollPositions.openHeights = [...hOpen];
      }
    }
    if (this.archivedScroll) {
      this.savedScrollPositions.archive = this.archivedScroll.currentScroll;
      const hArc = (this.archivedScroll as any).previousItemsHeight;
      if (hArc && hArc.length > 0 && hArc.some((h) => h !== null)) {
        this.savedScrollPositions.archiveHeights = [...hArc];
      }
    }
    if (this.frozenScroll) {
      this.savedScrollPositions.frozen = this.frozenScroll.currentScroll;
      const hFroz = (this.frozenScroll as any).previousItemsHeight;
      if (hFroz && hFroz.length > 0 && hFroz.some((h) => h !== null)) {
        this.savedScrollPositions.frozenHeights = [...hFroz];
      }
    }
  }

  public segmentChanged() {
    this.uiSearchText = this.manageSearchTextScope(this.bean_segment, false);
    this.saveScrollPositions();
    this.retriggerScroll();
    this.setUIParams();
  }

  private lastInteractedBeanId: string = null;

  public async beanAction(event?: any): Promise<void> {
    if (event && event.length > 1) {
      const action = event[0];
      const bean = event[1];
      if (bean && bean.config && bean.config.uuid) {
        this.lastInteractedBeanId = bean.config.uuid;
      }
    }
    this.loadBeans();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }

  public async showSort() {
    const sortSegment = this.manageSortScope(this.bean_segment);
    const newSort = await this.beanSortFilterHelper.showSort(sortSegment);
    if (newSort) {
      if (this.bean_segment === 'open') {
        this.openBeansSort = newSort;
      } else if (this.bean_segment === 'archive') {
        this.archivedBeansSort = newSort;
      } else if (this.bean_segment === 'frozen') {
        this.frozenBeansSort = newSort;
      }

      await this.__saveBeanFilter();

      this.loadBeans();
    }
  }

  public async showFilter() {
    const filterSegment = this.manageFilterScope(this.bean_segment);
    const newFilter = await this.beanSortFilterHelper.showFilter(
      filterSegment,
      this.bean_segment,
    );
    if (newFilter) {
      /**We got the filtersegment above, so we got the reference and overwrite it**/

      if (this.bean_segment === 'open') {
        this.openBeansFilter = newFilter;
      } else if (this.bean_segment === 'archive') {
        this.archivedBeansFilter = newFilter;
      } else if (this.bean_segment === 'frozen') {
        this.frozenBeansFilter = newFilter;
      }
      await this.__saveBeanFilter();

      this.loadBeans();
    }
  }

  public isSortActive(): boolean {
    const sort = this.manageSortScope(this.bean_segment);
    return (
      sort.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
      sort.sort_after !== BEAN_SORT_AFTER.UNKOWN
    );
  }

  public isTextSearchActive() {
    const searchText = this.manageSearchTextScope(this.bean_segment);
    return searchText != '';
  }

  public isFilterActive(): boolean {
    let isFilterActive = false;

    if (this.settings) {
      const checkingFilter: IBeanPageFilter = this.manageFilterScope(
        this.bean_segment,
      );

      isFilterActive = !_.isEqual(
        this.settings?.GET_BEAN_FILTER(),
        checkingFilter,
      );
    }

    return isFilterActive;
  }

  public shallBarBeDisplayed() {
    let shallBarDisplayed = false;

    if (this.bean_segment === 'open') {
      shallBarDisplayed = this.openBeansLength > 0;
    } else if (this.bean_segment === 'archive') {
      shallBarDisplayed = this.finishedBeansLength > 0;
    } else if (this.bean_segment === 'frozen') {
      shallBarDisplayed = this.frozenBeansLength > 0;
    }

    return shallBarDisplayed;
  }

  public research() {
    this.setSearchTextScope(this.bean_segment, this.uiSearchText);
    this.__initializeBeansView(this.bean_segment);
    this.setUIParams();
  }

  public async add() {
    await this.uiBeanHelper.addBean();
    this.loadBeans();
  }

  public async beanPopover() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.POPOVER_ACTIONS,
    );
    const popover = await this.modalController.create({
      component: BeanPopoverAddComponent,
      componentProps: {},
      id: BeanPopoverAddComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.25, 0.5],
      initialBreakpoint: 0.25,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      switch (data.role as BEAN_POPOVER_ADD_ACTION) {
        case BEAN_POPOVER_ADD_ACTION.ADD:
          await this.add();
          break;
        case BEAN_POPOVER_ADD_ACTION.SCAN:
          await this.scanBean();
          break;
      }
    }
  }

  public async scanNFC() {
    if (this.platform.is('capacitor')) {
      try {
        this.uiAnalytics.trackEvent(
          BEAN_TRACKING.TITLE,
          BEAN_TRACKING.ACTIONS.NFC_SCAN,
        );
        await this.nfcService.readNFCTag();
      } catch (error) {
        // Just log and do nothing else, it's likely the user just cancelled
        this.uiLog.warn('NFC scan error:', error);
      }
    } else {
    }
    this.loadBeans();
  }
  public async scanBean() {
    if (this.platform.is('capacitor')) {
      try {
        const hasPermission = await this.uiImage.checkCameraPermission();
        if (hasPermission) {
          const scannedCode = await this.qrScannerService.scan();
          await this.intenthandler.handleQRCodeLink(scannedCode);
        }
      } catch (error) {
        // Just log and do nothing else, it's likely the user just cancelled
        this.uiLog.warn('Bean QR code scan error:', error);
      }
    } else {
      // Test sample for development
      // await this.intenthandler.handleQRCodeLink('https://beanconqueror.com/?qr=e7ada0a6');
    }
    this.loadBeans();
  }

  public async longPressAdd(event) {
    if (event) {
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    await this.add();
  }

  public async openImportMenu() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.IMPORT_MENU_OPENED,
    );
    const popover = await this.modalController.create({
      component: BeanImportPopoverComponent,
      componentProps: {},
      id: BeanImportPopoverComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.45],
      initialBreakpoint: 0.45,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      switch (data.role as BEAN_IMPORT_ACTION) {
        case BEAN_IMPORT_ACTION.QR_SCAN:
          await this.scanBean();
          break;
        case BEAN_IMPORT_ACTION.NFC_SCAN:
          await this.scanNFC();
          break;
        case BEAN_IMPORT_ACTION.AI_IMPORT:
          await this.aiImportBean();
          break;
        case BEAN_IMPORT_ACTION.AI_IMPORT_MULTI:
          await this.aiImportBeanMulti();
          break;
      }
    }
  }

  public async aiImportBean() {
    if (!this.platform.is('capacitor')) {
      return;
    }

    if (this.isCloudProvider()) {
      await this.aiImportBeanCloud();
    } else {
      await this.aiImportBeanLocal();
    }

    this.loadBeans();
  }

  private async aiImportBeanLocal() {
    try {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_START,
      );

      const readiness = await this.aiBeanImportService.checkReadiness();
      if (!readiness.ready) {
        this.uiAnalytics.trackEvent(
          BEAN_TRACKING.TITLE,
          BEAN_TRACKING.ACTIONS.AI_IMPORT_NOT_AVAILABLE,
        );
        await this.uiAlert.showMessage(
          readiness.message,
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );
        return;
      }

      const bean = await this.aiBeanImportService.captureAndExtractBeanData();

      if (bean !== null) {
        this.uiAnalytics.trackEvent(
          BEAN_TRACKING.TITLE,
          BEAN_TRACKING.ACTIONS.AI_IMPORT_SUCCESS,
        );

        const modal = await this.modalController.create({
          component: BeansAddComponent,
          id: BeansAddComponent.COMPONENT_ID,
          componentProps: { bean_template: bean },
        });
        await modal.present();
        await modal.onWillDismiss();
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error';
      this.uiLog.warn('AI bean import error: ' + errorMessage);
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_FAILED,
      );
      await this.uiAlert.showMessage(
        errorMessage,
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  private async aiImportBeanCloud() {
    try {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_CLOUD_START,
      );

      const readiness = this.cloudAiBeanImportService.checkReadiness();
      if (!readiness.ready) {
        this.uiAnalytics.trackEvent(
          BEAN_TRACKING.TITLE,
          BEAN_TRACKING.ACTIONS.AI_IMPORT_NOT_AVAILABLE,
        );
        await this.uiAlert.showMessage(
          readiness.message,
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );
        return;
      }

      const bean =
        await this.cloudAiBeanImportService.captureAndExtractBeanData();

      if (bean !== null) {
        this.uiAnalytics.trackEvent(
          BEAN_TRACKING.TITLE,
          BEAN_TRACKING.ACTIONS.AI_IMPORT_CLOUD_SUCCESS,
        );

        const modal = await this.modalController.create({
          component: BeansAddComponent,
          id: BeansAddComponent.COMPONENT_ID,
          componentProps: { bean_template: bean },
        });
        await modal.present();
        await modal.onWillDismiss();
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error';
      this.uiLog.warn('Cloud AI bean import error: ' + errorMessage);
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_CLOUD_FAILED,
      );
      await this.uiAlert.showMessage(
        errorMessage,
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  public async aiImportBeanMulti() {
    if (!this.platform.is('capacitor')) {
      return;
    }

    if (this.isCloudProvider()) {
      await this.aiImportBeanMultiCloud();
    } else {
      await this.aiImportBeanMultiLocal();
    }

    this.loadBeans();
  }

  private async aiImportBeanMultiLocal() {
    try {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_START,
      );

      const readiness = await this.aiBeanImportService.checkReadiness();
      if (!readiness.ready) {
        this.uiAnalytics.trackEvent(
          BEAN_TRACKING.TITLE,
          BEAN_TRACKING.ACTIONS.AI_IMPORT_NOT_AVAILABLE,
        );
        await this.uiAlert.showMessage(
          readiness.message,
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );
        return;
      }

      const modal = await this.modalController.create({
        component: AiImportPhotoGalleryComponent,
        id: AiImportPhotoGalleryComponent.COMPONENT_ID,
      });
      await modal.present();

      const { data, role } = await modal.onDidDismiss();

      if (
        role === 'cancel' ||
        !data ||
        !data.photoPaths ||
        data.photoPaths.length === 0
      ) {
        return;
      }

      await this.uiAlert.showLoadingSpinner('AI_IMPORT_STEP_EXTRACTING', true);
      try {
        const result = await this.aiBeanImportService.extractBeanDataFromImages(
          data.photoPaths,
          data.attachPhotos,
        );
        await this.uiAlert.hideLoadingSpinner();

        if (result && result.bean) {
          this.uiAnalytics.trackEvent(
            BEAN_TRACKING.TITLE,
            BEAN_TRACKING.ACTIONS.AI_IMPORT_SUCCESS,
          );

          if (result.attachmentPaths) {
            result.bean.attachments = result.attachmentPaths;
          }

          const addModal = await this.modalController.create({
            component: BeansAddComponent,
            id: BeansAddComponent.COMPONENT_ID,
            componentProps: { bean_template: result.bean },
          });
          await addModal.present();
          await addModal.onWillDismiss();
        }
      } catch (error: any) {
        await this.uiAlert.hideLoadingSpinner();

        if (!data.attachPhotos) {
          for (const path of data.photoPaths) {
            try {
              await this.uiFileHelper.deleteInternalFile(path);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }

        throw error;
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error';
      this.uiLog.warn('AI bean import (multi) error: ' + errorMessage);
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_FAILED,
      );
      await this.uiAlert.showMessage(
        errorMessage,
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  private async aiImportBeanMultiCloud() {
    try {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_CLOUD_START,
      );

      const readiness = this.cloudAiBeanImportService.checkReadiness();
      if (!readiness.ready) {
        this.uiAnalytics.trackEvent(
          BEAN_TRACKING.TITLE,
          BEAN_TRACKING.ACTIONS.AI_IMPORT_NOT_AVAILABLE,
        );
        await this.uiAlert.showMessage(
          readiness.message,
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );
        return;
      }

      const modal = await this.modalController.create({
        component: AiImportPhotoGalleryComponent,
        id: AiImportPhotoGalleryComponent.COMPONENT_ID,
      });
      await modal.present();

      const { data, role } = await modal.onDidDismiss();

      if (
        role === 'cancel' ||
        !data ||
        !data.photoPaths ||
        data.photoPaths.length === 0
      ) {
        return;
      }

      await this.uiAlert.showLoadingSpinner('AI_IMPORT_STEP_EXTRACTING', true);
      try {
        const result =
          await this.cloudAiBeanImportService.extractBeanDataFromImages(
            data.photoPaths,
            data.attachPhotos,
          );
        await this.uiAlert.hideLoadingSpinner();

        if (result && result.bean) {
          this.uiAnalytics.trackEvent(
            BEAN_TRACKING.TITLE,
            BEAN_TRACKING.ACTIONS.AI_IMPORT_CLOUD_SUCCESS,
          );

          if (result.attachmentPaths) {
            result.bean.attachments = result.attachmentPaths;
          }

          const addModal = await this.modalController.create({
            component: BeansAddComponent,
            id: BeansAddComponent.COMPONENT_ID,
            componentProps: { bean_template: result.bean },
          });
          await addModal.present();
          await addModal.onWillDismiss();
        }
      } catch (error: any) {
        await this.uiAlert.hideLoadingSpinner();

        if (!data.attachPhotos) {
          for (const path of data.photoPaths) {
            try {
              await this.uiFileHelper.deleteInternalFile(path);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }

        throw error;
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error';
      this.uiLog.warn('Cloud AI bean import (multi) error: ' + errorMessage);
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.AI_IMPORT_CLOUD_FAILED,
      );
      await this.uiAlert.showMessage(
        errorMessage,
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  private isCloudProvider(): boolean {
    const settings = this.uiSettingsStorage.getSettings();
    return (
      settings.cloud_ai_provider !== CLOUD_AI_PROVIDER_ENUM.APPLE_INTELLIGENCE
    );
  }

  private retriggerScrollTimeout: any;

  private retriggerScroll() {
    if (this.retriggerScrollTimeout) {
      clearTimeout(this.retriggerScrollTimeout);
    }
    this.retriggerScrollTimeout = setTimeout(() => {
      const el = this.beanContent.nativeElement;

      if (!el || el.offsetHeight === 0) {
        return; // Page is hidden, avoid clearing state
      }

      let scrollComponent: AgVirtualScrollComponent;
      if (this.bean_segment === 'open') {
        scrollComponent = this.openScroll;
        if (this.savedScrollPositions.openHeights?.length) {
          (scrollComponent as any).previousItemsHeight = [
            ...this.savedScrollPositions.openHeights,
          ];
        }
      } else if (this.bean_segment === 'archive') {
        scrollComponent = this.archivedScroll;
        if (this.savedScrollPositions.archiveHeights?.length) {
          (scrollComponent as any).previousItemsHeight = [
            ...this.savedScrollPositions.archiveHeights,
          ];
        }
      } else if (this.bean_segment === 'frozen') {
        scrollComponent = this.frozenScroll;
        if (this.savedScrollPositions.frozenHeights?.length) {
          (scrollComponent as any).previousItemsHeight = [
            ...this.savedScrollPositions.frozenHeights,
          ];
        }
      }

      if (!scrollComponent) {
        return;
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

      let targetScrollTop = -1;
      let snapToDomId: string = null;

      if (this.lastInteractedBeanId) {
        let index = -1;
        const viewArray =
          this.bean_segment === 'open'
            ? this.openBeans
            : this.bean_segment === 'archive'
              ? this.finishedBeans
              : this.frozenBeans;

        index = viewArray.findIndex((item) => {
          if (item['beans']) {
            return item['beans'].some(
              (b) => b.config.uuid === this.lastInteractedBeanId,
            );
          } else {
            return item['config']?.uuid === this.lastInteractedBeanId;
          }
        });

        if (index > -1) {
          const item = viewArray[index];
          if (item['beans']) {
            snapToDomId = 'bean-group-' + item['frozenGroupId'];
          } else {
            snapToDomId = 'bean-' + item['config'].uuid;
          }

          const rowHeight = this.uiIsCollapseActive ? 60 : 210;
          const heights = (scrollComponent as any).previousItemsHeight;

          let exactOffset = 0;
          if (heights && heights.length > 0) {
            for (let i = 0; i < index; i++) {
              exactOffset += heights[i] ? heights[i] : rowHeight;
            }
          } else {
            exactOffset = index * rowHeight;
          }

          const viewportTop = this.savedScrollPositions[this.bean_segment];
          const viewportBottom = viewportTop + el.offsetHeight;

          // Do not aggressively force an element to the uppermost viewport bounds if it is reasonably contained on-screen!
          if (
            exactOffset >= viewportTop &&
            exactOffset < viewportBottom - rowHeight
          ) {
            targetScrollTop = viewportTop;
          } else {
            targetScrollTop = exactOffset;
          }
        }
        this.lastInteractedBeanId = null;
      }

      if (
        targetScrollTop === -1 &&
        this.savedScrollPositions[this.bean_segment] > 0
      ) {
        targetScrollTop = this.savedScrollPositions[this.bean_segment];
      }

      if (targetScrollTop >= 0) {
        const contentHeightEl = scrollComponent.el.querySelector(
          '.content-height',
        ) as HTMLElement;
        if (contentHeightEl) {
          const h = (scrollComponent as any).previousItemsHeight;
          const rH = this.uiIsCollapseActive ? 60 : 210;
          let cHeight = 0;
          if (h && h.length > 0) {
            cHeight = h.reduce((sum, val) => sum + (val ? val : rH), 0);
          } else {
            cHeight =
              ((scrollComponent as any).originalItems?.length || 0) * rH;
          }
          contentHeightEl.style.height = cHeight + 'px';
        }
        scrollComponent.el.scrollTop = targetScrollTop;
      }

      setTimeout(() => {
        const elScroll = scrollComponent.el;
        elScroll.dispatchEvent(new Event('scroll'));

        // Target the absolute DOM element coordinates
        if (snapToDomId) {
          setTimeout(() => {
            const domNode = document.getElementById(snapToDomId);
            if (domNode) {
              domNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 50);
        }
      }, 15);
    }, 250);
  }

  private async __saveBeanFilter() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.bean_sort.OPEN = this.openBeansSort;
    settings.bean_sort.ARCHIVED = this.archivedBeansSort;
    settings.bean_sort.FROZEN = this.frozenBeansSort;

    settings.bean_filter.OPEN = this.openBeansFilter;
    settings.bean_filter.ARCHIVED = this.archivedBeansFilter;
    settings.bean_filter.FROZEN = this.frozenBeansFilter;
    await this.uiSettingsStorage.saveSettings(settings);
  }

  private __initializeBeans(): void {
    this.beans = this.uiBeanStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.openBeansLength = this.beans.reduce(
      (n, e) => (!e.finished && e.isFrozen() === false ? n + 1 : n),
      0,
    );
    this.finishedBeansLength = this.beans.reduce(
      (n, e) => (e.finished ? n + 1 : n),
      0,
    );
    this.frozenBeansLength = this.beans.reduce(
      (n, e) => (!e.finished && e.isFrozen() === true ? n + 1 : n),
      0,
    );

    this.openBeans = [];
    this.finishedBeans = [];
    this.frozenBeans = [];
    this.__initializeBeansView('open');
    this.__initializeBeansView('archive');
    this.__initializeBeansView('frozen');
  }

  private __initializeBeansView(_type: string) {
    const searchText = this.manageSearchTextScope(_type);
    const sort = this.manageSortScope(_type);
    const filters = this.manageFilterScope(_type);

    const filteredBeans = this.beanSortFilterHelper.initializeBeansView(
      _type,
      this.beans,
      searchText,
      sort,
      filters,
    );

    const groupedBeans: (Bean | BeanGroup)[] = [];
    const processedUuids = new Set<string>();

    for (const bean of filteredBeans) {
      if (processedUuids.has(bean.config.uuid)) {
        continue;
      }

      if (bean.frozenGroupId) {
        // Find all beans with this frozenGroupId in the filtered list
        // We only look in the filtered list to respect current filters
        const groupMembers = filteredBeans.filter(
          (b) => b.frozenGroupId === bean.frozenGroupId,
        );

        if (groupMembers.length > 1) {
          groupedBeans.push({
            frozenGroupId: bean.frozenGroupId,
            beans: groupMembers,
            expanded: false,
          });
          groupMembers.forEach((b) => processedUuids.add(b.config.uuid));
        } else {
          groupedBeans.push(bean);
          processedUuids.add(bean.config.uuid);
        }
      } else {
        groupedBeans.push(bean);
        processedUuids.add(bean.config.uuid);
      }
    }

    if (_type === 'open') {
      this.openBeans = groupedBeans;
    } else if (_type === 'archive') {
      this.finishedBeans = groupedBeans;
    } else if (_type === 'frozen') {
      this.frozenBeans = groupedBeans;
    }
    this.retriggerScroll();
  }

  private manageFilterScope(_type: string): IBeanPageFilter {
    if (_type === 'open') {
      return this.openBeansFilter;
    } else if (_type === 'archive') {
      return this.archivedBeansFilter;
    } else if (_type === 'frozen') {
      return this.frozenBeansFilter;
    }
  }

  private manageSortScope(_type: string): IBeanPageSort {
    if (_type === 'open') {
      return this.openBeansSort;
    } else if (_type === 'archive') {
      return this.archivedBeansSort;
    } else if (_type === 'frozen') {
      return this.frozenBeansSort;
    }
  }

  private manageSearchTextScope(_type: string, _toLowerCase = true) {
    let searchText = '';
    if (_type === 'open') {
      searchText = this.openBeansFilterText;
    } else if (_type === 'archive') {
      searchText = this.archivedBeansFilterText;
    } else if (_type === 'frozen') {
      searchText = this.frozenBeansFilterText;
    }
    if (_toLowerCase) {
      searchText = searchText.toLowerCase();
    }
    return searchText;
  }

  private setSearchTextScope(_type: string, _text: string) {
    if (_type === 'open') {
      this.openBeansFilterText = _text;
    } else if (_type === 'archive') {
      this.archivedBeansFilterText = _text;
    } else if (_type === 'frozen') {
      this.frozenBeansFilterText = _text;
    }
  }
}

export default BeansPage;
