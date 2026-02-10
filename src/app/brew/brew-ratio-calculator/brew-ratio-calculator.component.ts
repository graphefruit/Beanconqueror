import { Component, inject, Input, OnInit } from '@angular/core';

import {
  IonContent,
  IonHeader,
  ModalController,
} from '@ionic/angular/standalone';

import { Brew } from '../../../classes/brew/brew';
import { BrewRatioCardComponent } from '../../../components/brew-ratio-card/brew-ratio-card.component';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';

@Component({
  selector: 'app-brew-ratio-calculator',
  templateUrl: './brew-ratio-calculator.component.html',
  styleUrls: ['./brew-ratio-calculator.component.scss'],
  imports: [BrewRatioCardComponent, IonHeader, IonContent],
})
export class BrewRatioCalculatorComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID = 'brew-ratio-calculator';

  @Input('grindWeight') public grindWeight: number = 0;
  @Input('waterQuantity') public waterQuantity: number = 0;

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.RATIO_CALCULATION,
    );
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewRatioCalculatorComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
