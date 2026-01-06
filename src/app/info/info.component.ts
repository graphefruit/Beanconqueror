import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  imports: [IonicModule, RouterLink, TranslatePipe],
})
export class InfoComponent implements OnInit {
  constructor(private readonly router: Router) {}

  public ngOnInit() {}
}
