/** Core */
import { Component, ViewChild } from '@angular/core';
/** Ionic */
import { NavParams, Slides, ViewController } from 'ionic-angular';

/** Interfaces */
import { IBrew } from '../../../interfaces/brew/iBrew';

@Component({
  selector: 'brews-photo-view',
  templateUrl: 'brews-photo-view.html'
})
export class BrewsPhotoView {

  @ViewChild('photoSlides') public photoSlides: Slides;

  public data: IBrew;

  constructor(private viewCtrl: ViewController, private navParams: NavParams) {

  }

  public ionViewWillEnter(): void {
    this.data = this.navParams.get('BREW');

  }

  public dismiss(): void {
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

}
