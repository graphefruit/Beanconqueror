import { Component, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import { Platform, IonicModule } from '@ionic/angular';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class AboutComponent implements OnInit {
  public versionStr: string = '';

  public analyticsEnabled: boolean = false;
  public analyticsId: string = '';
  constructor(
    public platform: Platform,
    private readonly translate: TranslateService,
    private readonly uiSettingsStorage: UISettingsStorage,
  ) {}

  public async ngOnInit() {
    await this.setAppVersion();
    const settings = this.uiSettingsStorage.getSettings();
    this.analyticsEnabled = settings.matomo_analytics;
    this.analyticsId = settings.matomo_analytics_id;
  }

  public async setAppVersion() {
    this.versionStr = this.translate.instant('PAGE_ABOUT_NO_VERSION_AVAILABLE');
    if (this.platform.is('capacitor')) {
      const versionCode = (await App.getInfo()).version;
      this.versionStr =
        this.translate.instant('PAGE_ABOUT_APP_VERSION') + ': ' + versionCode;
    }
  }
}
