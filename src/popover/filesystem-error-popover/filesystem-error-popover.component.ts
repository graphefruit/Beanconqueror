import { Component, OnInit, inject } from '@angular/core';
import { LogTextComponent } from '../../app/info/log/log-text/log-text.component';
import { ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowDownOutline } from 'ionicons/icons';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-filesystem-error-popover',
  templateUrl: './filesystem-error-popover.component.html',
  styleUrls: ['./filesystem-error-popover.component.scss'],
  imports: [IonContent, IonButton, IonIcon],
})
export class FilesystemErrorPopoverComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ arrowDownOutline });
  }

  public ngOnInit() {}
  public async copyLogfiles(): Promise<any> {
    const modal = await this.modalCtrl.create({ component: LogTextComponent });
    await modal.present();
    await modal.onWillDismiss();
  }
}
