import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { IonButton, IonIcon, IonItem } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, arrowForwardOutline, trash } from 'ionicons/icons';

import { Clipboard } from '@capacitor/clipboard';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import { UIAlert } from '../../services/uiAlert';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIImage } from '../../services/uiImage';
import { UIToast } from '../../services/uiToast';
import { AsyncImageComponent } from '../async-image/async-image.component';

@Component({
  selector: 'photo-add',
  templateUrl: './photo-add.component.html',
  styleUrls: ['./photo-add.component.scss'],
  imports: [AsyncImageComponent, TranslatePipe, IonItem, IonIcon, IonButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PhotoAddComponent implements OnInit, OnDestroy {
  private readonly uiImage = inject(UIImage);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);

  @Input() public data:
    | Brew
    | Bean
    | GreenBean
    | Mill
    | Preparation
    | RoastingMachine;
  @Output() public dataChange = new EventEmitter<
    Brew | Bean | GreenBean | Mill | Preparation | RoastingMachine
  >();
  @ViewChild('photoSlides', { static: false }) public photoSlides:
    | ElementRef
    | undefined;

  constructor() {
    addIcons({ arrowBackOutline, arrowForwardOutline, trash });
  }

  public ngOnInit() {
    setTimeout(() => {
      // iOS Issue, update slider component
      this.updateSlider();
    }, 250);
  }
  public ngOnDestroy() {}

  public async addBase64ImageFromClipboard() {
    const currentData = await Clipboard.read();

    if (
      currentData.value === undefined ||
      currentData.value === '' ||
      currentData.value === null ||
      currentData.value.indexOf('data:image/') === -1
    ) {
      this.uiAlert.showMessage(this.translate.instant('NO_IMAGE_IN_CLIPBOARD'));
      return;
    }

    let ending = '.jpg';
    if (currentData.value.indexOf('data:image/png;base64,') > -1) {
      ending = '.png';
    }
    const fileName = await this.uiFileHelper.generateInternalPath(
      'photo',
      ending,
    );
    const fileUri = await this.uiFileHelper.writeInternalFileFromBase64(
      currentData.value,
      fileName,
    );
    this.data.attachments.push(fileUri.path);
  }
  public addImage(): void {
    this.uiImage.showOptionChooser().then((_option) => {
      if (_option === 'CHOOSE') {
        // CHOSE
        this.uiImage.choosePhoto().then(
          (_paths) => {
            if (_paths.length > 0) {
              for (const path of _paths) {
                this.data.attachments.push(path.toString());
              }

              this.emitChanges();
            }
          },
          (_error) => {
            this.uiAlert.showMessage(
              JSON.stringify(_error),
              this.translate.instant('ERROR_OCCURED'),
            );
          },
        );
      } else if (_option === 'CLIPBOARD') {
        this.addBase64ImageFromClipboard();
      } else {
        // TAKE
        this.uiImage.takePhoto().then(
          (_path) => {
            this.data.attachments.push(_path);
            this.emitChanges();
          },
          (_error) => {
            this.uiAlert.showMessage(
              _error.toString(),
              this.translate.instant('ERROR_OCCURED'),
            );
          },
        );
      }
    });
  }

  private async emitChanges() {
    this.updateSlider();
    this.dataChange.emit(this.data);
  }

  private async updateSlider() {
    if (this.photoSlides) {
      setTimeout(() => {
        this.photoSlides.nativeElement.swiper.update();
      }, 250);
    }
  }

  public async deleteImage(_index: number) {
    const splicedPaths: Array<string> = this.data.attachments.splice(_index, 1);
    for (const path of splicedPaths) {
      try {
        await this.uiFileHelper.deleteInternalFile(path);
        this.emitChanges();
        this.uiToast.showInfoToast('IMAGE_DELETED');
      } catch (ex) {
        this.uiToast.showInfoToast('IMAGE_NOT_DELETED');
      }
    }
  }

  public async sortLeft(_index: number) {
    this.swap(_index - 1, _index);
  }

  public async sortRight(_index: number) {
    this.swap(_index + 1, _index);
  }

  public swap(index1: number, index2: number) {
    // Check if the indices are within the valid range

    // Perform the swap using a temporary variable
    const temp = this.data.attachments[index1];
    this.data.attachments[index1] = this.data.attachments[index2];
    this.data.attachments[index2] = temp;
    this.emitChanges();

    this.photoSlides.nativeElement.swiper.slideTo(index1, 200, false);
  }
}
