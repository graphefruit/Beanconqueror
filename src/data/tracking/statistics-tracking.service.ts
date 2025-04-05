// statistics-tracking.service.ts
import { Injectable } from '@angular/core';
import { MatomoTrackingService } from './matomo-tracking.service';
import { Storage } from '@ionic/storage';

interface CoffeeStatistics {
  totalBeans: number;
  totalBrews: number;
  totalMills: number;
  averageRating: number;
  mostUsedBrewMethod: string;
  favoriteOrigin: string;
  beansByRoastLevel: { [key: string]: number };
  brewsByMethod: { [key: string]: number };
}

@Injectable({
  providedIn: 'root',
})
export class StatisticsTrackingService {
  private statistics: CoffeeStatistics = {
    totalBeans: 0,
    totalBrews: 0,
    totalMills: 0,
    averageRating: 0,
    mostUsedBrewMethod: '',
    favoriteOrigin: '',
    beansByRoastLevel: {},
    brewsByMethod: {},
  };

  constructor(
    private matomoTracking: MatomoTrackingService,
    private storage: Storage,
  ) {
    this.loadStatistics();
  }

  /**
   * Load user statistics from storage
   */
  private async loadStatistics(): Promise<void> {
    try {
      const storedStats = await this.storage.get('coffee_statistics');
      if (storedStats) {
        this.statistics = storedStats;
        this.trackAllStatistics();
      }
    } catch (error) {
      console.error('Failed to load statistics', error);
    }
  }

  /**
   * Save statistics to storage
   */
  private async saveStatistics(): Promise<void> {
    try {
      await this.storage.set('coffee_statistics', this.statistics);
    } catch (error) {
      console.error('Failed to save statistics', error);
    }
  }

  /**
   * Track all statistics to Matomo
   */
  private trackAllStatistics(): void {
    // Track basic counts
    this.matomoTracking.trackUserStatistic('bean', this.statistics.totalBeans);
    this.matomoTracking.trackUserStatistic('brew', this.statistics.totalBrews);
    this.matomoTracking.trackUserStatistic('mill', this.statistics.totalMills);

    // Track average rating
    this.matomoTracking.trackCoffeeStatistic(
      'averageRating',
      this.statistics.averageRating,
    );

    // Track most used brew method
    this.matomoTracking.trackCoffeeStatistic(
      'mostUsedBrewMethod',
      this.statistics.mostUsedBrewMethod,
    );

    // Track favorite origin
    this.matomoTracking.trackCoffeeStatistic(
      'favoriteOrigin',
      this.statistics.favoriteOrigin,
    );

    // Track beans by roast level
    Object.entries(this.statistics.beansByRoastLevel).forEach(
      ([level, count]) => {
        this.matomoTracking.trackCoffeeStatistic(`roastLevel_${level}`, count);
      },
    );

    // Track brews by method
    Object.entries(this.statistics.brewsByMethod).forEach(([method, count]) => {
      this.matomoTracking.trackCoffeeStatistic(`brewMethod_${method}`, count);
    });
  }

  /**
   * Add a new bean and update statistics
   * @param roastLevel Roast level of the new bean
   * @param origin Origin of the new bean
   */
  public addBean(roastLevel: string, origin: string): void {
    // Update total beans
    this.statistics.totalBeans++;

    // Update beans by roast level
    if (!this.statistics.beansByRoastLevel[roastLevel]) {
      this.statistics.beansByRoastLevel[roastLevel] = 0;
    }
    this.statistics.beansByRoastLevel[roastLevel]++;

    // Track the updates
    this.matomoTracking.trackUserStatistic('bean', this.statistics.totalBeans);
    this.matomoTracking.trackCoffeeStatistic(
      `roastLevel_${roastLevel}`,
      this.statistics.beansByRoastLevel[roastLevel],
    );
    this.matomoTracking.trackCoffeeStatistic('beanOrigin', origin);

    this.saveStatistics();
  }

  /**
   * Add a new brew and update statistics
   * @param method Brew method used
   * @param rating Rating given to the brew
   */
  public addBrew(method: string, rating?: number): void {
    // Update total brews
    this.statistics.totalBrews++;

    // Update brews by method
    if (!this.statistics.brewsByMethod[method]) {
      this.statistics.brewsByMethod[method] = 0;
    }
    this.statistics.brewsByMethod[method]++;

    // Track the updates
    this.matomoTracking.trackUserStatistic('brew', this.statistics.totalBrews);
    this.matomoTracking.trackCoffeeStatistic(
      `brewMethod_${method}`,
      this.statistics.brewsByMethod[method],
    );

    // Update and track rating if provided
    if (rating !== undefined) {
      // Calculate proper average
      this.statistics.averageRating =
        (this.statistics.averageRating * (this.statistics.totalBrews - 1) +
          rating) /
        this.statistics.totalBrews;
      this.matomoTracking.trackCoffeeStatistic('brewRating', rating);
      this.matomoTracking.trackCoffeeStatistic(
        'averageRating',
        this.statistics.averageRating,
      );
    }

    this.saveStatistics();
  }

  /**
   * Add a new mill and update statistics
   * @param millName Name of the mill
   */
  public addMill(millName: string): void {
    // Update total mills
    this.statistics.totalMills++;

    // Track the updates
    this.matomoTracking.trackUserStatistic('mill', this.statistics.totalMills);
    this.matomoTracking.trackCoffeeStatistic('millName', millName);

    this.saveStatistics();
  }

  /**
   * Get the current statistics
   * @returns Current coffee statistics
   */
  public getStatistics(): CoffeeStatistics {
    return { ...this.statistics };
  }
}
