import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-impressum',
  templateUrl: './impressum.component.html',
  styleUrls: ['./impressum.component.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class ImpressumComponent implements OnInit {
  constructor() {}

  public ngOnInit() {}
}
