import { Component, OnInit } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonMenuButton,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { BrewRatioCardComponent } from '../../../components/brew-ratio-card/brew-ratio-card.component';
import { HeaderComponent } from '../../../components/header/header.component';

@Component({
  selector: 'helper-brew-ratio',
  templateUrl: './helper-brew-ratio.component.html',
  styleUrls: ['./helper-brew-ratio.component.scss'],
  imports: [
    BrewRatioCardComponent,
    TranslatePipe,
    IonHeader,
    IonMenuButton,
    IonContent,
    HeaderComponent,
  ],
})
export class HelperBrewRatioComponent implements OnInit {
  constructor() {}

  public ngOnInit() {}
}
