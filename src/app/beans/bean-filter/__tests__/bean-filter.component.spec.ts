import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';
import { defineCustomElement as defineInput } from '@ionic/core/components/ion-input.js';
import { defineCustomElement as defineToggle } from '@ionic/core/components/ion-toggle.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';
import { Settings } from '../../../../classes/settings/settings';
import { IBeanPageFilter } from '../../../../interfaces/bean/iBeanPageFilter';
import { LIVE_REGION } from '../../../../services/a11y/live-region';
import { ScreenReaderState } from '../../../../services/a11y/screen-reader-state.service';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UIMillStorage } from '../../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BeanFilterComponent } from '../bean-filter.component';

/** 1 March 2026, noon local time. */
const NOW = new Date(2026, 2, 1, 12);

/** Ionic renders its fields asynchronously. */
async function until(condition: () => boolean): Promise<void> {
  for (let frame = 0; frame < 120 && !condition(); frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

describe('BeanFilterComponent', () => {
  let settings: Settings;
  let dismiss: jasmine.Spy;
  let fixture: ComponentFixture<BeanFilterComponent>;
  let given: IBeanPageFilter;

  beforeAll(() => {
    defineInput();
    defineToggle();
  });

  beforeEach(() => {
    settings = new Settings();
    settings.date_format = 'DD.MM.YYYY';
    dismiss = jasmine.createSpy('dismiss');
    const none = { getAllEntries: () => [] };

    TestBed.configureTestingModule({
      imports: [BeanFilterComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: { dismiss } },
        { provide: Platform, useValue: { is: () => false } },
        {
          provide: UIHelper,
          useValue: {
            copyData: <T>(value: T): T => structuredClone(value),
          },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: UIPreparationStorage, useValue: none },
        { provide: UIBeanStorage, useValue: none },
        { provide: UIMillStorage, useValue: none },
        { provide: ScreenReaderState, useValue: { on: signal(false) } },
        { provide: LIVE_REGION, useValue: { announce: () => undefined } },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });

  async function open(filter: Partial<IBeanPageFilter> = {}): Promise<void> {
    given = { ...settings.GET_BEAN_FILTER(), ...filter };
    fixture = TestBed.createComponent(BeanFilterComponent);
    fixture.componentRef.setInput('bean_filter', given);
    fixture.componentRef.setInput('segment', 'open');
    fixture.detectChanges();
    await fixture.whenStable();
    await until(() => favourites() !== null);
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  /** The switch Ionic renders, with the label slotted into it. */
  function favourites(): HTMLInputElement | null {
    return (
      element()
        .querySelector('ion-toggle')
        ?.shadowRoot?.querySelector<HTMLInputElement>('input[role="switch"]') ??
      null
    );
  }

  function button(name: string): HTMLElement {
    return Array.from(
      element().querySelectorAll<HTMLElement>('ion-button'),
    ).find((each) => each.textContent.trim() === name);
  }

  async function toggleFavourites(): Promise<void> {
    const before = favourites().checked;
    favourites().click();
    fixture.detectChanges();
    await fixture.whenStable();
    await until(() => favourites().checked !== before);
  }

  it('has a favourites switch named "Only favorites" that turns on and off', async () => {
    await open();

    expect(element().querySelector('ion-toggle').textContent.trim()).toBe(
      'Only favorites',
    );
    expect(favourites().checked).toBeFalse();

    await toggleFavourites();
    expect(favourites().checked).toBeTrue();
    expect(fixture.componentInstance.filter.favourite).toBeTrue();

    await toggleFavourites();
    expect(favourites().checked).toBeFalse();
    expect(fixture.componentInstance.filter.favourite).toBeFalse();
  });

  it('shows the favourites switch on for a filter that has it on', async () => {
    await open({ favourite: true });
    await until(() => favourites().checked);

    expect(favourites().checked).toBeTrue();
  });

  it('applies a copy of the changed filter and leaves the given one as it was', async () => {
    await open();
    await toggleFavourites();

    button('Apply filter').click();

    expect(dismiss).toHaveBeenCalledOnceWith({
      bean_filter: { ...settings.GET_BEAN_FILTER(), favourite: true },
    });
    expect(given.favourite).toBeFalse();
  });

  it('resets to the filter of a new installation', async () => {
    await open({ favourite: true, bean_roaster: ['Rösterei Nord'] });

    button('Reset filter').click();

    expect(dismiss).toHaveBeenCalledOnceWith(
      { bean_filter: settings.GET_BEAN_FILTER() },
      undefined,
      BeanFilterComponent.COMPONENT_ID,
    );
  });

  it('changes nothing when closed without its buttons', async () => {
    await open({ favourite: true });
    await toggleFavourites();

    fixture.componentInstance.dismiss();

    expect(dismiss).toHaveBeenCalledOnceWith({ bean_filter: undefined });
  });

  it('sets the roast date from yesterday in the web build, shown in the date format', async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(NOW);
    try {
      await open();
      const [from] = Array.from(
        element().querySelectorAll<HTMLElement>('ion-input'),
      );

      from.click();
      fixture.detectChanges();

      expect(
        new Date(fixture.componentInstance.filter.roastingDateStart),
      ).toEqual(new Date(2026, 1, 28, 12));
      expect(from.querySelector('input').value).toBe('28.02.2026');
      expect(fixture.componentInstance.filter.roastingDateEnd).toBe('');
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
