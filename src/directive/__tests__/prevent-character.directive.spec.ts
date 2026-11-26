import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { PreventCharacterDirective } from '../prevent-character.directive';

/** A number field of a form, here a native field in place of ion-input. */
@Component({
  imports: [FormsModule, PreventCharacterDirective],
  template: `<input [(ngModel)]="value" prevent-characters />`,
})
class HostComponent {
  public value: unknown = 0;
}

describe('PreventCharacterDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let field: HTMLInputElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    field = (fixture.nativeElement as HTMLElement).querySelector('input');
  });

  /** Types `text` into the field and leaves it, as ion-input reports it. */
  async function typeAndLeave(text: string): Promise<void> {
    field.value = text;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new CustomEvent('ionBlur'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('reads a decimal comma as a point when the field is left', async () => {
    await typeAndLeave('15,5');

    expect(field.value).toBe('15.5');
    expect(fixture.componentInstance.value).toBe(15.5);
  });

  it('keeps a decimal point', async () => {
    await typeAndLeave('16.25');

    expect(field.value).toBe('16.25');
    expect(fixture.componentInstance.value).toBe(16.25);
  });

  it('cuts off text after the number', async () => {
    await typeAndLeave('17g');

    expect(field.value).toBe('17');
    expect(fixture.componentInstance.value).toBe(17);
  });

  it('empties a field that holds text only', async () => {
    await typeAndLeave('abc');

    expect(field.value).toBe('');
    expect(fixture.componentInstance.value).toBe('');
  });

  it('drops a number that starts with a comma, but reads one after a 0', async () => {
    // indexOf(',') is 0 here, so the comma is not replaced.
    await typeAndLeave(',5');
    expect(field.value).toBe('');

    await typeAndLeave('0,5');
    expect(field.value).toBe('0.5');
    expect(fixture.componentInstance.value).toBe(0.5);
  });

  it('turns an empty field into 0', async () => {
    await typeAndLeave('');

    expect(field.value).toBe('0');
    expect(fixture.componentInstance.value).toBe(0);
  });
});
