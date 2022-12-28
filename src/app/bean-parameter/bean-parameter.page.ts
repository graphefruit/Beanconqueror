import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bean-parameter',
  templateUrl: './bean-parameter.page.html',
  styleUrls: ['./bean-parameter.page.scss'],
})
export class BeanParameterPage implements OnInit {
  constructor(public navCtrl: NavController, private readonly router: Router) {}

  public ngOnInit() {}

  public openManageParameters(): void {
    this.router.navigate(['/bean-parameter/manage']);
  }

  public openSortParameters(): void {
    this.router.navigateByUrl('/bean-parameter/sort');
  }

  public openListViewParameters(): void {
    this.router.navigateByUrl('/bean-parameter/listview');
  }
}
