import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIAnalytics } from '../../../services/uiAnalytics';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { Brew } from '../../../classes/brew/brew';

@Component({
  selector: 'app-brew-ratio-calculator',
  templateUrl: './brew-ratio-calculator.component.html',
  styleUrls: ['./brew-ratio-calculator.component.scss'],
})
export class BrewRatioCalculatorComponent implements OnInit {
  public static COMPONENT_ID = 'brew-ratio-calculator';

  @Input('grindWeight') public grindWeight: number = 0;
  @Input('waterQuantity') public waterQuantity: number = 0;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiAnalytics: UIAnalytics
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.RATIO_CALCULATION
    );
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewRatioCalculatorComponent.COMPONENT_ID
    );
  }
  public ngOnInit() {}
}
