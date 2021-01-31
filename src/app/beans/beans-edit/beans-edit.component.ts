import {Component, Input, OnInit} from '@angular/core';
import { ModalController, NavParams} from '@ionic/angular';
import {UIBeanStorage} from '../../../services/uiBeanStorage';

import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {IBean} from '../../../interfaces/bean/iBean';
import {Bean} from '../../../classes/bean/bean';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIToast} from '../../../services/uiToast';

declare var cordova: any;
@Component({
  selector: 'beans-edit',
  templateUrl: './beans-edit.component.html',
  styleUrls: ['./beans-edit.component.scss'],
})
export class BeansEditComponent implements OnInit {

  public data: Bean;
  @Input() public bean: IBean;
  public bean_segment = 'general';
  constructor (private readonly navParams: NavParams,
               private readonly modalController: ModalController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiToast: UIToast) {
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'EDIT');
    this.data = new Bean();
    this.data.initializeByObject(this.bean);
  }

  public editBean(): void {
    if (this.__formValid()) {
      this.__editBean();
    }
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'bean-edit');
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
    this.uiBeanStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BEAN_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public ngOnInit() {}

}
