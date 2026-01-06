import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'thanks',
  templateUrl: './thanks.component.html',
  styleUrls: ['./thanks.component.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class ThanksComponent implements OnInit {
  constructor() {}

  public ngOnInit() {}
}
