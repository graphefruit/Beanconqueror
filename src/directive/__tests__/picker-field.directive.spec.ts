import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickerFieldDirective } from '../picker-field.directive';

/**
 * The directive runs on an
 * ion-input stand-in with the native field ion-input renders into the light
 * DOM. The click handler blurs the field, as the app's handlers do.
 */
@Component({
  imports: [PickerFieldDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-input pickerField (click)="open($event)"
    ><input readonly
  /></test-input>`,
})
class HostComponent {
  public opened = 0;

  public open(event: Event): void {
    (event.target as HTMLElement).blur();
    this.opened++;
  }
}

describe('PickerFieldDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let field: HTMLInputElement;

  function press(key: string, repeat = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      repeat,
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    TestBed.overrideDirective(PickerFieldDirective, {
      set: { selector: 'test-input[pickerField]' },
    });
    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    field = (fixture.nativeElement as HTMLElement).querySelector('input');
  });

  afterEach(() => {
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('stays a read-only field that says it opens a dialog', () => {
    expect(field.readOnly).toBe(true);
    // ion-input hands the attribute on to the native field.
    expect(field.parentElement.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('opens the picker with Enter and Space and keeps the focus', () => {
    field.focus();

    const space = press(' ');
    press('Enter');
    press('Enter', true);

    expect(fixture.componentInstance.opened).toBe(2);
    expect(space.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(field);
  });
});
