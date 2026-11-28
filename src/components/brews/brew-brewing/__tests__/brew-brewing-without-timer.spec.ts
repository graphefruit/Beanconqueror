import { Brew } from '../../../../classes/brew/brew';
import { BrewBrewingComponent } from '../brew-brewing.component';

describe('BrewBrewingComponent without the brew time parameter', () => {
  function brewing(timer: { startTimer: jasmine.Spy } | undefined) {
    const graph = jasmine.createSpyObj('BrewBrewingGraphComponent', [
      'timerStartPressed',
      'timerStarted',
      'smartScaleConnected',
      'pressureDeviceConnected',
      'temperatureDeviceConnected',
    ]);
    const component = Object.assign(
      Object.create(BrewBrewingComponent.prototype),
      {
        data: new Brew(),
        settings: { brew_timer_start_delay_active: false },
        brewBrewingGraphEl: graph,
        timer: timer && {
          ...timer,
          isTimerRunning: () => false,
        },
      },
    ) as BrewBrewingComponent;
    spyOn(component, 'checkChanges').and.stub();
    return { component, graph };
  }

  for (const event of [
    'AUTO_START_PRESSURE',
    'AUTO_START_TEMPERATURE',
    'AUTO_LISTEN_SCALE',
    undefined,
  ]) {
    it(`starts no recording on ${event ?? 'a button'}`, async () => {
      const { component, graph } = brewing(undefined);

      await expectAsync(component.timerStartPressed(event)).toBeResolved();
      expect(graph.timerStartPressed).not.toHaveBeenCalled();
      expect(graph.timerStarted).not.toHaveBeenCalled();
    });
  }

  it('starts the hidden timer of the barista mode', async () => {
    const timer = { startTimer: jasmine.createSpy('startTimer') };
    const { component, graph } = brewing(timer);

    await component.timerStartPressed('AUTO_START_PRESSURE');

    expect(graph.timerStarted).toHaveBeenCalledOnceWith('AUTO_START_PRESSURE');
    expect(timer.startTimer).toHaveBeenCalledTimes(1);
  });
});
