import { Component, inject, OnInit } from '@angular/core';

import {
  IonButton,
  IonContent,
  IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowDownOutline } from 'ionicons/icons';

import { LogTextComponent } from '../../app/info/log/log-text/log-text.component';

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
