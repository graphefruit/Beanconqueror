import { Component, Input, OnInit } from '@angular/core';

import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import moment from 'moment/moment';
import {
  BrewFlow,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewTemperatureFlow,
  IBrewWeightFlow,
} from '../../../classes/brew/brewFlow';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-brew-modal-import-shot-meticulous',
  templateUrl: './brew-modal-import-shot-meticulous.component.html',
  styleUrls: ['./brew-modal-import-shot-meticulous.component.scss'],
})
export class BrewModalImportShotMeticulousComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-modal-import-shot-meticulous';

  @Input() public meticulousDevice: MeticulousDevice;
  public radioSelection: string;
  public history: Array<any> = [];
  constructor(private readonly modalController: ModalController) {}

  public ngOnInit() {
    this.readHistory();
  }

  private async readHistory() {
    this.history = await this.meticulousDevice.getHistory();
    //this.readShot(history[0]);
  }

  private readShot(_historyData) {
    const newMoment = moment(new Date()).startOf('day');

    let firstDripTimeSet: boolean = false;
    const newBrewFlow = new BrewFlow();

    let seconds: number = 0;
    let milliseconds: number = 0;
    for (const entry of _historyData.data as any) {
      const shotEntry: any = entry.shot;
      const shotEntryTime = newMoment.clone().add('milliseconds', entry.time);
      const timestamp = shotEntryTime.format('HH:mm:ss.SSS');

      seconds = shotEntryTime.diff(newMoment, 'seconds');
      milliseconds = shotEntryTime.get('milliseconds');

      const realtimeWaterFlow: IBrewRealtimeWaterFlow =
        {} as IBrewRealtimeWaterFlow;

      realtimeWaterFlow.brew_time = '';
      realtimeWaterFlow.timestamp = timestamp;
      realtimeWaterFlow.smoothed_weight = 0;
      realtimeWaterFlow.flow_value = shotEntry.flow;
      realtimeWaterFlow.timestampdelta = 0;

      newBrewFlow.realtimeFlow.push(realtimeWaterFlow);

      const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
      brewFlow.timestamp = timestamp;
      brewFlow.brew_time = '';
      brewFlow.actual_weight = shotEntry.weight;
      brewFlow.old_weight = 0;
      brewFlow.actual_smoothed_weight = 0;
      brewFlow.old_smoothed_weight = 0;
      brewFlow.not_mutated_weight = 0;
      newBrewFlow.weight.push(brewFlow);

      if (shotEntry.weight > 0 && firstDripTimeSet === false) {
        firstDripTimeSet = true;

        //this.brewComponent.brewFirstDripTime.setTime(seconds, milliseconds);
        //this.brewComponent.brewFirstDripTime.changeEvent();
      }

      const pressureFlow: IBrewPressureFlow = {} as IBrewPressureFlow;
      pressureFlow.timestamp = timestamp;
      pressureFlow.brew_time = '';
      pressureFlow.actual_pressure = shotEntry.pressure;
      pressureFlow.old_pressure = 0;
      newBrewFlow.pressureFlow.push(pressureFlow);

      const temperatureFlow: IBrewTemperatureFlow = {} as IBrewTemperatureFlow;
      temperatureFlow.timestamp = timestamp;
      temperatureFlow.brew_time = '';
      temperatureFlow.actual_temperature = shotEntry.temperature;
      temperatureFlow.old_temperature = 0;
      newBrewFlow.temperatureFlow.push(temperatureFlow);
    }

    const lastEntry = newBrewFlow.weight[newBrewFlow.weight.length - 1];

    console.log(newBrewFlow);
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID
    );
  }
  public choose(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID
    );
  }
}
