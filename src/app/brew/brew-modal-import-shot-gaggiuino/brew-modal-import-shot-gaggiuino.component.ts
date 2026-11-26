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

import { GaggiuinoDevice } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoDevice';
import { GaggiuinoShotData } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoShotData';
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
  selector: 'app-brew-modal-import-shot-gaggiuino',
  templateUrl: './brew-modal-import-shot-gaggiuino.component.html',
  styleUrls: ['./brew-modal-import-shot-gaggiuino.component.scss'],
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
export class BrewModalImportShotGaggiuinoComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);

  public static COMPONENT_ID: string = 'brew-modal-import-shot-gaggiuino';

  @Input() public gaggiuinoDevice: GaggiuinoDevice;
  public radioSelection: number;
  public history: Array<GaggiuinoShotData> = [];
  public readonly entryKey = (entry: GaggiuinoShotData): number => entry.id;

  public ngOnInit() {
    this.readHistory();
  }

  private async readHistory() {
    const lastShotId: number = await this.gaggiuinoDevice.getLastShotId();
    if (lastShotId === null) {
      //No shots have been done
    } else {
      await this.uiAlert.showLoadingSpinner();
      await this.fetchShotDetails(lastShotId);
      await this.uiAlert.hideLoadingSpinner();
    }
  }

  public async fetchShotDetails(lastShotId: number) {
    const alldatatoPush = [];
    for (let id = lastShotId; id >= Math.max(1, lastShotId - 5); id--) {
      try {
        const gaggiuinoShotDataEntry = new GaggiuinoShotData();
        const data = await this.gaggiuinoDevice.getShotData(id);

        if (data !== null) {
          gaggiuinoShotDataEntry.id = id;
          gaggiuinoShotDataEntry.timestamp = data.timestamp;
          gaggiuinoShotDataEntry.profileName = data.profile.name;
          gaggiuinoShotDataEntry.brewFlow =
            GaggiuinoDevice.returnBrewFlowForShotData(data);
          gaggiuinoShotDataEntry.rawData = data;

          alldatatoPush.push(gaggiuinoShotDataEntry);
        }
      } catch (error) {
        // console.error(There was a problem with the fetch operation for id ${id}:, error);
      }
    }
    /**We need to grab all data before we can push it else the virtual scrolling has issues **/
    this.history = alldatatoPush;
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotGaggiuinoComponent.COMPONENT_ID,
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
      BrewModalImportShotGaggiuinoComponent.COMPONENT_ID,
    );
  }
}
