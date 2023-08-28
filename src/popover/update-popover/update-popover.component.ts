import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { IonContent, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-update-popover',
  templateUrl: './update-popover.component.html',
  styleUrls: ['./update-popover.component.scss'],
})
export class UpdatePopoverComponent implements OnInit {
  @Input() public versions: Array<string>;
  public config = {
    slidesPerView: 3,
    spaceBetween: 50,
    navigation: true,
    pagination: { clickable: true },
    scrollbar: { draggable: true },
  };
  public slide: number = 1;
  @ViewChild('slider', { static: false }) public updateSlider:
    | ElementRef
    | undefined;
  @ViewChild('updateContent', { static: false })
  public updateContentElement: IonContent;

  constructor(
    private readonly modalController: ModalController,
    private translate: TranslateService
  ) {}

  public nextSlide() {
    this.updateContentElement.scrollToTop(250);
    this.slide = this.slide + 1;
    if (this.updateSlider?.nativeElement.swiper.allowSlideNext) {
      this.updateSlider?.nativeElement.swiper.slideNext();
    }
  }
  public finish() {
    this.dismiss();
  }

  public ngOnInit() {
    this.__triggerUpdate();
  }

  private __triggerUpdate() {
    // Fix, specialy on new devices which will see 2 update screens, the slider was white
    setTimeout(() => {
      //TODO this.updateSlider.update();
    });
  }

  public dismiss() {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      'update-popover'
    );
  }

  public getDescription(_version: string): Array<string> {
    const translatedStr: any = this.translate.instant(
      'UPDATE_TEXT_TITLE_TITLE.' + _version + '.DESCRIPTION'
    );
    return [...translatedStr];
  }
}
