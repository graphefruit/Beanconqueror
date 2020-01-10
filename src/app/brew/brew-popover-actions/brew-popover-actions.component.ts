import {Component, OnInit} from '@angular/core';
import {NavParams, PopoverController} from '@ionic/angular';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {Brew} from '../../../classes/brew/brew';
import {UIHelper} from '../../../services/uiHelper';

@Component({
  selector: 'brew-popover-actions',
  templateUrl: './brew-popover-actions.component.html',
  styleUrls: ['./brew-popover-actions.component.scss'],
})
export class BrewPopoverActionsComponent implements OnInit {

  public static ACTIONS: any = {
    POST: 'POST',
    REPEAT: 'REPEAT',
    DETAIL: 'DETAIL',
    EDIT: 'EDIT',
    DELETE: 'DELETE',
    PHOTO_GALLERY: 'PHOTO_GALLERY'
  };

  public data: Brew = new Brew();

  constructor(private readonly popoverController: PopoverController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('brew'));

    this.data.initializeByObject(brew);
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
