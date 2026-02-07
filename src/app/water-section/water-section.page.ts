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
  selector: 'water-section',
  templateUrl: './water-section.page.html',
  styleUrls: ['./water-section.page.scss'],
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
export class WaterSectionPage implements OnInit {
  public ngOnInit(): void {}

  constructor() {
    addIcons({ waterOutline });
  }
}

export default WaterSectionPage;
