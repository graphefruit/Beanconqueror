import {Component, OnInit} from '@angular/core';
import {PopoverController} from '@ionic/angular';

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


  constructor(private readonly popoverController: PopoverController) {
  }

  public ngOnInit() {
  }

  public getStaticActions(): any {
    return BrewPopoverActionsComponent.ACTIONS;
  }

  public async choose(_type: string): Promise<void> {
    this.popoverController.dismiss(undefined, _type);
  }


}
