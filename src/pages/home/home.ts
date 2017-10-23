import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
/**Services **/
import {UIStorage} from '../../services/uiStorage';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';

@Component({
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(public navCtrl: NavController, private uiStorage:UIStorage,private storage: Storage,private uiPre:UIPreparationStorage) {

    console.log(uiPre.getDBPath());


  }

  public startBrew(){

  }

}
