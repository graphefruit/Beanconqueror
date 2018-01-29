import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';

/**Services **/
import {UIStatistic} from '../../services/uiStatistic';

/**Third party**/
import moment from 'moment';
import 'moment/locale/de';


@Component({
  templateUrl: 'home.html',
  selector: 'home-page'
})
export class HomePage {

  /**Needed app minimize for android**/
  public isHome: boolean = true;
  public brews: number = 0;
  public beans: number = 0;
  public preparations: number = 0;

  constructor(public navCtrl: NavController,
              public uiStatistic: UIStatistic) {


  }

  public isChristmasTime():boolean {
    let month: number = moment().month()+1;
    if (month === 12)
    {
      return true;
    }
    else{
      return false;
    }
  }

  public getGeneratedText(): string {

    let year: number = moment().year();
    let month: number = moment().month()+1;
    //Bug .day always returned 1.
    let day: number  =parseInt(moment().format("DD"));


    if (year === 2018) {
      if (month == 1 && day == 1) {
        return "Wir wünschen dir ein frohes neues Jahr 2018 und natürlich ganz viel Kaffeegenuss!";
      }
      else if (month == 1 && day <= 10 ) {
        return "Wir wünschen dir (nachträglich) ein frohes neues Jahr und natürlich ganz viel Kaffeegenuss!";
      }
    }
    else if (year === 2017){
      if (month == 12 && (day == 24||day==25 || day==26)){
        return "Wir wünschen dir fröhliche Weihnachten und ganz viel Kaffee!";
      }
      else if (month ==12 && day <24){
        return "Vergiss nicht noch etwas Kaffee einzukaufen :)";
      }
    }
  }

}
