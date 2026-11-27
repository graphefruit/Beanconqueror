import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { MaxNumberValueDirective } from '../max-number-value.directive';

/** A timer field of the time picker, here a native field in place of ion-input. */
@Component({
  imports: [FormsModule, MaxNumberValueDirective],
  template: `<input [(ngModel)]="value" [max-number-value]="59" />`,
})
class HostComponent {
  public value: unknown = 0;
}

describe('MaxNumberValueDirective', () => {
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

  it('reads a decimal comma as a point, also at the start', async () => {
    await typeAndLeave('12,5');
    expect(fixture.componentInstance.value).toBe(12.5);

    await typeAndLeave(',5');
    expect(field.value).toBe('0.5');
    expect(fixture.componentInstance.value).toBe(0.5);
  });

  it('sets a value above the maximum or below 0 to 0', async () => {
    await typeAndLeave('60');
    expect(fixture.componentInstance.value).toBe(0);

    await typeAndLeave('-1');
    expect(fixture.componentInstance.value).toBe(0);
  });

  it('empties a field that holds text only and turns an empty one into 0', async () => {
    await typeAndLeave('abc');
    expect(fixture.componentInstance.value).toBe('');

    await typeAndLeave('');
    expect(fixture.componentInstance.value).toBe(0);
  });
});
