import { Component, OnInit } from '@angular/core';
import { LogTextComponent } from '../../app/info/log/log-text/log-text.component';
import { ModalController, IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-filesystem-error-popover',
  templateUrl: './filesystem-error-popover.component.html',
  styleUrls: ['./filesystem-error-popover.component.scss'],
  imports: [IonicModule],
})
export class FilesystemErrorPopoverComponent implements OnInit {
  constructor(private readonly modalCtrl: ModalController) {}

  public ngOnInit() {}
  public async copyLogfiles(): Promise<any> {
    const modal = await this.modalCtrl.create({ component: LogTextComponent });
    await modal.present();
    await modal.onWillDismiss();
  }
}
