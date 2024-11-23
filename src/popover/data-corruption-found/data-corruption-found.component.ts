import { Component, Input, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';

@Component({
    selector: 'app-data-corruption-found',
    templateUrl: './data-corruption-found.component.html',
    styleUrls: ['./data-corruption-found.component.scss'],
    standalone: false
})
export class DataCorruptionFoundComponent implements OnInit {
  public static POPOVER_ID: string = 'data-corruption-found-popover';

  @Input() public actualUIStorageDataObj: any = undefined;
  @Input() public backupDataObj: any = undefined;

  private disableHardwareBack;

  constructor(
    private readonly modalController: ModalController,
    private readonly platform: Platform
  ) {}

  public ngOnInit() {
    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          // Don't do anything.
        }
      );
    } catch (ex) {}
  }

  public async dismiss() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}

    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      DataCorruptionFoundComponent.POPOVER_ID
    );
  }

  public async import() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}

    this.modalController.dismiss(
      {
        dismissed: true,
        import: true,
      },
      undefined,
      DataCorruptionFoundComponent.POPOVER_ID
    );
  }
}
