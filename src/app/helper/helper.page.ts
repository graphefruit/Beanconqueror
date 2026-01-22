import { Component } from '@angular/core';

import {
  IonContent,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { waterOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

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
