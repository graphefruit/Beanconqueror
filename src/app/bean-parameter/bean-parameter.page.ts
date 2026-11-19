import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-bean-parameter',
  templateUrl: './bean-parameter.page.html',
  styleUrls: ['./bean-parameter.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonBackButton,
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
  private readonly route = inject(ActivatedRoute);

  public openManageParameters(): void {
    this.open('manage');
  }

  public openListViewParameters(): void {
    this.open('listview');
  }

  /** The page sits in the tab it was opened from; its pages follow it there. */
  private open(page: string): void {
    void this.router.navigate([page], { relativeTo: this.route });
  }
}
