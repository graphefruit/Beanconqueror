import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCheckbox,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { wifiOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { AsyncImageComponent } from '../../../components/async-image/async-image.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PREPARATION_FUNCTION_PIPE_ENUM } from '../../../enums/preparations/preparationFunctionPipe';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { PreparationFunction } from '../../../pipes/preparation/preparationFunction';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'preparation-modal-select',
  templateUrl: './preparation-modal-select.component.html',
  styleUrls: ['./preparation-modal-select.component.scss'],
  imports: [
    FormsModule,
    NgTemplateOutlet,
    AsyncImageComponent,
    TranslatePipe,
    FormatDatePipe,
    PreparationFunction,
    IonHeader,
    IonContent,
    IonIcon,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRadioGroup,
    IonCard,
    IonItem,
    IonCheckbox,
    IonRadio,
    IonFooter,
    IonRow,
    IonCol,
    IonThumbnail,
    IonButton,
  ],
})
export class PreparationModalSelectComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiSettings = inject(UISettingsStorage);

  public static COMPONENT_ID = 'preparation-modal-select';
  public objs: Array<Preparation> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public preparation_segment: string = 'open';

  public openPreparations: Array<Preparation> = [];
  public archivedPreparations: Array<Preparation> = [];
  public uiBrewsCountCache: any = {};
  public uiLastUsedCountCache: any = {};
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  public settings: Settings;
  constructor() {
    this.objs = this.uiPreparationStorage.getAllEntries();
    this.settings = this.uiSettings.getSettings();
    this.openPreparations = this.getOpenPreparations();
    this.archivedPreparations = this.getArchivedPreparations();
    addIcons({ wifiOutline });
  }

  public ionViewDidEnter(): void {
    if (this.multiple) {
      for (const obj of this.objs) {
        this.multipleSelection[obj.config.uuid] =
          this.selectedValues.filter((e) => e === obj.config.uuid).length > 0;
      }
    } else {
      if (this.selectedValues.length > 0) {
        this.radioSelection = this.selectedValues[0];
      }
    }
  }

  public ngOnInit() {}

  public getOpenPreparations(): Array<Preparation> {
    return this.objs
      .filter((e) => !e.finished)
      .sort((a, b) => {
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
  }

  public getArchivedPreparations(): Array<Preparation> {
    return this.objs
      .filter((e) => e.finished)
      .sort((a, b) => {
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
  }

  public async choose(): Promise<void> {
    const chosenKeys: Array<string> = [];
    if (this.multiple) {
      for (const key in this.multipleSelection) {
        if (this.multipleSelection[key] === true) {
          chosenKeys.push(key);
        }
      }
    } else {
      chosenKeys.push(this.radioSelection);
    }
    let selected_text: string = '';

    for (const val of chosenKeys) {
      const preparation: Preparation = this.uiPreparationStorage.getByUUID(val);
      selected_text += preparation.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss(
      {
        selected_values: chosenKeys,
        selected_text: selected_text,
      },
      undefined,
      PreparationModalSelectComponent.COMPONENT_ID,
    );
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      PreparationModalSelectComponent.COMPONENT_ID,
    );
  }

  public lastUsed(_preparation: Preparation): number {
    if (this.uiLastUsedCountCache[_preparation.config.uuid] === undefined) {
      let relatedBrews: Array<Brew> =
        this.uiPreparationHelper.getAllBrewsForThisPreparation(
          _preparation.config.uuid,
        );
      if (relatedBrews.length > 0) {
        relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
        this.uiLastUsedCountCache[_preparation.config.uuid] =
          relatedBrews[0].config.unix_timestamp;
      } else {
        this.uiLastUsedCountCache[_preparation.config.uuid] = -1;
      }
    }
    return this.uiLastUsedCountCache[_preparation.config.uuid];
  }

  public getBrewsCount(_preparation: Preparation): number {
    if (this.uiBrewsCountCache[_preparation.config.uuid] === undefined) {
      const relatedBrews: Array<Brew> =
        this.uiPreparationHelper.getAllBrewsForThisPreparation(
          _preparation.config.uuid,
        );
      this.uiBrewsCountCache[_preparation.config.uuid] = relatedBrews.length;
    }
    return this.uiBrewsCountCache[_preparation.config.uuid];
  }

  protected readonly PREPARATION_FUNCTION_PIPE_ENUM =
    PREPARATION_FUNCTION_PIPE_ENUM;
}
