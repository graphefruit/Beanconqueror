import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-roasting-section',
  templateUrl: './roasting-section.page.html',
  styleUrls: ['./roasting-section.page.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class RoastingSectionPage implements OnInit {
  constructor() {}

  public ngOnInit() {}
}

export default RoastingSectionPage;
