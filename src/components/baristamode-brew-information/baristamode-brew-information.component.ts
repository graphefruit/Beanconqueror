import { DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonGrid,
  IonIcon,
  IonLabel,
  IonRow,
  IonText,
  IonTitle,
  MenuController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import BaristamodeBrew from '../../classes/brew/baristamodeBrew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { Settings } from '../../classes/settings/settings';
import { BREW_ACTION } from '../../enums/brews/brewAction';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { FormatDatePipe } from '../../pipes/formatDate';
import { UIAlert } from '../../services/uiAlert';
import { UIBaristamodeBrewStorage } from '../../services/uiBaristamodeBrewStorage';
import { UIExcel } from '../../services/uiExcel';
import { UIGraphHelper } from '../../services/uiGraphHelper';
import { UIHelper } from '../../services/uiHelper';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { VisualizerService } from '../../services/visualizerService/visualizer-service.service';
import {
  ActionsPopoverComponent,
  popoverAction,
  PopoverAction,
} from '../actions-popover/actions-popover.component';
import { GraphDisplayCardComponent } from '../graph-display-card/graph-display-card.component';

@Component({
  selector: 'baristamode-brew-information',
  templateUrl: './baristamode-brew-information.component.html',
  styleUrls: ['./baristamode-brew-information.component.scss'],
  imports: [
    NgTemplateOutlet,
    NgClass,
    GraphDisplayCardComponent,
    DecimalPipe,
    TranslatePipe,
    FormatDatePipe,
    IonIcon,
    IonLabel,
    IonTitle,
    IonGrid,
    IonText,
    IonCard,
    IonCardContent,
    IonRow,
    IonCol,
    IonButton,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BaristamodeBrewInformationComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiGraphHelper = inject(UIGraphHelper);
  private readonly menu = inject(MenuController);
  private readonly modalCtrl = inject(ModalController);
  private readonly uiBaristamodeBrewStorage = inject(UIBaristamodeBrewStorage);
  private readonly visualizerService = inject(VisualizerService);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiExcel = inject(UIExcel);

  constructor() {
    addIcons({ analyticsOutline });
  }

  @Input() public brew: BaristamodeBrew;

  @ViewChild('brewInformationContainer', { read: ElementRef, static: false })
  public brewInformationContainer: ElementRef;

  @ViewChild('swiper', { static: false })
  public brewInformationSlider: ElementRef | undefined;

  public settings: Settings = null;
  public brewQuantityEnum = BREW_QUANTITY_TYPES_ENUM;

  public informationContainerHeight: number = undefined;
  public informationContainerWidth: number = undefined;

  public ngOnInit() {
    if (this.brew) {
      this.settings = this.uiSettingsStorage.getSettings();

      if (this.brew.flow_profile) {
        setTimeout(() => {
          this.brewInformationSlider?.nativeElement?.swiper?.on(
            'touchStart',
            () => {
              this.menu.swipeGesture(false);
            },
          );
          this.brewInformationSlider?.nativeElement?.swiper?.on(
            'touchEnd',
            () => {
              this.menu.swipeGesture(true);
            },
          );
        }, 25);

        setTimeout(() => {
          this.calculcationInformationContainer();
        }, 350);
      }
    }
  }

  private calculcationInformationContainer() {
    this.informationContainerHeight =
      this.brewInformationContainer?.nativeElement?.offsetHeight - 50;
    this.informationContainerWidth =
      this.brewInformationContainer?.nativeElement?.offsetWidth - 50;
  }

  public async showBrewGraph() {
    if (this.brew.flow_profile) {
      try {
        const flowData = await this.uiGraphHelper.readFlowProfile(
          this.brew.flow_profile,
        );
        await this.uiGraphHelper.detailGraphRawData(flowData);
      } catch (ex) {}
    }
  }

  public async showBrewActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const popover = await ActionsPopoverComponent.create(this.modalCtrl, {
      id: 'baristamode-brew-popover-actions',
      items: this.buildBrewActions(),
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalBrewAction(data.role as BREW_ACTION);
    }
  }

  private buildBrewActions(): PopoverAction[] {
    const hasFlowProfile =
      !!this.brew.flow_profile && this.brew.flow_profile.length > 0;
    const hasVisualizerId = !!this.brew.customInformation?.visualizer_id;
    const canExportToVisualizer =
      hasFlowProfile &&
      this.settings.visualizer_active &&
      this.settings.visualizer_upload_automatic === false &&
      !!this.settings.visualizer_username &&
      !!this.settings.visualizer_password &&
      !hasVisualizerId;

    return [
      popoverAction({
        role: BREW_ACTION.SHOW_GRAPH,
        translationKey: 'SHOW_GRAPH',
        icon: 'analytics-outline',
        visible: !!this.brew.flow_profile,
      }),
      popoverAction({
        role: BREW_ACTION.DOWNLOAD_XLSX,
        translationKey: 'DOWNLOAD_XLSX',
        icon: 'download',
        visible: !!this.brew.flow_profile,
      }),
      popoverAction({
        role: BREW_ACTION.VISUALIZER,
        translationKey: 'MANUAL_EXPORT_TO_VISUALIZER',
        icon: 'beanconqueror-visualizer',
        visible: canExportToVisualizer,
      }),
      popoverAction({
        role: BREW_ACTION.SHOW_VISUALIZER,
        translationKey: 'SHOW_VISUALIZER',
        icon: 'beanconqueror-visualizer-logo',
        visible: hasVisualizerId,
      }),
      popoverAction({
        role: BREW_ACTION.DELETE,
        translationKey: 'POPOVER_BREWS_OPTION_DELETE',
        icon: 'beanconqueror-delete',
      }),
    ];
  }

  private async internalBrewAction(action: BREW_ACTION) {
    switch (action) {
      case BREW_ACTION.DELETE:
        await this.deleteBrew();
        break;
      case BREW_ACTION.VISUALIZER:
        await this.shareToVisualizer();
        break;
      case BREW_ACTION.SHOW_VISUALIZER:
        await this.showVisualizerShot();
        break;
      case BREW_ACTION.SHOW_GRAPH:
        await this.showBrewGraph();
        break;
      case BREW_ACTION.DOWNLOAD_XLSX:
        await this.downloadExcel();
        break;
      default:
        break;
    }
  }

  public async deleteBrew(): Promise<void> {
    const choice = await this.uiAlert.showConfirm(
      'DELETE_BREW_QUESTION',
      'SURE_QUESTION',
      true,
    );
    if (choice !== 'YES') {
      return;
    }
    await this.uiBaristamodeBrewStorage.removeByObject(this.brew);
    this.uiToast.showInfoToast('TOAST_BREW_DELETED_SUCCESSFULLY');
  }

  public async shareToVisualizer() {
    await this.uiAlert.showLoadingSpinner();
    try {
      await this.visualizerService.uploadBaristamodeBrewToVisualizer(this.brew);
    } catch (ex) {}
    await this.uiAlert.hideLoadingSpinner();
  }

  public async showVisualizerShot() {
    this.uiHelper.openExternalWebpage(
      this.settings.visualizer_url +
        'shots/' +
        this.brew.customInformation.visualizer_id,
    );
  }

  public async downloadExcel() {
    if (this.brew.flow_profile) {
      try {
        const flowData = await this.uiGraphHelper.readFlowProfile(
          this.brew.flow_profile,
        );
        const brewFlow = new BrewFlow();
        Object.assign(brewFlow, flowData);
        await this.uiExcel.exportBrewFlowProfile(brewFlow);
      } catch (ex) {}
    }
  }
}
