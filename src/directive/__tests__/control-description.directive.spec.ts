import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlDescriptionDirective } from '../control-description.directive';

/**
 * The directive runs on stand-in elements instead of Ionic's.
 */
@Component({
  imports: [ControlDescriptionDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <test-checkbox id="webhook">
      <div class="field-label">{{ title() }}</div>
      <p>Sends the brew to your server.</p>
    </test-checkbox>
    <test-toggle id="rating">
      <div class="field-label">Rating</div>
      <p>Rating</p>
    </test-toggle>
    <test-checkbox id="plain">Notes</test-checkbox>
  `,
})
class HostComponent {
  public readonly title = signal('Webhook');
}

describe('ControlDescriptionDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  function element(id: string): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`#${id}`);
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
  }

  beforeEach(async () => {
    TestBed.overrideDirective(ControlDescriptionDirective, {
      set: { selector: 'test-checkbox, test-toggle' },
    });
    fixture = TestBed.createComponent(HostComponent);
    await settle();
  });

  it('names a checkbox after its title and describes it by the explanation', () => {
    const checkbox = element('webhook');
    const description = checkbox.querySelector('p');

    expect(checkbox.getAttribute('aria-label')).toBe('Webhook');
    expect(description.id).not.toBe('');
    expect(checkbox.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('leaves out an explanation that repeats the title', () => {
    expect(element('rating').getAttribute('aria-label')).toBe('Rating');
    expect(element('rating').hasAttribute('aria-describedby')).toBe(false);
  });

  it('leaves a control without explanation alone', () => {
    expect(element('plain').hasAttribute('aria-label')).toBe(false);
  });

  it('follows a changed title', async () => {
    fixture.componentInstance.title.set('Webhook senden');
    await settle();

    expect(element('webhook').getAttribute('aria-label')).toBe(
      'Webhook senden',
    );
  });
});
