import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SelectLabelDirective } from '../select-label.directive';

/**
 * Ionic's components do not load in unit tests, so the directive runs on a
 * stand-in element with the label ion-select renders into its shadow root.
 * e2e/a11y-brew-form.spec.ts covers the real one.
 */
@Component({
  imports: [SelectLabelDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-select />`,
})
class HostComponent {}

describe('SelectLabelDirective', () => {
  beforeAll(() => {
    if (!customElements.get('test-select')) {
      customElements.define('test-select', class extends HTMLElement {});
    }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.overrideDirective(SelectLabelDirective, {
      set: { selector: 'test-select' },
    });
  });

  it('hides the visible label, which the button names already', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const select = (fixture.nativeElement as HTMLElement).querySelector(
      'test-select',
    );
    select.attachShadow({ mode: 'open' }).innerHTML =
      '<label><div class="label-text-wrapper"><div class="label-text">Bohnensorte</div></div>' +
      '<button aria-label="Bohnensorte, Brazil Cerrado"></button></label>';
    await fixture.whenStable();

    const root = select.shadowRoot;
    expect(
      root.querySelector('.label-text-wrapper').getAttribute('aria-hidden'),
    ).toBe('true');
    expect(root.querySelector('button').hasAttribute('aria-hidden')).toBe(
      false,
    );
  });
});
