import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonMenuButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

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
