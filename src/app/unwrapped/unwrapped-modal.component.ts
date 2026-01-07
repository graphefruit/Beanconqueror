import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UnwrappedStats } from '../../services/unwrapped/unwrapped.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { register } from 'swiper/element/bundle';
import { CurrencyService } from '../../services/currencyService/currency.service';
import { SlicePipe, DecimalPipe, DatePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';

register();

@Component({
  selector: 'app-unwrapped-modal',
  templateUrl: './unwrapped-modal.component.html',
  styleUrls: ['./unwrapped-modal.component.scss'],
  imports: [
    SlicePipe,
    DecimalPipe,
    DatePipe,
    TranslatePipe,
    IonContent,
    IonIcon,
    IonButton,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UnwrappedModalComponent implements OnInit {
  @Input() stats: UnwrappedStats;
  @ViewChild('swiper') swiperRef: ElementRef | undefined;

  public static COMPONENT_ID = 'UnwrappedModalComponent';

  constructor(
    private modalController: ModalController,
    private translate: TranslateService,
    private currencyService: CurrencyService,
  ) {
    addIcons({ closeOutline });
  }

  ngOnInit() {}

  close() {
    this.modalController.dismiss();
  }

  nextSlide() {
    this.swiperRef?.nativeElement.swiper.slideNext();
  }

  public getCurrencySymbol(): string {
    return this.currencyService.getActualCurrencySymbol();
  }
}
