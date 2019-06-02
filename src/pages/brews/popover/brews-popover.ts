import {Component} from '@angular/core';

import {ViewController} from 'ionic-angular';
@Component({
  templateUrl: 'brews-popover.html',
  selector: 'brews-popover'
})
export class BrewsPopover {

  public static ACTIONS: any = {
    "DOWNLOAD": "DOWNLOAD",
    "TABLE":"TABLE",
  };

  constructor(public viewCtrl: ViewController) {

  }

  public download() {
    this.viewCtrl.dismiss(BrewsPopover.ACTIONS.DOWNLOAD);

  }

  public table(){
    this.viewCtrl.dismiss(BrewsPopover.ACTIONS.TABLE);
  }


}
