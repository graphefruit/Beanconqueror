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
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    IonSpinner,
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
  private readonly translate = inject(TranslateService);

  readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);

  public static COMPONENT_ID: string = 'brew-modal-import-shot-gaggimate';

  @Input() public gaggimateDevice: GaggimateDevice;
  /**
   * Id and timestamp of the shot which was already imported into the brew, if
   * any. This shot is listed first and preselected, even if it is not part of
   * the latest shots anymore.
   */
  @Input() public importedShotId = 0;
  @Input() public importedShotTimestamp = 0;
  public radioSelection: number;
  public history: Array<GaggimateShotData> = [];

  public loading = true;
  public loadingCurrent = 0;
  public loadingTotal = 0;
  public loadingImportedShot = false;
  private loadingCancelled = false;

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
    // The loading state is shown inside the modal instead of a blocking spinner,
    // so the user is able to cancel it via the dismiss buttons
    this.loading = true;
    try {
      await this.fetchShotDetails();
    } finally {
      this.loading = false;
    }

    this.retriggerScroll();
  }

  public async fetchShotDetails() {
    const alldatatoPush = [];

    const recentShots = await this.gaggimateDevice.getRecentShots();
    if (this.loadingCancelled) {
      return;
    }

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
      const shotsToFetch = recentShotsArray.slice(
        0,
        this.gaggimateDevice.getLatestShotsToImport(),
      );
      await this.addImportedShotToList(shotsToFetch, recentShotsArray);
      if (this.loadingCancelled) {
        return;
      }

      this.loadingTotal = shotsToFetch.length;
      for (let i = 0; i < shotsToFetch.length; i++) {
        if (this.loadingCancelled) {
          return;
        }
        this.loadingCurrent = i + 1;
        try {
          const GaggimateShotDataEntry = new GaggimateShotData();

          const data = shotsToFetch[i];
          // The imported shot is always the first one, see addImportedShotToList()
          this.loadingImportedShot =
            i === 0 && Number(data?.id) === Number(this.importedShotId);

          if (data !== null) {
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
            GaggimateShotDataEntry.targetTemp =
              GaggimateDevice.returnTargetTemperatureForShotData(
                shotData.samples,
              );

            GaggimateShotDataEntry.notes =
              await this.gaggimateDevice.getShotNotesFile(data.id);

            if (data.hasNotes) {
              // console.log('has notes', data.id)
              // TODO: For future release, when the flag will be correctly populated, we should load the notes only on true
            }

            alldatatoPush.push(GaggimateShotDataEntry);
          }
        } catch (error) {
          console.error(`There was a problem fetching from GaggiMate:`, error);
        }
      }
    }

    if (alldatatoPush.length > 0) {
      /**We need to grab all data before we can push it else the virtual scrolling has issues **/
      this.history = alldatatoPush;
      if (alldatatoPush.some((entry) => entry.id === this.importedShotId)) {
        // Preselect the shot which was imported into this brew before
        this.radioSelection = this.importedShotId;
      }
    } else {
      await this.uiAlert.showMessage(
        this.translate.instant(
          'PREPARATION_DEVICE.TYPE_GAGGIMATE.ERROR_RECENT_SHOT_LIST_EMPTY_POSSIBLE_VERSION_MISMATCH',
          {
            maxShotVersionSupported:
              this.gaggimateDevice.maxShotVersionSupported,
          },
        ),
        'CARE',
        'OK',
        true,
      );
    }
  }

  /**
   * Puts the shot which was already imported into the brew at the first
   * position of the list. If it is not part of the recent shots anymore, it is
   * looked up in the complete shot index of the GaggiMate.
   */
  private async addImportedShotToList(
    shotsToFetch: any[],
    recentShotsArray: any[],
  ) {
    if (!this.importedShotId) {
      return;
    }
    this.loadingImportedShot = true;
    // Shot ids are reused when the history on the GaggiMate is reset, so the
    // timestamp needs to match aswell (if we know it, older imports don't)
    const isImportedShot = (shot) =>
      Number(shot.id) === Number(this.importedShotId) &&
      (!this.importedShotTimestamp ||
        shot.timestamp === this.importedShotTimestamp);

    const existingIndex = shotsToFetch.findIndex(isImportedShot);
    let importedShot =
      existingIndex >= 0
        ? shotsToFetch.splice(existingIndex, 1)[0]
        : recentShotsArray.find(isImportedShot);

    if (!importedShot) {
      try {
        importedShot = (await this.gaggimateDevice.getAllShots()).find(
          isImportedShot,
        );
      } catch (error) {
        console.error(`There was a problem fetching from GaggiMate:`, error);
      }
    }
    if (importedShot) {
      shotsToFetch.unshift(importedShot);
    }
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
    this.loadingCancelled = true;
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
