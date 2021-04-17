import {Component, Input, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {GreenBean} from '../../../../classes/green-bean/green-bean';
import {UIGreenBeanStorage} from '../../../../services/uiGreenBeanStorage';
import {UIImage} from '../../../../services/uiImage';
import {UIHelper} from '../../../../services/uiHelper';
import {UIFileHelper} from '../../../../services/uiFileHelper';
import {UIToast} from '../../../../services/uiToast';

import {IGreenBean} from '../../../../interfaces/green-bean/iGreenBean';


@Component({
  selector: 'green-bean-edit',
  templateUrl: './green-bean-edit.component.html',
  styleUrls: ['./green-bean-edit.component.scss'],
})
export class GreenBeanEditComponent implements OnInit {


  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;


  public bean_segment = 'general';
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiGreenBeanStorage: UIGreenBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper,
               private readonly uiFileHelper: UIFileHelper,
               private readonly uiToast: UIToast) {

  }


  public async ionViewWillEnter() {
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);

  }



  public editBean(): void {
    if (this.__formValid()) {
      this.__editBean();
    }
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }
  private __editBean(): void {
    this.uiGreenBeanStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_GREEN_BEAN_EDITED_SUCCESSFULLY');
    this.dismiss();
  }



  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'green-bean-edit');
  }


  public ngOnInit() {}


}
