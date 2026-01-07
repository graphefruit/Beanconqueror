import { Component, OnInit } from '@angular/core';
import { BrewRatioCardComponent } from '../../../components/brew-ratio-card/brew-ratio-card.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'helper-brew-ratio',
  templateUrl: './helper-brew-ratio.component.html',
  styleUrls: ['./helper-brew-ratio.component.scss'],
  imports: [
    BrewRatioCardComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
  ],
})
export class HelperBrewRatioComponent implements OnInit {
  constructor() {}

  public ngOnInit() {}
}
