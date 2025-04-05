// matomo-tracking.service.ts
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';

@Injectable({
  providedIn: 'root',
})
export class MatomoTrackingService {
  private _paq: any[] = [];
  private userId: string | null = null;
  private isInitialized = false;
  private readonly MATOMO_URL = 'https://beanconqueror.com/matomo/';
  private readonly SITE_ID = '1';

  constructor(private platform: Platform) {
    this.initializeTracking();
  }

  /**
   * Initialize Matomo tracking with enhanced configuration
   */
  private async initializeTracking(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Wait for platform ready to ensure device information is available
    await this.platform.ready();

    // Initialize Matomo tracker array
    window._paq = window._paq || [];

    // Enable JavaScript error tracking - fixes issue with error reporting
    window._paq.push(['enableJSErrorTracking']);

    // Enable heartbeat timer to track actual time spent on page
    window._paq.push(['enableHeartBeatTimer']);

    // Enable link tracking
    window._paq.push(['enableLinkTracking']);

    // Set document title for better page view reporting
    window._paq.push(['setDocumentTitle', document.title]);

    // Get device info for better tracking
    try {
      const deviceInfo = await Device.getInfo();
      const appInfo = await App.getInfo();

      // Set custom dimensions for better user tracking
      window._paq.push(['setCustomDimension', 1, deviceInfo.platform]);
      window._paq.push(['setCustomDimension', 2, deviceInfo.model]);
      window._paq.push(['setCustomDimension', 3, deviceInfo.operatingSystem]);
      window._paq.push(['setCustomDimension', 4, appInfo.version]);
      window._paq.push(['setCustomDimension', 5, deviceInfo.osVersion]);
    } catch (error) {
      console.error('Failed to get device info', error);
    }

    // Configure Matomo tracker
    window._paq.push(['setTrackerUrl', `${this.MATOMO_URL}matomo.php`]);
    window._paq.push(['setSiteId', this.SITE_ID]);

    // Create anonymous user ID for cumulative data tracking
    this.createOrRetrieveUserId();

    // Load Matomo tracking script
    this.loadMatomoTrackingScript();

    this.isInitialized = true;
  }

  /**
   * Load Matomo tracking script dynamically
   */
  private loadMatomoTrackingScript(): void {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.src = `${this.MATOMO_URL}matomo.js`;

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  /**
   * Create or retrieve a unique user ID for tracking
   */
  private createOrRetrieveUserId(): void {
    // Check for existing user ID in localStorage
    const storedUserId = localStorage.getItem('matomo_user_id');

    if (storedUserId) {
      this.userId = storedUserId;
    } else {
      // Create a new unique ID
      this.userId = this.generateUUID();
      localStorage.setItem('matomo_user_id', this.userId);
    }

    // Set the user ID in Matomo
    if (this.userId) {
      window._paq.push(['setUserId', this.userId]);
    }
  }

  /**
   * Generate a UUID for anonymous user tracking
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * Track a page view
   * @param pageName Name of the page being viewed
   */
  public trackPageView(pageName: string): void {
    if (!this.isInitialized) {
      this.initializeTracking();
    }

    window._paq.push(['setCustomUrl', window.location.href]);
    window._paq.push(['setDocumentTitle', pageName]);
    window._paq.push(['trackPageView']);
  }

  /**
   * Track an event
   * @param category Event category
   * @param action Event action
   * @param name Optional event name
   * @param value Optional numeric value
   */
  public trackEvent(
    category: string,
    action: string,
    name?: string,
    value?: number,
  ): void {
    if (!this.isInitialized) {
      this.initializeTracking();
    }

    const eventData = ['trackEvent', category, action];

    if (name) {
      eventData.push(name);
    }

    if (value !== undefined) {
      eventData.push(value);
    }

    window._paq.push(eventData);
  }

  /**
   * Track user statistics for beans, brews, and mills
   * @param type Type of statistic (bean, brew, mill)
   * @param count Count value
   */
  public trackUserStatistic(
    type: 'bean' | 'brew' | 'mill',
    count: number,
  ): void {
    const category = 'UserStatistics';

    this.trackEvent(category, `${type}Count`, undefined, count);

    // Set custom variables for cumulative statistics
    window._paq.push([
      'setCustomVariable',
      type === 'bean' ? 1 : type === 'brew' ? 2 : 3, // Variable index based on type
      `${type}Count`, // Variable name
      count.toString(), // Variable value
      'visit', // Scope (visit or page)
    ]);
  }

  /**
   * Track bean-related actions
   * @param action The bean action to track
   * @param beanName Optional bean name for identification
   */
  public trackBeanAction(action: string, beanName?: string): void {
    const category = 'Bean';
    this.trackEvent(category, action, beanName);
  }

  /**
   * Track brew-related actions
   * @param action The brew action to track
   * @param brewMethod Optional brew method for identification
   */
  public trackBrewAction(action: string, brewMethod?: string): void {
    const category = 'Brew';
    this.trackEvent(category, action, brewMethod);
  }

  /**
   * Track mill-related actions
   * @param action The mill action to track
   * @param millName Optional mill name for identification
   */
  public trackMillAction(action: string, millName?: string): void {
    const category = 'Mill';
    this.trackEvent(category, action, millName);
  }

  /**
   * Track coffee statistics for analytics
   * @param type Type of coffee statistic
   * @param value Value associated with the statistic
   */
  public trackCoffeeStatistic(type: string, value: any): void {
    const category = 'CoffeeStatistics';
    this.trackEvent(category, type, value?.toString());
  }
}
