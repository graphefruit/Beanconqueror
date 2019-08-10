import { Component, OnInit } from '@angular/core';
import {ModalController, PopoverController} from '@ionic/angular';

@Component({
  selector: 'brew-popover',
  templateUrl: './brew-popover.component.html',
  styleUrls: ['./brew-popover.component.scss'],
})
export class BrewPopoverComponent implements OnInit {

  constructor(private readonly popoverController: PopoverController) { }

  public ngOnInit() {}

  public static ACTIONS: any = {
    DOWNLOAD: 'DOWNLOAD',
    TABLE: 'TABLE'
  };


  public async download() {
     this.popoverController.dismiss(undefined,BrewPopoverComponent.ACTIONS.DOWNLOAD);

  }

  public table(): void {
    this.popoverController.dismiss(undefined,BrewPopoverComponent.ACTIONS.TABLE);
  }

}
