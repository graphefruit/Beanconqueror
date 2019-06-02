import { Component } from '@angular/core';

import { ViewController } from 'ionic-angular';
@Component({
  templateUrl: 'brews-popover.html',
  selector: 'brews-popover'
})
export class BrewsPopover {

  public static ACTIONS: any = {
    DOWNLOAD: 'DOWNLOAD',
    TABLE: 'TABLE'
  };

  constructor(public viewCtrl: ViewController) {

  }

  public download(): void {
    this.viewCtrl.dismiss(BrewsPopover.ACTIONS.DOWNLOAD);

  }

  public table(): void {
    this.viewCtrl.dismiss(BrewsPopover.ACTIONS.TABLE);
  }

}
