import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonItem,
  IonRadio,
  IonRadioGroup,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { GaggimateDevice } from '../../../classes/preparationDevice/gaggimate/gaggimateDevice';
import { GaggimateShotData } from '../../../classes/preparationDevice/gaggimate/gaggimateShotData';
import { GraphDisplayCardComponent } from '../../../components/graph-display-card/graph-display-card.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { UIAlert } from '../../../services/uiAlert';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'app-brew-modal-import-shot-gaggimate',
  templateUrl: './brew-modal-import-shot-gaggimate.component.html',
  styleUrls: ['./brew-modal-import-shot-gaggimate.component.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    GraphDisplayCardComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonButton,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonRadioGroup,
    IonCard,
    IonItem,
    IonRadio,
    IonGrid,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BrewModalImportShotGaggimateComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);

  public static COMPONENT_ID: string = 'brew-modal-import-shot-gaggimate';

  @Input() public gaggimateDevice: GaggimateDevice;
  public radioSelection: number;
  public history: Array<GaggimateShotData> = [];

  @ViewChild('ionItemEl', { read: ElementRef, static: false })
  public ionItemEl: ElementRef;

  @ViewChild('historyShotContent', { read: ElementRef })
  public historyShotContent: ElementRef;

  @ViewChild('GaggimateShotDataScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public GaggimateShotDataScroll: AgVirtualScrollComponent;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;

  public ngOnInit() {
    this.readHistory();
  }

  private async readHistory() {
    await this.uiAlert.showLoadingSpinner();
    await this.fetchShotDetails();
    await this.uiAlert.hideLoadingSpinner();

    this.retriggerScroll();
  }

  public async fetchShotDetails() {
    const alldatatoPush = [];

    const recentShots = await this.gaggimateDevice.getRecentShots();

    if (!recentShots) {
      await this.uiAlert.showMessage(
        'PREPARATION_DEVICE.TYPE_GAGGIMATE.ERROR_RECENT_SHOT_LIST_UNAVAILABLE',
        'CARE',
        'OK',
        true,
      );
      return;
    }

    const recentShotsArray = JSON.parse(recentShots);

    if (recentShotsArray.length === 0) {
      await this.uiAlert.showMessage(
        'PREPARATION_DEVICE.TYPE_GAGGIMATE.ERROR_RECENT_SHOT_LIST_EMPTY',
        'CARE',
        'OK',
        true,
      );
    } else {
      for (let i = 0; i < this.gaggimateDevice.getLatestShotsToImport(); i++) {
        try {
          const GaggimateShotDataEntry = new GaggimateShotData();

          const data = recentShotsArray[i];

          if (data !== null) {
            // TODO : For future release, if a shot has been already imported ask if it should be imported again (id check)
            GaggimateShotDataEntry.id = Number(data.id); // force id as a number
            GaggimateShotDataEntry.timestamp = data.timestamp;
            GaggimateShotDataEntry.profile = data.profile;
            GaggimateShotDataEntry.profileId = data.profileId;
            GaggimateShotDataEntry.duration = data.duration;
            GaggimateShotDataEntry.avgFlow = data.avgFlow;
            GaggimateShotDataEntry.avgTemp = data.avgTemp;
            GaggimateShotDataEntry.volume = data.volume;
            GaggimateShotDataEntry.maxPressure = data.maxPressure;
            GaggimateShotDataEntry.rating = data.rating ?? 0;
            GaggimateShotDataEntry.incomplete = data.incomplete;

            // Load the slog samples and the notes
            const shotData = await this.gaggimateDevice.getShotSlog(data.id);

            GaggimateShotDataEntry.brewFlow =
              GaggimateDevice.returnBrewFlowForShotData(shotData.samples);

            GaggimateShotDataEntry.notes =
              await this.gaggimateDevice.getShotNotesFile(data.id);

            if (data.hasNotes) {
              // console.log('has notes', data.id)
              // TODO: For future release, when the flag will be correctly populated, we should load the notes only on true
            }

            alldatatoPush.push(GaggimateShotDataEntry);
          }
        } catch (error) {
          // console.error(There was a problem with the fetch operation for id ${id}:, error);
        }
      }
    }

    /**We need to grab all data before we can push it else the virtual scrolling has issues **/
    this.history = alldatatoPush;
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(() => {
      const el = this.historyShotContent.nativeElement;
      const scrollComponent: AgVirtualScrollComponent =
        this.GaggimateShotDataScroll;

      if (!scrollComponent) {
        return;
      }

      scrollComponent.el.style.height = el.offsetHeight - 20 + 'px';
      // this.segmentScrollHeight = scrollComponent.el.style.height;

      // HACK: Manually trigger component refresh to work around initialization
      //       bug. For some reason the scroll component sees its own height as
      //       0 during initialization, which causes it to render 0 items. As
      //       no changes to the component occur after initialization, no
      //       re-render ever occurs. This forces one. The root cause for
      //       this issue is currently unknown.
      if (scrollComponent.items.length === 0) {
        scrollComponent.refreshData();
      }
    }, 150);
  }

  public getElementOffsetWidth() {
    if (this.ionItemEl?.nativeElement?.offsetWidth) {
      return this.ionItemEl?.nativeElement?.offsetWidth - 50;
    }
    return 0;
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotGaggimateComponent.COMPONENT_ID,
    );
  }
  public choose(): void {
    let returningData;
    for (const entry of this.history) {
      if (entry.id === this.radioSelection) {
        returningData = entry;
        break;
      }
    }
    this.modalController.dismiss(
      {
        choosenData: returningData,
        dismissed: true,
      },
      undefined,
      BrewModalImportShotGaggimateComponent.COMPONENT_ID,
    );
  }
}
