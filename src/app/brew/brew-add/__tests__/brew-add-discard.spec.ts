import { AlertController, Platform } from '@ionic/angular';

import { Brew } from '../../../../classes/brew/brew';
import { DiscardGuard } from '../../../../services/discardGuard/discard-guard';
import { UIAlert } from '../../../../services/uiAlert';
import { BrewAddComponent } from '../brew-add.component';

describe('BrewAddComponent leaving the form', () => {
  let component: BrewAddComponent;
  let showConfirm: jasmine.Spy;
  let modalDismiss: jasmine.Spy;
  let timerRunning: boolean;

  beforeEach(() => {
    showConfirm = jasmine.createSpy('showConfirm').and.resolveTo('NO');
    modalDismiss = jasmine.createSpy('dismiss').and.resolveTo(true);
    timerRunning = false;
    const data = new Brew();
    data.grind_weight = 18;
    component = Object.assign(Object.create(BrewAddComponent.prototype), {
      data,
      settings: {},
      modalController: { dismiss: modalDismiss },
      bleManager: { getScale: () => null },
      brewBrewing: {
        timer: { isTimerRunning: () => timerRunning },
        brewBrewingGraphEl: {
          flow_profile_raw: {
            weight: [],
            pressureFlow: [],
            temperatureFlow: [],
          },
        },
      },
    }) as BrewAddComponent;
    Object.assign(component, {
      discardGuard: new DiscardGuard(
        { showConfirm } as unknown as UIAlert,
        {
          backButton: {
            subscribeWithPriority: () => ({ unsubscribe: () => undefined }),
          },
        } as unknown as Platform,
        {} as AlertController,
        {
          question: 'PAGE_BREW_DISCARD_CONFIRM',
          changed: () => component['formChanged'](),
          close: () => component.dismiss(),
        },
        null,
      ),
    });
  });

  it('closes without asking when only the form filled in values', async () => {
    component.brewLoaded();
    component.data.coordinates = {
      ...component.data.coordinates,
      latitude: 52.5,
    };

    await component.confirmDismiss();

    expect(showConfirm).not.toHaveBeenCalled();
    expect(modalDismiss).toHaveBeenCalledTimes(1);
  });

  it('asks once the user changed a value', async () => {
    component.brewLoaded();
    component.data.grind_weight = 17;

    await component.confirmDismiss();

    expect(showConfirm).toHaveBeenCalledTimes(1);
    expect(modalDismiss).not.toHaveBeenCalled();
  });

  it('asks when the user typed before the form had loaded', async () => {
    component.noteInput();
    component.brewLoaded();

    await component.confirmDismiss();

    expect(showConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not count events after loading as input by themselves', async () => {
    component.brewLoaded();
    component.noteInput();

    await component.confirmDismiss();

    expect(showConfirm).not.toHaveBeenCalled();
  });

  it('asks while the timer runs', async () => {
    component.brewLoaded();
    timerRunning = true;

    await component.confirmDismiss();

    expect(showConfirm).toHaveBeenCalledTimes(1);
  });

  it('asks when the scale wrote a flow profile', async () => {
    component.brewLoaded();
    component.brewBrewing.brewBrewingGraphEl.flow_profile_raw.weight.push(
      {} as never,
    );

    await component.confirmDismiss();

    expect(showConfirm).toHaveBeenCalledTimes(1);
  });
});
