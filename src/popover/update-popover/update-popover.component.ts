import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { IonContent, ModalController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-update-popover',
    templateUrl: './update-popover.component.html',
    styleUrls: ['./update-popover.component.scss'],
    standalone: false
})
export class UpdatePopoverComponent implements OnInit {
  @Input() public versions: Array<string>;

  public slide: number = 1;
  @ViewChild('slider', { static: false }) public updateSlider:
    | ElementRef
    | undefined;
  @ViewChild('updateContent', { static: false })
  public updateContentElement: IonContent;

  constructor(
    private readonly modalController: ModalController,
    private translate: TranslateService,
    private readonly platform: Platform
  ) {}

  public isAndroid() {
    return this.platform.is('android');
  }
  public isIOS() {
    return this.platform.is('ios');
  }
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
      // TODO this.updateSlider.update();
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

  public getDesc(_description: string) {
    if (_description.startsWith('[ANDROID]')) {
      if (this.isAndroid()) {
        return _description.replace('[ANDROID]', '');
      } else {
        return '';
      }
    } else if (_description.startsWith('[IOS]')) {
      if (this.isIOS()) {
        return _description.replace('[IOS]', '');
      } else {
        return '';
      }
    }
    return _description;
  }

  public canRenderDesc(_description: string): boolean {
    if (_description.startsWith('[ANDROID]')) {
      return this.isAndroid();
    } else if (_description.startsWith('[IOS]')) {
      return this.isIOS();
    }
    return true;
  }
}
