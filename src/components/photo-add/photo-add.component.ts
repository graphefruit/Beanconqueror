import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { UIImage } from '../../services/uiImage';
import { Brew } from '../../classes/brew/brew';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Bean } from '../../classes/bean/bean';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIToast } from '../../services/uiToast';

import { Preparation } from '../../classes/preparation/preparation';
import { Mill } from '../../classes/mill/mill';
import { UIAlert } from '../../services/uiAlert';
import { TranslateService } from '@ngx-translate/core';
import { Clipboard } from '@capacitor/clipboard';

@Component({
  selector: 'photo-add',
  templateUrl: './photo-add.component.html',
  styleUrls: ['./photo-add.component.scss'],
  standalone: false,
})
export class PhotoAddComponent implements OnInit, OnDestroy {
  @Input() public data: Brew | Bean | GreenBean | Mill | Preparation;
  @Output() public dataChange = new EventEmitter<
    Brew | Bean | GreenBean | Mill | Preparation
  >();
  @ViewChild('photoSlides', { static: false }) public photoSlides:
    | ElementRef
    | undefined;

  constructor(
    private readonly uiImage: UIImage,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiToast: UIToast,
    private readonly uiAlert: UIAlert,
    private readonly translate: TranslateService,
  ) {}

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
