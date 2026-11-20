import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  IonBackButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  NavController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'brew-parameter',
  templateUrl: './brew-parameter.page.html',
  styleUrls: ['./brew-parameter.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    RouterLink,
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    IonItem,
    IonIcon,
    IonCardContent,
    IonFooter,
  ],
})
export class BrewParameterPage implements OnInit {
  navCtrl = inject(NavController);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public ngOnInit() {}

  public openManageParameters(): void {
    this.open('manage');
  }

  public openSortParameters(): void {
    this.open('sort');
  }

  public openDefaultParameters(): void {
    this.open('default');
  }
  public openRepeatParameters(): void {
    this.open('repeat');
  }

  public openListViewParameters(): void {
    this.open('listview');
  }

  /** The page sits in the tab it was opened from; its pages follow it there. */
  private open(page: string): void {
    void this.router.navigate([page], { relativeTo: this.route });
  }
}

export default BrewParameterPage;
