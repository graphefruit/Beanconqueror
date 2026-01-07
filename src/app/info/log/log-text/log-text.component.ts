import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UILog } from '../../../../services/uiLog';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'log-text',
  templateUrl: './log-text.component.html',
  styleUrls: ['./log-text.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class LogTextComponent implements OnInit {
  public logString: string = '';

  constructor(
    private readonly modalController: ModalController,
    private readonly uiLog: UILog,
  ) {}

  public ngOnInit() {
    this.logString = JSON.stringify(this.uiLog.getLogs());
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true,
    });
  }
}
