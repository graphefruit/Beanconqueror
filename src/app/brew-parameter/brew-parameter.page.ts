import { Component, OnInit, inject } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonMenuButton,
  IonContent,
  IonCard,
  IonItem,
  IonIcon,
  IonCardTitle,
  IonCardContent,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'brew-parameter',
  templateUrl: './brew-parameter.page.html',
  styleUrls: ['./brew-parameter.page.scss'],
  imports: [
    RouterLink,
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonCard,
    IonItem,
    IonIcon,
    IonCardTitle,
    IonCardContent,
  ],
})
export class BrewParameterPage implements OnInit {
  navCtrl = inject(NavController);
  private readonly router = inject(Router);

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
