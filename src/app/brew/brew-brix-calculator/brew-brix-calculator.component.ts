import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCol,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { UIAnalytics } from '../../../services/uiAnalytics';

@Component({
  selector: 'app-brew-brix-calculator',
  templateUrl: './brew-brix-calculator.component.html',
  styleUrls: ['./brew-brix-calculator.component.scss'],
  imports: [
    FormsModule,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonItem,
    IonInput,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class BrewBrixCalculatorComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID = 'brew-brix-calculator';

  public brix: number = 0;

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
