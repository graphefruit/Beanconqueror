import {Component, Input, OnInit} from '@angular/core';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIHelper} from '../../../services/uiHelper';
import {Preparation} from '../../../classes/preparation/preparation';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {Brew} from '../../../classes/brew/brew';
import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';

@Component({
  selector: 'preparation-information',
  templateUrl: './preparation-information.component.html',
  styleUrls: ['./preparation-information.component.scss'],
})
export class PreparationInformationComponent implements OnInit {

  public data: Preparation = new Preparation();
  @Input() private preparation: IPreparation;

  constructor(private readonly uiAnalytics: UIAnalytics,
              private readonly uiHelper: UIHelper,
              private readonly modalController: ModalController,
              private readonly uiBrewStorage: UIBrewStorage) {
  }

  public ngOnInit() {
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('PREPARATION', 'INFORMATION');

    if (this.preparation !== undefined) {
      this.data = this.uiHelper.copyData(this.preparation);
    }
  }


  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    });
  }

  public countBrewsWithThisPreparationMethod(): number {
    return this.__getAllReleatedBrews().length;
  }

  public countBrewedQuantity(): string {
    const brews: Array<Brew> = this.__getAllReleatedBrews();
    let mlBrewed: number = 0;
    for (const brew of brews) {
      mlBrewed += brew.brew_quantity;
    }
    return mlBrewed.toFixed(2);
  }

  public typeOfBrewedQuantity(): string {
    const brews: Array<Brew> = this.__getAllReleatedBrews();

    for (const brew of brews) {
      return BREW_QUANTITY_TYPES_ENUM[brew.brew_quantity_type];
    }
    return 'gr';
  }

  public countGrindWeight(): string {
    const brews: Array<Brew> = this.__getAllReleatedBrews();
    let grindWeights: number = 0;
    for (const brew of brews) {
      grindWeights += brew.grind_weight;
    }
    return grindWeights.toFixed(2);
  }

  public countTimeSpentWithThisPreparationMethod(): string {
    const brews: Array<Brew> = this.__getAllReleatedBrews();
    let grindWeights: number = 0;
    for (const brew of brews) {
      grindWeights += brew.brew_time;
    }
    return grindWeights.toFixed(2);
  }

  private __getAllReleatedBrews(): Array<Brew> {
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();

    const relatedBrews: Array<Brew> = [];
    for (const brew of brews) {
      if (brew.method_of_preparation === this.data.config.uuid) {
        relatedBrews.push(brew);
      }
    }
    return relatedBrews;
  }

}
