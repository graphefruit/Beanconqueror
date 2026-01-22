import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  helpBuoyOutline,
  informationCircleOutline,
} from 'ionicons/icons';

import { App } from '@capacitor/app';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    IonItem,
    IonIcon,
    HeaderComponent,
  ],
})
export class AboutComponent implements OnInit {
  platform = inject(Platform);
  private readonly translate = inject(TranslateService);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public versionStr: string = '';

  public analyticsEnabled: boolean = false;
  public analyticsId: string = '';
  constructor() {
    addIcons({ informationCircleOutline, analyticsOutline, helpBuoyOutline });
  }

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
