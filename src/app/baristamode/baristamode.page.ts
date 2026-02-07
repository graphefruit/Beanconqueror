import { Component, OnInit } from '@angular/core';
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
