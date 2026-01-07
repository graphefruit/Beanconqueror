import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { waterOutline } from 'ionicons/icons';
import {
  IonContent,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';

@Component({
  selector: 'helper',
  templateUrl: './helper.page.html',
  styleUrls: ['./helper.page.scss'],
  imports: [
    TranslatePipe,
    IonContent,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
  ],
})
export class HelperPage {
  constructor() {
    addIcons({ waterOutline });
  }
}

export default HelperPage;
