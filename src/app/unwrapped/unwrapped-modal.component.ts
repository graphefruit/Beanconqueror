import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { UnwrappedStats } from '../../services/unwrapped/unwrapped.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { register } from 'swiper/element/bundle';
import { CurrencyService } from '../../services/currencyService/currency.service';
import { SlicePipe, DecimalPipe, DatePipe } from '@angular/common';

register();

@Component({
  selector: 'app-unwrapped-modal',
  templateUrl: './unwrapped-modal.component.html',
  styleUrls: ['./unwrapped-modal.component.scss'],
  imports: [IonicModule, SlicePipe, DecimalPipe, DatePipe, TranslatePipe],
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
  ) {}

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
