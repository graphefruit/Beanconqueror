import { Component, OnInit, ViewChild } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import moment from 'moment/moment';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { NgxStarsComponent } from 'ngx-stars';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { ModalController, NavParams } from '@ionic/angular';
import { Brew } from '../../../classes/brew/brew';
import { UIBrewStorage } from '../../../services/uiBrewStorage';

@Component({
  selector: 'app-brew-rating',
  templateUrl: './brew-rating.component.html',
  styleUrls: ['./brew-rating.component.scss'],
})
export class BrewRatingComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-rating';
  public maxBrewRating: number = 5;
  public settings: Settings;
  public data: Brew = new Brew();
  @ViewChild('brewStars', { read: NgxStarsComponent, static: false })
  public brewStars: NgxStarsComponent;

  constructor(
    private readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiBrewStorage: UIBrewStorage
  ) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.cloneData(this.navParams.get('brew'));

    if (brew !== undefined) {
      this.data.initializeByObject(brew);
    }
  }

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();

    this.maxBrewRating = this.settings.brew_rating;
  }
  public changedRating() {
    if (typeof this.brewStars !== 'undefined') {
      this.brewStars.setRating(this.data.rating);
    }
  }
  public async save() {
    await this.uiBrewStorage.update(this.data);
    this.dismiss();
  }
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewRatingComponent.COMPONENT_ID
    );
  }
}
