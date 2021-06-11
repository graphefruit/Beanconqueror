import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';
import {ModalController} from '@ionic/angular';
import {IFlavor} from '../../../interfaces/flavor/iFlavor';
import {CuppingFlavorsComponent} from '../../../components/cupping-flavors/cupping-flavors.component';

@Component({
  selector: 'app-brew-flavor-picker',
  templateUrl: './brew-flavor-picker.component.html',
  styleUrls: ['./brew-flavor-picker.component.scss'],
})
export class BrewFlavorPickerComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-flavor-picker';
  @Input() public flavor: IFlavor;
  public data: IFlavor = undefined;

  @ViewChild('flavorEl', {read: CuppingFlavorsComponent, static: false}) public flavorEl: CuppingFlavorsComponent;

  constructor(private readonly uiHelper: UIHelper,
              private readonly modalController: ModalController) {


  }



  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,BrewFlavorPickerComponent.COMPONENT_ID);
  }
  public setFlavors() {
    const customFlavors: Array<string> =  this.flavorEl.getCustomFlavors();
    const selectedFlavors: {} = this.flavorEl.getSelectedFlavors();
    for (const key in selectedFlavors) {
      if (selectedFlavors[key] === false) {
        delete selectedFlavors[key];
      }
    }

    this.modalController.dismiss({
      customFlavors: customFlavors,
      selectedFlavors: selectedFlavors,
    },undefined,BrewFlavorPickerComponent.COMPONENT_ID);
  }


  public ngOnInit() {
    // Remove reference
    this.data = this.uiHelper.copyData(this.flavor);
    setTimeout(() => {


    this.flavorEl.setSelectedFlavors(this.data.predefined_flavors);
    this.flavorEl.setCustomFlavors(this.data.custom_flavors);
    },50);
  }

}
