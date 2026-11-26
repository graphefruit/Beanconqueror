import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { PreventCharacterDirective } from '../prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../remove-empty-number.directive';

/** A number field as the forms use it: emptied on focus, 0 again when left. */
@Component({
  imports: [FormsModule, RemoveEmptyNumberDirective, PreventCharacterDirective],
  template: `<input
    [(ngModel)]="value"
    remove-empty-number
    prevent-characters
  />`,
})
class HostComponent {
  public value: unknown = 0;
}

describe('RemoveEmptyNumberDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let field: HTMLInputElement;

  async function open(value: unknown): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = value;
    fixture.detectChanges();
    await fixture.whenStable();
    field = (fixture.nativeElement as HTMLElement).querySelector('input');
  }

  /** ion-input reports focus and blur as ionFocus and ionBlur. */
  async function send(event: 'ionFocus' | 'ionBlur'): Promise<void> {
    field.dispatchEvent(new CustomEvent(event));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('empties a field holding 0 on focus, and the field is 0 again when left empty', async () => {
    await open(0);
    expect(field.value).toBe('0');

    await send('ionFocus');
    expect(field.value).toBe('');
    expect(fixture.componentInstance.value).toBe('');

    await send('ionBlur');
    expect(field.value).toBe('0');
    expect(fixture.componentInstance.value).toBe(0);
  });

  for (const empty of ['0', '', null, undefined]) {
    it(`empties a field holding ${JSON.stringify(empty)} on focus`, async () => {
      await open(empty);

      await send('ionFocus');

      expect(field.value).toBe('');
      expect(fixture.componentInstance.value).toBe('');
    });
  }

  it('keeps a number on focus', async () => {
    await open(15.5);

    await send('ionFocus');

    expect(field.value).toBe('15.5');
    expect(fixture.componentInstance.value).toBe(15.5);
  });
});
