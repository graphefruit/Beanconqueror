import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-bean-parameter',
  templateUrl: './bean-parameter.page.html',
  styleUrls: ['./bean-parameter.page.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonIcon,
  ],
})
export class BeanParameterPage {
  constructor(private readonly router: Router) {}

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
