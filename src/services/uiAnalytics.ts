/** Core */
import {Injectable} from '@angular/core';
/** Ionic */
import {AlertController} from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';
import {UIHelper} from './uiHelper';

import {Settings} from '../classes/settings/settings';
import {UISettingsStorage} from './uiSettingsStorage';
import {UIAlert} from './uiAlert';
import {UILog} from './uiLog';
import {NavigationEnd, Router} from '@angular/router';

declare var window;
declare var Matomo;
@Injectable({
  providedIn: 'root'
})
export class UIAnalytics {

  private canTrack: boolean = true;
  private matomoTracker: any = undefined;

  constructor(private readonly alertController: AlertController,
              private readonly translate: TranslateService,
              private readonly uiHelper: UIHelper,
              private readonly uiSettings: UISettingsStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiLog: UILog,
              private readonly router: Router) {
  }

  public async initializeTracking(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.__attachToRoutingEvents();

      await this.uiSettings.storageReady();
      this.matomoTracker = Matomo.getTracker();
      resolve();

    });
  }

  public trackPage(_pageName: string) {
    if (this.canTrack) {
      this.__trackPageFB(_pageName);
    } else {
      this.uiLog.info(`ANALYTICS - DISABLED - But we would track page: Page:${_pageName}`);
    }
  }

  public trackEvent(_category, _action,_name?,_value?) {
    if (this.canTrack) {
      try {

        this.__trackEventFB(_category, _action,_name,_value);

      } catch (ex) {

      }
    } else {
      this.uiLog.info(`ANALYTICS - DISABLED - But we would track event: Category:${_category}, Action: ${_action}`);
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
        this.matomoTracker.trackPageView(_pageName);
        this.matomoTracker.setDocumentTitle(_pageName);
        this.uiLog.log('SUCCESS - Track Page - ' + _pageName);
      }
    } catch (ex) {
    }
  }


  private __trackEventFB(_category, _action,_name?,_value?) {
    if (this.canTrack) {
      try {

        if (_name && _value) {
          this.matomoTracker.trackEvent(_category,_action,_name,_value);
          this.uiLog.log('SUCCESS - Track event page - Category:' + _category + ' Action:' + _action + ' Name:' + _name + ' Value:' + _value);
        } else {
          this.matomoTracker.trackEvent(_category,_action);
          this.uiLog.log('SUCCESS - Track event page - Category:' + _category + ' Action:' + _action);
        }

        this.uiLog.log('SUCCESS - Track event page - Category:' + _category + ' Action:' + _action);
      } catch (ex) {

      }
    }
  }

}
