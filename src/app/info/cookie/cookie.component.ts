import { Component, OnInit, inject } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { Settings } from '../../../classes/settings/settings';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-cookie',
  templateUrl: './cookie.component.html',
  styleUrls: ['./cookie.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
  ],
})
export class CookieComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);

  public ngOnInit() {}

  public disableTracking() {}
}
