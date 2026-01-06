import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'water-section',
  templateUrl: './water-section.page.html',
  styleUrls: ['./water-section.page.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class WaterSectionPage implements OnInit {
  public ngOnInit(): void {}
}
