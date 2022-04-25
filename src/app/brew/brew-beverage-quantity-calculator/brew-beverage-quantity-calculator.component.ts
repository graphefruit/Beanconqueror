import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';

@Component({
  selector: 'app-brew-beverage-quantity-calculator',
  templateUrl: './brew-beverage-quantity-calculator.component.html',
  styleUrls: ['./brew-beverage-quantity-calculator.component.scss'],
})
export class BrewBeverageQuantityCalculatorComponent implements OnInit {

  public static COMPONENT_ID = 'brew-beverage-quantity-calculator';


  public totalWeight: number = 0;
  @Input('vesselWeight') public vesselWeight: number = 0;
  public calculatedWeight: number = 0;

  constructor(private readonly modalController: ModalController) {

  }

  public ionViewWillEnter(): void {
  }

  public calculateWeight() {
    this.calculatedWeight = this.totalWeight - this.vesselWeight
  }

  public async setBrewBeverage() {

    let brewBeverageQuantity: number = this.calculatedWeight;
    if (brewBeverageQuantity < 0) {
      brewBeverageQuantity = 0;
    }
    this.modalController.dismiss({
      brew_beverage_quantity: brewBeverageQuantity,
      dismissed: true
    },undefined, BrewBeverageQuantityCalculatorComponent.COMPONENT_ID);

  }


  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined, BrewBeverageQuantityCalculatorComponent.COMPONENT_ID);

  }
  public ngOnInit() {}

}
