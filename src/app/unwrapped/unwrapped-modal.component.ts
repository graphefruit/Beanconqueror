import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
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
  IonButton,
  IonContent,
  IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { register } from 'swiper/element/bundle';

import { CurrencyService } from '../../services/currencyService/currency.service';
import { UnwrappedStats } from '../../services/unwrapped/unwrapped.service';

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
  private modalController = inject(ModalController);
  private translate = inject(TranslateService);
  private currencyService = inject(CurrencyService);

  @Input() stats: UnwrappedStats;
  @ViewChild('swiper') swiperRef: ElementRef | undefined;

  public static COMPONENT_ID = 'UnwrappedModalComponent';

  constructor() {
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
