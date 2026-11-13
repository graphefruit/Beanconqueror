import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';

import moment from 'moment';

import { Settings } from '../../../classes/settings/settings';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { createMockUISettingsStorage } from '../../../test-utils';
import { TimerComponent } from '../timer.component';

/**
 * A timer can be created for a time that is stored already, e.g. when the
 * brew form lays out its fields again. It shows that time from the start,
 * without reporting it as a change.
 */
describe('TimerComponent', () => {
  let fixture: ComponentFixture<TimerComponent>;
  let component: TimerComponent;
  let settings: Settings;
  /** The events the timer has emitted, in their order. */
  let emitted: string[];

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    const mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);

    TestBed.configureTestingModule({
      imports: [TimerComponent],
      providers: [
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: jasmine.createSpyObj('CoffeeBluetoothDevicesService', [
            'getScale',
          ]),
        },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['create']),
        },
        {
          provide: Platform,
          useValue: jasmine.createSpyObj('Platform', ['is']),
        },
      ],
    }).compileComponents();
  }));

  /** Creates a timer, with start values if given, and renders it. */
  function createTimer(_start?: {
    seconds: number;
    milliseconds: number;
  }): void {
    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    emitted = [];
    for (const event of [
      'timerStarted',
      'timerPaused',
      'timerReset',
      'timerResumed',
      'timerTicked',
    ] as const) {
      component[event].subscribe(() => emitted.push(event));
    }
    if (_start) {
      fixture.componentRef.setInput('initialSeconds', _start.seconds);
      fixture.componentRef.setInput('initialMilliseconds', _start.milliseconds);
    }
    fixture.detectChanges();
  }

  /** The time of the timer as it is written into its field. */
  function shownTime(): string {
    return moment(component.displayingTime).format('mm:ss.SSS');
  }

  /** The text of the field, once Ionic has rendered its input. */
  async function fieldText(): Promise<string> {
    const field: HTMLElement = fixture.nativeElement;
    for (let waited = 0; waited < 2000; waited += 10) {
      if (field.querySelector('input')?.value) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return field.querySelector('input')?.value;
  }

  it('starts at zero without a start value', () => {
    createTimer();

    expect(component.getSeconds()).toBe(0);
    expect(component.getMilliseconds()).toBe(0);
    expect(shownTime()).toBe('00:00.000');
    expect(emitted).toEqual([]);
  });

  it('has its start value from the first rendering on, without running', () => {
    createTimer({ seconds: 30, milliseconds: 250 });

    expect(component.getSeconds()).toBe(30);
    expect(component.getMilliseconds()).toBe(250);
    expect(shownTime()).toBe('00:30.250');
    expect(component.isTimerRunning()).toBeFalse();
  });

  it('shows its start value in its field', async () => {
    settings.brew_milliseconds = true;
    createTimer({ seconds: 30, milliseconds: 250 });

    expect(await fieldText()).toBe('00:30.250');
  });

  it('does not report its start value as a tick', () => {
    createTimer({ seconds: 30, milliseconds: 250 });

    // A tick makes the brew form store the time of the timer.
    expect(emitted).toEqual([]);
  });

  it('counts a missing start value as zero', () => {
    createTimer({ seconds: undefined, milliseconds: 250 });
    expect(component.getSeconds()).toBe(0);
    expect(component.getMilliseconds()).toBe(250);
    expect(shownTime()).toBe('00:00.250');

    createTimer({ seconds: 30, milliseconds: undefined });
    expect(component.getSeconds()).toBe(30);
    expect(component.getMilliseconds()).toBe(0);
    expect(shownTime()).toBe('00:30.000');

    createTimer({ seconds: null, milliseconds: null });
    expect(component.getSeconds()).toBe(0);
    expect(component.getMilliseconds()).toBe(0);
    expect(shownTime()).toBe('00:00.000');
  });

  it('keeps its time when the start value changes later', () => {
    createTimer({ seconds: 30, milliseconds: 250 });

    // The brew form binds the stored time, which follows the timer.
    fixture.componentRef.setInput('initialSeconds', 45);
    fixture.componentRef.setInput('initialMilliseconds', 10);
    fixture.detectChanges();

    expect(component.getSeconds()).toBe(30);
    expect(component.getMilliseconds()).toBe(250);
    expect(shownTime()).toBe('00:30.250');
    expect(emitted).toEqual([]);
  });

  it('is reset to zero, not to its start value', () => {
    createTimer({ seconds: 30, milliseconds: 250 });

    component.reset();

    expect(component.getSeconds()).toBe(0);
    expect(component.getMilliseconds()).toBe(0);
    expect(shownTime()).toBe('00:00.000');
    expect(emitted).toEqual(['timerReset', 'timerTicked']);
  });

  it('runs on from its start value when it is started', fakeAsync(() => {
    settings.brew_milliseconds = true;
    createTimer({ seconds: 30, milliseconds: 250 });

    component.startTimer();
    tick(2300);
    component.pauseTimer();
    // The tick that was waiting when the timer was paused.
    tick(10);

    expect(component.getSeconds()).toBe(32);
    expect(component.getMilliseconds()).toBe(550);
    expect(shownTime()).toBe('00:32.550');
  }));
});
