/** Core */
import { Component } from '@angular/core';
/** Ionic */
import { NavParams, ViewController } from 'ionic-angular';
/** Classes */
import { Bean } from '../../../classes/bean/bean';
/** Interfaces */
import { IBean } from '../../../interfaces/bean/iBean';
/** Services */
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIHelper } from '../../../services/uiHelper';
/** Ionic native */
import { UIImage } from '../../../services/uiImage';

/** Enums */
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { ROASTS_ENUM } from '../../../enums/beans/roasts';

@Component({
  templateUrl: 'beans-edit.html'
})
export class BeansEditModal {

  public data: Bean = new Bean();
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  private bean: IBean;
  constructor(private navParams: NavParams,
              private viewCtrl: ViewController,
              private uiBeanStorage: UIBeanStorage,
              private uiImage: UIImage,
              private uiHelper: UIHelper) {
    this.data.roastingDate = new Date().toISOString();
  }

  public ionViewWillEnter(): void {
    this.bean = this.navParams.get('BEAN');
    this.data = this.uiHelper.copyData(this.bean);

  }
  public editBean(): void {
    if (this.__formValid()) {
      this.__editBean();
    }
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
  private __editBean(): void {
    this.uiBeanStorage.update(this.data);
    this.dismiss();
  }
}
