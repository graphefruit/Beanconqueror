import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonLabel,
  IonMenuButton,
  IonRow,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import moment from 'moment';
import { Subscription } from 'rxjs';

import BaristamodeBrew from '../../../classes/brew/baristamodeBrew';
import { HeaderComponent } from '../../../components/header/header.component';
import { UIBaristamodeBrewStorage } from '../../../services/uiBaristamodeBrewStorage';

@Component({
  selector: 'app-baristamode-statistics',
  templateUrl: './baristamode-statistics.page.html',
  styleUrls: ['./baristamode-statistics.page.scss'],
  imports: [
    FormsModule,
    DecimalPipe,
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonCardSubtitle,
    IonGrid,
  ],
})
export class BaristamodeStatisticsPage implements OnDestroy {
  private readonly uiBaristamodeBrewStorage = inject(UIBaristamodeBrewStorage);
  private readonly translate = inject(TranslateService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @ViewChild('accuracyChart', { static: false })
  public accuracyChart!: ElementRef;
  @ViewChild('profileTimelineChart', { static: false })
  public profileTimelineChart!: ElementRef;
  @ViewChild('waterBeverageChart', { static: false })
  public waterBeverageChart!: ElementRef;

  public segment: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY';
  private brewStorageChangeSubscription?: Subscription;

  // All-time cumulative metrics
  public totalBrewsCount = 0;
  public averageAbsoluteOffset = 0;
  public overallHitRate = 0;
  public totalWaterIntake = 0;
  public totalLiquidProduced = 0;
  public averageBrewTime = 0;

  // Active time window metrics
  public activeBrewsCount = 0;
  public activeAvgOffset = 0;
  public activeHitRate = 0;
  public activeAvgTime = 0;

  // Chart instances to prevent canvas duplication/leak
  private accuracyChartInstance: Chart | null = null;
  private profileTimelineChartInstance: Chart | null = null;
  private waterBeverageChartInstance: Chart | null = null;

  public ionViewWillEnter(): void {
    this.calculateAllTimeMetrics();
    this.loadActiveSegmentData();

    this.brewStorageChangeSubscription = this.uiBaristamodeBrewStorage
      .attachOnEvent()
      .subscribe(() => {
        this.calculateAllTimeMetrics();
        this.loadActiveSegmentData();
      });
  }

  public ionViewWillLeave(): void {
    this.destroyCharts();
  }

  public ngOnDestroy(): void {
    if (this.brewStorageChangeSubscription) {
      this.brewStorageChangeSubscription.unsubscribe();
    }
    this.destroyCharts();
  }

  public onSegmentChange(): void {
    this.loadActiveSegmentData();
  }

  private destroyCharts(): void {
    if (this.accuracyChartInstance) {
      this.accuracyChartInstance.destroy();
      this.accuracyChartInstance = null;
    }
    if (this.profileTimelineChartInstance) {
      this.profileTimelineChartInstance.destroy();
      this.profileTimelineChartInstance = null;
    }
    if (this.waterBeverageChartInstance) {
      this.waterBeverageChartInstance.destroy();
      this.waterBeverageChartInstance = null;
    }
  }

  private calculateAllTimeMetrics(): void {
    const brews = this.uiBaristamodeBrewStorage.getAllEntries() || [];
    this.totalBrewsCount = brews.length;

    if (this.totalBrewsCount === 0) {
      this.averageAbsoluteOffset = 0;
      this.overallHitRate = 0;
      this.totalWaterIntake = 0;
      this.totalLiquidProduced = 0;
      this.averageBrewTime = 0;
      return;
    }

    let absoluteOffsetSum = 0;
    let hitCount = 0;
    let waterIntakeSum = 0;
    let liquidProducedSum = 0;
    let brewTimeSum = 0;

    for (const brew of brews) {
      const offset = Math.abs(
        brew.desired_beverage_quantity - brew.brew_beverage_quantity,
      );
      absoluteOffsetSum += offset;

      if (offset <= 0.5) {
        hitCount++;
      }

      waterIntakeSum += brew.water_volume_intake || 0;
      liquidProducedSum += brew.brew_beverage_quantity || 0;
      brewTimeSum += brew.brew_time || 0;
    }

    this.averageAbsoluteOffset = absoluteOffsetSum / this.totalBrewsCount;
    this.overallHitRate = (hitCount / this.totalBrewsCount) * 100;
    this.totalWaterIntake = waterIntakeSum;
    this.totalLiquidProduced = liquidProducedSum;
    this.averageBrewTime = brewTimeSum / this.totalBrewsCount;

    this.changeDetectorRef.detectChanges();
  }

  private loadActiveSegmentData(): void {
    setTimeout(() => {
      this.renderCharts();
    }, 150);
  }

  private renderCharts(): void {
    this.destroyCharts();

    const allBrews = this.uiBaristamodeBrewStorage.getAllEntries() || [];
    if (allBrews.length === 0) {
      return;
    }

    // Filter brews within active time window
    let startDate = moment();

    if (this.segment === 'DAILY') {
      startDate = moment().subtract(13, 'days').startOf('day');
    } else if (this.segment === 'WEEKLY') {
      startDate = moment().subtract(7, 'weeks').startOf('isoWeek');
    } else if (this.segment === 'MONTHLY') {
      startDate = moment().subtract(5, 'months').startOf('month');
    }

    const filteredBrews = allBrews.filter((brew) => {
      const brewDate = moment.unix(brew.config.unix_timestamp);
      return brewDate.isSameOrAfter(startDate);
    });

    let cardStartDate = moment();
    if (this.segment === 'DAILY') {
      cardStartDate = moment().startOf('day');
    } else if (this.segment === 'WEEKLY') {
      cardStartDate = moment().startOf('isoWeek');
    } else if (this.segment === 'MONTHLY') {
      cardStartDate = moment().startOf('month');
    }

    const cardBrews = allBrews.filter((brew) => {
      const brewDate = moment.unix(brew.config.unix_timestamp);
      return brewDate.isSameOrAfter(cardStartDate);
    });

    this.calculateActiveWindowMetrics(cardBrews);
    this.renderAccuracyChart(cardBrews);
    this.renderProfileTimelineChart(filteredBrews, startDate);
    this.renderWaterBeverageChart(filteredBrews);
  }

  private calculateActiveWindowMetrics(brews: BaristamodeBrew[]): void {
    this.activeBrewsCount = brews.length;

    if (this.activeBrewsCount === 0) {
      this.activeAvgOffset = 0;
      this.activeHitRate = 0;
      this.activeAvgTime = 0;
      return;
    }

    let offsetSum = 0;
    let hitCount = 0;
    let timeSum = 0;

    for (const brew of brews) {
      const offset = Math.abs(
        brew.desired_beverage_quantity - brew.brew_beverage_quantity,
      );
      offsetSum += offset;
      if (offset <= 0.5) {
        hitCount++;
      }
      timeSum += brew.brew_time || 0;
    }

    this.activeAvgOffset = offsetSum / this.activeBrewsCount;
    this.activeHitRate = (hitCount / this.activeBrewsCount) * 100;
    this.activeAvgTime = timeSum / this.activeBrewsCount;

    this.changeDetectorRef.detectChanges();
  }

  private renderAccuracyChart(brews: BaristamodeBrew[]): void {
    if (!this.accuracyChart) return;

    let perfect = 0;
    let excellent = 0;
    let good = 0;
    let miss = 0;

    for (const brew of brews) {
      const offset = Math.abs(
        brew.desired_beverage_quantity - brew.brew_beverage_quantity,
      );
      if (offset <= 0.2) {
        perfect++;
      } else if (offset <= 0.5) {
        excellent++;
      } else if (offset <= 1.0) {
        good++;
      } else {
        miss++;
      }
    }

    const data = {
      labels: [
        this.translate.instant('BARISTAMODE_STATISTICS.PERFECT'),
        this.translate.instant('BARISTAMODE_STATISTICS.EXCELLENT'),
        this.translate.instant('BARISTAMODE_STATISTICS.GOOD'),
        this.translate.instant('BARISTAMODE_STATISTICS.MISS'),
      ],
      datasets: [
        {
          data: [perfect, excellent, good, miss],
          backgroundColor: [
            'rgb(76, 175, 80)', // Perfect: Green
            'rgb(139, 195, 74)', // Excellent: Light Green
            'rgb(255, 193, 7)', // Good: Amber Yellow
            'rgb(255, 87, 34)', // Miss: Deep Orange
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };

    this.accuracyChartInstance = new Chart(this.accuracyChart.nativeElement, {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'var(--ion-text-color, #000000)',
            },
          },
        },
      },
    } as any);
  }

  private renderProfileTimelineChart(
    brews: BaristamodeBrew[],
    startDate: moment.Moment,
  ): void {
    if (!this.profileTimelineChart) return;

    // Generate buckets keys and readable labels
    const bucketKeys: string[] = [];
    const bucketLabels: string[] = [];

    if (this.segment === 'DAILY') {
      for (let i = 0; i < 14; i++) {
        const d = moment(startDate).add(i, 'days');
        bucketKeys.push(d.format('YYYY-MM-DD'));
        bucketLabels.push(d.format('DD.MM'));
      }
    } else if (this.segment === 'WEEKLY') {
      for (let i = 0; i < 8; i++) {
        const w = moment(startDate).add(i, 'weeks');
        bucketKeys.push(w.format('YYYY-[W]WW'));
        bucketLabels.push(`W${w.format('WW')}`);
      }
    } else if (this.segment === 'MONTHLY') {
      for (let i = 0; i < 6; i++) {
        const m = moment(startDate).add(i, 'months');
        bucketKeys.push(m.format('YYYY-MM'));
        bucketLabels.push(m.format('MMM YY'));
      }
    }

    // Get unique custom and standard profiles dynamically from all brews
    const uniqueProfiles = Array.from(
      new Set(brews.map((b) => b.pressure_profile).filter((p) => p)),
    );
    const standardProfiles = ['P1', 'P2', 'P3', 'M'];
    const sortedProfiles = [
      ...standardProfiles.filter((p) => uniqueProfiles.includes(p)),
      ...uniqueProfiles.filter((p) => !standardProfiles.includes(p)),
    ];

    // Build data arrays for each profile
    const datasets = sortedProfiles.map((profile, index) => {
      const data = bucketKeys.map((key) => {
        return brews.filter((brew) => {
          if (brew.pressure_profile !== profile) return false;
          const brewDate = moment.unix(brew.config.unix_timestamp);

          if (this.segment === 'DAILY') {
            return brewDate.format('YYYY-MM-DD') === key;
          } else if (this.segment === 'WEEKLY') {
            return brewDate.format('YYYY-[W]WW') === key;
          } else {
            return brewDate.format('YYYY-MM') === key;
          }
        }).length;
      });

      // Distinct curated palette for profiles
      const colors = [
        'rgb(159, 140, 111)', // P1 (Beanconqueror Classic Brown)
        'rgb(96, 125, 139)', // P2 (Blue Grey)
        'rgb(191, 101, 143)', // P3 (Rose)
        'rgb(64, 160, 144)', // M (Teal)
        'rgb(175, 140, 191)', // Custom 1 (Purple)
        'rgb(224, 162, 154)', // Custom 2 (Salmon)
      ];

      return {
        label: profile,
        data,
        backgroundColor: colors[index % colors.length],
        borderColor: 'transparent',
      };
    });

    this.profileTimelineChartInstance = new Chart(
      this.profileTimelineChart.nativeElement,
      {
        type: 'bar',
        data: {
          labels: bucketLabels,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: {
                display: false,
              },
              ticks: {
                color: 'var(--ion-text-color, #000000)',
              },
            },
            y: {
              stacked: true,
              ticks: {
                color: 'var(--ion-text-color, #000000)',
                precision: 0,
              },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: 'var(--ion-text-color, #000000)',
              },
            },
          },
        },
      } as any,
    );
  }

  private renderWaterBeverageChart(brews: BaristamodeBrew[]): void {
    if (!this.waterBeverageChart) return;

    // Retrieve active profiles
    const uniqueProfiles = Array.from(
      new Set(brews.map((b) => b.pressure_profile).filter((p) => p)),
    );
    const standardProfiles = ['P1', 'P2', 'P3', 'M'];
    const sortedProfiles = [
      ...standardProfiles.filter((p) => uniqueProfiles.includes(p)),
      ...uniqueProfiles.filter((p) => !standardProfiles.includes(p)),
    ];

    if (sortedProfiles.length === 0) return;

    const avgWaterData: number[] = [];
    const avgLiquidData: number[] = [];
    const ratioData: number[] = [];

    for (const profile of sortedProfiles) {
      const profileBrews = brews.filter((b) => b.pressure_profile === profile);
      if (profileBrews.length === 0) {
        avgWaterData.push(0);
        avgLiquidData.push(0);
        ratioData.push(0);
        continue;
      }

      let waterSum = 0;
      let liquidSum = 0;

      for (const brew of profileBrews) {
        waterSum += brew.water_volume_intake || 0;
        liquidSum += brew.brew_beverage_quantity || 0;
      }

      const avgWater = waterSum / profileBrews.length;
      const avgLiquid = liquidSum / profileBrews.length;
      const ratio = avgLiquid > 0 ? waterSum / liquidSum : 0; // Water Intake to Liquid output ratio

      avgWaterData.push(Math.round(avgWater * 10) / 10);
      avgLiquidData.push(Math.round(avgLiquid * 10) / 10);
      ratioData.push(Math.round(ratio * 100) / 100);
    }

    const data = {
      labels: sortedProfiles,
      datasets: [
        {
          type: 'bar',
          label: this.translate.instant('BARISTAMODE_STATISTICS.AVG_WATER'),
          data: avgWaterData,
          backgroundColor: 'rgba(54, 162, 235, 0.65)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1.5,
          yAxisID: 'yWeight',
        },
        {
          type: 'bar',
          label: this.translate.instant('BARISTAMODE_STATISTICS.AVG_BEVERAGE'),
          data: avgLiquidData,
          backgroundColor: 'rgba(159, 140, 111, 0.65)',
          borderColor: 'rgb(159, 140, 111)',
          borderWidth: 1.5,
          yAxisID: 'yWeight',
        },
        {
          type: 'line',
          label: this.translate.instant('BARISTAMODE_STATISTICS.RATIO'),
          data: ratioData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 3,
          tension: 0.3,
          fill: false,
          yAxisID: 'yRatio',
        },
      ],
    };

    this.waterBeverageChartInstance = new Chart(
      this.waterBeverageChart.nativeElement,
      {
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: 'var(--ion-text-color, #000000)',
              },
            },
            yWeight: {
              type: 'linear',
              position: 'left',
              ticks: {
                color: 'var(--ion-text-color, #000000)',
              },
              title: {
                display: true,
                text: 'g / ml',
                color: 'var(--ion-text-color, #000000)',
              },
            },
            yRatio: {
              type: 'linear',
              position: 'right',
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis
              },
              ticks: {
                color: 'var(--ion-text-color, #000000)',
              },
              title: {
                display: true,
                text: 'Ratio (Input/Output)',
                color: 'var(--ion-text-color, #000000)',
              },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: 'var(--ion-text-color, #000000)',
              },
            },
          },
        },
      } as any,
    );
  }
}

export default BaristamodeStatisticsPage;
