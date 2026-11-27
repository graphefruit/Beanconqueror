import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
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
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { GraphDisplayCardComponent } from '../../../components/graph-display-card/graph-display-card.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../../components/virtual-list/virtual-list.component';
import { UIAlert } from '../../../services/uiAlert';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'app-brew-modal-import-shot-meticulous',
  templateUrl: './brew-modal-import-shot-meticulous.component.html',
  styleUrls: ['./brew-modal-import-shot-meticulous.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    VirtualListComponent,
    VirtualRowDirective,
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
export class BrewModalImportShotMeticulousComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);

  public static COMPONENT_ID: string = 'brew-modal-import-shot-meticulous';

  @Input() public meticulousDevice: MeticulousDevice;
  public radioSelection: string;
  public history: any[] = [];
  public readonly entryKey = (entry: { id: string }): string => entry.id;
  public hasMore = true;
  public isLoadingMore = false;
  private lastEntryTime: number | undefined;

  public ngOnInit() {
    void this.readHistory();
  }

  private async readHistory() {
    await this.uiAlert.showLoadingSpinner();
    try {
      const results = await this.meticulousDevice?.getHistory();
      this.history = results ?? [];
      this.lastEntryTime = this.history[this.history.length - 1]?.time;
      this.hasMore = this.history.length >= MeticulousDevice.PAGE_SIZE;
    } catch (ex) {
      await this.uiAlert.showMessage(
        'PREPARATION_DEVICE.TYPE_METICULOUS.DATA_COULD_NOT_BE_LOADED',
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
    await this.uiAlert.hideLoadingSpinner();
  }

  public async loadMoreHistory() {
    if (
      !this.hasMore ||
      this.isLoadingMore ||
      this.lastEntryTime === undefined
    ) {
      return;
    }
    this.isLoadingMore = true;
    try {
      const results = await this.meticulousDevice?.getHistory(
        this.lastEntryTime,
      );
      const allResults = results ?? [];
      const newEntries = allResults.filter(
        (entry) => !this.history.some((existing) => existing.id === entry.id),
      );
      this.history = [...this.history, ...newEntries];
      this.lastEntryTime = this.history[this.history.length - 1]?.time;
      this.hasMore =
        allResults.length >= MeticulousDevice.PAGE_SIZE &&
        newEntries.length > 0;
    } catch (ex) {
      // silently fail — scrolling to the end again retries
    }
    this.isLoadingMore = false;
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  }
  public async choose(): Promise<void> {
    let returningData;

    for (const entry of this.history) {
      if (entry.id === this.radioSelection) {
        returningData = entry;
        break;
      }
    }

    // The selected entry's shot data is loaded lazily once its card renders.
    // Guarantee it is present before handing the entry back to the importer.
    if (returningData && !returningData.data) {
      try {
        const details = await this.meticulousDevice?.getHistoryEntryDetails(
          returningData.id,
        );
        if (details?.data) {
          returningData.data = details.data;
        }
      } catch {
        // ignore - importer guards against missing data
      }
    }

    void this.modalController.dismiss(
      {
        choosenHistory: returningData,
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  }
}
