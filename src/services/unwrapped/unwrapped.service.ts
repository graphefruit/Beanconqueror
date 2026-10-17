import { inject, Injectable } from '@angular/core';

import { DateTime } from 'luxon';

import { Bean } from '../../classes/bean/bean';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';

export interface UnwrappedStats {
  year: number;
  totalBeans: number;
  totalWeight: number;
  topCountries: { country: string; count: number }[];
  topRoasters: { roaster: string; count: number }[];
  favoriteRoast: string;
  averageRating: number;
  mostExpensiveBean: Bean | null;
  topProcessingMethods: { method: string; count: number }[];
  topVarieties: { variety: string; count: number }[];
  topPreparations: { preparation: string; count: number }[];
  topGrinders: { grinder: string; count: number }[];
  totalCost: number;
  totalBrews: number;
  totalCaffeine: number;
  averageBrewsPerDay: number;
  mostActiveDay: { date: string; count: number };
  mostActiveHour: { hour: number; count: number };
  mostUsedBean: { name: string; count: number } | null;
  bestRatedBean: { name: string; rating: number; roaster: string } | null;
}

@Injectable({
  providedIn: 'root',
})
export class UnwrappedService {
  private uiBeanStorage = inject(UIBeanStorage);
  private uiBrewStorage = inject(UIBrewStorage);
  private uiPreparationStorage = inject(UIPreparationStorage);
  private uiMillStorage = inject(UIMillStorage);

  public getAvailableYears(): number[] {
    const allBeans = this.uiBeanStorage.getAllEntries();
    const years = new Set<number>();
    for (const bean of allBeans) {
      const dateStr = bean.buyDate || bean.roastingDate;
      if (dateStr) {
        const date = DateTime.fromISO(dateStr);
        if (date.isValid) {
          years.add(date.year);
        }
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }

  public getUnwrappedData(year: number): UnwrappedStats | null {
    const allBeans = this.uiBeanStorage.getAllEntries();

    const beansInYear = allBeans.filter((bean) => {
      let dateStr = bean.buyDate;
      if (!dateStr) {
        dateStr = bean.roastingDate;
      }
      if (!dateStr) return false;

      const date = DateTime.fromISO(dateStr);
      return date.isValid && date.year === year;
    });

    if (beansInYear.length === 0) {
      return null;
    }

    // Group beans by frozenGroupId if present, or by individual bean uuid
    const groupedBeansMap = new Map<string, Bean[]>();
    for (const bean of beansInYear) {
      const key = bean.frozenGroupId
        ? `frozen_${bean.frozenGroupId}`
        : `bean_${bean.config.uuid}`;
      const group = groupedBeansMap.get(key) || [];
      group.push(bean);
      groupedBeansMap.set(key, group);
    }

    const stats: UnwrappedStats = {
      year: year,
      totalBeans: groupedBeansMap.size,
      totalWeight: 0,
      topCountries: [],
      topRoasters: [],
      favoriteRoast: '',
      averageRating: 0,
      mostExpensiveBean: null,
      topProcessingMethods: [],
      topVarieties: [],
      topPreparations: [],
      topGrinders: [],
      totalCost: 0,
      totalBrews: 0,
      totalCaffeine: 0,
      averageBrewsPerDay: 0,
      mostActiveDay: { date: '', count: 0 },
      mostActiveHour: { hour: 0, count: 0 },
      mostUsedBean: null,
      bestRatedBean: null,
    };

    const countriesMap = new Map<string, number>();
    const roastersMap = new Map<string, number>();
    const roastsMap = new Map<string, number>();
    const processingMap = new Map<string, number>();
    const varietyMap = new Map<string, number>();
    let totalRating = 0;
    let ratedBeansCount = 0;

    for (const beanGroup of groupedBeansMap.values()) {
      let groupWeight = 0;
      let groupCost = 0;
      for (const bean of beanGroup) {
        if (bean.weight) {
          groupWeight += bean.weight;
        }
        if (bean.cost) {
          groupCost += bean.cost;
        }
      }
      stats.totalWeight += groupWeight;
      stats.totalCost += groupCost;

      const repBean = beanGroup[0];

      // Country, Processing, Variety (counted once per master bean)
      if (repBean.bean_information) {
        repBean.bean_information.forEach((info) => {
          if (info.country) {
            const country = info.country.trim();
            if (country) {
              countriesMap.set(country, (countriesMap.get(country) || 0) + 1);
            }
          }
          if (info.processing) {
            const procs = info.processing.split(/[,;|]/);
            procs.forEach((p) => {
              const proc = p.trim();
              if (proc) {
                processingMap.set(proc, (processingMap.get(proc) || 0) + 1);
              }
            });
          }
          if (info.variety) {
            const varieties = info.variety.split(/[,;|]/);
            varieties.forEach((v) => {
              const variety = v.trim();
              if (variety) {
                varietyMap.set(variety, (varietyMap.get(variety) || 0) + 1);
              }
            });
          }
        });
      }

      // Roaster (counted once per master bean)
      if (repBean.roaster) {
        const roaster = repBean.roaster.trim();
        if (roaster) {
          roastersMap.set(roaster, (roastersMap.get(roaster) || 0) + 1);
        }
      }

      // Roast (counted once per master bean)
      if (repBean.roast) {
        const roast = this.getRoastName(repBean.roast);
        roastsMap.set(roast, (roastsMap.get(roast) || 0) + 1);
      }

      // Rating (counted once per master bean if rated)
      const ratedBean = beanGroup.find((b) => b.rating > 0);
      if (ratedBean) {
        totalRating += ratedBean.rating;
        ratedBeansCount++;
      }

      // Most Expensive Bean (compare total bean cost)
      if (groupCost > 0) {
        if (
          !stats.mostExpensiveBean ||
          groupCost > stats.mostExpensiveBean.cost
        ) {
          stats.mostExpensiveBean = {
            ...repBean,
            cost: groupCost,
          } as Bean;
        }
      }
    }

    stats.topCountries = this.mapToSortedArray(countriesMap, 'country');
    stats.topRoasters = this.mapToSortedArray(roastersMap, 'roaster');
    stats.topProcessingMethods = this.mapToSortedArray(processingMap, 'method');
    stats.topVarieties = this.mapToSortedArray(varietyMap, 'variety');

    const sortedRoasts = this.mapToSortedArray(roastsMap, 'roast');
    if (sortedRoasts.length > 0) {
      stats.favoriteRoast = sortedRoasts[0].roast;
    }

    if (ratedBeansCount > 0) {
      stats.averageRating = totalRating / ratedBeansCount;
    }

    // --- Preparations (Brews) ---
    const allBrews = this.uiBrewStorage.getAllEntries();
    const brewsInYear = allBrews.filter((brew) => {
      const date = DateTime.fromSeconds(brew.config.unix_timestamp);
      return date.isValid && date.year === year;
    });

    const preparationMap = new Map<string, number>();
    const grinderMap = new Map<string, number>();
    const beanUsageMap = new Map<string, number>();
    const dayMap = new Map<string, number>();
    const hourMap = new Map<number, number>();

    stats.totalBrews = brewsInYear.length;

    // Calculate days with brews for average
    const uniqueDays = new Set<string>();

    for (const brew of brewsInYear) {
      const date = DateTime.fromSeconds(brew.config.unix_timestamp);
      const dateStr = date.toISODate(); // YYYY-MM-DD

      if (dateStr) {
        uniqueDays.add(dateStr);
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      }

      const hour = date.hour;
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);

      // Caffeine (approximate if not available, but let's try to use grind weight * 0.008 as per UIBrewStorage)
      // Or better, check if we can access the helper. For now, simple calc:
      if (brew.grind_weight) {
        stats.totalCaffeine += brew.grind_weight * 8; // 8mg per gram roughly? UIBrewStorage says * 0.008 which is grams?
        // Wait, UIBrewStorage says: return this.grind_weight * 0.008; (in getCaffeineAmount)
        // If grind_weight is in grams, 0.008 is kg? No.
        // Standard is ~10mg caffeine per gram of coffee? 1% caffeine.
        // 0.008 is 0.8%.
        // Let's assume the result should be in mg.
        // If grind_weight is 18g. 18 * 10 = 180mg.
        // UIBrewStorage comment says "Return the caffeine amount in mg".
        // But 18 * 0.008 = 0.144. That's extremely low for mg. Maybe it returns grams of caffeine?
        // 0.144g = 144mg. Yes.
        // So let's accumulate in mg.
        stats.totalCaffeine += brew.grind_weight * 0.008 * 1000;
      }

      // Preparations
      if (brew.method_of_preparation) {
        const prepName = this.uiPreparationStorage.getPreparationNameByUUID(
          brew.method_of_preparation,
        );
        if (prepName) {
          preparationMap.set(prepName, (preparationMap.get(prepName) || 0) + 1);
        }
      }
      // Grinders
      if (brew.mill) {
        const millName = this.uiMillStorage.getMillNameByUUID(brew.mill);
        if (millName) {
          grinderMap.set(millName, (grinderMap.get(millName) || 0) + 1);
        }
      }
      // Bean Usage
      if (brew.bean) {
        const beanInstance = this.uiBeanStorage.getEntryByUUID(brew.bean);
        if (beanInstance) {
          const beanName = beanInstance.name;
          beanUsageMap.set(beanName, (beanUsageMap.get(beanName) || 0) + 1);
        }
      }
    }

    // Averages and Maxes
    if (uniqueDays.size > 0) {
      stats.averageBrewsPerDay = stats.totalBrews / uniqueDays.size;
    }

    // Most Active Day
    let maxDayCount = 0;
    let maxDayDate = '';
    dayMap.forEach((count, date) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        maxDayDate = date;
      }
    });
    stats.mostActiveDay = { date: maxDayDate, count: maxDayCount };

    // Most Active Hour
    let maxHourCount = 0;
    let maxHour = 0;
    hourMap.forEach((count, hour) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        maxHour = hour;
      }
    });
    stats.mostActiveHour = { hour: maxHour, count: maxHourCount };

    // Most Used Bean
    const sortedBeans = this.mapToSortedArray(beanUsageMap, 'name');
    if (sortedBeans.length > 0) {
      stats.mostUsedBean = sortedBeans[0];
    }

    // Best Rated Bean Calculation
    const beanRatingMap = new Map<
      string,
      { totalRating: number; count: number; roaster: string; name: string }
    >();

    for (const brew of brewsInYear) {
      if (brew.bean && brew.rating > 0) {
        const beanInstance = this.uiBeanStorage.getEntryByUUID(brew.bean);
        if (beanInstance) {
          const key = beanInstance.frozenGroupId
            ? beanInstance.frozenGroupId
            : brew.bean;
          const current = beanRatingMap.get(key) || {
            totalRating: 0,
            count: 0,
            roaster: beanInstance.roaster,
            name: beanInstance.name,
          };
          current.totalRating += brew.rating;
          current.count += 1;
          beanRatingMap.set(key, current);
        }
      }
    }

    let bestBean = null;
    let maxRating = -1;

    beanRatingMap.forEach((data) => {
      const avg = data.totalRating / data.count;
      if (avg > maxRating) {
        maxRating = avg;
        bestBean = { name: data.name, rating: avg, roaster: data.roaster };
      }
    });

    stats.bestRatedBean = bestBean;

    stats.topPreparations = this.mapToSortedArray(
      preparationMap,
      'preparation',
    );
    stats.topGrinders = this.mapToSortedArray(grinderMap, 'grinder');

    return stats;
  }

  private mapToSortedArray(map: Map<string, number>, keyName: string): any[] {
    return Array.from(map.entries())
      .map(([key, count]) => ({ [keyName]: key, count }))
      .sort((a, b) => b.count - a.count);
  }

  private getRoastName(roastEnum: ROASTS_ENUM): string {
    // Basic mapping, could be improved with translation service if needed
    return roastEnum.toString();
  }
}
