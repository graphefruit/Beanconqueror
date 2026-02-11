import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Preparation } from '../../../classes/preparation/preparation';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { DefaultCustomParameterComponent } from '../../../components/parameter/default-custom-parameter/default-custom-parameter.component';
import { ListViewCustomParameterComponent } from '../../../components/parameter/list-view-custom-parameter/list-view-custom-parameter.component';
import { ManageCustomParameterComponent } from '../../../components/parameter/manage-custom-parameter/manage-custom-parameter.component';
import { RepeatCustomParameterComponent } from '../../../components/parameter/repeat-custom-parameter/repeat-custom-parameter.component';
import { SortCustomParameterComponent } from '../../../components/parameter/sort-custom-parameter/sort-custom-parameter.component';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';

@Component({
  selector: 'app-preparation-custom-parameters',
  templateUrl: './preparation-custom-parameters.component.html',
  styleUrls: ['./preparation-custom-parameters.component.scss'],
  imports: [
    FormsModule,
    ManageCustomParameterComponent,
    DefaultCustomParameterComponent,
    SortCustomParameterComponent,
    ListViewCustomParameterComponent,
    RepeatCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonCard,
    IonCardContent,
    IonItem,
    IonCheckbox,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
})
export class PreparationCustomParametersComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);

  public static COMPONENT_ID: string = 'preparation-custom-parameters';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public preparationTypeEnum = PREPARATION_TYPES;
  public segment: string = 'manage';
  @Input() private preparation: IPreparation;

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
