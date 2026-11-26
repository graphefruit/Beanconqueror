import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonRow,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../../components/header/header.component';
import { UILog } from '../../../../services/uiLog';

@Component({
  selector: 'log-text',
  templateUrl: './log-text.component.html',
  styleUrls: ['./log-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
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

  public ngOnInit(): void {
    this.logString = JSON.stringify(this.uiLog.getLogs());
    void this.uiLog.loadEarlier().then(() => {
      this.logString = JSON.stringify(this.uiLog.getLogs());
    });
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true,
    });
  }
}
