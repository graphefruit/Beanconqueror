import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-baristamode',
  templateUrl: './baristamode.page.html',
  styleUrls: ['./baristamode.page.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class BaristamodePage implements OnInit {
  public ngOnInit(): void {}
}

export default BaristamodePage;
