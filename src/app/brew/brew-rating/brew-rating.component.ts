import { Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCol,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonRange,
  IonRow,
  IonTextarea,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';

import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-brew-rating',
  templateUrl: './brew-rating.component.html',
  styleUrls: ['./brew-rating.component.scss'],
  imports: [
    FormsModule,
    NgxStarsModule,
    DisableDoubleClickDirective,
    TranslatePipe,
    ToFixedPipe,
    IonHeader,
    IonContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonRange,
    IonTextarea,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class BrewRatingComponent implements OnInit {
  readonly uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly modalController = inject(ModalController);
  private readonly uiBrewStorage = inject(UIBrewStorage);

  public static COMPONENT_ID: string = 'brew-rating';
  public maxBrewRating: number = 5;
  public settings: Settings;
  public data: Brew = new Brew();
  @ViewChild('brewStars', { read: NgxStarsComponent, static: false })
  public brewStars: NgxStarsComponent;

  @Input('brew') public brew: IBrew;

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
      BrewRatingComponent.COMPONENT_ID,
    );
  }
}
