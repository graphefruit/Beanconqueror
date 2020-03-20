import {Component, Input, OnInit} from '@angular/core';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIHelper} from '../../../services/uiHelper';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {Brew} from '../../../classes/brew/brew';
import {Mill} from '../../../classes/mill/mill';
import {IMill} from '../../../interfaces/mill/iMill';

@Component({
  selector: 'mill-information',
  templateUrl: './mill-information.component.html',
  styleUrls: ['./mill-information.component.scss'],
})
export class MillInformationComponent implements OnInit {

  public data: Mill = new Mill();
  @Input() private mill: IMill;

  constructor(private readonly uiAnalytics: UIAnalytics,
              private readonly uiHelper: UIHelper,
              private readonly modalController: ModalController,
              private readonly uiBrewStorage: UIBrewStorage) {
  }

  public ngOnInit() {
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('MILL', 'INFORMATION');

    if (this.mill !== undefined) {
      this.data = this.uiHelper.copyData(this.mill);
    }
  }


  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    });
  }

  public countBrewsWithThisMillMethod(): number {
    return this.__getAllReleatedBrews().length;
  }

  public countGrindWeight(): string {
    const brews: Array<Brew> = this.__getAllReleatedBrews();
    let grindWeights: number = 0;
    for (const brew of brews) {
      grindWeights += brew.grind_weight;
    }
    return grindWeights.toFixed(2);
  }

  private __getAllReleatedBrews(): Array<Brew> {
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();

    const relatedBrews: Array<Brew> = [];
    for (const brew of brews) {
      if (brew.mill === this.data.config.uuid) {
        relatedBrews.push(brew);
      }
    }
    return relatedBrews;
  }

}
