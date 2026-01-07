import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { Bean } from '../../classes/bean/bean';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Brew } from '../../classes/brew/brew';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import { Water } from '../../classes/water/water';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { AsyncImageComponent } from '../../components/async-image/async-image.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'photo-popover',
  templateUrl: './photo-popover.component.html',
  styleUrls: ['./photo-popover.component.scss'],
  imports: [
    AsyncImageComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
  ],
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
