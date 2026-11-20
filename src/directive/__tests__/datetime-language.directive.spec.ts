import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { DatetimeLanguageDirective } from '../datetime-language.directive';

/**
 * Ionic's components do not load in unit tests, so the directive runs on a
 * stand-in element here, with the parts of the shadow root it works on as
 * Ionic renders them. e2e/a11y-texts.spec.ts covers the real ion-datetime.
 */
@Component({
  imports: [DatetimeLanguageDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-datetime></test-datetime>`,
})
class HostComponent {}

type Datetime = HTMLElement & { locale?: string };

/** Lets the mutation observer report what happened in the current task. */
function mutationsDelivered(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

describe('DatetimeLanguageDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let datetime: Datetime;
  let toggle: HTMLButtonElement;
  let previous: HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    });
    TestBed.overrideDirective(DatetimeLanguageDirective, {
      set: { selector: 'test-datetime' },
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: {
        PREVIOUS_MONTH: 'Vorheriger Monat',
        SHOW_YEAR_PICKER: 'Monats- und Jahresauswahl anzeigen',
        HIDE_YEAR_PICKER: 'Monats- und Jahresauswahl ausblenden',
      },
    });
    translate.setTranslation('zh_TW', {});
    translate.use('de');
    fixture = TestBed.createComponent(HostComponent);
    datetime = (fixture.nativeElement as HTMLElement).querySelector(
      'test-datetime',
    );
    const root = datetime.attachShadow({ mode: 'open' });
    toggle = document.createElement('button');
    toggle.setAttribute('aria-label', 'Show year picker');
    previous = document.createElement('button');
    previous.setAttribute('aria-label', 'Previous month');
    root.append(toggle, previous);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows dates in the app language', () => {
    expect(datetime.locale).toBe('de');
  });

  it("translates Ionic's names of its buttons", () => {
    expect(previous.getAttribute('aria-label')).toBe('Vorheriger Monat');
    expect(toggle.getAttribute('aria-label')).toBe(
      'Monats- und Jahresauswahl anzeigen',
    );
  });

  it('translates a name Ionic renders again in English', async () => {
    toggle.setAttribute('aria-label', 'Hide year picker');
    await mutationsDelivered();

    expect(toggle.getAttribute('aria-label')).toBe(
      'Monats- und Jahresauswahl ausblenden',
    );
  });

  it('follows a change of the app language', async () => {
    TestBed.inject(TranslateService).use('zh_TW');
    await fixture.whenStable();

    expect(datetime.locale).toBe('zh-TW');
  });
});
