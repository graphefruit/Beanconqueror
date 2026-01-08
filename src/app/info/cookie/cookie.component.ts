import { Component, OnInit, inject } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { Settings } from '../../../classes/settings/settings';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonBackButton,
  IonContent,
  IonCard,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../components/header/header.component';

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
