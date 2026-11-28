import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';
import { defineCustomElement as defineInput } from '@ionic/core/components/ion-input.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import en from '../../../assets/i18n/en.json';
import { Settings } from '../../../classes/settings/settings';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BrewTimerComponent } from '../brew-timer.component';

/**
 * The brew timer of the brew form, in the web build without a device: the
 * time field, start, pause, resume and reset, and the first drip mark of an
 * espresso method. Time is moved with fakeAsync, which also moves Date.
 */
describe('BrewTimerComponent', () => {
  let fixture: ComponentFixture<BrewTimerComponent>;
  let element: HTMLElement;

  beforeAll(() => {
    defineInput();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BrewTimerComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: {} },
        // The web build: no capacitor, no iOS.
        { provide: Platform, useValue: { is: () => false } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: {
            attachOnEvent: () => new Subject<unknown>(),
            getScale: () => undefined,
          },
        },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });

  afterEach(() => {
    element?.remove();
  });

  /** Opens the timer and lets the time field show its first value. */
  function open(
    dripTimerVisible: boolean,
    initial: { seconds: number; milliseconds?: number } = undefined,
  ): void {
    fixture = TestBed.createComponent(BrewTimerComponent);
    fixture.componentRef.setInput('label', 'Time');
    if (initial) {
      fixture.componentRef.setInput('initialSeconds', initial.seconds);
      fixture.componentRef.setInput(
        'initialMilliseconds',
        initial.milliseconds,
      );
    }
    fixture.componentRef.setInput('bloomTimerVisible', true);
    fixture.componentRef.setInput('dripTimerVisible', dripTimerVisible);
    element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    fixture.detectChanges();
    afterReset();
  }

  /** Moves the clock by `seconds` and renders what the timer shows then. */
  function settle(seconds: number): void {
    tick(seconds * 1000);
    // The time field is written in the next frame.
    tick(20);
    fixture.detectChanges();
  }

  /** The time field is written half a second after a reset. */
  function afterReset(): void {
    tick(600);
    fixture.detectChanges();
  }

  function shownTime(): string {
    return element.querySelector('input').value;
  }

  /**
   * The name screen readers read; ion-button hands its aria-label on to the
   * native button once it has rendered.
   */
  function nameOf(button: HTMLElement): string {
    return (
      button.getAttribute('aria-label') ??
      button.shadowRoot?.querySelector('button')?.getAttribute('aria-label')
    );
  }

  /** The timer's buttons by their names, in the order of the field. */
  function buttons(): string[] {
    return [...element.querySelectorAll<HTMLElement>('ion-button')].map(nameOf);
  }

  function press(name: string): void {
    const button = [
      ...element.querySelectorAll<HTMLElement>('ion-button'),
    ].find((candidate) => nameOf(candidate) === name);
    expect(button).withContext(name).toBeDefined();
    button.click();
    fixture.detectChanges();
  }

  /** Stops the timer's own ticks, which would run on forever. */
  function stop(): void {
    fixture.destroy();
    flush();
    discardPeriodicTasks();
  }

  it('resets the time and offers a new start', fakeAsync(() => {
    open(false);
    expect(shownTime()).toBe('00:00');
    // Nothing to reset before the first start.
    expect(buttons()).toEqual(['Start timer']);

    press('Start timer');
    settle(12);
    press('Pause timer');
    settle(0);
    expect(shownTime()).toBe('00:12');
    expect(buttons()).toEqual(['Reset timer', 'Resume timer']);

    const resets = jasmine.createSpy('timerReset');
    fixture.componentInstance.timerReset.subscribe(resets);
    press('Reset timer');
    afterReset();

    expect(resets).toHaveBeenCalledTimes(1);
    expect(shownTime()).toBe('00:00');
    expect(fixture.componentInstance.getSeconds()).toBe(0);
    expect(buttons()).toEqual(['Start timer']);

    // The new start counts from zero.
    press('Start timer');
    settle(3);
    expect(shownTime()).toBe('00:03');
    stop();
  }));

  it('starts with the stored time of a field that is shown again', fakeAsync(() => {
    open(false, { seconds: 95, milliseconds: 120 });

    expect(shownTime()).toBe('01:35');
    expect(fixture.componentInstance.getSeconds()).toBe(95);
    expect(fixture.componentInstance.getMilliseconds()).toBe(120);
    // A stored time is not run on, as when editing a brew.
    expect(buttons()).toEqual(['Reset timer', 'Start timer']);
    stop();
  }));

  it('starts at zero without a stored time', fakeAsync(() => {
    open(false, { seconds: undefined });

    expect(shownTime()).toBe('00:00');
    expect(fixture.componentInstance.getSeconds()).toBe(0);
    stop();
  }));

  it('offers the first drip mark only to an espresso method', fakeAsync(() => {
    open(false);
    press('Start timer');
    settle(2);

    expect(buttons()).toEqual(['Set bloom time', 'Pause timer']);
    stop();
  }));

  it('marks the first drip at the running time and keeps the timer running', fakeAsync(() => {
    open(true);
    const drips: number[] = [];
    fixture.componentInstance.dripTimer.subscribe((seconds: number) =>
      drips.push(seconds),
    );

    press('Start timer');
    settle(8);
    expect(buttons()).toEqual([
      'Set bloom time',
      'Set first drip time',
      'Pause timer',
    ]);
    press('Set first drip time');

    expect(drips).toEqual([8]);
    // Marked once per brew.
    expect(buttons()).toEqual(['Set bloom time', 'Pause timer']);

    settle(22);
    press('Pause timer');
    settle(0);
    expect(shownTime()).toBe('00:30');
    expect(fixture.componentInstance.getSeconds()).toBe(30);
    stop();
  }));
});
