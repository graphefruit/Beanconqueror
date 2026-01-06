import { Component, Input, OnInit } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { ModalController, IonicModule } from '@ionic/angular';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { FormsModule } from '@angular/forms';
import { ManageCustomParameterComponent } from '../../../components/parameter/manage-custom-parameter/manage-custom-parameter.component';
import { DefaultCustomParameterComponent } from '../../../components/parameter/default-custom-parameter/default-custom-parameter.component';
import { SortCustomParameterComponent } from '../../../components/parameter/sort-custom-parameter/sort-custom-parameter.component';
import { ListViewCustomParameterComponent } from '../../../components/parameter/list-view-custom-parameter/list-view-custom-parameter.component';
import { RepeatCustomParameterComponent } from '../../../components/parameter/repeat-custom-parameter/repeat-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-preparation-custom-parameters',
  templateUrl: './preparation-custom-parameters.component.html',
  styleUrls: ['./preparation-custom-parameters.component.scss'],
  imports: [
    IonicModule,
    FormsModule,
    ManageCustomParameterComponent,
    DefaultCustomParameterComponent,
    SortCustomParameterComponent,
    ListViewCustomParameterComponent,
    RepeatCustomParameterComponent,
    TranslatePipe,
  ],
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
