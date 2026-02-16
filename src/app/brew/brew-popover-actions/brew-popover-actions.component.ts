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
import {
  analyticsOutline,
  heart,
  heartOutline,
  shareSocialOutline,
  trophy,
  trophyOutline,
} from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { BREW_ACTION } from '../../../enums/brews/brewAction';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'brew-popover-actions',
  templateUrl: './brew-popover-actions.component.html',
  styleUrls: ['./brew-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class BrewPopoverActionsComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiSettings = inject(UISettingsStorage);
  private readonly uiBrewHelper = inject(UIBrewHelper);

  public static COMPONENT_ID = 'brew-popover-actions';
  public data: Brew = new Brew();
  public settings: Settings;

  @Input('brew') public brew: IBrew;

  constructor() {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range

    this.settings = this.uiSettings.getSettings();
    addIcons({
      heartOutline,
      heart,
      trophyOutline,
      trophy,
      shareSocialOutline,
      analyticsOutline,
    });
  }

  public ionViewDidEnter(): void {}
  public ngOnInit() {
    const brew: IBrew = this.uiHelper.copyData(this.brew);
    this.data.initializeByObject(brew);
  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public hasFlowProfile(): boolean {
    return this.data.flow_profile && this.data.flow_profile.length > 0;
  }

  public hasCoordinates(): boolean {
    return (
      this.settings.track_brew_coordinates &&
      this.data.coordinates.latitude !== undefined &&
      this.data.coordinates.latitude !== null &&
      this.data.coordinates.latitude !== 0
    );
  }

  public isRatingEnabled() {
    return this.uiBrewHelper.fieldVisible(
      this.settings.manage_parameters.rating,
      this.data.getPreparation().manage_parameters.rating,
      this.data.getPreparation().use_custom_parameters,
    );
  }

  public hasFastBrewActivated(): boolean {
    return this.settings.fast_brew_repeat;
  }

  public getStaticActions(): any {
    return BREW_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      BrewPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      BrewPopoverActionsComponent.COMPONENT_ID,
    );
  }
}
