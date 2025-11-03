import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import moment from 'moment';
import { ModalController, Platform } from '@ionic/angular';
import { DatetimePopoverComponent } from '../../../popover/datetime-popover/datetime-popover.component';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';
import { RoastingParserService } from 'src/app/shared/roasting-parser/roasting-parser.service';
import { RoastData } from 'src/app/shared/roasting-parser/roasting-data.model';
import { RoastingMachine } from 'src/classes/roasting-machine/roasting-machine';
import { UIRoastingMachineStorage } from 'src/services/uiRoastingMachineStorage';
import { ROASTING_MACHINE_TYPES } from 'src/enums/roasting-machine/roasting-machine-types';

@Component({
  selector: 'bean-roast-information',
  templateUrl: './bean-roast-information.component.html',
  styleUrls: ['./bean-roast-information.component.scss'],
  standalone: false,
})
export class BeanRoastInformationComponent implements OnInit, OnChanges {
  @Input() public data: Bean;
  @Output() public dataChange = new EventEmitter<Bean>();
  public displayingTime: string = '';
  public roastData: RoastData;
  public selectedRoastingMachine: RoastingMachine;
  public ROASTING_MACHINE_TYPES = ROASTING_MACHINE_TYPES;

  constructor(
    private readonly platform: Platform,
    private readonly modalCtrl: ModalController,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly roastingParserService: RoastingParserService,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
  ) {}

  async ngOnInit() {
    this.displayingTime = moment()
      .startOf('day')
      .add('seconds', this.data.bean_roast_information.roast_length)
      .toISOString();

    if (this.data.bean_roast_information.roaster_machine) {
      const machines = this.uiRoastingMachineStorage.getAllEntries();
      this.selectedRoastingMachine = machines.find(
        (m) =>
          m.config.uuid === this.data.bean_roast_information.roaster_machine,
      );
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (
      changes.data &&
      changes.data.currentValue.bean_roast_information.roaster_machine !==
        changes.data.previousValue.bean_roast_information.roaster_machine
    ) {
      const machines = this.uiRoastingMachineStorage.getAllEntries();
      this.selectedRoastingMachine = machines.find(
        (m) =>
          m.config.uuid === this.data.bean_roast_information.roaster_machine,
      );
      if (
        this.selectedRoastingMachine?.type !== ROASTING_MACHINE_TYPES.KAFFELOGIC
      ) {
        this.roastData = null;
      }
    }
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

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = reader.result as string;
        this.roastData =
          this.roastingParserService.parseKaffelogic(fileContent);
      };
      reader.readAsText(file);
    }
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
