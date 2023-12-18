import { Component, Input, OnInit } from '@angular/core';

import { ModalController } from '@ionic/angular';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Preparation } from '../../../classes/preparation/preparation';
import { Brew } from '../../../classes/brew/brew';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'preparation-modal-select',
  templateUrl: './preparation-modal-select.component.html',
  styleUrls: ['./preparation-modal-select.component.scss'],
})
export class PreparationModalSelectComponent implements OnInit {
  public static COMPONENT_ID = 'preparation-modal-select';
  public objs: Array<Preparation> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public preparation_segment: string = 'open';
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  public settings: Settings;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiSettings: UISettingsStorage
  ) {
    this.objs = this.uiPreparationStorage.getAllEntries();
    this.settings = this.uiSettings.getSettings();
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
      PreparationModalSelectComponent.COMPONENT_ID
    );
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      PreparationModalSelectComponent.COMPONENT_ID
    );
  }

  public lastUsed(_preparation: Preparation): number {
    let relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        _preparation.config.uuid
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
        _preparation.config.uuid
      );
    return relatedBrews.length;
  }
}
