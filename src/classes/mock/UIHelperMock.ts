import DurationConstructor = moment.unitOfTime.DurationConstructor;
import moment from 'moment';
import { sleep } from '../devices';

export class UIHelperMock {
  public copyData(_value: any): any {
    return _value;
  }

  public showAlert(_message: string, title: string) {}

  public formatSeconds(_seconds: DurationConstructor, _format: string) {
    try {
      return moment().startOf('day').add('seconds', _seconds).format(_format);
    } catch (ex) {
      return 0;
    }
  }

  public isBeanconqurorAppReady(): Promise<any> {
    return sleep(10);
  }

  public cloneData(data: any): any {
    return data;
  }

  public toFixedIfNecessary(value: string, dp: number) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed(dp);
  }
}
