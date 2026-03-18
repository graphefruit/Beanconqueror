import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  IonContent,
  IonHeader,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import { Water } from '../../classes/water/water';
import { AsyncImageComponent } from '../../components/async-image/async-image.component';
import { HeaderDismissButtonComponent } from '../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'photo-popover',
  templateUrl: './photo-popover.component.html',
  styleUrls: ['./photo-popover.component.scss'],
  imports: [
    AsyncImageComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    HeaderComponent,
    HeaderDismissButtonComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PhotoPopoverComponent implements OnInit {
  private readonly modalController = inject(ModalController);

  public static COMPONENT_ID: string = 'photo-popover';

  @Input() public data:
    | Bean
    | GreenBean
    | Brew
    | RoastingMachine
    | Water
    | Mill
    | Preparation;
  @ViewChild('photoSlides', { static: false }) public photoSlides:
    | ElementRef
    | undefined;
  private async updateSlider() {
    if (this.photoSlides) {
      //TODO await this.photoSlides.update();
    }
  }
  public ionViewDidEnter(): void {
    this.updateSlider();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PhotoPopoverComponent.COMPONENT_ID,
    );
  }

  public ngOnInit() {}
}
