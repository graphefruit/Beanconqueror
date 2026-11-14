import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import {
  IonContent,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { waterOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'water-section',
  templateUrl: './water-section.page.html',
  styleUrls: ['./water-section.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
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
