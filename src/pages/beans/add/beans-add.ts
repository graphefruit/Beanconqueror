/**Core**/
import {Component} from '@angular/core';
/**Ionic**/
import {ViewController} from 'ionic-angular';
/**Services**/
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIImage} from '../../../services/uiImage';

/**Classes**/
import {Bean} from '../../../classes/bean/bean';

/**Enums**/
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {BEAN_MIX_ENUM} from "../../../enums/beans/mix";

@Component({
  templateUrl: 'beans-add.html',
})
export class BeansAddModal {


  public data: Bean = new Bean();

  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;


  constructor(private viewCtrl: ViewController, private uiBeanStorage: UIBeanStorage, private uiImage: UIImage) {
    this.data.roastingDate = new Date().toISOString();
  }

  private __formValid():boolean{
    let valid:boolean = true;
    let name:string = this.data.name;
    if (name == undefined || name == null || name.trim() == ""){
      valid = false;
    }
    return valid;
  }
  public addBean(form) {

    if (this.__formValid()) {
      this.__addBean();
    }
  }

  public __addBean() {
    this.uiBeanStorage.add(this.data);
    this.dismiss();
  }

  public addImage() {
    this.uiImage.showOptionChooser().then((_option) => {
      if (_option === "CHOOSE") {
        //CHOSE
        this.uiImage.choosePhoto().then((_path) => {
          this.data.filePath = _path.toString();
        }, () => {

        })
      }
      else {
        //TAKE
        this.uiImage.takePhoto().then((_path) => {
          this.data.filePath = _path.toString();
        }, () => {

        })
      }
    });
  }



  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }


}
