import { Component, OnInit, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular/standalone';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { addIcons } from 'ionicons';
import {
  informationCircleOutline,
  analyticsOutline,
  helpBuoyOutline,
} from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonItem,
    IonIcon,
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
