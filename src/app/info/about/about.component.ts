import { Component, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent implements OnInit {
  public versionStr: string = '';

  constructor(
    public platform: Platform,
    private readonly translate: TranslateService
  ) {}

  public async ngOnInit() {
    await this.setAppVersion();
  }

  public async setAppVersion() {
    this.versionStr = this.translate.instant('PAGE_ABOUT_NO_VERSION_AVAILABLE');
    if (this.platform.is('cordova')) {
      const versionCode = (await App.getInfo()).version;
      this.versionStr =
        this.translate.instant('PAGE_ABOUT_APP_VERSION') + ': ' + versionCode;
    }
  }
}
