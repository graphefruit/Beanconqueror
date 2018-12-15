import {Component, ViewChild, ElementRef} from '@angular/core';

import {ViewController, NavParams} from 'ionic-angular';
@Component({
  templateUrl: 'brews-popover.html',
  selector: 'brews-popover'
})
export class BrewsPopover {

  public static ACTIONS: any = {
    "DOWNLOAD": "DOWNLOAD",
    "TABLE":"TABLE",
  };

  constructor(private navParams: NavParams, public viewCtrl: ViewController) {

  }

  public download() {
    this.viewCtrl.dismiss(BrewsPopover.ACTIONS.DOWNLOAD);

  }

  public table(){
    this.viewCtrl.dismiss(BrewsPopover.ACTIONS.TABLE);
  }


}
