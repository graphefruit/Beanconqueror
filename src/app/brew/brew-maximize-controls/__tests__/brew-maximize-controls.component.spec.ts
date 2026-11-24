import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateModule, TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../../../classes/brew/brew';
import { Settings } from '../../../../classes/settings/settings';
import { BrewTimerComponent } from '../../../../components/brew-timer/brew-timer.component';
import { BrewBrewingComponent } from '../../../../components/brews/brew-brewing/brew-brewing.component';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewMaximizeControlsComponent } from '../brew-maximize-controls.component';

describe('BrewMaximizeControlsComponent', () => {
  let fixture: ComponentFixture<BrewMaximizeControlsComponent>;

  beforeEach(() => {
    const settingsStorage = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
    ]);
    settingsStorage.getSettings.and.returnValue(new Settings());
    TestBed.configureTestingModule({
      imports: [BrewMaximizeControlsComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['dismiss']),
        },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj('UIHelper', ['formatSeconds']),
        },
        { provide: UISettingsStorage, useValue: settingsStorage },
        {
          provide: Platform,
          useValue: { backButton: { subscribeWithPriority: () => undefined } },
        },
      ],
    });
    // Plain elements instead of the Ionic components, which would load icons.
    TestBed.overrideComponent(BrewMaximizeControlsComponent, {
      set: { imports: [TranslatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    fixture = TestBed.createComponent(BrewMaximizeControlsComponent);
    fixture.componentInstance.brew = new Brew();
  });

  function controlNames(): string[] {
    const buttons: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll(
        '#informationContainer ion-button',
      ),
    );
    return buttons.map((button) => button.getAttribute('aria-label'));
  }

  it('shows no timer controls when the brew time parameter is hidden', () => {
    // Without the parameter the brew form has no timer component.
    fixture.componentInstance.brewComponent = {
      timer: undefined,
    } as BrewBrewingComponent;

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(controlNames()).toEqual([]);
  });

  it('offers to start a timer that has not started yet', () => {
    const timer = {
      timer: { runTimer: false, hasStarted: false, hasFinished: false },
      getSeconds: () => 0,
    } as unknown as BrewTimerComponent;
    fixture.componentInstance.brewComponent = {
      timer,
    } as BrewBrewingComponent;

    fixture.detectChanges();

    expect(controlNames()).toEqual(['A11Y.START_TIMER']);
  });
});
