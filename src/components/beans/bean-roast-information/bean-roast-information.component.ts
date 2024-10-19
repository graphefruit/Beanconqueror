import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import moment from 'moment';
import { ModalController, Platform } from '@ionic/angular';
import { DatetimePopoverComponent } from '../../../popover/datetime-popover/datetime-popover.component';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';

@Component({
  selector: 'bean-roast-information',
  templateUrl: './bean-roast-information.component.html',
  styleUrls: ['./bean-roast-information.component.scss'],
})
export class BeanRoastInformationComponent implements OnInit {
  @Input() public data: Bean;
  @Output() public dataChange = new EventEmitter<Bean>();
  public displayingTime: string = '';

  constructor(
    private readonly platform: Platform,
    private readonly modalCtrl: ModalController,
    private readonly bleManager: CoffeeBluetoothDevicesService
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

  public async showTimeOverlay(_event) {
    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalCtrl.create({
      component: DatetimePopoverComponent,
      id: 'datetime-popover',
      cssClass: 'popover-actions',
      animated: true,
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
      componentProps: { displayingTime: this.displayingTime },
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (
      modalData !== undefined &&
      modalData.data &&
      modalData.data.displayingTime !== undefined
    ) {
      this.displayingTime = modalData.data.displayingTime;
      this.data.bean_roast_information.roast_length = moment
        .duration(
          moment(modalData.data.displayingTime).diff(
            moment(modalData.data.displayingTime).startOf('day')
          )
        )
        .asSeconds();
    }
  }
}
