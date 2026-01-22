import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { HeaderComponent } from '../../../components/header/header.component';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-cookie',
  templateUrl: './cookie.component.html',
  styleUrls: ['./cookie.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    HeaderComponent,
  ],
})
export class CookieComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);

  public ngOnInit() {}

  public disableTracking() {}
}
