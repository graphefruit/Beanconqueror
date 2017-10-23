/**Core**/
import {Component} from '@angular/core';
/**Ionic**/
import {NavController} from 'ionic-angular';

@Component({
  templateUrl: 'settings.html'
})
export class SettingsPage {

  settings = {
    time: true,
    grind_size: true,
    weight: true,
    method_of_preparation: true,
    water_flow: true,
    bean_type: true,
    brew_temperature:true,
    note: true,
  };

  constructor(public navCtrl: NavController) {

  }

}
