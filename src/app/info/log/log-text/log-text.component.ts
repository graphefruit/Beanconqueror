import { Component, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UILog } from '../../../../services/uiLog';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonFooter,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../../components/header/header.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';

@Component({
  selector: 'log-text',
  templateUrl: './log-text.component.html',
  styleUrls: ['./log-text.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonButton,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class LogTextComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiLog = inject(UILog);

  public logString: string = '';

  public ngOnInit() {
    this.logString = JSON.stringify(this.uiLog.getLogs());
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true,
    });
  }
}
