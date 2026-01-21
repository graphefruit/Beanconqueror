import { Component, Input, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { FormsModule } from '@angular/forms';
import { PreventCharacterDirective } from '../../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../../directive/remove-empty-number.directive';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonItem,
  IonInput,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-brew-beverage-quantity-calculator',
  templateUrl: './brew-beverage-quantity-calculator.component.html',
  styleUrls: ['./brew-beverage-quantity-calculator.component.scss'],
  imports: [
    FormsModule,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
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
export class BrewBeverageQuantityCalculatorComponent {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);

  public static readonly COMPONENT_ID = 'brew-beverage-quantity-calculator';

  public totalWeight: number = 0;
  @Input('vesselWeight') public vesselWeight: number = 0;
  public calculatedWeight: number = 0;

  public calculateWeight() {
    this.calculatedWeight = this.totalWeight - this.vesselWeight;
    if (this.calculatedWeight && this.calculatedWeight > 0) {
      this.calculatedWeight = this.uiHelper.toFixedIfNecessary(
        this.calculatedWeight,
        1,
      );
    }
  }

  public async setBrewBeverage() {
    let brewBeverageQuantity: number = this.calculatedWeight;
    if (brewBeverageQuantity < 0) {
      brewBeverageQuantity = 0;
    }
    this.modalController.dismiss(
      {
        brew_beverage_quantity: brewBeverageQuantity,
        dismissed: true,
      },
      undefined,
      BrewBeverageQuantityCalculatorComponent.COMPONENT_ID,
    );
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewBeverageQuantityCalculatorComponent.COMPONENT_ID,
    );
  }
}
