import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'helper',
  templateUrl: './helper.page.html',
  styleUrls: ['./helper.page.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class HelperPage {}
