import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Signal,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
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
  Platform,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import _ from 'lodash';

import { Bean } from '../../classes/bean/bean';
import { errorSummary } from '../../classes/log/logSummary';
import { Settings } from '../../classes/settings/settings';
import {
  ActionsPopoverComponent,
  popoverAction,
  PopoverAction,
} from '../../components/actions-popover/actions-popover.component';
import { AiImportPhotoGalleryComponent } from '../../components/ai-import-photo-gallery/ai-import-photo-gallery.component';
import {
  BeanActionEvent,
  BeanInformationComponent,
} from '../../components/bean-information/bean-information.component';
import { HeaderButtonComponent } from '../../components/header/header-button.component';
import { HeaderComponent } from '../../components/header/header.component';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import { BEAN_IMPORT_ACTION } from '../../enums/beans/beanImportAction';
import { BEAN_SORT_AFTER } from '../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../enums/beans/beanSortOrder';
import { AI_PROVIDER_ENUM } from '../../enums/settings/aiProvider';
import { BeanGroup } from '../../interfaces/bean/beanGroup';
import { IBean } from '../../interfaces/bean/iBean';
import { IBeanPageFilter } from '../../interfaces/bean/iBeanPageFilter';
import { IBeanPageSort } from '../../interfaces/bean/iBeanPageSort';
import { AppleIntelligenceAIBeanImportService } from '../../services/aiBeanImport/apple-intelligence-ai-bean-import.service';
import { CloudAIBeanImportService } from '../../services/aiBeanImport/cloud-ai-bean-import.service';
import { BeanSortFilterHelperService } from '../../services/beanSortFilterHelper/bean-sort-filter-helper.service';
import { IntentHandlerService } from '../../services/intentHandler/intent-handler.service';
import { NfcService } from '../../services/nfcService/nfc-service.service';
import { QrScannerService } from '../../services/qrScanner/qr-scanner.service';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIImage } from '../../services/uiImage';
import { UILog } from '../../services/uiLog';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { BeanStore } from '../../stores/beans/bean.store';
import { DeepReadonly } from '../../stores/core/read-only';
import { BeansAddComponent } from './beans-add/beans-add.component';

type BeanSegment = 'open' | 'archive' | 'frozen';

function perSegment<T>(create: () => T): Record<BeanSegment, T> {
  return { open: create(), archive: create(), frozen: create() };
}

/**
 * A `Bean` over a store entry, only to be read: its nested values are those of
 * the entry and are not frozen in production, so a change would alter the
 * store. The sort helper copies the beans before the cards get them.
 */
function readOnlyBean(entry: DeepReadonly<IBean>): Bean {
  const bean = new Bean();
  bean.initializeByObject(entry as IBean);
  return bean;
}

function segmentOf(bean: Bean): BeanSegment {
  if (bean.finished) {
    return 'archive';
  }
  return bean.isFrozen() ? 'frozen' : 'open';
}

/** One entry per frozen group that has more than one bean in `beans`. */
function groupFrozenPortions(beans: Bean[]): (Bean | BeanGroup)[] {
  const grouped: (Bean | BeanGroup)[] = [];
  const processedUuids = new Set<string>();

  for (const bean of beans) {
    if (processedUuids.has(bean.config.uuid)) {
      continue;
    }
    // Only the beans in the list count, so that filters are respected.
    const groupMembers = bean.frozenGroupId
      ? beans.filter((b) => b.frozenGroupId === bean.frozenGroupId)
      : [bean];

    if (groupMembers.length > 1) {
      grouped.push({
        frozenGroupId: bean.frozenGroupId,
        beans: groupMembers,
        expanded: false,
      });
      groupMembers.forEach((b) => processedUuids.add(b.config.uuid));
    } else {
      grouped.push(bean);
      processedUuids.add(bean.config.uuid);
    }
  }
  return grouped;
}

@Component({
  selector: 'beans',
  templateUrl: './beans.page.html',
  styleUrls: ['./beans.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    AgVirtualScrollComponent,
    BeanInformationComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    IonIcon,
    IonButton,
    IonFab,
    IonFabButton,
  ],
})
export class BeansPage {
  private readonly uiLog = inject(UILog);
  private readonly beanStore = inject(BeanStore);
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
  private readonly appleIntelligenceImportService = inject(
    AppleIntelligenceAIBeanImportService,
  );
  private readonly cloudAiBeanImportService = inject(CloudAIBeanImportService);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiFileHelper = inject(UIFileHelper);

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

  public readonly segment = signal<BeanSegment>('open');
  public readonly showFrozen = signal(false);
  public readonly showArchive = signal(false);
  /** The text in the search field, of the segment shown. */
  public readonly uiSearchText = signal('');

  private readonly searchText = perSegment(() => signal(''));
  private readonly sort = perSegment(() =>
    signal<IBeanPageSort>({
      sort_after: BEAN_SORT_AFTER.UNKOWN,
      sort_order: BEAN_SORT_ORDER.UNKOWN,
    }),
  );
  /** Undefined until the page is entered for the first time. */
  private readonly filter = perSegment(() =>
    signal<IBeanPageFilter | undefined>(undefined),
  );
  private readonly collapsed = perSegment(() => signal(false));

  private settings: Settings;

  /**
   * Counts the requests to build the lists anew without a change of the
   * beans: what a card shows also depends on brews and settings, which are
   * no signals yet, and a cancelled form leaves its changes on the card's
   * copy until the lists are built again.
   */
  private readonly reloads = signal(0);

  /** All beans by name, for the sort helper and the counts. */
  private readonly beans = computed(() => {
    this.reloads();
    return this.beanStore
      .entries()
      .map(readOnlyBean)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  public readonly beanCount = computed(() => {
    const count: Record<BeanSegment, number> = {
      open: 0,
      archive: 0,
      frozen: 0,
    };
    for (const bean of this.beans()) {
      count[segmentOf(bean)]++;
    }
    return count;
  });

  /** The entries of each list after search, filter and sort. */
  public readonly rows: Record<BeanSegment, Signal<(Bean | BeanGroup)[]>> = {
    open: this.rowsOf('open'),
    archive: this.rowsOf('archive'),
    frozen: this.rowsOf('frozen'),
  };

  /** The entries the virtual scroll of each list renders. */
  public readonly renderedRows = perSegment(() =>
    signal<(Bean | BeanGroup)[]>([]),
  );

  public readonly isCollapseActive = computed(() =>
    this.collapsed[this.segment()](),
  );

  public readonly isSortActive = computed(() => {
    const sort = this.sort[this.segment()]();
    return (
      sort.sort_order !== BEAN_SORT_ORDER.UNKOWN &&
      sort.sort_after !== BEAN_SORT_AFTER.UNKOWN
    );
  });

  public readonly isFilterActive = computed(() => {
    // The default filter depends on a setting.
    this.reloads();
    const filter = this.filter[this.segment()]();
    return (
      filter !== undefined &&
      !_.isEqual(this.settings.GET_BEAN_FILTER(), filter)
    );
  });

  public readonly isTextSearchActive = computed(
    () => this.searchText[this.segment()]() !== '',
  );

  /** Whether the search field and the buttons next to it are shown. */
  public readonly showToolbar = computed(() => {
    const segment = this.segment();
    return (
      this.rows[segment]().length > 0 ||
      this.beanCount()[segment] > 0 ||
      this.isTextSearchActive() ||
      this.isFilterActive() ||
      this.isSortActive()
    );
  });

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

  private forceScrollToTop = false;

  private lastInteractedBeanId: string = null;

  public constructor() {
    addIcons({ add });
    // Whoever changed a bean: the scroll positions have to be saved before
    // the lists get their new entries.
    this.beanStore.changes
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadBeans());
  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.sort.archive.set(this.settings.bean_sort.ARCHIVED);
    this.sort.open.set(this.settings.bean_sort.OPEN);
    this.sort.frozen.set(this.settings.bean_sort.FROZEN);

    this.filter.archive.set(this.settings.bean_filter.ARCHIVED);
    this.filter.frozen.set(this.settings.bean_filter.FROZEN);
    this.filter.open.set(this.settings.bean_filter.OPEN);

    this.collapsed.open.set(this.settings.bean_collapsed.OPEN);
    this.collapsed.archive.set(this.settings.bean_collapsed.ARCHIVED);
    this.collapsed.frozen.set(this.settings.bean_collapsed.FROZEN);

    this.showFrozen.set(this.settings.freeze_coffee_beans);
    this.showArchive.set(this.settings.show_archived_beans);
    this.loadBeans();
  }

  private rowsOf(segment: BeanSegment): Signal<(Bean | BeanGroup)[]> {
    return computed(() => {
      const filter = this.filter[segment]();
      if (filter === undefined) {
        return [];
      }
      return groupFrozenPortions(
        this.beanSortFilterHelper.initializeBeansView(
          segment,
          this.beans(),
          this.searchText[segment]().toLowerCase(),
          this.sort[segment](),
          filter,
        ),
      );
    });
  }

  public toggleCollapseBeans() {
    const collapsed = this.collapsed[this.segment()];
    collapsed.update((value) => !value);
    this.__saveCollapseFilter();

    this.reloads.update((count) => count + 1);
    this.retriggerScroll();
  }

  private async __saveCollapseFilter() {
    this.settings.bean_collapsed.OPEN = this.collapsed.open();
    this.settings.bean_collapsed.ARCHIVED = this.collapsed.archive();
    this.settings.bean_collapsed.FROZEN = this.collapsed.frozen();
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public loadBeans(resetScroll: boolean = false): void {
    if (resetScroll) {
      this.resetScrollPosition();
    } else {
      this.saveScrollPositions();
    }

    this.reloads.update((count) => count + 1);
    this.retriggerScroll();
  }

  private resetScrollPosition(): void {
    this.forceScrollToTop = true;
    const segment = this.segment();
    this.savedScrollPositions[segment] = 0;
    this.savedScrollPositions[`${segment}Heights`] = [];
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
    this.uiSearchText.set(this.searchText[this.segment()]());
    this.saveScrollPositions();
    this.retriggerScroll();
  }

  public async beanAction(event?: BeanActionEvent): Promise<void> {
    if (event && event.length > 1) {
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
    const segment = this.segment();
    const newSort = await this.beanSortFilterHelper.showSort(
      this.sort[segment](),
    );
    if (newSort) {
      this.sort[segment].set(newSort);

      await this.__saveBeanFilter();

      this.loadBeans(true);
    }
  }

  public async showFilter() {
    const segment = this.segment();
    const newFilter = await this.beanSortFilterHelper.showFilter(
      this.filter[segment](),
      segment,
    );
    if (newFilter) {
      this.filter[segment].set(newFilter);
      await this.__saveBeanFilter();

      this.loadBeans(true);
    }
  }

  public research() {
    this.searchText[this.segment()].set(this.uiSearchText());
    this.resetScrollPosition();
    this.retriggerScroll();
  }

  public async add() {
    await this.uiBeanHelper.addBean();
    this.loadBeans();
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

  public async openImportMenu() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.IMPORT_MENU_OPENED,
    );
    const role = await ActionsPopoverComponent.pick(this.modalController, {
      id: 'bean-import-popover',
      items: this.buildImportActions(),
      breakpoints: [0, 0.45],
      initialBreakpoint: 0.45,
    });
    if (role !== undefined) {
      switch (role as BEAN_IMPORT_ACTION) {
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

  private buildImportActions(): PopoverAction[] {
    const isAiImportAvailable = this.isAiImportAvailable();

    return [
      popoverAction({
        role: BEAN_IMPORT_ACTION.QR_SCAN,
        translationKey: 'SCAN_BEAN_QR',
        icon: 'qr-code-outline',
      }),
      popoverAction({
        role: BEAN_IMPORT_ACTION.NFC_SCAN,
        translationKey: 'SCAN_BEAN_NFC',
        icon: 'beanconqueror-nfc-scan',
      }),
      popoverAction({
        role: BEAN_IMPORT_ACTION.AI_IMPORT,
        translationKey: 'AI_BEAN_IMPORT',
        icon: 'camera-outline',
        visible: isAiImportAvailable,
      }),
      popoverAction({
        role: BEAN_IMPORT_ACTION.AI_IMPORT_MULTI,
        translationKey: 'AI_BEAN_IMPORT_MULTI',
        subtitleTranslationKey: 'AI_BEAN_IMPORT_MULTI_HINT',
        icon: 'images-outline',
        visible: isAiImportAvailable,
      }),
    ];
  }

  private isAiImportAvailable(): boolean {
    if (!this.platform.is('capacitor')) {
      return false;
    }

    const settings = this.uiSettingsStorage.getSettings();
    if (settings.ai_provider === AI_PROVIDER_ENUM.NO_PROVIDER) {
      return false;
    }

    if (settings.ai_provider === AI_PROVIDER_ENUM.APPLE_INTELLIGENCE) {
      return this.platform.is('ios');
    }

    return !!settings.cloud_ai_api_key && !!settings.cloud_ai_model;
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

      const readiness =
        await this.appleIntelligenceImportService.checkReadiness();
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
        await this.appleIntelligenceImportService.captureAndExtractBeanData();

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
      // The message can quote the answer of the provider.
      this.uiLog.warn(
        'Cloud AI bean import error',
        errorSummary(error?.originalError ?? error),
      );
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

      const readiness =
        await this.appleIntelligenceImportService.checkReadiness();
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
          await this.appleIntelligenceImportService.extractBeanDataFromImages(
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
            componentProps: {
              bean_template: result.bean,
              reuse_attachments: !!result.attachmentPaths?.length,
            },
          });
          await addModal.present();
          const { role: addRole } = await addModal.onWillDismiss();

          // If user cancelled the add modal and photos were attached, clean them up
          if (addRole !== 'saved' && result.attachmentPaths?.length) {
            for (const path of result.attachmentPaths) {
              try {
                await this.uiFileHelper.deleteInternalFile(path);
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          }
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
            componentProps: {
              bean_template: result.bean,
              reuse_attachments: !!result.attachmentPaths?.length,
            },
          });
          await addModal.present();
          const { role: addRole } = await addModal.onWillDismiss();

          // If user cancelled the add modal and photos were attached, clean them up
          if (addRole !== 'saved' && result.attachmentPaths?.length) {
            for (const path of result.attachmentPaths) {
              try {
                await this.uiFileHelper.deleteInternalFile(path);
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          }
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
      // The message can quote the answer of the provider.
      this.uiLog.warn(
        'Cloud AI bean import (multi) error',
        errorSummary(error?.originalError ?? error),
      );
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
      settings.ai_provider !== AI_PROVIDER_ENUM.APPLE_INTELLIGENCE &&
      settings.ai_provider !== AI_PROVIDER_ENUM.NO_PROVIDER
    );
  }

  private retriggerScrollTimeout: any;

  private retriggerScroll() {
    if (this.retriggerScrollTimeout) {
      clearTimeout(this.retriggerScrollTimeout);
    }
    this.retriggerScrollTimeout = setTimeout(() => {
      const el = this.beanContent?.nativeElement;

      if (!el || el.offsetHeight === 0) {
        return; // Page is hidden, avoid clearing state
      }

      const segment = this.segment();
      let scrollComponent: AgVirtualScrollComponent;
      if (segment === 'open') {
        scrollComponent = this.openScroll;
        if (this.savedScrollPositions.openHeights?.length) {
          (scrollComponent as any).previousItemsHeight = [
            ...this.savedScrollPositions.openHeights,
          ];
        }
      } else if (segment === 'archive') {
        scrollComponent = this.archivedScroll;
        if (this.savedScrollPositions.archiveHeights?.length) {
          (scrollComponent as any).previousItemsHeight = [
            ...this.savedScrollPositions.archiveHeights,
          ];
        }
      } else if (segment === 'frozen') {
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

      if (this.forceScrollToTop) {
        targetScrollTop = 0;
        this.forceScrollToTop = false;
        this.lastInteractedBeanId = null;
      } else if (this.lastInteractedBeanId) {
        const viewArray = this.rows[segment]();
        const index = viewArray.findIndex((item) => {
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

          const rowHeight = this.isCollapseActive() ? 60 : 210;
          const heights = (scrollComponent as any).previousItemsHeight;

          let exactOffset = 0;
          if (heights && heights.length > 0) {
            for (let i = 0; i < index; i++) {
              exactOffset += heights[i] ? heights[i] : rowHeight;
            }
          } else {
            exactOffset = index * rowHeight;
          }

          const viewportTop = this.savedScrollPositions[segment];
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

      if (targetScrollTop === -1 && this.savedScrollPositions[segment] > 0) {
        targetScrollTop = this.savedScrollPositions[segment];
      }

      if (targetScrollTop >= 0) {
        const contentHeightEl = scrollComponent.el.querySelector(
          '.content-height',
        ) as HTMLElement;
        if (contentHeightEl) {
          const h = (scrollComponent as any).previousItemsHeight;
          const rH = this.isCollapseActive() ? 60 : 210;
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
    settings.bean_sort.OPEN = this.sort.open();
    settings.bean_sort.ARCHIVED = this.sort.archive();
    settings.bean_sort.FROZEN = this.sort.frozen();

    settings.bean_filter.OPEN = this.filter.open();
    settings.bean_filter.ARCHIVED = this.filter.archive();
    settings.bean_filter.FROZEN = this.filter.frozen();
    await this.uiSettingsStorage.saveSettings(settings);
  }
}

export default BeansPage;
