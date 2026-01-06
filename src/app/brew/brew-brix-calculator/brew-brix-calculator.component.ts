import { Component, OnInit } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { UIAnalytics } from '../../../services/uiAnalytics';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { FormsModule } from '@angular/forms';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-brew-brix-calculator',
  templateUrl: './brew-brix-calculator.component.html',
  styleUrls: ['./brew-brix-calculator.component.scss'],
  imports: [
    IonicModule,
    FormsModule,
    DisableDoubleClickDirective,
    TranslatePipe,
  ],
})
export class BrewBrixCalculatorComponent implements OnInit {
  public static COMPONENT_ID = 'brew-brix-calculator';

  public brix: number = 0;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.BRIX_CALCULATION,
    );
  }

  public async setBrix() {
    const brix: number = this.brix;

    let tdsValue: number = (0.0036 * brix + 0.7897) * brix - 0.0071;
    if (tdsValue < 0) {
      tdsValue = 0;
    }
    tdsValue = +tdsValue.toFixed(2);
    this.modalController.dismiss(
      {
        tds: tdsValue,
        dismissed: true,
      },
      undefined,
      BrewBrixCalculatorComponent.COMPONENT_ID,
    );
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewBrixCalculatorComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
