import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { analyticsOutline } from 'ionicons/icons';
import {
  IonContent,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';

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
