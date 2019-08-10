import { Component, OnInit } from '@angular/core';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {Bean} from '../../../classes/bean/bean';
import {ModalController} from '@ionic/angular';

@Component({
  selector: 'beans-add',
  templateUrl: './beans-add.component.html',
  styleUrls: ['./beans-add.component.scss'],
})
export class BeansAddComponent implements OnInit {


  public data: Bean = new Bean();

  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;

  constructor (private readonly modalController: ModalController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper) {
    this.data.roastingDate = new Date().toISOString();
  }

  public addBean (): void {

    if (this.__formValid()) {
      this.__addBean();
    }
  }

  public __addBean(): void {
    this.uiBeanStorage.add(this.data);
    this.dismiss();
  }

  public addImage(): void {
    this.uiImage.showOptionChooser()
        .then((_option) => {
          if (_option === 'CHOOSE') {
            // CHOSE
            this.uiImage.choosePhoto()
                .then((_path) => {
                  this.data.filePath = _path.toString();
                });
          } else {
            // TAKE
            this.uiImage.takePhoto()
                .then((_path) => {
                  this.data.filePath = _path.toString();
                });
          }
        });
  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
    });
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }

  public ngOnInit() {}

}
