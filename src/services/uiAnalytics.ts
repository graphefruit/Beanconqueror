import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { UIHelper } from './uiHelper';

import { Settings } from '../classes/settings/settings';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIAlert } from './uiAlert';
import { UILog } from './uiLog';
import { NavigationEnd, Router } from '@angular/router';

declare var Matomo;

interface IEventPayload {
  category: string;
  action: string;
  name?: string;
  value?: number;
}

@Injectable({
  providedIn: 'root',
})
export class UIAnalytics {
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiSettings = inject(UISettingsStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiLog = inject(UILog);
  private readonly router = inject(Router);

  private canTrack: boolean = false;
  private matomoTracker: any = undefined;
  private matomoUrl: string = 'https://analytics-beanconqueror.com/matomo.php'; // Extracted from index.html
  private siteId: string = '2'; // Extracted from index.html

  public async initializeTracking(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        this.__attachToRoutingEvents();

        await this.uiSettings.storageReady();
        this.matomoTracker = Matomo.getTracker(); // Still useful for other tracking methods
        const settings: Settings = this.uiSettings.getSettings();
        if (settings.matomo_analytics === true) {
          await this.enableTracking();
        } else {
          this.disableTracking();
        }
      } catch (ex) {
        this.uiLog.error('Error initializing Matomo tracking', ex);
      }
      resolve(undefined);
    });
  }

  public async enableTracking() {
    this.canTrack = true;
    this.uiLog.log('Tracking enabled');
    try {
      if (this.matomoTracker) {
        this.matomoTracker.setConsentGiven();
      }
      await this._setUserId();
      this.canTrack = true;
    } catch (ex) {
      this.uiLog.error(ex.message);
    }
  }
  private async _setUserId() {
    try {
      const settings: Settings = this.uiSettings.getSettings();
      let userId = settings.matomo_analytics_id;
      if (!userId) {
        userId = UIHelper.generateUUID();
        settings.matomo_analytics_id = userId;
        await this.uiSettings.saveSettings(settings);
      }
      if (this.matomoTracker) {
        this.matomoTracker.setUserId(userId);
      }
    } catch (ex) {
      this.uiLog.error('Error setting Matomo User ID', ex);
    }
  }

  public disableTracking() {
    this.canTrack = false;
    this.uiLog.log('Tracking disabled');
    try {
      if (this.matomoTracker) {
        this.matomoTracker.requireConsent();
      }
      this.canTrack = false;
    } catch (ex) {
      this.uiLog.error(ex.message);
    }
  }

  public trackPage(_pageName: string) {
    if (this.canTrack && this.matomoTracker) {
      this.__trackPageFB(_pageName);
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED or tracker not init - But we would track page: Page:${_pageName}`,
      );
    }
  }

  public trackEvent(
    _category: string,
    _action: string,
    _name?: string,
    _value?: number,
  ) {
    if (this.canTrack && this.matomoTracker) {
      try {
        this.__trackEventFB(_category, _action, _name, _value);
      } catch (ex) {
        this.uiLog.error('Error tracking event', ex);
      }
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED or tracker not init - But we would track event: Category:${_category}, Action: ${_action}`,
      );
    }
  }

  public trackCustomDimension(_segmentId: number, _value: string) {
    if (this.canTrack && this.matomoTracker) {
      try {
        this.matomoTracker.setCustomDimension(_segmentId, _value);
      } catch (ex) {
        this.uiLog.error('Error tracking custom dimension', ex);
      }
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED or tracker not init - But we would track event: Custom Dimension :${_segmentId}, Value: ${_value}`,
      );
    }
  }

  public trackContentImpression(
    _contentName: string,
    _contentPiece: string,
    _contentTarget?: string,
  ) {
    if (this.canTrack && this.matomoTracker) {
      try {
        this.matomoTracker.trackContentImpression(
          _contentName,
          _contentPiece,
          _contentTarget,
        );
      } catch (ex) {
        this.uiLog.error(
          `Error tracking single content impression: ${_contentName}`,
          ex,
        );
      }
    } else {
      this.uiLog.info(
        `ANALYTICS - DISABLED or tracker not init - But we would track event: Content Impression :${_contentName}, Piece: ${_contentPiece}`,
      );
    }
  }

  public async trackBulkContentImpressions(
    impressions: Array<{
      contentName: string;
      contentPiece: string;
      contentTarget?: string;
    }>,
  ): Promise<boolean | void> {
    if (!this.canTrack) {
      this.uiLog.info(
        `ANALYTICS - DISABLED - Not sending ${impressions?.length || 0} bulk content impressions.`,
      );
      return;
    }

    if (!impressions || impressions.length === 0) {
      this.uiLog.info('No impressions to track in bulk.');
      return;
    }

    const settings = this.uiSettings.getSettings();
    const userId = settings.matomo_analytics_id;

    try {
      const requests = impressions.map((imp) => {
        let requestString = `?idsite=${this.siteId}&rec=1&action_name=BulkRequestImpressions`;
        requestString += `&c_n=${encodeURIComponent(imp.contentName)}`;
        requestString += `&c_p=${encodeURIComponent(imp.contentPiece)}`;
        if (imp.contentTarget) {
          requestString += `&c_t=${encodeURIComponent(imp.contentTarget)}`;
        }
        if (userId) {
          requestString += `&uid=${encodeURIComponent(userId)}`;
        }
        requestString += `&apiv=1`;
        requestString += `&rand=${Date.now()}`;
        return requestString;
      });

      const bulkPayload = {
        requests: requests,
      };

      this.uiLog.log(
        `Sending ${requests.length} content impressions via Matomo Bulk Tracking API.`,
      );
      this.uiLog.debug(
        'Bulk content impression payload (first request):',
        requests.length > 0 ? requests[0] : 'N/A',
      );

      const response = await fetch(
        `${this.matomoUrl}?module=API&method=CoreAdminHome.bulkTrack&format=json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bulkPayload),
        },
      );

      if (response.ok) {
        this.uiLog.log(
          `Matomo Bulk Tracking API call for content impressions successful. Status: ${response.status}`,
        );
        try {
          const responseData = await response.json();
          this.uiLog.debug(
            'Matomo Bulk Tracking API response data (content impressions):',
            responseData,
          );
          return true;
        } catch (e) {
          if (response.status !== 204) {
            this.uiLog.warn(
              'Matomo Bulk Tracking API response (content impressions) was not JSON, but status was ok.',
              e,
            );
          }
        }
      } else {
        const errorText = await response.text();
        this.uiLog.error(
          `Matomo Bulk Tracking API call for content impressions failed. Status: ${response.status}`,
          errorText,
        );
      }
    } catch (ex) {
      this.uiLog.error(
        'Error sending bulk content impressions via Matomo API:',
        ex,
      );
    }
    return false;
  }

  public async trackBulkEvents(events: Array<IEventPayload>): Promise<void> {
    if (!this.canTrack) {
      this.uiLog.info(
        `ANALYTICS - DISABLED - Not sending ${events?.length || 0} bulk events.`,
      );
      return;
    }

    if (!events || events.length === 0) {
      this.uiLog.info('No events to track in bulk.');
      return;
    }

    const settings = this.uiSettings.getSettings();
    const userId = settings.matomo_analytics_id;

    try {
      const requests = events.map((event) => {
        // Define action_name for the event. Using a combination of category and action.
        const actionName = `Event: ${event.category} / ${event.action}`;
        let requestString = `?idsite=${this.siteId}&rec=1&action_name=BulkRequestEvents`;

        // Event parameters
        requestString += `&e_c=${encodeURIComponent(event.category)}`;
        requestString += `&e_a=${encodeURIComponent(event.action)}`;
        if (event.name) {
          requestString += `&e_n=${encodeURIComponent(event.name)}`;
        }
        if (event.value !== undefined) {
          // Check for undefined as 0 is a valid value
          requestString += `&e_v=${event.value}`;
        }

        if (userId) {
          requestString += `&uid=${encodeURIComponent(userId)}`;
        }
        requestString += `&apiv=1`;
        requestString += `&rand=${Date.now()}`;
        return requestString;
      });

      const bulkPayload = {
        requests: requests,
      };

      this.uiLog.log(
        `Sending ${requests.length} events via Matomo Bulk Tracking API.`,
      );
      this.uiLog.debug(
        'Bulk event payload (first request):',
        requests.length > 0 ? requests[0] : 'N/A',
      );

      const response = await fetch(
        `${this.matomoUrl}?module=API&method=CoreAdminHome.bulkTrack&format=json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bulkPayload),
        },
      );

      if (response.ok) {
        this.uiLog.log(
          `Matomo Bulk Tracking API call for events successful. Status: ${response.status}`,
        );
        try {
          const responseData = await response.json();
          this.uiLog.debug(
            'Matomo Bulk Tracking API response data (events):',
            responseData,
          );
        } catch (e) {
          if (response.status !== 204) {
            this.uiLog.warn(
              'Matomo Bulk Tracking API response (events) was not JSON, but status was ok.',
              e,
            );
          }
        }
      } else {
        const errorText = await response.text();
        this.uiLog.error(
          `Matomo Bulk Tracking API call for events failed. Status: ${response.status}`,
          errorText,
        );
      }
    } catch (ex) {
      this.uiLog.error('Error sending bulk events via Matomo API:', ex);
    }
  }

  private __attachToRoutingEvents() {
    this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        const nav: NavigationEnd = val;
        this.trackPage(nav.urlAfterRedirects);
      }
    });
  }

  private __trackPageFB(_pageName: string) {
    try {
      if (this.canTrack && this.matomoTracker) {
        this.matomoTracker.setDocumentTitle(_pageName);
        this.matomoTracker.trackPageView(_pageName);
        this.uiLog.log('SUCCESS - Track Page - ' + _pageName);
      }
    } catch (ex) {
      this.uiLog.error('Error in __trackPageFB', ex);
    }
  }

  private __trackEventFB(
    _category: string,
    _action: string,
    _name?: string,
    _value?: number,
  ) {
    if (this.canTrack && this.matomoTracker) {
      try {
        // Matomo JS tracker's trackEvent method signature: category, action, [name], [value]
        this.matomoTracker.trackEvent(_category, _action, _name, _value);
        this.uiLog.log(
          `SUCCESS - Track event (JS) - Category:${_category} Action:${_action} Name:${_name || 'N/A'} Value:${_value === undefined ? 'N/A' : _value}`,
        );
      } catch (ex) {
        this.uiLog.error('Error in __trackEventFB', ex);
      }
    }
  }
}
