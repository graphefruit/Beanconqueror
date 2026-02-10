import { Component, OnInit } from '@angular/core';

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
  selector: 'app-baristamode',
  templateUrl: './baristamode.page.html',
  styleUrls: ['./baristamode.page.scss'],
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
export class BaristamodePage implements OnInit {
  public ngOnInit(): void {}

  constructor() {
    addIcons({ waterOutline });
  }
}

export default BaristamodePage;
