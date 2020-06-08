import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'helper-brew-ratio',
  templateUrl: './helper-brew-ratio.component.html',
  styleUrls: ['./helper-brew-ratio.component.scss'],
})
export class HelperBrewRatioComponent implements OnInit {

  public brewRatio: any = {
    water: 0,
    ground_coffee: 0
  };

  constructor() {
  }

  public ngOnInit() {
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
