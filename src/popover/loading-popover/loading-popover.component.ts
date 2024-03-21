import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'loading-popover',
  templateUrl: './loading-popover.component.html',
  styleUrls: ['./loading-popover.component.scss'],
})
export class LoadingPopoverComponent implements OnInit {
  public __showDismissButton: boolean = false;
  @Input('showDismissAfterSpecificTimeout')
  public showDismissAfterSpecificTimeout: boolean;
  @Input('message') public message: string;
  private timeoutFunc = null;
  constructor(private readonly modalController: ModalController) {}

  public ngOnInit() {
    if (this.showDismissAfterSpecificTimeout) {
      this.timeoutFunc = setTimeout(() => {
        this.showDismissButton();
      }, 10000);
    }
  }
  public ngOnDestroy() {
    if (this.timeoutFunc) {
      clearTimeout(this.timeoutFunc);
    }
  }

  public ok() {
    this.modalController.dismiss({
      dismissed: true,
    });
  }
  public showDismissButton() {
    this.__showDismissButton = true;
  }
}
