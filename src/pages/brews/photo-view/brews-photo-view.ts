/**Core**/
import {Component, ViewChild} from '@angular/core';
/**Ionic**/
import {ViewController, NavParams,Slides} from 'ionic-angular';

/**Interfaces**/
import {IBrew} from '../../../interfaces/brew/iBrew';

@Component({
  selector: 'brews-photo-view',
  templateUrl: 'brews-photo-view.html',
})
export class BrewsPhotoView {

  @ViewChild('photoSlides') photoSlides: Slides;

  public data: IBrew;

  constructor(private viewCtrl: ViewController, private navParams: NavParams) {

  }

  ionViewWillEnter() {
    this.data = this.navParams.get('BREW');

  }


  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }



}
