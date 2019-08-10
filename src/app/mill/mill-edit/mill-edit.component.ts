import {Component, Input, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {Mill} from '../../../classes/mill/mill';
import {UIHelper} from '../../../services/uiHelper';
import {IMill} from '../../../interfaces/mill/iMill';

@Component({
  selector: 'mill-edit',
  templateUrl: './mill-edit.component.html',
  styleUrls: ['./mill-edit.component.scss'],
})
export class MillEditComponent implements OnInit {

  public data: Mill = new Mill();

  @Input() private mill: IMill;

  constructor (private readonly navParams: NavParams,
               private  readonly modalController: ModalController,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiHelper: UIHelper) {

  }

  public ionViewWillEnter(): void {

    this.data = this.uiHelper.copyData(this.mill);
  }

  public editMill(form): void {
    if (form.valid) {
      this.__editMill();
    }
  }

  public __editMill(): void {
    this.uiMillStorage.update(this.data);
    this.dismiss();
  }

  public dismiss(): void {
   this.modalController.dismiss({
      'dismissed': true
    });
  }
  public ngOnInit() {}

}
