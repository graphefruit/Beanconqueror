import { Component, OnInit } from '@angular/core';
import {Settings} from '../../classes/settings/settings';
import {ModalController} from '@ionic/angular';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UISettingsStorage} from '../../services/uiSettingsStorage';

@Component({
  selector: 'analytics-popover',
  templateUrl: './analytics-popover.component.html',
  styleUrls: ['./analytics-popover.component.scss'],
})
export class AnalyticsPopoverComponent implements OnInit {
  public static POPOVER_ID:string = 'analytics-popover';
  private readonly settings: Settings;


  constructor(private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage,) {
    this.settings = this.uiSettingsStorage.getSettings();


  }

  public ngOnInit() {

  }

  public finish() {
    this.settings.matomo_analytics = true;
    this.uiSettingsStorage.saveSettings(this.settings);
    this.uiAnalytics.enableTracking();
    this.modalController.dismiss({
      dismissed: true
    }, undefined, AnalyticsPopoverComponent.POPOVER_ID);


  }

}
