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

import { TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Settings } from '../../../classes/settings/settings';
import { AsyncImageComponent } from '../../../components/async-image/async-image.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { MILL_FUNCTION_PIPE_ENUM } from '../../../enums/mills/millFunctionPipe';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { MillFunction } from '../../../pipes/mill/millFunction';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'mill-modal-select',
  templateUrl: './mill-modal-select.component.html',
  styleUrls: ['./mill-modal-select.component.scss'],
  imports: [
    FormsModule,
    NgTemplateOutlet,
    AsyncImageComponent,
    TranslatePipe,
    FormatDatePipe,
    MillFunction,
    IonHeader,
    IonContent,
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
export class MillModalSelectComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiMillHelper = inject(UIMillHelper);
  private readonly uiSettings = inject(UISettingsStorage);

  public static COMPONENT_ID = 'mill-modal-select';
  public objs: Array<Mill> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public mill_segment: string = 'open';

  public openMills: Array<Mill> = [];
  public archivedMills: Array<Mill> = [];
  public uiBrewsCountCache: any = {};
  public uiLastUsedCountCache: any = {};
  public uiLastUsedGrindSizeCache: any = {};
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  public settings: Settings;
  constructor() {
    this.settings = this.uiSettings.getSettings();
  }

  public ionViewDidEnter(): void {
    this.objs = this.uiMillStorage.getAllEntries();

    this.openMills = this.getOpenMills();
    this.archivedMills = this.getArchivedMills();
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
      MillModalSelectComponent.COMPONENT_ID,
    );
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      MillModalSelectComponent.COMPONENT_ID,
    );
  }

  public getLastUsedGrindSizeForBrew(_mill: Mill): string {
    if (this.uiLastUsedGrindSizeCache[_mill.config.uuid] === undefined) {
      let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
        _mill.config.uuid,
      );
      if (relatedBrews.length > 0) {
        relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
        if (relatedBrews[0].mill_speed > 0) {
          this.uiLastUsedGrindSizeCache[_mill.config.uuid] =
            relatedBrews[0].grind_size + ' @ ' + relatedBrews[0].mill_speed;
        } else {
          this.uiLastUsedGrindSizeCache[_mill.config.uuid] =
            relatedBrews[0].grind_size;
        }
      } else {
        this.uiLastUsedGrindSizeCache[_mill.config.uuid] = '-';
      }
    }
    return this.uiLastUsedGrindSizeCache[_mill.config.uuid];
  }

  public lastUsed(_mill: Mill): number {
    if (this.uiLastUsedCountCache[_mill.config.uuid] === undefined) {
      let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
        _mill.config.uuid,
      );
      if (relatedBrews.length > 0) {
        relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
        this.uiLastUsedCountCache[_mill.config.uuid] =
          relatedBrews[0].config.unix_timestamp;
      } else {
        this.uiLastUsedCountCache[_mill.config.uuid] = -1;
      }
    }
    return this.uiLastUsedCountCache[_mill.config.uuid];
  }

  public getBrewsCount(_mill: Mill): number {
    if (this.uiBrewsCountCache[_mill.config.uuid] === undefined) {
      const relatedBrews: Array<Brew> =
        this.uiMillHelper.getAllBrewsForThisMill(_mill.config.uuid);
      this.uiBrewsCountCache[_mill.config.uuid] = relatedBrews.length;
    }
    return this.uiBrewsCountCache[_mill.config.uuid];
  }

  protected readonly MILL_FUNCTION_PIPE_ENUM = MILL_FUNCTION_PIPE_ENUM;
}
