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
import { analyticsOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-graph-section',
  templateUrl: './graph-section.page.html',
  styleUrls: ['./graph-section.page.scss'],
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
export class GraphSectionPage implements OnInit {
  constructor() {
    addIcons({ analyticsOutline });
  }

  public ngOnInit() {}
}

export default GraphSectionPage;
