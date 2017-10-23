/**Core**/
import { Component } from '@angular/core';
/**Third party**/
import moment from 'moment';
@Component({
  templateUrl: 'about.html',
})
export class AboutPage {


  public actual_year:string;
  constructor() {

  }

  ionViewWillEnter() {
    this.actual_year = String(moment().year());
  }


}
