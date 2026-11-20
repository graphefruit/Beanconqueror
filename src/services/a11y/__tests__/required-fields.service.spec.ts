import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LIVE_REGION } from '../live-region';
import { isBlank, RequiredFields } from '../required-fields.service';

type Field = HTMLElement & {
  value?: unknown;
  errorText?: string;
  setFocus?: () => Promise<void>;
};

/** An ion-input stand-in with Ionic's error text, which is an alert. */
function field(value: unknown, errorText?: string, required = true): Field {
  const element = document.createElement('ion-input') as Field;
  if (required) {
    element.setAttribute('required', '');
  }
  element.value = value;
  element.errorText = errorText;
  element.setFocus = jasmine
    .createSpy('setFocus')
    .and.returnValue(Promise.resolve());
  element.innerHTML = '<div class="error-text" role="alert"></div>';
  return element;
}

describe('RequiredFields', () => {
  let heard: string[];
  let form: HTMLElement;

  function report(): Promise<void> {
    return TestBed.inject(RequiredFields).report(form);
  }

  beforeEach(() => {
    heard = [];
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: LIVE_REGION,
          useValue: { announce: (message: string) => heard.push(message) },
        },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      NAME_REQUIRED: 'Bitte gib einen Namen ein.',
    });
    translate.use('de');
    form = document.createElement('form');
  });

  it('marks the blank required fields, focuses the first and announces its error', async () => {
    const name = field('  ', 'Bitte gib einen Namen für die Bohnen ein.');
    const roaster = field('', 'Röster fehlt');
    const filled = field('Alpha');
    const optional = field('', undefined, false);
    form.append(name, filled, roaster, optional);

    await report();

    for (const blank of [name, roaster]) {
      expect(blank.classList).toContain('ion-touched');
      expect(blank.classList).toContain('ion-invalid');
      expect(blank.querySelector('.error-text').hasAttribute('role')).toBe(
        false,
      );
    }
    for (const other of [filled, optional]) {
      expect(other.classList).not.toContain('ion-invalid');
    }
    expect(name.setFocus).toHaveBeenCalled();
    expect(roaster.setFocus).not.toHaveBeenCalled();
    expect(heard).toEqual(['Bitte gib einen Namen für die Bohnen ein.']);
  });

  it('shows the tab with the fields first and marks them once it is shown', async () => {
    const name = field('', 'Bitte gib einen Namen für die Bohnen ein.');
    const reported = TestBed.inject(RequiredFields).report(form, () =>
      form.append(name),
    );
    TestBed.inject(ApplicationRef).tick();
    await reported;

    expect(name.classList).toContain('ion-invalid');
    expect(name.setFocus).toHaveBeenCalled();
    expect(heard).toEqual(['Bitte gib einen Namen für die Bohnen ein.']);
  });

  it('announces the error also when the field is not shown', async () => {
    await report();

    expect(heard).toEqual(['Bitte gib einen Namen ein.']);
  });
});

describe('isBlank', () => {
  it('takes nothing and only spaces as blank', () => {
    expect([undefined, null, '', ' \n '].map(isBlank)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(['Alpha', 0].map(isBlank)).toEqual([false, false]);
  });
});
