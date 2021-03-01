import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {Brew} from '../../../classes/brew/brew';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {BREW_ACTION} from '../../../enums/brews/brewAction';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {Settings} from '../../../classes/settings/settings';

@Component({
  selector: 'brew-popover-actions',
  templateUrl: './brew-popover-actions.component.html',
  styleUrls: ['./brew-popover-actions.component.scss'],
})
export class BrewPopoverActionsComponent implements OnInit {


  public data: Brew = new Brew();
  private settings: Settings;

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettings: UISettingsStorage) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('brew'));
    this.settings = this.uiSettings.getSettings();
    this.data.initializeByObject(brew);
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'POPOVER_ACTIONS');
  }
  public ngOnInit() {

  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public hasCoordinates(): boolean {
    return (this.settings.track_brew_coordinates &&
      (this.data.coordinates.latitude!== undefined && this.data.coordinates.latitude !== null && this.data.coordinates.latitude !== 0) );
  }

  public hasFastBrewActivated(): boolean {
    return this.settings.fast_brew_repeat;
  }

  public getStaticActions(): any {
    return BREW_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(undefined, _type,'brew-popover-actions');
  }
  public async dismiss() {
    this.modalController.dismiss(undefined, undefined,'brew-popover-actions');
  }

}
