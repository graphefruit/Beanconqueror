import { Component, Input, OnInit } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { ModalController } from '@ionic/angular';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';

@Component({
  selector: 'app-preparation-custom-parameters',
  templateUrl: './preparation-custom-parameters.component.html',
  styleUrls: ['./preparation-custom-parameters.component.scss'],
  standalone: false,
})
export class PreparationCustomParametersComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-custom-parameters';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public preparationTypeEnum = PREPARATION_TYPES;
  public segment: string = 'manage';
  @Input() private preparation: IPreparation;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiPreparationStorage: UIPreparationStorage,
  ) {}

  public ionViewWillEnter(): void {
    if (this.preparation !== undefined) {
      this.data.initializeByObject(this.preparation);
    }
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PreparationCustomParametersComponent.COMPONENT_ID,
    );
  }

  public async save() {
    await this.uiPreparationStorage.update(this.data);
  }

  public ngOnInit() {}
}
