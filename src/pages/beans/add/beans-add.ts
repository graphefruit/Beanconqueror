/** Core */
import {Component} from '@angular/core';
/** Ionic */
import {ViewController} from 'ionic-angular';
/** Services */
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIImage} from '../../../services/uiImage';
/** Classes */
import {Bean} from '../../../classes/bean/bean';
/** Enums */
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {UIHelper} from '../../../services/uiHelper';

@Component({
  templateUrl: 'beans-add.html'
})
export class BeansAddModal {

  public data: Bean = new Bean();

  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;

  constructor (private readonly viewCtrl: ViewController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper) {
    this.data.roastingDate = new Date().toISOString();
  }
  public addBean(form): void {

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
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }

}
