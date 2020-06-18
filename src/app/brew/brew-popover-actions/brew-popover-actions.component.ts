import {Component, OnInit} from '@angular/core';
import {NavParams, PopoverController} from '@ionic/angular';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {Brew} from '../../../classes/brew/brew';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'brew-popover-actions',
  templateUrl: './brew-popover-actions.component.html',
  styleUrls: ['./brew-popover-actions.component.scss'],
})
export class BrewPopoverActionsComponent implements OnInit {

  public static ACTIONS: any = {
    REPEAT: 'REPEAT',
    DETAIL: 'DETAIL',
    EDIT: 'EDIT',
    DELETE: 'DELETE',
    PHOTO_GALLERY: 'PHOTO_GALLERY'
  };

  public data: Brew = new Brew();

  constructor(private readonly popoverController: PopoverController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('brew'));

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

  public getStaticActions(): any {
    return BrewPopoverActionsComponent.ACTIONS;
  }

  public async choose(_type: string): Promise<void> {
    this.popoverController.dismiss(undefined, _type);
  }


}
