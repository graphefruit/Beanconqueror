import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonMenuButton,
  IonContent,
  IonCard,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  imports: [
    RouterLink,
    TranslatePipe,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonCard,
    IonItem,
    IonLabel,
    IonIcon,
    HeaderComponent,
  ],
})
export class InfoComponent implements OnInit {
  private readonly router = inject(Router);

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  public ngOnInit() {}
}

export default InfoComponent;
