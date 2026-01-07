import { Component, Input, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonFooter,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-data-corruption-found',
  templateUrl: './data-corruption-found.component.html',
  styleUrls: ['./data-corruption-found.component.scss'],
  imports: [
    IonHeader,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon,
    IonFooter,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class DataCorruptionFoundComponent implements OnInit {
  public static POPOVER_ID: string = 'data-corruption-found-popover';

  @Input() public actualUIStorageDataObj: any = undefined;
  @Input() public backupDataObj: any = undefined;
  @Input() public isAutomaticBackup: boolean = false;

  private disableHardwareBack;

  constructor(
    private readonly modalController: ModalController,
    private readonly platform: Platform,
  ) {
    addIcons({ alertCircleOutline });
  }

  public ngOnInit() {
    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          // Don't do anything.
        },
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
      DataCorruptionFoundComponent.POPOVER_ID,
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
      DataCorruptionFoundComponent.POPOVER_ID,
    );
  }
}
