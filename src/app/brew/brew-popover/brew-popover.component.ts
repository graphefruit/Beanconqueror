import {Component, OnInit} from '@angular/core';
import {PopoverController} from '@ionic/angular';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'brew-popover',
  templateUrl: './brew-popover.component.html',
  styleUrls: ['./brew-popover.component.scss'],
})
export class BrewPopoverComponent implements OnInit {

  public static ACTIONS: any = {
    DOWNLOAD: 'DOWNLOAD',
    TABLE: 'TABLE',
    RESET_FILTER: 'RESET_FILTER',
  };


  constructor(private readonly popoverController: PopoverController,
              private readonly uiAnalytics: UIAnalytics) {
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'POPOVER');
  }

  public ngOnInit() {
  }

  public async download() {
     this.popoverController.dismiss(undefined,BrewPopoverComponent.ACTIONS.DOWNLOAD);
  }

  public table(): void {
    this.popoverController.dismiss(undefined,BrewPopoverComponent.ACTIONS.TABLE);
  }

  public resetFilter(): void {
    this.popoverController.dismiss(undefined, BrewPopoverComponent.ACTIONS.RESET_FILTER);
  }

}
