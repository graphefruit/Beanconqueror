import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonMenuButton,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-bean-parameter',
  templateUrl: './bean-parameter.page.html',
  styleUrls: ['./bean-parameter.page.scss'],
  imports: [
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonCard,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonIcon,
  ],
})
export class BeanParameterPage {
  private readonly router = inject(Router);

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
