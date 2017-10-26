import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

/**Services **/

import {UIStatistic} from '../../services/uiStatistic';


@Component({
  templateUrl: 'home.html'
})
export class HomePage {

  public brews:number=0;
  public beans:number=0;
  public preparations:number=0;
  constructor(public navCtrl: NavController,
              public uiStatistic:UIStatistic) {





  }


}
