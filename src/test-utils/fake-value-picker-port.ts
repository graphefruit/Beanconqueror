import type { PortResult } from '../services/ports/port-result';
import type {
  DatePick,
  ValuePickerPort,
} from '../services/ports/value-picker-port';

/** VALUE_PICKER_PORT without a device for unit tests; set the answer, then call the code under test. */
export class FakeValuePickerPort implements ValuePickerPort {
  /** The answer of the next picks; without one the person closes the picker. */
  public answer: PortResult<DatePick> = {
    ok: true,
    value: { kind: 'cancelled' },
  };
  /** The date each pick opened on. */
  public readonly starts: Date[] = [];

  public pickDate(start: Date): Promise<PortResult<DatePick>> {
    this.starts.push(start);
    return Promise.resolve(this.answer);
  }
}
