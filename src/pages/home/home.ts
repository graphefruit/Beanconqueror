import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

/**Services **/

import {UIStatistic} from '../../services/uiStatistic';


@Component({
  templateUrl: 'home.html',
  selector:'home-page'
})
export class HomePage {

  /**Needed app minimize for android**/
  public isHome:boolean = true;
  public brews:number=0;
  public beans:number=0;
  public preparations:number=0;
  constructor(public navCtrl: NavController,
              public uiStatistic:UIStatistic) {





  }


}
