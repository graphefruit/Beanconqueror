import { Component, OnInit } from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {IBrew} from '../../../interfaces/brew/iBrew';

@Component({
  selector: 'brew-photo-view',
  templateUrl: './brew-photo-view.component.html',
  styleUrls: ['./brew-photo-view.component.scss'],
})
export class BrewPhotoViewComponent implements OnInit {


  public data: IBrew;

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams) {

  }

  public ionViewWillEnter(): void {
    this.data = this.navParams.get('brew');

  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
    });
  }


  public ngOnInit() {}

}
