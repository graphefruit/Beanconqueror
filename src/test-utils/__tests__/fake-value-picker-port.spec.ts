import { valuePickerPortContract } from '../contracts/value-picker-port.contract';
import { FakeValuePickerPort } from '../fake-value-picker-port';

valuePickerPortContract('FakeValuePickerPort', () => {
  const port = new FakeValuePickerPort();
  return {
    port,
    answer: (answer) => (port.answer = answer),
    lastStart: () => port.starts.at(-1),
  };
});
