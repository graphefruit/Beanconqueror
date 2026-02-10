import { Component, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';

@Component({
  selector: 'app-impressum',
  templateUrl: './impressum.component.html',
  styleUrls: ['./impressum.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    HeaderComponent,
  ],
})
export class ImpressumComponent implements OnInit {
  constructor() {}

  public ngOnInit() {}
}
