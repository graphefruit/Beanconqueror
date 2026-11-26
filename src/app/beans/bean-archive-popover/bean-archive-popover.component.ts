import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
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
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { RangeNameDirective } from '../../../directive/range-name.directive';
import { StarsNameDirective } from '../../../directive/stars-name.directive';
import { IBean } from '../../../interfaces/bean/iBean';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { BeanCommands } from '../../../stores/beans/bean-commands';

@Component({
  selector: 'app-bean-archive-popover',
  templateUrl: './bean-archive-popover.component.html',
  styleUrls: ['./bean-archive-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    NgxStarsModule,
    StarsNameDirective,
    DisableDoubleClickDirective,
    TranslatePipe,
    ToFixedPipe,
    IonHeader,
    IonContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonRange,
    RangeNameDirective,
    IonTextarea,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class BeanArchivePopoverComponent implements OnInit {
  private readonly beanCommands = inject(BeanCommands);
  private readonly modalController = inject(ModalController);
  private readonly uiToast = inject(UIToast);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  readonly uiHelper = inject(UIHelper);

  public static COMPONENT_ID = 'bean-archive-popover';
  @Input() public bean: IBean;
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;
  public data: Bean = new Bean();
  public averageBrewRating: number | undefined;

  public maxBeanRating: number = 5;
  public settings: Settings = undefined;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.maxBeanRating = this.settings.bean_rating;
  }

  public ngOnInit() {}
  public ionViewWillEnter(): void {
    if (this.bean !== undefined) {
      this.data.initializeByObject(this.bean);
      this.tryCalcuatingAverageBrewRating();
      if (this.averageBrewRating) {
        this.data.rating = this.averageBrewRating;
      }
      if (this.data.rating > 0) {
        this.changedRating();
      }
    }
  }

  public async archive() {
    await this.beanCommands.archive(
      this.data.config.uuid,
      this.data.rating,
      this.data.note,
    );
    this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeanArchivePopoverComponent.COMPONENT_ID,
    );
  }
  public changedRating() {
    if (typeof this.beanRating !== 'undefined') {
      this.beanRating.setRating(this.data.rating);
    }
  }

  private tryCalcuatingAverageBrewRating() {
    // An existing rating on the bean exists. Don't attempt to calculate average rating.
    if (this.data.rating !== 0) {
      return;
    }

    const brewsWithRatings = this.data
      .getBrews()
      .filter((brew) => brew.rating > 0);
    // No brews with ratings found. Don't attempt to calculate average rating.
    if (brewsWithRatings.length === 0) {
      return;
    }
    this.averageBrewRating = this.calculateAverageBeanRating(brewsWithRatings);
  }

  private calculateAverageBeanRating(brewsWithRatings: Brew[]): number {
    let sum = 0;
    const ratio = this.settings.bean_rating / this.settings.brew_rating;
    brewsWithRatings.forEach((currentBrew, _index, _arr) => {
      sum += currentBrew.rating * ratio;
    });
    const averageRating = sum / brewsWithRatings.length;
    const numberOfSteps = Math.round(
      averageRating / this.settings.bean_rating_steps,
    );
    const roundedRating = numberOfSteps * this.settings.bean_rating_steps;

    return this.uiHelper.toFixedIfNecessary(roundedRating, 2);
  }
}
