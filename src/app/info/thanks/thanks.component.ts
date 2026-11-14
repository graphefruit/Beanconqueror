import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { IonBackButton, IonContent, IonHeader } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';

@Component({
  selector: 'thanks',
  templateUrl: './thanks.component.html',
  styleUrls: ['./thanks.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
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
