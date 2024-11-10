import { Component, Input, ViewChild } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { AlertController, ModalController, Platform } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { Brew } from '../../../classes/brew/brew';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { Settings } from '../../../classes/settings/settings';
import { Preparation } from '../../../classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { Chart } from 'chart.js';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIExcel } from '../../../services/uiExcel';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { TranslateService } from '@ngx-translate/core';
import { IBrewWaterFlow } from '../../../classes/brew/brewFlow';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIAlert } from '../../../services/uiAlert';
import { BrewFlowComponent } from '../brew-flow/brew-flow.component';
import moment from 'moment';

import { UILog } from '../../../services/uiLog';
import { Visualizer } from '../../../classes/visualizer/visualizer';
import { BrewPopoverExtractionComponent } from '../brew-popover-extraction/brew-popover-extraction.component';
import { BrewBrewingGraphComponent } from '../../../components/brews/brew-brewing-graph/brew-brewing-graph.component';
import { sleep } from '../../../classes/devices';
import { ShareService } from '../../../services/shareService/share-service.service';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';
import { Bean } from '../../../classes/bean/bean';
import { Mill } from '../../../classes/mill/mill';

declare var Plotly;
@Component({
  selector: 'brew-detail',
  templateUrl: './brew-detail.component.html',
  styleUrls: ['./brew-detail.component.scss'],
})
export class BrewDetailComponent {
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
  constructor(
    private readonly modalController: ModalController,
    public uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiBrewHelper: UIBrewHelper,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiExcel: UIExcel,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiMillHelper: UIMillHelper,
    private readonly translate: TranslateService,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiAlert: UIAlert,
    private readonly platform: Platform,
    private readonly alertCtrl: AlertController,
    private readonly uiLog: UILog,
    private readonly shareService: ShareService
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async ionViewDidEnter() {
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.DETAIL
    );
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);

      this.bean = this.data.getBean();
      this.choosenPreparation = this.data.getPreparation();
      this.mill = this.data.getMill();
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

  private initializeFlowChartOnGraphEl() {
    setTimeout(async () => {
      if (this.editActive === false) {
        if (this.brewBrewingGraphEl) {
          await this.brewBrewingGraphEl?.instance();
        }
      }
    }, 150);
  }

  public copyNotesToClipboard() {
    this.uiHelper.copyToClipboard(this.data.note);
  }
  public async detailBean() {
    await this.uiBeanHelper.detailBean(this.data.getBean());
  }
  public async detailPreparation() {
    await this.uiPreparationHelper.detailPreparation(
      this.data.getPreparation()
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
      BrewDetailComponent.COMPONENT_ID
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
      this.uiBrewHelper.getCuppingChartData(this.data) as any
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
        }
      ).once('success', async (url) => {
        setTimeout(() => {
          Plotly.Snapshot.toImage(
            this.brewBrewingGraphEl.profileDiv.nativeElement,
            {
              format: 'jpeg',
            }
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
        }
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
        true
      );
    } catch (ex) {}
  }

  public async downloadJSONProfile() {
    if (this.data.flow_profile !== '') {
      const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
        this.data.flow_profile
      );
      const filename: string =
        'Beanconqueror_Flowprofile_JSON_' +
        moment().format('HH_mm_ss_DD_MM_YYYY').toString() +
        '.json';
      await this.uiHelper.exportJSON(
        filename,
        JSON.stringify(jsonParsed),
        true
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
      this.brewBrewingGraphEl.flow_profile_raw
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
    }
  }
  public async showExtractionChart(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.EXTRACTION_GRAPH
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
}
