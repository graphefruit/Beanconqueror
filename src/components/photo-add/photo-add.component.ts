import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {UIImage} from '../../services/uiImage';
import {Brew} from '../../classes/brew/brew';
import {GreenBean} from '../../classes/green-bean/green-bean';
import {Bean} from '../../classes/bean/bean';
import {UIFileHelper} from '../../services/uiFileHelper';
import {UIToast} from '../../services/uiToast';
import {IonSlides} from '@ionic/angular';
import {Preparation} from '../../classes/preparation/preparation';
import {Mill} from '../../classes/mill/mill';

@Component({
  selector: 'photo-add',
  templateUrl: './photo-add.component.html',
  styleUrls: ['./photo-add.component.scss'],
})
export class PhotoAddComponent implements OnInit {

  @Input() public data: Brew | Bean | GreenBean | Mill | Preparation;
  @Output() public dataChange = new EventEmitter<Brew | Bean | GreenBean| Mill | Preparation>();
  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;

  constructor(private readonly uiImage: UIImage,
              private readonly uiFileHelper: UIFileHelper,
              private readonly uiToast: UIToast) { }

  public ngOnInit() {
    setTimeout(() => {
      // iOS Issue, update slider component
      this.updateSlider();
    },250);
  }

  public addImage(): void {
    this.uiImage.showOptionChooser()
      .then((_option) => {
        if (_option === 'CHOOSE') {
          // CHOSE
          this.uiImage.choosePhoto()
            .then((_path) => {
              if (_path) {
                this.data.attachments.push(_path.toString());
                this.emitChanges();
              }

            });
        } else {
          // TAKE
          this.uiImage.takePhoto()
            .then((_path) => {
              this.data.attachments.push(_path.toString());
              this.emitChanges();
            });
        }
      });
  }

  private async emitChanges() {
    this.updateSlider();
    this.dataChange.emit(this.data);
  }

  private async updateSlider() {
    if (this.photoSlides) {
      await this.photoSlides.update();
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
    if (this.data.attachments.length > 0) {
      // Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }
  }

}
