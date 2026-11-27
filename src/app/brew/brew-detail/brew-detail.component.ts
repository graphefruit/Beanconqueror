import { DecimalPipe, KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  signal,
  ViewChild,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AlertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonChip,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonRow,
  ModalController,
  Platform,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  clipboardOutline,
  create,
  cutOutline,
  download,
  expandOutline,
  globeOutline,
  shareSocialOutline,
} from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import moment from 'moment';

import {
  BREW_DETAIL_FIELDS,
  brewFieldLayout,
  EMPTY_BREW_FIELD_LAYOUT,
} from '../../../brew-session/rules/brewFieldLayout';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BrewFlow } from '../../../classes/brew/brewFlow';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { Settings } from '../../../classes/settings/settings';
import { Visualizer } from '../../../classes/visualizer/visualizer';
import { BrewGraphViewComponent } from '../../../components/brews/graph/brew-graph-view/brew-graph-view.component';
import { FlowProfileReader } from '../../../components/brews/graph/flow-profile-reader.service';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PhotoViewComponent } from '../../../components/photo-view/photo-view.component';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';
import { MILL_FUNCTION_PIPE_ENUM } from '../../../enums/mills/millFunctionPipe';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { MillFunction } from '../../../pipes/mill/millFunction';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIExcel } from '../../../services/uiExcel';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIGraphHelper } from '../../../services/uiGraphHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  applyFlowCut,
  beforeCutPathOf,
  FlowCutSave,
} from '../../../stores/brews/flow-cut-rules';
import { averageFlow, peakFlow } from '../../../stores/brews/flow-stats-rules';
import { BrewPopoverCutComponent } from '../brew-popover-cut/brew-popover-cut.component';
import { BrewPopoverExtractionComponent } from '../brew-popover-extraction/brew-popover-extraction.component';

@Component({
  selector: 'brew-detail',
  templateUrl: './brew-detail.component.html',
  styleUrls: ['./brew-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    BrewGraphViewComponent,
    PhotoViewComponent,
    DecimalPipe,
    KeyValuePipe,
    TranslatePipe,
    FormatDatePipe,
    ToFixedPipe,
    BrewFunction,
    MillFunction,
    HeaderComponent,
    HeaderDismissButtonComponent,
    HeaderButtonComponent,
    IonHeader,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonItem,
    IonLabel,
    IonChip,
    IonGrid,
    IonRow,
    IonCol,
    IonCardHeader,
    IonCardContent,
    IonPopover,
    IonList,
    IonFooter,
  ],
})
export class BrewDetailComponent {
  private readonly modalController = inject(ModalController);
  uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiExcel = inject(UIExcel);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiMillHelper = inject(UIMillHelper);
  private readonly translate = inject(TranslateService);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly platform = inject(Platform);
  private readonly alertCtrl = inject(AlertController);
  private readonly uiLog = inject(UILog);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly shareService = inject(ShareService);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly destroyRef = inject(DestroyRef);
  private readonly flowProfileReader = inject(FlowProfileReader);
  private readonly uiGraphHelper = inject(UIGraphHelper);

  public static readonly COMPONENT_ID = 'brew-detail';
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public data: Brew = new Brew();
  public settings: Settings;

  @ViewChild('cuppingChart', { static: false }) public cuppingChart;
  @Input('brew') public brew: IBrew;
  public loaded: boolean = false;

  /** The graph of the brew as read from its file; undefined while it is read. */
  protected readonly flow = signal<BrewFlow | null | undefined>(undefined);
  protected readonly reference = signal<BrewFlow | null>(null);
  protected readonly avgFlow = computed(() => averageFlow(this.flow()));
  protected readonly peakFlow = computed(() => peakFlow(this.flow()));
  private readonly graphView = viewChild(BrewGraphViewComponent);

  public bean: Bean;
  /**We named it that way, because the graph-componeneted access it aswell **/
  public choosenPreparation: Preparation;
  public mill: Mill;

  public uiShowSectionAfterBrew: boolean = false;
  public uiShowSectionWhileBrew: boolean = false;
  public uiShowSectionBeforeBrew: boolean = false;
  public uiShowCupping: boolean = false;

  /**
   * The settings and the preparation of the brew the fields are laid out by,
   * until the settings are available as a signal. Both are changed in place,
   * so setting the same object again counts as a change as well.
   */
  private readonly layoutSettings = signal<Settings>(undefined, {
    equal: () => false,
  });
  private readonly layoutPreparation = signal<Preparation>(undefined, {
    equal: () => false,
  });
  /** The shown fields of each section, in the configured order. */
  protected readonly brewFields = computed(() => {
    const settings = this.layoutSettings();
    const preparation = this.layoutPreparation();
    if (!settings || !preparation) {
      return EMPTY_BREW_FIELD_LAYOUT;
    }
    return brewFieldLayout(BREW_DETAIL_FIELDS, settings, preparation);
  });

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.layoutSettings.set(this.settings);
    // Parameters can change while the details are open, e.g. when the brew
    // is edited from here. Settings and preparations are changed in place, so
    // the fields are laid out again with the objects at hand.
    this.uiSettingsStorage
      .attachOnEvent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.layoutSettings.set(this.settings));
    this.uiPreparationStorage
      .attachOnEvent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.layoutPreparation.set(this.choosenPreparation));
    addIcons({
      create,
      globeOutline,
      download,
      shareSocialOutline,
      expandOutline,
      clipboardOutline,
      cutOutline,
    });
  }
  public setUIParams() {
    this.uiShowSectionAfterBrew = this.showSectionAfterBrew();
    this.uiShowSectionWhileBrew = this.showSectionWhileBrew();
    this.uiShowSectionBeforeBrew = this.showSectionBeforeBrew();
    this.uiShowCupping = this.showCupping();
  }
  public openURL(_url) {
    if (_url) {
      this.uiHelper.openExternalWebpage(_url);
    }
  }

  public async ionViewDidEnter() {
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.DETAIL,
    );
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);

      this.bean = this.data.getBean();
      this.choosenPreparation = this.data.getPreparation();
      this.layoutPreparation.set(this.choosenPreparation);
      this.mill = this.data.getMill();
      this.setUIParams();
    }
    if (this.showCupping()) {
      // Set timeout else element wont be visible
      setTimeout(() => {
        this.__loadCuppingChart();
      }, 1000);
    }
    this.loaded = true;
    await this.loadFlow();
  }

  /** Reads the graph of the brew with the reference it was made against. */
  private async loadFlow(): Promise<void> {
    if (!this.data.flow_profile) {
      this.flow.set(null);
      this.reference.set(null);
      return;
    }
    const [flow, reference] = await Promise.all([
      this.flowProfileReader.read(this.data.flow_profile),
      this.flowProfileReader.readReference(this.data),
    ]);
    this.flow.set(flow);
    this.reference.set(reference.flow);
  }

  public copyNotesToClipboard() {
    this.uiHelper.copyToClipboard(this.data.note);
  }
  public async detailBean() {
    await this.uiBeanHelper.detailBean(this.data.getBean());
  }
  public async detailPreparation() {
    await this.uiPreparationHelper.detailPreparation(
      this.data.getPreparation(),
    );
  }
  public async detailMill() {
    await this.uiMillHelper.detailMill(this.data.getMill());
  }

  public getPreparation(): Preparation {
    return this.choosenPreparation;
  }
  public showSectionAfterBrew(): boolean {
    return this.uiBrewHelper.showSectionAfterBrew(this.getPreparation());
  }
  public showSectionWhileBrew(): boolean {
    return this.uiBrewHelper.showSectionWhileBrew(this.getPreparation());
  }

  public showSectionBeforeBrew(): boolean {
    return this.uiBrewHelper.showSectionBeforeBrew(this.getPreparation());
  }
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewDetailComponent.COMPONENT_ID,
    );
  }

  public async repeat() {
    await this.uiBrewHelper.repeatBrew(this.data);
  }
  public async edit() {
    const returningBrew: Brew = await this.uiBrewHelper.editBrew(this.data);
    if (returningBrew) {
      this.data = returningBrew;
      this.bean = this.data.getBean();
      this.choosenPreparation = this.data.getPreparation();
      this.layoutPreparation.set(this.choosenPreparation);
      this.mill = this.data.getMill();
      this.setUIParams();
      // Editing can replace the graph or its reference.
      await this.loadFlow();
    }
  }
  public formatSeconds(seconds: number, milliseconds) {
    const secs = seconds;
    let formattingStr: string = 'mm:ss';
    const millisecondsEnabled: boolean = this.settings.brew_milliseconds;
    if (millisecondsEnabled) {
      formattingStr = 'mm:ss.SSS';
    }
    const formatted = moment
      .utc(secs * 1000)
      .add('milliseconds', milliseconds)
      .format(formattingStr);
    return formatted;
  }
  public showCupping(): boolean {
    return this.uiBrewHelper.showCupping(this.data);
  }

  private __loadCuppingChart(): void {
    new Chart(
      this.cuppingChart.nativeElement,
      this.uiBrewHelper.getCuppingChartData(this.data) as any,
    );
  }

  /** Shows the graph large, with its chips and the time slider. */
  public async maximizeFlowGraph() {
    await this.uiGraphHelper.detailBrewGraph(this.data);
  }

  public async shareFlowProfile() {
    let shared = false;
    try {
      const view = this.graphView();
      if (view) {
        shared = await this.shareService.shareFile(
          '',
          await view.exportImage(),
        );
      }
    } catch (err) {
      this.uiLog.error('Cant share profilechart', err);
    }
    if (!shared) {
      await this.uiAlert.showMessage(
        'SHARE_FLOW_PROFILE_FAILED',
        undefined,
        undefined,
        true,
      );
    }
  }

  public async downloadVisualizerProfile() {
    const vS: Visualizer = new Visualizer();

    vS.mapBrew(this.data);
    try {
      if (this.data.tds > 0) {
        vS.brew.ey = Number(this.data.getExtractionYield());
      }
    } catch (ex) {}

    vS.mapBean(this.data.getBean());
    vS.mapWater(this.data.getWater());
    vS.mapPreparation(this.data.getPreparation());
    vS.mapMill(this.data.getMill());
    vS.brewFlow = this.flow() ?? new BrewFlow();

    try {
      await this.uiHelper.exportJSON(
        this.brew.config.uuid + '_visualizer.json',
        JSON.stringify(vS),
        true,
      );
    } catch (ex) {}
  }

  public async downloadJSONProfile() {
    if (this.data.flow_profile !== '') {
      const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
        this.data.flow_profile,
      );
      const filename: string =
        'Beanconqueror_Flowprofile_JSON_' +
        moment().format('HH_mm_ss_DD_MM_YYYY').toString() +
        '.json';
      await this.uiHelper.exportJSON(
        filename,
        JSON.stringify(jsonParsed),
        true,
      );
      // No popup needed anymore, because we share the file now
      /*if (this.platform.is('android')) {
              const alert = await this.alertCtrl.create({
                header: this.translate.instant('DOWNLOADED'),
                subHeader: this.translate.instant('FILE_DOWNLOADED_SUCCESSFULLY', {
                  fileName: filename,
                }),
                buttons: ['OK'],
              });
              await alert.present();
            }*/
    }
  }
  public async downloadFlowProfile() {
    await this.uiExcel.exportBrewFlowProfile(this.flow() ?? new BrewFlow());
  }

  public async showExtractionChart(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.EXTRACTION_GRAPH,
    );
    const popover = await this.modalController.create({
      component: BrewPopoverExtractionComponent,
      animated: true,
      componentProps: { brew: this.data },
      id: BrewPopoverExtractionComponent.COMPONENT_ID,
      cssClass: 'popover-extraction',
      initialBreakpoint: 1,
    });
    await popover.present();
    await popover.onWillDismiss();
  }

  private async readDummyFlowProfile(): Promise<any> {
    return (
      await import('../../../assets/BeanconquerorFlowTestDataSecond.json')
    ).default;
  }

  public async cutFlowProfile(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!this.data.flow_profile) {
      return;
    }

    let flowProfile = null;
    try {
      if (!this.platform.is('capacitor')) {
        flowProfile = await this.readDummyFlowProfile();
      } else {
        flowProfile = await this.uiFileHelper.readInternalJSONFile(
          this.data.flow_profile,
        );
      }
    } catch (ex) {
      this.uiLog.error('Cant read flow profile for cutting ' + ex.message);
      return;
    }

    if (!flowProfile) {
      return;
    }

    const popover = await this.modalController.create({
      component: BrewPopoverCutComponent,
      animated: true,
      componentProps: {
        brew: this.data,
        flowProfile: flowProfile,
      },
      id: BrewPopoverCutComponent.COMPONENT_ID,
      cssClass: 'popover-cut',
    });

    await popover.present();
    const result = await popover.onWillDismiss();

    if (result.role === 'save' && result.data) {
      await this.saveFlowCut(result.data);
    }
  }

  /**
   * Writes the cut flow profile and then the brew, so that file and brew
   * never disagree: when one of them fails, both stay as they were. The
   * profile from before is kept beside it; it is no attachment of the brew,
   * so export, sync and the attachment manifest leave it out.
   */
  private async saveFlowCut(cut: FlowCutSave): Promise<void> {
    const path = this.data.flow_profile;
    const beforeCutPath = beforeCutPathOf(path);
    // The browser shows a sample profile and has no file to write.
    const writesFile = this.platform.is('capacitor');
    if (writesFile) {
      try {
        await this.uiFileHelper.replaceInternalFileKeepingCopy(
          JSON.stringify(cut.flowProfile),
          path,
          beforeCutPath,
        );
      } catch (ex) {
        this.uiLog.error('Failed to write cut flow profile: ' + ex?.message);
        await this.showFlowCutFailed();
        return;
      }
    }

    const updatedData = new Brew();
    updatedData.initializeByObject(this.data);
    applyFlowCut(updatedData, cut);
    if (!(await this.uiBrewStorage.update(updatedData))) {
      if (writesFile) {
        try {
          // A move, not a copy: it needs no space on a full disk, where
          // saving the brew most likely failed.
          await this.uiFileHelper.renameInternalFile(beforeCutPath, path);
        } catch (ex) {
          this.uiLog.error(
            'Failed to restore cut flow profile: ' + ex?.message,
          );
        }
      }
      await this.showFlowCutFailed();
      return;
    }
    this.data = updatedData;
    if (this.brew) {
      const updatedBrew = new Brew();
      updatedBrew.initializeByObject(this.brew as Brew);
      applyFlowCut(updatedBrew, cut);
      this.brew = updatedBrew;
    }
    this.flow.set(cut.flowProfile);
    this.cdr.detectChanges();
  }

  private showFlowCutFailed(): Promise<void> {
    return this.uiAlert.showMessage(
      'CUT_FLOW_PROFILE_SAVE_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
  }

  protected readonly BREW_FUNCTION_PIPE_ENUM = BREW_FUNCTION_PIPE_ENUM;
  protected readonly MILL_FUNCTION_PIPE_ENUM = MILL_FUNCTION_PIPE_ENUM;
  protected readonly PreparationDeviceType = PreparationDeviceType;
  protected readonly PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  protected readonly SanremoYOUMode = SanremoYOUMode;
}
