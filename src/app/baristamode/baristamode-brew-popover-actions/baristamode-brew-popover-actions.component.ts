import { Component, inject, Input, OnInit } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline, download } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import BaristamodeBrew from '../../../classes/brew/baristamodeBrew';
import { Settings } from '../../../classes/settings/settings';
import { BREW_ACTION } from '../../../enums/brews/brewAction';
import { IBaristamodeBrew } from '../../../interfaces/brew/iBaristamodeBrew';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'baristamode-brew-popover-actions',
  templateUrl: './baristamode-brew-popover-actions.component.html',
  styleUrls: ['./baristamode-brew-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class BaristamodeBrewPopoverActionsComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiSettings = inject(UISettingsStorage);

  public static COMPONENT_ID = 'baristamode-brew-popover-actions';
  public data: BaristamodeBrew = new BaristamodeBrew();
  public settings: Settings;

  @Input('brew') public brew: IBaristamodeBrew;

  constructor() {
    this.settings = this.uiSettings.getSettings();
    addIcons({
      analyticsOutline,
      download,
    });
  }

  public ngOnInit() {
    const brew: IBaristamodeBrew = this.uiHelper.copyData(this.brew);
    this.data.initializeByObject(brew);
  }

  public hasFlowProfile(): boolean {
    return !!(this.data.flow_profile && this.data.flow_profile.length > 0);
  }

  public getStaticActions(): any {
    return BREW_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      BaristamodeBrewPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      BaristamodeBrewPopoverActionsComponent.COMPONENT_ID,
    );
  }
}
