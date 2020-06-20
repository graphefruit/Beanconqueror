import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Preparation} from '../../../classes/preparation/preparation';
import {PREPARATION_TYPES} from '../../../enums/preparations/preparationTypes';
import {NgForm} from '@angular/forms';
import {ModalController, NavParams} from '@ionic/angular';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIToast} from '../../../services/uiToast';

@Component({
  selector: 'preparation-add-type',
  templateUrl: './preparation-add-type.component.html',
  styleUrls: ['./preparation-add-type.component.scss'],
})
export class PreparationAddTypeComponent implements OnInit {


  public data: Preparation = new Preparation();

  public preparationTypeEnum = PREPARATION_TYPES;

  @ViewChild('addPreparationForm', {static: false}) public preparationForm: NgForm;
  @Input() private hide_toast_message: boolean;

  constructor(private readonly modalController: ModalController,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly navParams: NavParams,
              private readonly uiToast: UIToast) {
    this.data.type = this.navParams.get('type');
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('PREPARATION', 'ADD_TYPE');
  }


  public addPreparation(): void {

    if (this.preparationForm.valid) {
      this.__addPreparation();
    }
  }

  public __addPreparation(): void {
    this.uiPreparationStorage.add(this.data);
    this.dismiss(true);
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_PREPARATION_ADDED_SUCCESSFULLY');
    }
  }

  public async dismiss(_added: boolean) {
    this.modalController.dismiss({
      dismissed: true,
      added: _added
    });
  }

  public ngOnInit() {
  }

}
