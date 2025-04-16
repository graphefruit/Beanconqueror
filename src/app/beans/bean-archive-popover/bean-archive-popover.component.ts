import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IBean } from '../../../interfaces/bean/iBean';
import { Bean } from '../../../classes/bean/bean';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { ModalController } from '@ionic/angular';
import { UIToast } from '../../../services/uiToast';
import { NgxStarsComponent } from 'ngx-stars';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIHelper } from '../../../services/uiHelper';
import { Brew } from '../../../classes/brew/brew';

@Component({
  selector: 'app-bean-archive-popover',
  templateUrl: './bean-archive-popover.component.html',
  styleUrls: ['./bean-archive-popover.component.scss'],
})
export class BeanArchivePopoverComponent implements OnInit {
  public static COMPONENT_ID = 'bean-archive-popover';
  @Input() public bean: IBean;
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;
  public data: Bean = new Bean();

  public maxBeanRating: number = 5;
  public settings: Settings = undefined;
  constructor(
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly modalController: ModalController,
    private readonly uiToast: UIToast,
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiHelper: UIHelper,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.maxBeanRating = this.settings.bean_rating;
  }

  public ngOnInit() {}
  public ionViewWillEnter(): void {
    if (this.bean !== undefined) {
      this.data.initializeByObject(this.bean);
      if (this.data.rating === 0)
        this.data.rating = this.calculateAverageBeanRating();
      if (this.data.rating > 0) {
        this.changedRating();
      }
    }
  }

  public async archive() {
    this.data.finished = true;
    await this.uiBeanStorage.update(this.data);
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

  public calculateAverageBeanRating(): number {
    var sum = 0;
    const brewsWithRatings = this.brewsWithRatings();
    const ratio = this.settings.bean_rating / this.settings.brew_rating;
    brewsWithRatings.forEach((currentBrew, _index, _arr) => {
      sum += currentBrew.rating * ratio;
    });
    return Math.round(sum / brewsWithRatings.length);
  }

  public brewsWithRatings(): Brew[] {
    return this.data.getBrews().filter((brew) => brew.rating > 0);
  }
}
