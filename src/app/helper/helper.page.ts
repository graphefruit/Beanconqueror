import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'helper',
  templateUrl: './helper.page.html',
  styleUrls: ['./helper.page.scss'],
})
export class HelperPage implements OnInit {

  public waterhardness: any = {
    ca: 0,
    mg: 0
  };
  public brewRatio: any = {
    water: 0,
    ground_coffee: 0
  };

  constructor() {
  }

  public ngOnInit() {
  }


  public getTotalHardness() {
    //  GH = 0.02495*[Ca] + 0.04114*[Mg]
    try {
      const hardness: number = (0.02495 * this.waterhardness.ca) + 0.04114 * (this.waterhardness.mg);
      return hardness.toFixed(2);
    } catch (ex) {
      return 0;
    }
  }

  public getGermanHardness() {
    //  °dH = 0.1402*[Ca] + 0.2307*[Mg],
    try {
      const hardness: number = ((this.waterhardness.ca * 1.4) + (this.waterhardness.mg * 2.307)) / 10;
      return hardness.toFixed(2);
    } catch (ex) {
      return 0;
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
