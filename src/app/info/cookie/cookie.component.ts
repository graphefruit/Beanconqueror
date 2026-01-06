import { Component, OnInit } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { Settings } from '../../../classes/settings/settings';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-cookie',
  templateUrl: './cookie.component.html',
  styleUrls: ['./cookie.component.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class CookieComponent implements OnInit {
  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ngOnInit() {}

  public disableTracking() {}
}
