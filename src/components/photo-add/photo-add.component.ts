import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
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

@Component({
  selector: 'photo-add',
  templateUrl: './photo-add.component.html',
  styleUrls: ['./photo-add.component.scss'],
})
export class PhotoAddComponent implements OnInit {
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
    private readonly translate: TranslateService
  ) {}

  public ngOnInit() {
    setTimeout(() => {
      // iOS Issue, update slider component
      this.updateSlider();
    }, 250);
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
              this.translate.instant('ERROR_OCCURED')
            );
          }
        );
      } else {
        // TAKE
        this.uiImage.takePhoto().then(
          (_path) => {
            this.data.attachments.push(_path.toString());
            this.emitChanges();
          },
          (_error) => {
            this.uiAlert.showMessage(
              JSON.stringify(_error),
              this.translate.instant('ERROR_OCCURED')
            );
          }
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
        await this.uiFileHelper.deleteFile(path);
        this.emitChanges();
        this.uiToast.showInfoToast('IMAGE_DELETED');
      } catch (ex) {
        this.uiToast.showInfoToast('IMAGE_NOT_DELETED');
      }
    }
  }
}
