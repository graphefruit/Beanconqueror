import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { NgxStarsComponent } from 'ngx-stars';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { ModalController } from '@ionic/angular';
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

  @Input('brew') public brew: IBrew;

  constructor(
    public readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly modalController: ModalController,
    private readonly uiBrewStorage: UIBrewStorage
  ) {}

  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }

  public ngOnInit() {
    const brew: IBrew = this.uiHelper.cloneData(this.brew);

    if (brew !== undefined) {
      this.data.initializeByObject(brew);
    }
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
