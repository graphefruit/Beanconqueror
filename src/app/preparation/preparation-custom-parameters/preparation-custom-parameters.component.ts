import {Component, Input, OnInit} from '@angular/core';
import {Preparation} from '../../../classes/preparation/preparation';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {PREPARATION_TYPES} from '../../../enums/preparations/preparationTypes';
import {ModalController, NavParams} from '@ionic/angular';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'app-preparation-custom-parameters',
  templateUrl: './preparation-custom-parameters.component.html',
  styleUrls: ['./preparation-custom-parameters.component.scss'],
})
export class PreparationCustomParametersComponent implements OnInit {

  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public preparationTypeEnum = PREPARATION_TYPES;
  public segment:string ='manage';
  @Input() private preparation: IPreparation;

  constructor (private readonly navParams: NavParams,
               private readonly modalController: ModalController,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('PREPARATION', 'CUSTOM_PARAMETERS');
    if (this.preparation !== undefined) {
      this.data.initializeByObject(this.preparation);
    }
  }


  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    }, undefined, 'preparation-custom-parameters');
  }

  public save() {
    this.uiPreparationStorage.update(this.data);
  }

  public ngOnInit() {}

}
