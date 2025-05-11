/** Core */
import { Injectable } from '@angular/core';
/** Ionic */
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { UIHelper } from './uiHelper';

import { Settings } from '../classes/settings/settings';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIAlert } from './uiAlert';
import { UILog } from './uiLog';
import { NavigationEnd, Router } from '@angular/router';

declare var window;
declare var Matomo;
@Injectable({
  providedIn: 'root',
})
export class UIAnalytics {
  private canTrack: boolean = false;
  private matomoTracker: any = undefined;

  constructor(
    private readonly alertController: AlertController,
    private readonly translate: TranslateService,
    private readonly uiHelper: UIHelper,
    private readonly uiSettings: UISettingsStorage,
    private readonly uiAlert: UIAlert,
    private readonly uiLog: UILog,
    private readonly router: Router,
  ) {}

  public async initializeTracking(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        this.__attachToRoutingEvents();

        await this.uiSettings.storageReady();
        this.matomoTracker = Matomo.getTracker();
        const settings: Settings = this.uiSettings.getSettings();
        if (settings.matomo_analytics === true) {
          await this.enableTracking();
        } else {
          this.disableTracking();
        }
      } catch (ex) {}
      resolve(undefined);
    });
  }

  public async enableTracking() {
    this.canTrack = true;
    this.uiLog.log('Tracking enabled');
    try {
      this.matomoTracker.setConsentGiven();
      await this._setUserId();

      this.canTrack = true;
    } catch (ex) {
      this.uiLog.error(ex.message);
    }
  }
  private async _setUserId() {
    try {
      const settings: Settings = this.uiSettings.getSettings();
      if (settings.matomo_analytics_id) {
      } else {
        settings.matomo_analytics_id = UIHelper.generateUUID();
        await this.uiSettings.saveSettings(settings);
      }
      this.matomoTracker.setUserId(settings.matomo_analytics_id);
    } catch (ex) {}
  }

  public disableTracking() {
    this.canTrack = false;
    this.uiLog.log('Tracking disabled');
    try {
      this.matomoTracker.requireConsent();
      this.canTrack = false;
    } catch (ex) {
      this.uiLog.error(ex.message);
    }
  }

  public trackPage(_pageName: string) {
    if (this.canTrack) {
      this.__trackPageFB(_pageName);
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED - But we would track page: Page:${_pageName}`,
      );
    }
  }

  public trackEvent(_category, _action, _name?) {
    if (this.canTrack) {
      try {
        this.__trackEventFB(_category, _action, _name);
      } catch (ex) {}
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED - But we would track event: Category:${_category}, Action: ${_action}`,
      );
    }
  }

  public trackCustomDimension(_segmentId: number, _value: string) {
    if (this.canTrack) {
      try {
        this.matomoTracker.setCustomDimension(_segmentId, _value);
      } catch (ex) {}
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED - But we would track event: Custom Dimension :${_segmentId}, Value: ${_value}`,
      );
    }
  }

  public trackContentImpression(_contentName: string, _contentPiece: string) {
    if (this.canTrack) {
      try {
        this.matomoTracker.trackContentImpression(_contentName, _contentPiece);
      } catch (ex) {}
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED - But we would track event: Content Impression :${_contentName}, Piece: ${_contentPiece}`,
      );
    }
  }

  private __attachToRoutingEvents() {
    this.router.events.subscribe((val) => {
      // see also
      if (val instanceof NavigationEnd) {
        const nav: NavigationEnd = val;
        this.trackPage(nav.urlAfterRedirects);
      }
    });
  }

  private __trackPageFB(_pageName: string) {
    try {
      if (this.canTrack) {
        this.matomoTracker.setDocumentTitle(_pageName);
        this.matomoTracker.trackPageView(_pageName);
        this.uiLog.log('SUCCESS - Track Page - ' + _pageName);
      }
    } catch (ex) {}
  }

  private __trackEventFB(_category, _action, _name?) {
    if (this.canTrack) {
      try {
        if (_name) {
          this.matomoTracker.trackEvent(_category, _action, _name);
          this.uiLog.log(
            'SUCCESS - Track event page - Category:' +
              _category +
              ' Action:' +
              _action +
              ' Name:' +
              _name,
          );
        } else {
          this.matomoTracker.trackEvent(_category, _action);
          this.uiLog.log(
            'SUCCESS - Track event page - Category:' +
              _category +
              ' Action:' +
              _action,
          );
        }
      } catch (ex) {}
    }
  }
}
