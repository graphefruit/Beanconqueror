import {Component, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {Preparation} from '../../../classes/preparation/preparation';

@Component({
  selector: 'app-brew-choose-preparation-to-brew',
  templateUrl: './brew-choose-preparation-to-brew.component.html',
  styleUrls: ['./brew-choose-preparation-to-brew.component.scss'],
})
export class BrewChoosePreparationToBrewComponent implements OnInit {
public static COMPONENT_ID: string ='brew-choose-preparation-to-brew';
  constructor(private readonly modalController: ModalController,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiPreparationStorage: UIPreparationStorage) { }



  public ngOnInit() {


  }

  public getPreparationMethods(): Array<Preparation> {
    return this.uiPreparationStorage.getAllEntries().filter((e)=>!e.finished);
  }

  public choosePreparation(_prep: Preparation) {
    this.modalController.dismiss({
      dismissed: true,
      preparation: _prep
    },undefined, BrewChoosePreparationToBrewComponent.COMPONENT_ID);


  }
  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined, BrewChoosePreparationToBrewComponent.COMPONENT_ID);

  }

}
