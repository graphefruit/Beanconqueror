import { Component, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';

@Component({
  selector: 'thanks',
  templateUrl: './thanks.component.html',
  styleUrls: ['./thanks.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    HeaderComponent,
  ],
})
export class ThanksComponent implements OnInit {
  constructor() {}

  public ngOnInit() {}
}
