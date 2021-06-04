import { Component, OnInit } from '@angular/core';
import {ModalController} from '@ionic/angular';

@Component({
  selector: 'app-brew-beverage-quantity-calculator',
  templateUrl: './brew-beverage-quantity-calculator.component.html',
  styleUrls: ['./brew-beverage-quantity-calculator.component.scss'],
})
export class BrewBeverageQuantityCalculatorComponent implements OnInit {

  public static COMPONENT_ID = 'brew-beverage-quantity-calculator';


  public totalWeight: number = 0;
  public vesselWeight: number = 0;
  public calcualtedWeight: number = 0;

  constructor(private readonly modalController: ModalController) {

  }

  public ionViewWillEnter(): void {
  }

  public calculateWeight() {
    this.calcualtedWeight = this.totalWeight - this.vesselWeight
  }

  public async setBrix() {

    let brewBeverageQuantity: number = 0;
    this.modalController.dismiss({
      brew_beverage_quantity: brewBeverageQuantity,
      dismissed: true
    },undefined, BrewBeverageQuantityCalculatorComponent.COMPONENT_ID)

  }


  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined, BrewBeverageQuantityCalculatorComponent.COMPONENT_ID)

  }
  public ngOnInit() {}

}
