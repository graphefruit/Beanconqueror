import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'brew-parameter',
  templateUrl: './brew-parameter.page.html',
  styleUrls: ['./brew-parameter.page.scss'],
})
export class BrewParameterPage implements OnInit {
  constructor(public navCtrl: NavController, private readonly router: Router) {}

  public ngOnInit() {}

  public openManageParameters(): void {
    this.router.navigate(['/brew-parameter/manage']);
  }

  public openSortParameters(): void {
    this.router.navigateByUrl('/brew-parameter/sort');
  }

  public openDefaultParameters(): void {
    this.router.navigateByUrl('/brew-parameter/default');
  }
  public openRepeatParameters(): void {
    this.router.navigateByUrl('/brew-parameter/repeat');
  }

  public openListViewParameters(): void {
    this.router.navigateByUrl('/brew-parameter/listview');
  }
}
