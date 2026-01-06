import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import moment from 'moment';
import { ModalController, Platform, IonicModule } from '@ionic/angular';
import { DatetimePopoverComponent } from '../../../popover/datetime-popover/datetime-popover.component';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';
import { FormsModule } from '@angular/forms';
import { PreventCharacterDirective } from '../../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../../directive/remove-empty-number.directive';
import { TransformDateDirective } from '../../../directive/transform-date';
import { RoastingMachineOverlayDirective } from '../../../directive/roasting-machine-overlay.directive';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'bean-roast-information',
  templateUrl: './bean-roast-information.component.html',
  styleUrls: ['./bean-roast-information.component.scss'],
  imports: [
    IonicModule,
    FormsModule,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    TransformDateDirective,
    RoastingMachineOverlayDirective,
    TranslatePipe,
  ],
})
export class BeanRoastInformationComponent implements OnInit {
  @Input() public data: Bean;
  @Output() public dataChange = new EventEmitter<Bean>();
  public displayingTime: string = '';

  constructor(
    private readonly platform: Platform,
    private readonly modalCtrl: ModalController,
    private readonly bleManager: CoffeeBluetoothDevicesService,
  ) {}

  public ngOnInit() {
    this.displayingTime = moment()
      .startOf('day')
      .add('seconds', this.data.bean_roast_information.roast_length)
      .toISOString();
  }
  public smartScaleConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }

    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }

  public bluetoothScaleSetGreenBeanWeight() {
    this.data.bean_roast_information.green_bean_weight =
      this.bleManager.getScaleWeight();
  }
  public bluetoothScaleSetRoastBeanWeight() {
    this.data.weight = this.bleManager.getScaleWeight();
  }

  /**Somehow on devices an double/tripple click is triggered, and we can't fix this somehow, so we check if the popover is already shown and else ignore the triple tap**/
  private _overLaytimeShown: boolean = false;
  public async showTimeOverlay(_event) {
    if (this._overLaytimeShown === true) {
      return;
    }
    this._overLaytimeShown = true;

    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalCtrl.create({
      component: DatetimePopoverComponent,
      id: 'datetime-popover',
      cssClass: 'popover-actions',
      animated: false,
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
      componentProps: { displayingTime: this.displayingTime },
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    this._overLaytimeShown = false;
    if (
      modalData !== undefined &&
      modalData.data &&
      modalData.data.displayingTime !== undefined
    ) {
      this.displayingTime = modalData.data.displayingTime;
      this.data.bean_roast_information.roast_length = moment
        .duration(
          moment(modalData.data.displayingTime).diff(
            moment(modalData.data.displayingTime).startOf('day'),
          ),
        )
        .asSeconds();
    }
  }
}
