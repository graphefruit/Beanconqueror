import {Component, Input, OnInit} from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';
import {Brew} from '../../../classes/brew/brew';
import {ModalController} from '@ionic/angular';

@Component({
  selector: 'app-brew-flavor-picker',
  templateUrl: './brew-flavor-picker.component.html',
  styleUrls: ['./brew-flavor-picker.component.scss'],
})
export class BrewFlavorPickerComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-flavor-picker';
  @Input() public brew: Brew;
  public data: Brew;
  constructor(private readonly uiHelper: UIHelper,
              private readonly modalController: ModalController) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range



  }



  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,BrewFlavorPickerComponent.COMPONENT_ID);
  }


  public ngOnInit() {
    this.data.initializeByObject(this.brew);

  }

}
