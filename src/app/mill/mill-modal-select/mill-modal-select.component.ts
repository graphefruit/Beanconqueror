import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { Mill } from '../../../classes/mill/mill';
import { Brew } from '../../../classes/brew/brew';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';

@Component({
  selector: 'mill-modal-select',
  templateUrl: './mill-modal-select.component.html',
  styleUrls: ['./mill-modal-select.component.scss'],
})
export class MillModalSelectComponent implements OnInit {
  public static COMPONENT_ID = 'mill-modal-select';
  public objs: Array<Mill> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public mill_segment: string = 'open';
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  public settings: Settings;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiMillHelper: UIMillHelper,
    private readonly uiSettings: UISettingsStorage
  ) {
    this.settings = this.uiSettings.getSettings();
  }

  public ionViewDidEnter(): void {
    this.objs = this.uiMillStorage.getAllEntries();
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

  public getOpenMills(): Array<Mill> {
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

  public getArchivedMills(): Array<Mill> {
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
      const mill: Mill = this.uiMillStorage.getByUUID(val);
      selected_text += mill.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss(
      {
        selected_values: chosenKeys,
        selected_text: selected_text,
      },
      undefined,
      MillModalSelectComponent.COMPONENT_ID
    );
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      MillModalSelectComponent.COMPONENT_ID
    );
  }

  public getLastUsedGrindSizeForBrew(_mill: Mill): string {
    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      _mill.config.uuid
    );
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      if (relatedBrews[0].mill_speed > 0) {
        return relatedBrews[0].grind_size + ' @ ' + relatedBrews[0].mill_speed;
      } else {
        return relatedBrews[0].grind_size;
      }
    }
    return '-';
  }

  public lastUsed(_mill: Mill): number {
    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      _mill.config.uuid
    );
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      return relatedBrews[0].config.unix_timestamp;
    }
    return -1;
  }

  public getBrewsCount(_mill: Mill): number {
    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      _mill.config.uuid
    );
    return relatedBrews.length;
  }
}
