import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { BrewRatioCardComponent } from '../../../components/brew-ratio-card/brew-ratio-card.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'helper-brew-ratio',
  templateUrl: './helper-brew-ratio.component.html',
  styleUrls: ['./helper-brew-ratio.component.scss'],
  imports: [IonicModule, BrewRatioCardComponent, TranslatePipe],
})
export class HelperBrewRatioComponent implements OnInit {
  constructor() {}

  public ngOnInit() {}
}
