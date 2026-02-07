import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonBackButton,
  IonContent,
} from '@ionic/angular/standalone';
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
