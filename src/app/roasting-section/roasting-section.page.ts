import { Component, OnInit } from '@angular/core';

import {
  IonContent,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-roasting-section',
  templateUrl: './roasting-section.page.html',
  styleUrls: ['./roasting-section.page.scss'],
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
export class RoastingSectionPage implements OnInit {
  constructor() {}

  public ngOnInit() {}
}

export default RoastingSectionPage;
