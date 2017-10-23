/**Core**/
import {Component} from '@angular/core';
/**Ionic**/
import {ViewController} from 'ionic-angular';
/**Services**/
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIImage} from '../../../services/uiImage';

/**Classes**/
import {Bean} from '../../../classes/bean/bean';


@Component({
  templateUrl: 'beans-add.html',
})
export class BeansAddModal {


  public data: Bean = new Bean();

  constructor(private viewCtrl: ViewController, private uiBeanStorage: UIBeanStorage, private uiImage: UIImage) {
    this.data.roastingDate = new Date().toISOString();
  }

  public addBean(form) {

    if (form.valid) {
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
          console.log(_path);

          if (_path) {
            this.data.filePath = _path.toString();
          }

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
