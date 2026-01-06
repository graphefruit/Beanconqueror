import { Component, Input, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { PreventCharacterDirective } from '../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../directive/remove-empty-number.directive';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'brew-ratio-card',
  templateUrl: './brew-ratio-card.component.html',
  styleUrls: ['./brew-ratio-card.component.scss'],
  imports: [
    IonicModule,
    FormsModule,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    TranslatePipe,
  ],
})
export class BrewRatioCardComponent implements OnInit {
  public brewRatio: any = {
    water: 0,
    ground_coffee: 0,
  };

  @Input('water') public water: number = 0;
  @Input('groundCoffee') public groundCoffee: number = 0;
  constructor() {}

  public ngOnInit() {
    if (this.water > 0) {
      this.brewRatio.water = this.water;
    }
    if (this.groundCoffee > 0) {
      this.brewRatio.ground_coffee = this.groundCoffee;
    }
  }

  public getBrewRatio() {
    const grindWeight: number = this.brewRatio.ground_coffee;
    const brewQuantity: number = this.brewRatio.water;
    let ratio: string = '1 / ';

    if (brewQuantity > 0 && grindWeight > 0) {
      ratio += (brewQuantity / grindWeight).toFixed(2);
    } else {
      ratio += '?';
    }

    return ratio;
  }
}
