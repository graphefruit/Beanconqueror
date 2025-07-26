import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'helper-water-hardness',
  templateUrl: './helper-water-hardness.component.html',
  styleUrls: ['./helper-water-hardness.component.scss'],
  standalone: false,
})
export class HelperWaterHardnessComponent implements OnInit {
  public waterhardness: any = {
    ca: 0,
    mg: 0,
  };

  constructor() {}

  public ngOnInit() {}

  public getTotalHardness() {
    //  GH = 0.02495*[Ca] + 0.04114*[Mg]
    try {
      const hardness: number =
        0.02495 * this.waterhardness.ca + 0.04114 * this.waterhardness.mg;
      return hardness.toFixed(2);
    } catch (ex) {
      return 0;
    }
  }

  public getGermanHardness(): string {
    //  °dH = 0.1402*[Ca] + 0.2307*[Mg],
    try {
      const hardness: number =
        (this.waterhardness.ca * 1.4 + this.waterhardness.mg * 2.307) / 10;
      return hardness.toFixed(2);
    } catch (ex) {
      return '0';
    }
  }
}
