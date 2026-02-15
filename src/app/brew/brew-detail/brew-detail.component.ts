import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, inject, Input, ViewChild } from '@angular/core';

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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  clipboardOutline,
  create,
  download,
  expandOutline,
  globeOutline,
  shareSocialOutline,
} from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import moment from 'moment';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import {
  IBrewRealtimeWaterFlow,
  IBrewWaterFlow,
} from '../../../classes/brew/brewFlow';
import { sleep } from '../../../classes/devices';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { Settings } from '../../../classes/settings/settings';
import { Visualizer } from '../../../classes/visualizer/visualizer';
import { BrewBrewingGraphComponent } from '../../../components/brews/brew-brewing-graph/brew-brewing-graph.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PhotoViewComponent } from '../../../components/photo-view/photo-view.component';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { BrewFieldOrder } from '../../../pipes/brew/brewFieldOrder';
import { BrewFieldVisiblePipe } from '../../../pipes/brew/brewFieldVisible';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIExcel } from '../../../services/uiExcel';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BrewFlowComponent } from '../brew-flow/brew-flow.component';
import { BrewPopoverExtractionComponent } from '../brew-popover-extraction/brew-popover-extraction.component';

declare var Plotly;
@Component({
  selector: 'brew-detail',
  templateUrl: './brew-detail.component.html',
  styleUrls: ['./brew-detail.component.scss'],
  imports: [
    BrewBrewingGraphComponent,
    PhotoViewComponent,
    DecimalPipe,
    KeyValuePipe,
    TranslatePipe,
    FormatDatePipe,
    ToFixedPipe,
    BrewFieldVisiblePipe,
    BrewFieldOrder,
    BrewFunction,
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
  private readonly shareService = inject(ShareService);

  public static readonly COMPONENT_ID = 'brew-detail';
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public data: Brew = new Brew();
  public settings: Settings;

  @ViewChild('cuppingChart', { static: false }) public cuppingChart;
  @Input('brew') public brew: IBrew;
  public loaded: boolean = false;

  private maximizeFlowGraphIsShown: boolean = false;
  public editActive: boolean = false;

  @ViewChild('brewBrewingGraphEl', { static: false })
  public brewBrewingGraphEl: BrewBrewingGraphComponent;

  public bean: Bean;
  /**We named it that way, because the graph-componeneted access it aswell **/
  public choosenPreparation: Preparation;
  public mill: Mill;

  public uiShowSectionAfterBrew: boolean = false;
  public uiShowSectionWhileBrew: boolean = false;
  public uiShowSectionBeforeBrew: boolean = false;
  public uiShowCupping: boolean = false;

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({
      create,
      globeOutline,
      download,
      shareSocialOutline,
      expandOutline,
      clipboardOutline,
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
      this.mill = this.data.getMill();
      this.setUIParams();
    }
    if (this.showCupping()) {
      // Set timeout else element wont be visible
      setTimeout(() => {
        this.__loadCuppingChart();
      }, 1000);
    }
    this.initializeFlowChartOnGraphEl();

    this.loaded = true;
  }

  private async initializeFlowChartOnGraphEl() {
    await sleep(150);
    if (this.editActive === false) {
      if (this.brewBrewingGraphEl) {
        await this.brewBrewingGraphEl?.instance();
      }
    }
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
    try {
      Plotly.purge(this.brewBrewingGraphEl.profileDiv.nativeElement);
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewDetailComponent.COMPONENT_ID,
    );
  }

  public async repeat() {
    try {
      Plotly.purge(this.brewBrewingGraphEl.profileDiv.nativeElement);
      // Remove the element just to make sure...
      document.getElementById('canvasContainerBrew').remove();
    } catch (ex) {}

    this.editActive = true;
    //Wait 100ms, so the dom will be new rendered and the id will be removed from the flowprofilechart
    await sleep(100);
    this.uiBrewHelper.repeatBrew(this.data).then(() => {
      this.editActive = false;
      this.initializeFlowChartOnGraphEl();
    });
  }
  public async edit() {
    try {
      Plotly.purge(this.brewBrewingGraphEl.profileDiv.nativeElement);
      // Remove the element just to make sure...
      document.getElementById('canvasContainerBrew').remove();
    } catch (ex) {}
    this.editActive = true;
    // Wait 50ms, so the dom will be new rendered and the id will be removed from the flowprofilechart
    await sleep(50);

    const returningBrew: Brew = await this.uiBrewHelper.editBrew(this.data);
    this.editActive = false;
    if (returningBrew) {
      this.data = returningBrew;
      this.bean = this.data.getBean();
      this.choosenPreparation = this.data.getPreparation();
      this.mill = this.data.getMill();
      this.setUIParams();
      this.initializeFlowChartOnGraphEl();
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

  public async maximizeFlowGraph() {
    const modal = await this.modalController.create({
      component: BrewFlowComponent,
      id: BrewFlowComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      componentProps: {
        brewComponent: this,
        brew: this.data,
        isDetail: true,
      },
    });
    this.maximizeFlowGraphIsShown = true;
    await modal.present();
    await modal.onWillDismiss().then(async () => {
      this.maximizeFlowGraphIsShown = false;
      // If responsive would be true, the add of the container would result into 0 width 0 height, therefore the hack
      try {
        setTimeout(() => {
          this.brewBrewingGraphEl.onOrientationChange();
        }, 150);
      } catch (ex) {}
    });
  }

  public async shareFlowProfile() {
    /* const fileShare: string = this.flowProfileChartEl.toBase64Image(
          'image/jpeg',
          1
        );*/
    if (this.platform.is('ios')) {
      //#544 - we need to do it twice... don't know why, ios issue
      Plotly.Snapshot.toImage(
        this.brewBrewingGraphEl.profileDiv.nativeElement,
        {
          format: 'jpeg',
        },
      ).once('success', async (url) => {
        setTimeout(() => {
          Plotly.Snapshot.toImage(
            this.brewBrewingGraphEl.profileDiv.nativeElement,
            {
              format: 'jpeg',
            },
          ).once('success', async (urlNew) => {
            try {
              this.shareService.shareFile('', urlNew);
            } catch (err) {
              this.uiLog.error('Cant share profilechart ' + err.message);
            }
          });
        }, 750);
      });
    } else {
      Plotly.Snapshot.toImage(
        this.brewBrewingGraphEl.profileDiv.nativeElement,
        {
          format: 'jpeg',
        },
      ).once('success', async (url) => {
        try {
          this.shareService.shareFile('', url);
        } catch (err) {
          this.uiLog.error('Cant share profilechart ' + err.message);
        }
      });
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
    vS.brewFlow = this.brewBrewingGraphEl.flow_profile_raw;

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
    await this.uiExcel.exportBrewFlowProfile(
      this.brewBrewingGraphEl.flow_profile_raw,
    );
  }

  public getAvgFlow(): number {
    if (
      this.brewBrewingGraphEl?.flow_profile_raw.waterFlow &&
      this.brewBrewingGraphEl?.flow_profile_raw.waterFlow.length > 0
    ) {
      const waterFlows: Array<IBrewWaterFlow> =
        this.brewBrewingGraphEl?.flow_profile_raw.waterFlow;
      let calculatedFlow: number = 0;
      let foundEntries: number = 0;
      for (const water of waterFlows) {
        if (water.value > 0) {
          calculatedFlow += water.value;
          foundEntries += 1;
        }
      }
      if (calculatedFlow > 0) {
        return calculatedFlow / foundEntries;
      }

      return 0;
    } else if (
      this.brewBrewingGraphEl?.flow_profile_raw.realtimeFlow &&
      this.brewBrewingGraphEl?.flow_profile_raw.realtimeFlow.length > 0
    ) {
      /** E.g. on the meticulous we don't have the calculcated water flow, so take the realtime flow **/
      const waterFlows: Array<IBrewRealtimeWaterFlow> =
        this.brewBrewingGraphEl?.flow_profile_raw.realtimeFlow;
      let calculatedFlow: number = 0;
      let foundEntries: number = 0;
      for (const water of waterFlows) {
        if (water.flow_value > 0) {
          calculatedFlow += water.flow_value;
          foundEntries += 1;
        }
      }
      if (calculatedFlow > 0) {
        return calculatedFlow / foundEntries;
      }

      return 0;
    }
  }

  public getPeakFlow() {
    if (
      this.brewBrewingGraphEl?.flow_profile_raw.realtimeFlow &&
      this.brewBrewingGraphEl?.flow_profile_raw.realtimeFlow.length > 0
    ) {
      const waterFlows: Array<IBrewRealtimeWaterFlow> =
        this.brewBrewingGraphEl?.flow_profile_raw.realtimeFlow;
      const maxWaterFlow = Math.max(...waterFlows.map((obj) => obj.flow_value));
      return maxWaterFlow;
    }
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

  protected readonly BREW_FUNCTION_PIPE_ENUM = BREW_FUNCTION_PIPE_ENUM;
  protected readonly PreparationDeviceType = PreparationDeviceType;
  protected readonly PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  protected readonly SanremoYOUMode = SanremoYOUMode;
}
