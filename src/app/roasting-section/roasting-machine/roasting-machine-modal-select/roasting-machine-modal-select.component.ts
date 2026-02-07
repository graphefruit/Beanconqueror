import { Component, Input, OnInit, inject } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';
import { UIRoastingMachineStorage } from '../../../../services/uiRoastingMachineStorage';
import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonItem,
  IonCheckbox,
  IonRadioGroup,
  IonRadio,
  IonFooter,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../../components/header/header.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';

@Component({
  selector: 'app-roasting-machine-modal-select',
  templateUrl: './roasting-machine-modal-select.component.html',
  styleUrls: ['./roasting-machine-modal-select.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonContent,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonItem,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonFooter,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class RoastingMachineModalSelectComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiRoastingMachineStorage = inject(UIRoastingMachineStorage);

  public static COMPONENT_ID: string = 'roasting-machine-modal-select';
  public objs: Array<RoastingMachine> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public segment: string = 'open';
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;

  public ionViewDidEnter(): void {
    this.objs = this.uiRoastingMachineStorage.getAllEntries();
    if (this.multiple) {
      for (const obj of this.objs) {
        this.multipleSelection[obj.config.uuid] =
          this.selectedValues.filter((e) => e === obj.config.uuid).length > 0;
      }
    } else {
      if (this.selectedValues.length > 0) {
        this.radioSelection = this.selectedValues[0];
      }
    }
  }

  public ngOnInit() {}

  public getOpenEntries(): Array<RoastingMachine> {
    return this.objs.filter((e) => !e.finished);
  }

  public getArchivedEntries(): Array<RoastingMachine> {
    return this.objs.filter((e) => e.finished);
  }

  public async choose(): Promise<void> {
    const chosenKeys: Array<string> = [];
    if (this.multiple) {
      for (const key in this.multipleSelection) {
        if (this.multipleSelection[key] === true) {
          chosenKeys.push(key);
        }
      }
    } else {
      chosenKeys.push(this.radioSelection);
    }
    let selected_text: string = '';

    for (const val of chosenKeys) {
      const mill: RoastingMachine =
        this.uiRoastingMachineStorage.getByUUID(val);
      selected_text += mill.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss(
      {
        selected_values: chosenKeys,
        selected_text: selected_text,
      },
      undefined,
      RoastingMachineModalSelectComponent.COMPONENT_ID,
    );
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      RoastingMachineModalSelectComponent.COMPONENT_ID,
    );
  }
}
