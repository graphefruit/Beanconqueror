import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { ModalController } from '@ionic/angular/standalone';
import { IFlavor } from '../../../interfaces/flavor/iFlavor';
import { CuppingFlavorsComponent } from '../../../components/cupping-flavors/cupping-flavors.component';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-brew-flavor-picker',
  templateUrl: './brew-flavor-picker.component.html',
  styleUrls: ['./brew-flavor-picker.component.scss'],
  imports: [
    CuppingFlavorsComponent,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BrewFlavorPickerComponent implements OnInit {
  private readonly uiHelper = inject(UIHelper);
  private readonly modalController = inject(ModalController);

  public static COMPONENT_ID: string = 'brew-flavor-picker';
  @Input() public flavor: IFlavor;
  public data: IFlavor = undefined;

  @ViewChild('flavorEl', { read: CuppingFlavorsComponent, static: false })
  public flavorEl: CuppingFlavorsComponent;

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewFlavorPickerComponent.COMPONENT_ID,
    );
  }
  public setFlavors() {
    this.flavorEl.checkInputAndAddCustomFlavor();
    const customFlavors: Array<string> = this.flavorEl.getCustomFlavors();
    const selectedFlavors: {} = this.flavorEl.getSelectedFlavors();
    for (const key in selectedFlavors) {
      if (selectedFlavors[key] === false) {
        delete selectedFlavors[key];
      }
    }

    this.modalController.dismiss(
      {
        customFlavors: customFlavors,
        selectedFlavors: selectedFlavors,
      },
      undefined,
      BrewFlavorPickerComponent.COMPONENT_ID,
    );
  }

  public ngOnInit() {
    // Remove reference
    this.data = this.uiHelper.copyData(this.flavor);
    setTimeout(() => {
      this.flavorEl.setSelectedFlavors(this.data.predefined_flavors);
      this.flavorEl.setCustomFlavors(this.data.custom_flavors);
    }, 50);
  }
}
