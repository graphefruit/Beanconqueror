import { Component, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Preparation } from '../../../classes/preparation/preparation';
import { Brew } from '../../../classes/brew/brew';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { addIcons } from 'ionicons';
import { wifiOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonContent,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-brew-choose-preparation-to-brew',
  templateUrl: './brew-choose-preparation-to-brew.component.html',
  styleUrls: ['./brew-choose-preparation-to-brew.component.scss'],
  imports: [
    TranslatePipe,
    FormatDatePipe,
    IonHeader,
    IonContent,
    IonItem,
    IonIcon,
  ],
})
export class BrewChoosePreparationToBrewComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiSettings = inject(UISettingsStorage);

  public static COMPONENT_ID: string = 'brew-choose-preparation-to-brew';
  public settings: Settings;

  public preparationMethods: Array<Preparation> = [];

  constructor() {
    this.settings = this.uiSettings.getSettings();
    addIcons({ wifiOutline });
  }

  public ngOnInit() {
    this.preparationMethods = this.getPreparationMethods();
  }

  public getPreparationMethods(): Array<Preparation> {
    const allEntries = this.uiPreparationStorage
      .getAllEntries()
      .filter((e) => !e.finished);
    if (allEntries && allEntries.length > 0) {
      let clonedEntries = this.uiHelper.cloneData(allEntries);
      clonedEntries = clonedEntries.sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      });
      return clonedEntries;
    } else {
      return [];
    }
  }

  public choosePreparation(_prep: Preparation) {
    this.modalController.dismiss(
      {
        dismissed: true,
        preparation: _prep,
      },
      undefined,
      BrewChoosePreparationToBrewComponent.COMPONENT_ID,
    );
  }
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewChoosePreparationToBrewComponent.COMPONENT_ID,
    );
  }

  public lastUsed(_preparation: Preparation): number {
    let relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        _preparation.config.uuid,
      );
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      return relatedBrews[0].config.unix_timestamp;
    }
    return -1;
  }

  public getBrewsCount(_preparation: Preparation): number {
    const relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        _preparation.config.uuid,
      );
    return relatedBrews.length;
  }
}
