import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { RangeNameDirective, rangeValueText } from '../range-name.directive';

/**
 * Ionic's components do not load in unit tests, so the directive runs on a
 * stand-in element with the knobs ion-range renders into its shadow root.
 * e2e/a11y-forms.spec.ts covers the real one.
 */
@Component({
  imports: [RangeNameDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-range [rangeLabel]="label()" [rangeUnit]="unit()" />`,
})
class HostComponent {
  public readonly label = signal('Bildqualität');
  public readonly unit = signal('%');
}

function knob(value: number, extraPart = ''): string {
  return `<div role="slider" part="knob-handle ${extraPart}" aria-labelledby="range-label" aria-valuenow="${value}"></div>`;
}

describe('RangeNameDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let range: HTMLElement & { step?: number };

  async function create(knobs: string, step = 1): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    range = (fixture.nativeElement as HTMLElement).querySelector('test-range');
    range.step = step;
    range.attachShadow({ mode: 'open' }).innerHTML = knobs;
    await settle();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function knobs(): HTMLElement[] {
    return [
      ...range.shadowRoot.querySelectorAll<HTMLElement>('[role="slider"]'),
    ];
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    });
    TestBed.overrideDirective(RangeNameDirective, {
      set: { selector: 'test-range' },
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: { RANGE_FROM: '{{name}}, von', RANGE_TO: '{{name}}, bis' },
    });
    translate.setTranslation('en', {
      A11Y: { RANGE_FROM: '{{name}}, from', RANGE_TO: '{{name}}, to' },
    });
    translate.use('de');
  });

  it('names the knob after the label and says the value with its unit', async () => {
    await create(knob(80));

    const [only] = knobs();
    expect(only.getAttribute('aria-label')).toBe('Bildqualität');
    expect(only.hasAttribute('aria-labelledby')).toBe(false);
    expect(only.getAttribute('aria-valuetext')).toBe('80 %');
  });

  it('names the lower and the upper knob of a range', async () => {
    await create(
      knob(1.5, 'knob-handle-lower') + knob(3, 'knob-handle-upper'),
      0.5,
    );

    expect(knobs().map((each) => each.getAttribute('aria-label'))).toEqual([
      'Bildqualität, von',
      'Bildqualität, bis',
    ]);
    expect(knobs().map((each) => each.getAttribute('aria-valuetext'))).toEqual([
      '1,5 %',
      '3 %',
    ]);
  });

  it('says a new value once the knob moves', async () => {
    await create(knob(80));

    knobs()[0].setAttribute('aria-valuenow', '95');
    await new Promise((resolve) => setTimeout(resolve));

    expect(knobs()[0].getAttribute('aria-valuetext')).toBe('95 %');
  });

  it('follows the label, the unit and the app language', async () => {
    await create(
      knob(1.5, 'knob-handle-lower') + knob(3, 'knob-handle-upper'),
      0.1,
    );

    fixture.componentInstance.label.set('Flow');
    fixture.componentInstance.unit.set('g/s');
    TestBed.inject(TranslateService).use('en');
    await settle();

    expect(knobs()[0].getAttribute('aria-label')).toBe('Flow, from');
    expect(knobs()[0].getAttribute('aria-valuetext')).toBe('1.5 g/s');
  });

  it('keeps Ionic’s name where no label is given', async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label.set('');
    range = (fixture.nativeElement as HTMLElement).querySelector('test-range');
    range.attachShadow({ mode: 'open' }).innerHTML = knob(2);
    await settle();

    expect(knobs()[0].hasAttribute('aria-label')).toBe(false);
    expect(knobs()[0].getAttribute('aria-labelledby')).toBe('range-label');
  });
});

describe('rangeValueText', () => {
  it('rounds to the decimals of the step', () => {
    expect(rangeValueText(0.1 + 0.2, 0.1, 'bar', 'en')).toBe('0.3 bar');
    expect(rangeValueText(12.3456, 0.001, 's', 'de')).toBe('12,346 s');
    expect(rangeValueText(4, undefined, '', 'en')).toBe('4');
  });

  it('accepts the app’s language codes', () => {
    expect(rangeValueText(1234.5, 0.5, '', 'zh_TW')).toBe('1,234.5');
  });
});
