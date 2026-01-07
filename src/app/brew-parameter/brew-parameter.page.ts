import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonCard,
  IonItem,
  IonIcon,
  IonCardTitle,
  IonCardContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'brew-parameter',
  templateUrl: './brew-parameter.page.html',
  styleUrls: ['./brew-parameter.page.scss'],
  imports: [
    RouterLink,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonCard,
    IonItem,
    IonIcon,
    IonCardTitle,
    IonCardContent,
  ],
})
export class BrewParameterPage implements OnInit {
  constructor(
    public navCtrl: NavController,
    private readonly router: Router,
  ) {}

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

export default BrewParameterPage;
